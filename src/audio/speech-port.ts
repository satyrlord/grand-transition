import type { SpeechCancellationReason, SpeechDiagnostic } from './speech-diagnostics';

export interface SpeechRequest {
  readonly onDiagnostic?: (event: SpeechDiagnostic) => void;
  readonly provider?: 'neural' | 'microsoft-local';
  readonly microsoftVoice?: 'David' | 'Mark' | 'Zira';
  readonly text: string;
  readonly language: string;
  readonly rate?: number;
  readonly pitch?: number;
  readonly volume?: number;
  readonly voiceUri?: string | null;
  readonly onStart?: () => void;
  readonly onEnd?: () => void;
  readonly segments?: readonly string[];
  readonly chunkStarts?: readonly number[];
  readonly onSegment?: (index: number) => void;
  readonly onError?: () => void;
}

export interface SpeechResult {
  readonly accepted: boolean;
  readonly reason?: string;
}

export interface SpeechPort {
  readonly available: boolean;
  speak(request: SpeechRequest): SpeechResult;
  /** Prepare one public delivery without starting playback or emitting callbacks. */
  prepare?(request: SpeechRequest): SpeechResult;
  cancel(reason?: SpeechCancellationReason): void;
  pause?(): void;
  resume?(): void;
}

export type SpeechVoice = Readonly<{
  voiceURI: string;
  name: string;
  lang: string;
  default: boolean;
}>;

export type NeuralSpeechCommand =
  | Readonly<{ type: 'load'; baseUrl: string }>
  | Readonly<{ type: 'synthesize'; id: number; segments: readonly string[]; voiceId: string; rate: number; pitch: number }>;

export type NeuralSpeechMessage =
  | Readonly<{ type: 'booted' }>
  | Readonly<{ type: 'progress'; loaded: number; total: number }>
  | Readonly<{ type: 'ready'; voices: readonly SpeechVoice[] }>
  | Readonly<{ type: 'speech'; id: number; samples: Float32Array<ArrayBuffer>; markers: readonly Readonly<{ index: number; seconds: number }>[]; sampleRate: number; playbackRate: number }>
  | Readonly<{ type: 'error'; id: number | null }>;
