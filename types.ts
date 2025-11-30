export interface TranslationRecord {
  id: string;
  original: string;
  translated: string;
  timestamp: number;
}

export enum TranslationStatus {
  IDLE = 'IDLE',
  TRANSLATING = 'TRANSLATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface AudioState {
  isPlaying: boolean;
  isLoading: boolean;
}
