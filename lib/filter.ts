export class KalmanFilter {
  R: number;
  Q: number;
  A: number;
  B: number;
  C: number;
  cov: number | null;
  x: number | null;

  constructor(R = 0.00001, Q = 0.001) {
    this.R = R;
    this.Q = Q;
    this.A = 1;
    this.B = 0;
    this.C = 1;
    this.cov = null;
    this.x = null;
  }

  filter(z: number): number {
    if (this.x === null) {
      this.x = z;
      this.cov = 1;
      return this.x;
    }

    // prediction
    const predX = this.A * this.x;
    const predCov = this.A * this.cov! * this.A + this.R;

    // kalman gain
    const K = (predCov * this.C) / (this.C * predCov * this.C + this.Q);

    // correction
    this.x = predX + K * (z - this.C * predX);
    this.cov = predCov - K * this.C * predCov;

    return this.x;
  }
}
