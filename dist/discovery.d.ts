import dgram from "dgram";
export interface DiscoveryOptions {
    ipAddress: string;
    controlPort: number;
    cliPort?: number | null;
    cliPortJson?: number | null;
    name?: string;
    uuid?: string;
}
export declare function startDiscovery(opts: DiscoveryOptions): dgram.Socket;
