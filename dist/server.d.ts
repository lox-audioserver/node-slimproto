import { EventEmitter } from "events";
import net from "net";
import { EventType, SlimEvent } from "./models.js";
export interface SlimServerOptions {
    cliPort?: number | null;
    cliPortJson?: number | null;
    ipAddress?: string | null;
    name?: string | null;
    controlPort?: number;
}
type PlayerConnection = {
    id: string;
    socket: net.Socket;
};
export declare class SlimServer extends EventEmitter {
    readonly options: SlimServerOptions;
    private server?;
    private discovery?;
    private playersMap;
    private subscriptions;
    constructor(options?: SlimServerOptions);
    get players(): PlayerConnection[];
    getPlayer(playerId: string): PlayerConnection | undefined;
    start(): Promise<void>;
    stop(): Promise<void>;
    subscribe(cb: (event: SlimEvent) => void | Promise<void>, eventFilter?: EventType | EventType[] | null, playerFilter?: string | string[] | null): () => void;
    private registerPlayer;
    private handleDisconnect;
    private forwardEvent;
}
export {};
