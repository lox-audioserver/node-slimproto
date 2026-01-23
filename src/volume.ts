export class SlimProtoVolume {
  minimum = 0;
  maximum = 100;
  step = 1;

  private static readonly oldMap: number[] = [
    0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 5, 5, 6, 6, 7, 8, 9, 9, 10, 11, 12, 13, 14, 15,
    16, 16, 17, 18, 19, 20, 22, 23, 24, 25, 26, 27, 28, 29, 30, 32, 33, 34, 35, 37,
    38, 39, 40, 42, 43, 44, 46, 47, 48, 50, 51, 53, 54, 56, 57, 59, 60, 61, 63, 65,
    66, 68, 69, 71, 72, 74, 75, 77, 79, 80, 82, 84, 85, 87, 89, 90, 92, 94, 96, 97,
    99, 101, 103, 104, 106, 108, 110, 112, 113, 115, 117, 119, 121, 123, 125, 127,
    128,
  ];

  private readonly totalVolumeRange = -50; // dB
  private readonly stepPoint = -1;
  private readonly stepFraction = 1;

  volume = 50;

  increment(): void {
    this.volume = Math.min(this.volume + this.step, this.maximum);
  }

  decrement(): void {
    this.volume = Math.max(this.volume - this.step, this.minimum);
  }

  oldGain(): number {
    if (this.volume <= 0) return 0;
    return SlimProtoVolume.oldMap[this.volume];
  }

  decibels(): number {
    const stepDb = this.totalVolumeRange * this.stepFraction;
    const maxVolumeDb = 0;
    const slopeHigh = maxVolumeDb - stepDb / (100 - this.stepPoint);
    const slopeLow = stepDb - this.totalVolumeRange / (this.stepPoint - 0.0);
    const x2 = this.volume;
    let m: number;
    let x1: number;
    let y1: number;
    if (x2 > this.stepPoint) {
      m = slopeHigh;
      x1 = 100;
      y1 = maxVolumeDb;
    } else {
      m = slopeLow;
      x1 = 0;
      y1 = this.totalVolumeRange;
    }
    return m * (x2 - x1) + y1;
  }

  newGain(): number {
    if (this.volume <= 0) return 0;
    const decibel = this.decibels();
    const floatmult = 10 ** (decibel / 20.0);
    if (decibel >= -30 && decibel <= 0) {
      return Math.trunc(floatmult * (1 << 8) + 0.5) * (1 << 8);
    }
    return Math.trunc(floatmult * (1 << 16) + 0.5);
  }
}
