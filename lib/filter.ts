export class AdaptiveKalman {
  private R = 0.0001; // measurement noise
  private Q = 0.00001; // process noise
  private x = 0;
  private p = 1;
  private k = 0;
  private initialized = false;

  filter(value: number, accuracy: number | null) {
    if (!this.initialized) {
      this.x = value;
      this.initialized = true;
      return value;
    }

    // GPS accuracy-based noise control
    if (accuracy !== null && accuracy > 0) {
      this.R = Math.max(0.0001, accuracy * accuracy * 0.000001);
    }

    this.p = this.p + this.Q;
    this.k = this.p / (this.p + this.R);
    this.x = this.x + this.k * (value - this.x);
    this.p = (1 - this.k) * this.p;

    return this.x;
  }
}
