interface WorkerManagerConfig {
  prefix?: string;
  suffix?: string;
  caseSensitive: boolean;
  workerCount: number;
  onProgress: (totalAttempts: number, rate: number) => void;
  onFound: (address: string, secretKey: Uint8Array, totalAttempts: number) => void;
  onError: (error: string) => void;
}

export class WorkerManager {
  private workers: Worker[] = [];
  private totalAttempts = 0;
  private lastAttempts = 0;
  private lastTime = 0;
  private rateTimer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  private config: WorkerManagerConfig;

  constructor(config: WorkerManagerConfig) {
    this.config = config;
  }

  start() {
    this.stopped = false;
    this.totalAttempts = 0;
    this.lastAttempts = 0;
    this.lastTime = Date.now();

    // Rate calculation timer — every 1 second
    this.rateTimer = setInterval(() => {
      const now = Date.now();
      const intervalSec = (now - this.lastTime) / 1000 || 1;
      const intervalAttempts = this.totalAttempts - this.lastAttempts;
      const rate = Math.round(intervalAttempts / intervalSec);
      this.config.onProgress(this.totalAttempts, rate);
      this.lastTime = now;
      this.lastAttempts = this.totalAttempts;
    }, 1000);

    for (let i = 0; i < this.config.workerCount; i++) {
      const worker = new Worker('/workers/vanity-worker.js');

      worker.onmessage = (e) => {
        const msg = e.data;

        if (msg.type === 'progress') {
          this.totalAttempts += msg.attempts;
        }

        if (msg.type === 'found' && !this.stopped) {
          this.totalAttempts += msg.attempts;
          this.stop();
          this.config.onFound(msg.address, new Uint8Array(msg.secretKey), this.totalAttempts);
        }

        if (msg.type === 'error') {
          this.config.onError(msg.message);
          this.stop();
        }
      };

      worker.onerror = (e) => {
        this.config.onError(e.message || 'Worker error');
        this.stop();
      };

      worker.postMessage({
        type: 'start',
        config: {
          prefix: this.config.prefix,
          suffix: this.config.suffix,
          caseSensitive: this.config.caseSensitive,
        },
      });

      this.workers.push(worker);
    }
  }

  stop() {
    this.stopped = true;
    if (this.rateTimer) {
      clearInterval(this.rateTimer);
      this.rateTimer = null;
    }
    for (const worker of this.workers) {
      worker.postMessage({ type: 'stop' });
      setTimeout(() => worker.terminate(), 200);
    }
    this.workers = [];
  }
}
