import { EventEmitter } from "events";
import { Buffer } from "node:buffer";
import { FALLBACK_CODECS, FALLBACK_MODEL, FALLBACK_SAMPLE_RATE, FALLLBACK_FIRMWARE, HEARTBEAT_INTERVAL } from "./constants.js";
import { ButtonCode, CODEC_MAPPING, DEVICE_TYPE, EventType, FORMAT_BYTE, PCM_SAMPLE_RATE, PCM_SAMPLE_SIZE, PlayerState, RemoteCode, TransitionType } from "./models.js";
import { ipToInt, lookupHost, parseCapabilities, parseHeaders, parseStatus } from "./util.js";
import { SlimProtoVolume } from "./volume.js";
import { UnsupportedContentType } from "./errors.js";
export class SlimClient extends EventEmitter {
    socket;
    onEvent;
    buffer = Buffer.alloc(0);
    _connected = false;
    heartbeatTimer;
    lastHeartbeat = 0;
    _playerId = "";
    _deviceType = "";
    _deviceName = "";
    _capabilities = {};
    _powered = false;
    _muted = false;
    _state = PlayerState.STOPPED;
    _jiffies = 0;
    _lastTimestamp = 0;
    _elapsedMilliseconds = 0;
    _currentMedia;
    _bufferingMedia;
    _nextMedia;
    _autoPlay = false;
    _presets = [];
    volumeControl = new SlimProtoVolume();
    extraData = {
        can_seek: 0,
        digital_volume_control: 1,
        playlist_timestamp: Math.floor(Date.now() / 1000),
        "playlist repeat": 0,
        "playlist shuffle": 0,
        "playlist mode": "off",
        rate: 1,
        seq_no: 0,
        sleep: 0,
        will_sleep_in: 0,
        uuid: null
    };
    constructor(socket, options = {}) {
        super();
        this.socket = socket;
        this.onEvent = options.onEvent;
        this.socket.on("data", (chunk) => this.handleData(chunk));
        this.socket.on("close", () => this.handleDisconnect());
        this.socket.on("error", () => this.handleDisconnect());
    }
    get connected() {
        return this._connected;
    }
    get playerId() {
        return this._playerId;
    }
    get deviceType() {
        return this._deviceType;
    }
    get deviceModel() {
        return this._capabilities.ModelName ?? this._capabilities.Model ?? FALLBACK_MODEL;
    }
    get firmware() {
        return this._capabilities.Firmware ?? FALLLBACK_FIRMWARE;
    }
    get maxSampleRate() {
        return this._capabilities.MaxSampleRate ?? FALLBACK_SAMPLE_RATE;
    }
    get supportedCodecs() {
        return this._capabilities.SupportedCodecs ?? FALLBACK_CODECS;
    }
    get deviceAddress() {
        const info = this.socket.remoteAddress;
        return info ?? "";
    }
    get name() {
        return this._deviceName || `${this.deviceType}: ${this.playerId}`;
    }
    get volumeLevel() {
        return this.volumeControl.volume;
    }
    get powered() {
        return this._powered;
    }
    get muted() {
        return this._muted;
    }
    get state() {
        return this._state;
    }
    get elapsedMilliseconds() {
        if (this.state !== PlayerState.PLAYING)
            return this._elapsedMilliseconds;
        return this._elapsedMilliseconds + Math.trunc((Date.now() / 1000 - this._lastTimestamp) * 1000);
    }
    get elapsedSeconds() {
        return this.elapsedMilliseconds / 1000;
    }
    get jiffies() {
        return this._jiffies + Math.trunc((Date.now() / 1000 - this._lastTimestamp) * 1000);
    }
    get currentUrl() {
        return this._currentMedia?.url;
    }
    get currentMedia() {
        return this._currentMedia;
    }
    get nextMedia() {
        return this._nextMedia;
    }
    get presets() {
        return this._presets;
    }
    set presets(presets) {
        this._presets = presets.slice(0, 9);
        this.emitEvent(EventType.PLAYER_PRESETS_UPDATED);
    }
    disconnect() {
        if (!this._connected)
            return;
        this._connected = false;
        if (this.heartbeatTimer)
            clearInterval(this.heartbeatTimer);
        this.socket.removeAllListeners("data");
        this.socket.removeAllListeners("close");
        this.socket.removeAllListeners("error");
        this.socket.destroy();
    }
    handleDisconnect() {
        if (!this._connected)
            return;
        this._connected = false;
        if (this.heartbeatTimer)
            clearInterval(this.heartbeatTimer);
        this.emitEvent(EventType.PLAYER_DISCONNECTED);
        this.disconnect();
    }
    async handleData(chunk) {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        while (this.buffer.length >= 8) {
            const op = this.buffer.subarray(0, 4);
            const length = this.buffer.readUInt32BE(4);
            if (this.buffer.length < length + 8)
                break;
            const payload = this.buffer.subarray(8, length + 8);
            this.buffer = this.buffer.subarray(length + 8);
            const command = op.toString("ascii").replace(/!/g, "").trim().toLowerCase();
            await this.dispatchCommand(command, payload);
        }
    }
    async dispatchCommand(command, payload) {
        if (command === "bye!") {
            this.handleDisconnect();
            return;
        }
        const handlerName = `_process_${command}`;
        const handler = this[handlerName];
        if (handler) {
            await handler.call(this, payload);
            return;
        }
        // eslint-disable-next-line no-console
        console.debug(`No handler for ${command}`);
    }
    async stop() {
        if (this._state === PlayerState.STOPPED)
            return;
        await this._sendStrm(Buffer.from("q"), { flags: 0 });
        this._state = PlayerState.STOPPED;
        this.signalUpdate();
    }
    async play() {
        if (this._state !== PlayerState.PAUSED)
            return;
        await this._sendStrm(Buffer.from("u"), { flags: 0 });
        this._state = PlayerState.PLAYING;
        this.signalUpdate();
    }
    async pause() {
        if (![PlayerState.PLAYING, PlayerState.BUFFERING].includes(this._state))
            return;
        await this._sendStrm(Buffer.from("p"));
        this._state = PlayerState.PAUSED;
        this.signalUpdate();
    }
    async togglePause() {
        if (this.state === PlayerState.PLAYING) {
            await this.pause();
        }
        else {
            await this.play();
        }
    }
    async power(powered = true) {
        if (this._powered === powered)
            return;
        if (!powered)
            await this.stop();
        const payload = Buffer.alloc(2);
        payload.writeUInt8(powered ? 1 : 0, 0);
        payload.writeUInt8(1, 1);
        await this.sendFrame(Buffer.from("aude"), payload);
        this._powered = powered;
        this.signalUpdate();
    }
    async togglePower() {
        await this.power(!this.powered);
    }
    async volumeSet(volume) {
        if (volume === this.volumeControl.volume)
            return;
        this.volumeControl.volume = volume;
        const oldGain = this.volumeControl.oldGain();
        const newGain = this.volumeControl.newGain();
        const payload = Buffer.alloc(18);
        payload.writeUInt32BE(oldGain, 0);
        payload.writeUInt32BE(oldGain, 4);
        payload.writeUInt8(1, 8);
        payload.writeUInt8(255, 9);
        payload.writeUInt32BE(newGain, 10);
        payload.writeUInt32BE(newGain, 14);
        await this.sendFrame(Buffer.from("audg"), payload);
        this.signalUpdate();
    }
    async volumeUp() {
        this.volumeControl.increment();
        await this.volumeSet(this.volumeControl.volume);
    }
    async volumeDown() {
        this.volumeControl.decrement();
        await this.volumeSet(this.volumeControl.volume);
    }
    async mute(muted = false) {
        if (this._muted === muted)
            return;
        const payload = Buffer.from([muted ? 0 : 1, 0]);
        await this.sendFrame(Buffer.from("aude"), payload);
        this._muted = muted;
        this.signalUpdate();
    }
    async next() {
        if (!this._nextMedia)
            return;
        const media = this._nextMedia;
        this._nextMedia = undefined;
        await this.playUrl({
            url: media.url,
            mimeType: media.mimeType,
            metadata: media.metadata,
            transition: media.transition,
            transitionDuration: media.transitionDuration,
            enqueue: false,
            autostart: true,
            sendFlush: true
        });
    }
    async playUrl(opts) {
        const { url, mimeType = null, metadata = null, transition = TransitionType.NONE, transitionDuration = 0, enqueue = false, autostart = true, sendFlush = true } = opts;
        if (!url.startsWith("http")) {
            throw new UnsupportedContentType(`Invalid URL: ${url}`);
        }
        if (sendFlush) {
            await this._sendStrm(Buffer.from("f"), { autostart: Buffer.from("0") });
            await this._sendStrm(Buffer.from("q"), { flags: 0 });
        }
        const mediaDetails = {
            url,
            mimeType: mimeType ?? undefined,
            metadata: metadata ?? undefined,
            transition,
            transitionDuration
        };
        if (enqueue) {
            this._nextMedia = mediaDetails;
            this.extraData.playlist_timestamp = Math.floor(Date.now() / 1000);
            this.signalUpdate();
            return;
        }
        this._bufferingMedia = mediaDetails;
        this.extraData.playlist_timestamp = Math.floor(Date.now() / 1000);
        this.signalUpdate();
        if (!this._powered) {
            await this.power(true);
        }
        this._state = PlayerState.BUFFERING;
        const urlObj = new URL(url);
        let scheme = urlObj.protocol.replace(":", "");
        let host = urlObj.hostname;
        let port = urlObj.port ? Number(urlObj.port) : undefined;
        let path = urlObj.pathname + (urlObj.search ?? "");
        if (!port && scheme === "https") {
            port = 443;
        }
        else if (!port) {
            port = 80;
        }
        if (scheme === "https" && !this._capabilities.CanHTTPS) {
            this._bufferingMedia.url = url.replace("https", "http");
            scheme = "http";
            port = 80;
        }
        let resolvedMime = mimeType;
        if (!resolvedMime) {
            const ext = url.split(".").pop() ?? "";
            const candidates = [`audio/${url.slice(-3)}`, `audio/${ext}`];
            resolvedMime = candidates.find((mime) => CODEC_MAPPING[mime]) ?? null;
        }
        const codecDetails = resolvedMime ? this._parseCodc(resolvedMime) : Buffer.from("?????");
        if (port && port !== 80 && port !== 443) {
            host = `${host}:${port}`;
        }
        const httpReq = Buffer.from(`GET ${path} HTTP/1.0\r\nHost: ${host}\r\nConnection: close\r\nAccept: */*\r\nCache-Control: no-cache\r\nUser-Agent: VLC/3.0.9 LibVLC/3.0.9\r\nRange: bytes=0-\r\n\r\n`, "utf-8");
        const ipAddr = await lookupHost(urlObj.hostname);
        this._autoPlay = autostart;
        await this._sendStrm(Buffer.from("s"), {
            codecDetails,
            autostart: Buffer.from(autostart ? "3" : "0"),
            serverPort: port ?? 80,
            serverIp: ipToInt(ipAddr),
            threshold: 200,
            outputThreshold: 20,
            transDuration: transitionDuration,
            transType: Buffer.from(transition),
            flags: scheme === "https" ? 0x20 : 0x00,
            httpreq: httpReq
        });
    }
    async pauseFor(millis) {
        await this._sendStrm(Buffer.from("p"), { replayGain: millis });
    }
    async skipOver(millis) {
        await this._sendStrm(Buffer.from("a"), { replayGain: millis });
    }
    async unpauseAt(timestamp) {
        await this._sendStrm(Buffer.from("u"), { replayGain: timestamp });
    }
    signalUpdate() {
        this.emitEvent(EventType.PLAYER_UPDATED);
    }
    async sendFrame(command, data) {
        if (!this.socket.writable) {
            this.handleDisconnect();
            return;
        }
        const header = Buffer.alloc(2);
        header.writeUInt16BE(data.length + 4, 0);
        const cmd = Buffer.alloc(4);
        command.copy(cmd, 0, 0, Math.min(4, command.length));
        const packet = Buffer.concat([header, cmd, data]);
        await new Promise((resolve, reject) => {
            this.socket.write(packet, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    async _renderDisplay() {
        // Display rendering is not ported yet; keep the interface for compatibility.
    }
    async _sendHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            if (!this._connected)
                return;
            void (async () => {
                this.lastHeartbeat += 1;
                await this._sendStrm(Buffer.from("t"), {
                    autostart: Buffer.from("0"),
                    flags: 0,
                    replayGain: this.lastHeartbeat
                });
                await this._renderDisplay();
            })();
        }, HEARTBEAT_INTERVAL * 1000);
    }
    async _sendStrm(command, opts = {}) {
        const { autostart = Buffer.from("0"), codecDetails = Buffer.from("p1321"), threshold = 0, spdif = Buffer.from("0"), transDuration = 0, transType = Buffer.from("0"), flags = 0x20, outputThreshold = 0, replayGain = 0, serverPort = 0, serverIp = 0, httpreq = Buffer.alloc(0) } = opts;
        const payload = Buffer.alloc(25);
        payload.writeUInt8(command[0], 0);
        payload.writeUInt8(autostart[0], 1);
        codecDetails.copy(payload, 2, 0, 5);
        payload.writeUInt8(threshold, 7);
        payload.writeUInt8(spdif[0], 8);
        payload.writeUInt8(transDuration, 9);
        payload.writeUInt8(transType[0], 10);
        payload.writeUInt8(flags, 11);
        payload.writeUInt8(outputThreshold, 12);
        payload.writeUInt8(0, 13);
        payload.writeUInt32BE(replayGain, 14);
        payload.writeUInt16BE(serverPort, 18);
        payload.writeUInt32BE(serverIp, 20);
        await this.sendFrame(Buffer.from("strm"), Buffer.concat([payload, httpreq]));
    }
    async _process_helo(data) {
        const devId = data.readUInt8(0);
        const mac = [...data.subarray(2, 8)].map((b) => b.toString(16).padStart(2, "0")).join(":");
        this._playerId = mac.toLowerCase();
        this._deviceType = DEVICE_TYPE[devId] ?? "unknown device";
        this._capabilities = parseCapabilities(data);
        await this.sendFrame(Buffer.from("vers"), Buffer.from("7.9"));
        await this.sendFrame(Buffer.from("setd"), Buffer.from([0xfe]));
        await this.sendFrame(Buffer.from("setd"), Buffer.from([0]));
        await this.power(this._powered);
        await this.volumeSet(this.volumeLevel);
        this._connected = true;
        await this._sendHeartbeat();
        this.emitEvent(EventType.PLAYER_CONNECTED);
    }
    _process_butn(data) {
        const timestamp = data.readUInt32BE(0);
        const button = data.readUInt32BE(4);
        switch (button) {
            case ButtonCode.POWER:
                this.togglePower();
                return;
            case ButtonCode.PAUSE:
                this.togglePause();
                return;
            case ButtonCode.PLAY:
                this.play();
                return;
            case ButtonCode.VOLUME_DOWN:
                this.volumeDown();
                return;
            default:
        }
        this.emitEvent(EventType.PLAYER_BTN_EVENT, { type: "butn", timestamp, button });
    }
    _process_knob(data) {
        const timestamp = data.readUInt32BE(0);
        const position = data.readUInt32BE(4);
        const sync = data.readUInt8(8);
        this.emitEvent(EventType.PLAYER_BTN_EVENT, { type: "knob", timestamp, position, sync });
    }
    _process_ir(data) {
        const timestamp = data.readUInt32BE(0);
        const code = data.readUInt32BE(6);
        switch (code) {
            case RemoteCode.POWER:
                this.togglePower();
                return;
            case RemoteCode.PAUSE:
                this.togglePause();
                return;
            case RemoteCode.PLAY:
                this.play();
                return;
            case RemoteCode.VOLUME_DOWN:
                this.volumeDown();
                return;
            case RemoteCode.VOLUME_UP:
                this.volumeUp();
                return;
            default:
        }
        this.emitEvent(EventType.PLAYER_BTN_EVENT, { type: "ir", timestamp, code });
    }
    _process_dsco() {
        // Data stream disconnected; nothing to do yet.
    }
    async _process_stat(payload) {
        const event = payload.subarray(0, 4).toString();
        const data = payload.subarray(4);
        if (event === "\0\0\0\0")
            return;
        const handlerName = `_process_stat_${event.toLowerCase()}`;
        const handler = this[handlerName];
        if (handler) {
            await handler.call(this, data);
        }
        else {
            // eslint-disable-next-line no-console
            console.debug(`Unhandled stat event ${event}`);
        }
    }
    _process_stat_stmc() {
        this._state = PlayerState.BUFFERING;
        this.signalUpdate();
    }
    async _process_stat_stmd() {
        if (this._nextMedia) {
            const media = this._nextMedia;
            this._nextMedia = undefined;
            await this.playUrl({
                url: media.url,
                mimeType: media.mimeType,
                metadata: media.metadata,
                transition: media.transition,
                transitionDuration: media.transitionDuration,
                enqueue: false,
                autostart: true,
                sendFlush: false
            });
            return;
        }
        this.emitEvent(EventType.PLAYER_DECODER_READY);
    }
    _process_stat_stmf() {
        // connection closed stat
    }
    _process_stat_stmo() {
        if (this.state === PlayerState.BUFFERING)
            return;
        this._state = PlayerState.BUFFERING;
        if (this._autoPlay) {
            this.play();
        }
        else {
            this.emitEvent(EventType.PLAYER_OUTPUT_UNDERRUN);
        }
    }
    async _process_stat_stmp() {
        this._state = PlayerState.PAUSED;
        this.signalUpdate();
        await this._renderDisplay();
    }
    async _process_stat_stmr() {
        this._state = PlayerState.PLAYING;
        this.signalUpdate();
        await this._renderDisplay();
    }
    async _process_stat_stms() {
        this._state = PlayerState.PLAYING;
        if (this._bufferingMedia) {
            this._currentMedia = this._bufferingMedia;
            this._bufferingMedia = undefined;
            this.extraData.playlist_timestamp = Math.floor(Date.now() / 1000);
        }
        this.signalUpdate();
        await this._renderDisplay();
    }
    _process_stat_stmt(data) {
        const jiffies = data.readUInt32BE(16);
        const elapsedMilliseconds = data.readUInt32BE(28);
        this._jiffies = jiffies;
        this._elapsedMilliseconds = elapsedMilliseconds;
        this._lastTimestamp = Date.now() / 1000;
        this.emitEvent(EventType.PLAYER_HEARTBEAT);
    }
    async _process_stat_stmu() {
        this._state = PlayerState.STOPPED;
        this._currentMedia = undefined;
        this._bufferingMedia = undefined;
        this._nextMedia = undefined;
        this.extraData.playlist_timestamp = Math.floor(Date.now() / 1000);
        this.signalUpdate();
        await this._renderDisplay();
    }
    _process_stat_stml() {
        this._state = PlayerState.BUFFER_READY;
        this.emitEvent(EventType.PLAYER_BUFFER_READY);
    }
    _process_stat_stmn() {
        this.emitEvent(EventType.PLAYER_DECODER_ERROR);
    }
    async _process_resp(data) {
        const { statusCode, statusText } = parseStatus(data);
        const headers = parseHeaders(data);
        if (headers.location && this._nextMedia) {
            const location = headers.location;
            await this.playUrl({
                url: location,
                mimeType: this._nextMedia.mimeType,
                metadata: this._nextMedia.metadata,
                transition: this._nextMedia.transition,
                transitionDuration: this._nextMedia.transitionDuration ?? 0
            });
            return;
        }
        if (statusCode > 300) {
            // eslint-disable-next-line no-console
            console.error(`Server responds with status ${statusCode} ${statusText}`);
            return;
        }
        if (headers["content-type"]) {
            const contentType = headers["content-type"];
            const codcMsg = this._parseCodc(contentType);
            await this.sendFrame(Buffer.from("codc"), codcMsg);
        }
        if (headers["icy-name"] && this._bufferingMedia && !this._bufferingMedia.metadata?.title) {
            this._bufferingMedia.metadata = this._bufferingMedia.metadata ?? {};
            this._bufferingMedia.metadata.title = headers["icy-name"];
        }
        if (this._autoPlay) {
            await this.sendFrame(Buffer.from("cont"), Buffer.from("1"));
        }
    }
    _process_setd(data) {
        const dataId = data.readUInt8(0);
        if (dataId === 0) {
            this._deviceName = data.subarray(1, data.length - 1).toString();
            this.emitEvent(EventType.PLAYER_NAME_RECEIVED, this._deviceName);
        }
        if (dataId === 0xfe) {
            const len = data.length;
            let displayWidth = 0;
            let displayHeight = 0;
            if (len === 7) {
                displayWidth = data.readUInt16BE(1);
                displayHeight = data.readUInt16BE(3);
            }
            else if (len === 5) {
                displayWidth = data.readUInt16BE(1);
                displayHeight = data.readUInt16BE(3);
            }
            else if (len === 3) {
                displayWidth = data.readUInt16BE(1);
            }
            const resolution = `${displayWidth} x ${displayHeight}`;
            this.emitEvent(EventType.PLAYER_DISPLAY_RESOLUTION, resolution);
        }
    }
    _parseCodc(contentType) {
        if (contentType.includes("wav") || contentType.includes("pcm")) {
            const params = Object.fromEntries(new URLSearchParams(contentType.replace(";", "&")));
            const sampleRate = Number(params.rate ?? 44100);
            const sampleSize = Number(params.bitrate ?? 16);
            const channels = Number(params.channels ?? 2);
            const buf = Buffer.alloc(5);
            buf.write("p", 0, "ascii");
            (PCM_SAMPLE_SIZE[sampleSize] ?? Buffer.from("?")).copy(buf, 1);
            (PCM_SAMPLE_RATE[sampleRate] ?? Buffer.from("?")).copy(buf, 2);
            buf.write(channels.toString(), 3, "ascii");
            buf.write("1", 4, "ascii");
            return buf;
        }
        if (!CODEC_MAPPING[contentType]) {
            return Buffer.from("m????");
        }
        const codec = CODEC_MAPPING[contentType];
        if (!this.supportedCodecs.includes(codec)) {
            // eslint-disable-next-line no-console
            console.warn(`Player did not report support for content_type ${contentType}, playback might fail`);
        }
        if (contentType === "audio/aac" || contentType === "audio/aacp") {
            return Buffer.from("a2???");
        }
        const format = FORMAT_BYTE[codec] ?? Buffer.from("m");
        const buf = Buffer.alloc(5);
        format.copy(buf, 0);
        buf.write("????", 1, "ascii");
        return buf;
    }
    emitEvent(event, data) {
        this.onEvent?.(event, data);
        this.emit(event, { playerId: this.playerId, data });
    }
}
