export interface VoiceOption {
  language: string;
  voiceName: string;
  gender: 'MALE' | 'FEMALE';
  isDefault: boolean;
}
