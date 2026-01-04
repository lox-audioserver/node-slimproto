export declare class SlimProtoVolume {
    minimum: number;
    maximum: number;
    step: number;
    private static readonly oldMap;
    private readonly totalVolumeRange;
    private readonly stepPoint;
    private readonly stepFraction;
    volume: number;
    increment(): void;
    decrement(): void;
    oldGain(): number;
    decibels(): number;
    newGain(): number;
}
