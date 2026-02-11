export type VanityWorkerConfig = {
  prefix?: string;
  suffix?: string;
  caseSensitive: boolean;
};

export type VanityWorkerStartMessage = {
  type: 'start';
  config: VanityWorkerConfig;
};

export type VanityWorkerStopMessage = {
  type: 'stop';
};

export type VanityWorkerInboundMessage = VanityWorkerStartMessage | VanityWorkerStopMessage;

export type WorkerProgressMessage = {
  type: 'progress';
  attempts: number;
};

export type WorkerFoundMessage = {
  type: 'found';
  address: string;
  secretKey: Uint8Array;
  attempts: number;
};

export type WorkerErrorMessage = {
  type: 'error';
  message: string;
};

export type WorkerMessage = WorkerProgressMessage | WorkerFoundMessage | WorkerErrorMessage;
