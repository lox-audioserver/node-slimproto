export var EventType;
(function (EventType) {
    EventType["PLAYER_UPDATED"] = "player_updated";
    EventType["PLAYER_HEARTBEAT"] = "player_heartbeat";
    EventType["PLAYER_CONNECTED"] = "player_connected";
    EventType["PLAYER_DISCONNECTED"] = "player_disconnected";
    EventType["PLAYER_NAME_RECEIVED"] = "player_name_received";
    EventType["PLAYER_DISPLAY_RESOLUTION"] = "player_display_resolution";
    EventType["PLAYER_DECODER_READY"] = "player_decoder_ready";
    EventType["PLAYER_DECODER_ERROR"] = "player_decoder_error";
    EventType["PLAYER_OUTPUT_UNDERRUN"] = "player_output_underrun";
    EventType["PLAYER_BUFFER_READY"] = "player_buffer_ready";
    EventType["PLAYER_CLI_EVENT"] = "player_cli_event";
    EventType["PLAYER_BTN_EVENT"] = "player_btn_event";
    EventType["PLAYER_PRESETS_UPDATED"] = "player_presets_updated";
})(EventType || (EventType = {}));
export const DEVICE_TYPE = {
    2: "squeezebox",
    3: "softsqueeze",
    4: "squeezebox2",
    5: "transporter",
    6: "softsqueeze3",
    7: "receiver",
    8: "squeezeslave",
    9: "controller",
    10: "boom",
    11: "softboom",
    12: "squeezeplay",
    100: "squeezeesp32"
};
export var PlayerState;
(function (PlayerState) {
    PlayerState["PLAYING"] = "playing";
    PlayerState["STOPPED"] = "stopped";
    PlayerState["PAUSED"] = "paused";
    PlayerState["BUFFERING"] = "buffering";
    PlayerState["BUFFER_READY"] = "buffer_ready";
})(PlayerState || (PlayerState = {}));
export var TransitionType;
(function (TransitionType) {
    TransitionType["NONE"] = "0";
    TransitionType["CROSSFADE"] = "1";
    TransitionType["FADE_IN"] = "2";
    TransitionType["FADE_OUT"] = "3";
    TransitionType["FADE_IN_OUT"] = "4";
})(TransitionType || (TransitionType = {}));
export var VisualisationType;
(function (VisualisationType) {
    VisualisationType["NONE"] = "none";
    VisualisationType["SPECTRUM_ANALYZER"] = "spectrum_analyzer";
    VisualisationType["VU_METER_ANALOG"] = "vu_meter_analog";
    VisualisationType["VU_METER_DIGITAL"] = "vu_meter_digital";
    VisualisationType["WAVEFORM"] = "waveform";
})(VisualisationType || (VisualisationType = {}));
export var RemoteCode;
(function (RemoteCode) {
    RemoteCode[RemoteCode["SLEEP"] = 1988737095] = "SLEEP";
    RemoteCode[RemoteCode["POWER"] = 1988706495] = "POWER";
    RemoteCode[RemoteCode["REWIND"] = 1988739135] = "REWIND";
    RemoteCode[RemoteCode["PAUSE"] = 1988698335] = "PAUSE";
    RemoteCode[RemoteCode["FORWARD"] = 1988730975] = "FORWARD";
    RemoteCode[RemoteCode["ADD"] = 1988714655] = "ADD";
    RemoteCode[RemoteCode["PLAY"] = 1988694255] = "PLAY";
    RemoteCode[RemoteCode["UP"] = 1988747295] = "UP";
    RemoteCode[RemoteCode["DOWN"] = 1988735055] = "DOWN";
    RemoteCode[RemoteCode["LEFT"] = 1988726895] = "LEFT";
    RemoteCode[RemoteCode["RIGHT"] = 1988743215] = "RIGHT";
    RemoteCode[RemoteCode["VOLUME_UP"] = 1988722815] = "VOLUME_UP";
    RemoteCode[RemoteCode["VOLUME_DOWN"] = 1988690175] = "VOLUME_DOWN";
    RemoteCode[RemoteCode["NUM_1"] = 1988751375] = "NUM_1";
    RemoteCode[RemoteCode["NUM_2"] = 1988692215] = "NUM_2";
    RemoteCode[RemoteCode["NUM_3"] = 1988724855] = "NUM_3";
    RemoteCode[RemoteCode["NUM_4"] = 1988708535] = "NUM_4";
    RemoteCode[RemoteCode["NUM_5"] = 1988741175] = "NUM_5";
    RemoteCode[RemoteCode["NUM_6"] = 1988700375] = "NUM_6";
    RemoteCode[RemoteCode["NUM_7"] = 1988733015] = "NUM_7";
    RemoteCode[RemoteCode["NUM_8"] = 1988716695] = "NUM_8";
    RemoteCode[RemoteCode["NUM_9"] = 1988749335] = "NUM_9";
    RemoteCode[RemoteCode["NUM_0"] = 1988728935] = "NUM_0";
    RemoteCode[RemoteCode["FAVORITES"] = 1988696295] = "FAVORITES";
    RemoteCode[RemoteCode["SEARCH"] = 1988712615] = "SEARCH";
    RemoteCode[RemoteCode["BROWSE"] = 1988718735] = "BROWSE";
    RemoteCode[RemoteCode["SHUFFLE"] = 1988745255] = "SHUFFLE";
    RemoteCode[RemoteCode["REPEAT"] = 1988704455] = "REPEAT";
    RemoteCode[RemoteCode["NOW_PLAYING"] = 1988720775] = "NOW_PLAYING";
    RemoteCode[RemoteCode["SIZE"] = 1988753415] = "SIZE";
    RemoteCode[RemoteCode["BRIGHTNESS"] = 1988691195] = "BRIGHTNESS";
})(RemoteCode || (RemoteCode = {}));
export var ButtonCode;
(function (ButtonCode) {
    ButtonCode[ButtonCode["POWER"] = 65546] = "POWER";
    ButtonCode[ButtonCode["PRESET_1"] = 131104] = "PRESET_1";
    ButtonCode[ButtonCode["PRESET_2"] = 131105] = "PRESET_2";
    ButtonCode[ButtonCode["PRESET_3"] = 131106] = "PRESET_3";
    ButtonCode[ButtonCode["PRESET_4"] = 131107] = "PRESET_4";
    ButtonCode[ButtonCode["PRESET_5"] = 131108] = "PRESET_5";
    ButtonCode[ButtonCode["PRESET_6"] = 131109] = "PRESET_6";
    ButtonCode[ButtonCode["BACK"] = 131085] = "BACK";
    ButtonCode[ButtonCode["PLAY"] = 131090] = "PLAY";
    ButtonCode[ButtonCode["ADD"] = 131091] = "ADD";
    ButtonCode[ButtonCode["UP"] = 131083] = "UP";
    ButtonCode[ButtonCode["OK"] = 131086] = "OK";
    ButtonCode[ButtonCode["REWIND"] = 131088] = "REWIND";
    ButtonCode[ButtonCode["PAUSE"] = 131095] = "PAUSE";
    ButtonCode[ButtonCode["FORWARD"] = 131101] = "FORWARD";
    ButtonCode[ButtonCode["VOLUME_DOWN"] = 131081] = "VOLUME_DOWN";
    ButtonCode[ButtonCode["POWER_RELEASE"] = 131082] = "POWER_RELEASE";
})(ButtonCode || (ButtonCode = {}));
export const PCM_SAMPLE_SIZE = {
    8: Buffer.from("0"),
    16: Buffer.from("1"),
    20: Buffer.from("2"),
    32: Buffer.from("3"),
    24: Buffer.from("4"),
    0: Buffer.from("?")
};
export const PCM_SAMPLE_RATE = {
    11000: Buffer.from("0"),
    22000: Buffer.from("1"),
    44100: Buffer.from("3"),
    48000: Buffer.from("4"),
    8000: Buffer.from("5"),
    12000: Buffer.from("6"),
    16000: Buffer.from("7"),
    24000: Buffer.from("8"),
    88200: Buffer.from(":"),
    96000: Buffer.from("9"),
    176400: Buffer.from(";"),
    192000: Buffer.from("<"),
    352800: Buffer.from("="),
    384000: Buffer.from(">"),
    0: Buffer.from("?")
};
export const CODEC_MAPPING = {
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/flac": "flc",
    "audio/x-flac": "flc",
    "audio/wma": "wma",
    "audio/ogg": "ogg",
    "audio/oga": "ogg",
    "audio/aac": "aac",
    "audio/aacp": "aac",
    "audio/alac": "alc",
    "audio/wav": "pcm",
    "audio/x-wav": "pcm",
    "audio/dsf": "dsf",
    "audio/pcm,": "pcm"
};
export const FORMAT_BYTE = {
    pcm: Buffer.from("p"),
    mp3: Buffer.from("m"),
    flc: Buffer.from("f"),
    wma: Buffer.from("w"),
    ogg: Buffer.from("o"),
    aac: Buffer.from("a"),
    alc: Buffer.from("l"),
    dsf: Buffer.from("p"),
    dff: Buffer.from("p"),
    aif: Buffer.from("p")
};
export const PLAYMODE_MAP = {
    [PlayerState.STOPPED]: "stop",
    [PlayerState.PLAYING]: "play",
    [PlayerState.BUFFER_READY]: "play",
    [PlayerState.BUFFERING]: "play",
    [PlayerState.PAUSED]: "pause"
};
