
export enum SessionState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
}

export interface TranscriptMessage {
  speaker: 'user' | 'examiner';
  text: string;
  isFinal: boolean;
}
