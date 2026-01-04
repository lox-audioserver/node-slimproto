import { EventEmitter } from "events";
import net from "net";
import { randomUUID } from "crypto";
import { SLIMPROTO_PORT } from "./constants.js";
import { startDiscovery } from "./discovery.js";
import { EventType } from "./models.js";
import { getHostname, getIp } from "./util.js";
export class SlimServer extends EventEmitter {
    options;
    server;
    discovery;
    playersMap = new Map();
    subscriptions = [];
    constructor(options = {}) {
        super();
        this.options = options;
    }
    get players() {
        return Array.from(this.playersMap.values());
    }
    getPlayer(playerId) {
        return this.playersMap.get(playerId);
    }
    async start() {
        const ipAddress = this.options.ipAddress ?? (await getIp());
        const name = this.options.name ?? getHostname();
        const controlPort = this.options.controlPort ?? SLIMPROTO_PORT;
        this.server = net.createServer((socket) => this.registerPlayer(socket));
        await new Promise((resolve, reject) => {
            this.server?.once("error", reject);
            this.server?.listen(controlPort, "0.0.0.0", () => resolve());
        });
        this.discovery = startDiscovery({
            ipAddress,
            controlPort,
            cliPort: this.options.cliPort ?? null,
            cliPortJson: this.options.cliPortJson ?? null,
            name
        });
    }
    async stop() {
        for (const client of this.playersMap.values()) {
            client.socket.destroy();
        }
        this.playersMap.clear();
        if (this.server) {
            await new Promise((resolve) => this.server?.close(() => resolve()));
            this.server = undefined;
        }
        this.discovery?.close();
        this.discovery = undefined;
    }
    subscribe(cb, eventFilter, playerFilter) {
        const eventList = eventFilter == null
            ? null
            : Array.isArray(eventFilter)
                ? eventFilter
                : [eventFilter];
        const playerList = playerFilter == null
            ? null
            : Array.isArray(playerFilter)
                ? playerFilter
                : [playerFilter];
        const subscription = { callback: cb, eventFilter: eventList, playerFilter: playerList };
        this.subscriptions.push(subscription);
        return () => {
            const idx = this.subscriptions.indexOf(subscription);
            if (idx >= 0)
                this.subscriptions.splice(idx, 1);
        };
    }
    async registerPlayer(socket) {
        const playerId = `${socket.remoteAddress ?? "unknown"}:${socket.remotePort ?? randomUUID()}`;
        const player = { id: playerId, socket };
        this.playersMap.set(playerId, player);
        socket.on("close", () => this.handleDisconnect(playerId));
        socket.on("error", () => this.handleDisconnect(playerId));
        this.forwardEvent(playerId, EventType.PLAYER_CONNECTED, { remote: socket.remoteAddress });
    }
    handleDisconnect(playerId) {
        if (!this.playersMap.has(playerId))
            return;
        this.playersMap.delete(playerId);
        this.forwardEvent(playerId, EventType.PLAYER_DISCONNECTED);
    }
    forwardEvent(playerId, eventType, data) {
        const event = { type: eventType, playerId, data };
        this.emit(eventType, event);
        for (const sub of this.subscriptions) {
            if (sub.playerFilter && playerId && !sub.playerFilter.includes(playerId))
                continue;
            if (sub.eventFilter && !sub.eventFilter.includes(eventType))
                continue;
            const { callback } = sub;
            if (callback) {
                Promise.resolve(callback(event)).catch((err) => 
                // eslint-disable-next-line no-console
                console.error("Error in subscriber", err));
            }
        }
    }
}
