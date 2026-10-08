import { useQuery } from '@tanstack/react-query';
import { voiceOptionsApi } from '@/lib/api/voiceOptions';

export function useVoiceOptions() {
  return useQuery({
    queryKey: ['voice-options'],
    queryFn: voiceOptionsApi.getAll,
    staleTime: 10 * 60 * 1000,
  });
}
