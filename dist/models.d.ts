export declare enum EventType {
    PLAYER_UPDATED = "player_updated",
    PLAYER_HEARTBEAT = "player_heartbeat",
    PLAYER_CONNECTED = "player_connected",
    PLAYER_DISCONNECTED = "player_disconnected",
    PLAYER_NAME_RECEIVED = "player_name_received",
    PLAYER_DISPLAY_RESOLUTION = "player_display_resolution",
    PLAYER_DECODER_READY = "player_decoder_ready",
    PLAYER_DECODER_ERROR = "player_decoder_error",
    PLAYER_OUTPUT_UNDERRUN = "player_output_underrun",
    PLAYER_BUFFER_READY = "player_buffer_ready",
    PLAYER_CLI_EVENT = "player_cli_event",
    PLAYER_BTN_EVENT = "player_btn_event",
    PLAYER_PRESETS_UPDATED = "player_presets_updated"
}
export interface SlimEvent<T = unknown> {
    type: EventType;
    playerId: string;
    data?: T;
}
export declare const DEVICE_TYPE: Record<number, string>;
export declare enum PlayerState {
    PLAYING = "playing",
    STOPPED = "stopped",
    PAUSED = "paused",
    BUFFERING = "buffering",
    BUFFER_READY = "buffer_ready"
}
export declare enum TransitionType {
    NONE = "0",
    CROSSFADE = "1",
    FADE_IN = "2",
    FADE_OUT = "3",
    FADE_IN_OUT = "4"
}
export declare enum VisualisationType {
    NONE = "none",
    SPECTRUM_ANALYZER = "spectrum_analyzer",
    VU_METER_ANALOG = "vu_meter_analog",
    VU_METER_DIGITAL = "vu_meter_digital",
    WAVEFORM = "waveform"
}
export declare enum RemoteCode {
    SLEEP = 1988737095,
    POWER = 1988706495,
    REWIND = 1988739135,
    PAUSE = 1988698335,
    FORWARD = 1988730975,
    ADD = 1988714655,
    PLAY = 1988694255,
    UP = 1988747295,
    DOWN = 1988735055,
    LEFT = 1988726895,
    RIGHT = 1988743215,
    VOLUME_UP = 1988722815,
    VOLUME_DOWN = 1988690175,
    NUM_1 = 1988751375,
    NUM_2 = 1988692215,
    NUM_3 = 1988724855,
    NUM_4 = 1988708535,
    NUM_5 = 1988741175,
    NUM_6 = 1988700375,
    NUM_7 = 1988733015,
    NUM_8 = 1988716695,
    NUM_9 = 1988749335,
    NUM_0 = 1988728935,
    FAVORITES = 1988696295,
    SEARCH = 1988712615,
    BROWSE = 1988718735,
    SHUFFLE = 1988745255,
    REPEAT = 1988704455,
    NOW_PLAYING = 1988720775,
    SIZE = 1988753415,
    BRIGHTNESS = 1988691195
}
export declare enum ButtonCode {
    POWER = 65546,
    PRESET_1 = 131104,
    PRESET_2 = 131105,
    PRESET_3 = 131106,
    PRESET_4 = 131107,
    PRESET_5 = 131108,
    PRESET_6 = 131109,
    BACK = 131085,
    PLAY = 131090,
    ADD = 131091,
    UP = 131083,
    OK = 131086,
    REWIND = 131088,
    PAUSE = 131095,
    FORWARD = 131101,
    VOLUME_DOWN = 131081,
    POWER_RELEASE = 131082
}
export declare const PCM_SAMPLE_SIZE: Record<number, Buffer>;
export declare const PCM_SAMPLE_RATE: Record<number, Buffer>;
export declare const CODEC_MAPPING: Record<string, string>;
export declare const FORMAT_BYTE: Record<string, Buffer>;
export declare const PLAYMODE_MAP: Record<PlayerState, string>;
export interface MediaMetadata {
    item_id?: string;
    artist?: string;
    album?: string;
    title?: string;
    image_url?: string;
    duration?: number;
}
export interface MediaDetails {
    url: string;
    mimeType?: string;
    metadata?: MediaMetadata;
    transition?: TransitionType;
    transitionDuration?: number;
}
export interface Preset {
    uri: string;
    text: string;
    icon: string;
}
