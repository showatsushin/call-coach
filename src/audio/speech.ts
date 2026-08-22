export type SpeechInputErrorCode =
  | "permission_denied"
  | "no_speech"
  | "recognition_unavailable"
  | "recognition_aborted"
  | "recognition_error";

export class SpeechInputError extends Error {
  constructor(public readonly code: SpeechInputErrorCode) {
    super(code);
    this.name = "SpeechInputError";
  }
}

export interface SpeechInputProvider {
  isSupported(): boolean;
  startListening(): Promise<void>;
  stopListening(): Promise<string>;
  cancel(): void;
}

export interface SpeechOutputProvider {
  isSupported(): boolean;
  speak(text: string): Promise<void>;
  stop(): void;
}
