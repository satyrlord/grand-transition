export interface SpeechRequest {
  readonly text: string;
  readonly language: string;
  readonly rate?: number;
  readonly pitch?: number;
  readonly volume?: number;
}

export interface SpeechResult {
  readonly accepted: boolean;
  readonly reason?: string;
}

export interface SpeechPort {
  readonly available: boolean;
  speak(request: SpeechRequest): SpeechResult;
  cancel(): void;
}
