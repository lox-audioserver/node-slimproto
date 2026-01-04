export declare function getIp(): Promise<string>;
export declare function getHostname(): string;
export declare function selectFreePort(rangeStart: number, rangeEnd: number): Promise<number>;
export declare function parseCapabilities(heloData: Buffer): Record<string, unknown>;
export declare function parseHeaders(respData: Buffer): Record<string, string>;
export declare function parseStatus(respData: Buffer): {
    version: string;
    statusCode: number;
    statusText: string;
};
export declare function lookupHost(host: string): Promise<string>;
export declare function ipToInt(ipAddress: string): number;
