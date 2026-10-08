import { api } from '@/lib/api/client';
import type { VoiceOption } from '@/types/voiceOptions';

export const voiceOptionsApi = {
  getAll: () => api.get<VoiceOption[]>('/api/v1/voice-options'),
};
