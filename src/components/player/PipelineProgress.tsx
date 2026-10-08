import { View, Text, Pressable } from 'react-native';
import type { PipelineStep } from '@/types/dubbing';

interface PipelineProgressProps {
  steps: PipelineStep[];
  percent?: number;
  onWatchOriginal: () => void;
  onCancel: () => void;
  isCancelling?: boolean;
}

export function PipelineProgress({ steps, percent, onWatchOriginal, onCancel, isCancelling }: PipelineProgressProps) {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4F46E5' }} />
          <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: '#4F46E5' }}>
            ĐANG XỬ LÝ LỒNG TIẾNG AI
          </Text>
        </View>
        {percent !== undefined && (
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>{percent}%</Text>
        )}
      </View>

      {percent !== undefined && (
        <View style={{ height: 6, width: '100%', backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ height: '100%', backgroundColor: '#4F46E5', width: `${percent}%` }} />
        </View>
      )}

      <View style={{ gap: 8 }}>
        {steps.map((step) => (
          <View key={step.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: step.failed ? '#EF4444' : step.done ? '#22C55E' : 'transparent',
                borderWidth: step.failed || step.done ? 0 : step.active ? 2 : 1,
                borderColor: step.active ? '#4F46E5' : '#E2E8F0',
              }}
            >
              {step.failed && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✕</Text>}
              {!step.failed && step.done && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✓</Text>}
              {!step.failed && step.active && !step.done && (
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#4F46E5' }} />
              )}
            </View>
            <Text
              style={{
                fontSize: 13,
                color: step.failed ? '#DC2626' : step.done ? '#94A3B8' : step.active ? '#0F172A' : '#94A3B8',
                fontWeight: step.active ? '600' : '400',
              }}
            >
              {step.label}
              {step.failed ? ' — giữ âm thanh gốc' : ''}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 }}>
        <Pressable onPress={onWatchOriginal}>
          <Text style={{ fontSize: 13, fontWeight: '500', color: '#64748B', textDecorationLine: 'underline' }}>
            Ẩn tiến độ, xem video
          </Text>
        </Pressable>
        <Pressable onPress={onCancel} disabled={isCancelling}>
          <Text style={{ fontSize: 13, fontWeight: '500', color: '#DC2626', opacity: isCancelling ? 0.5 : 1 }}>
            {isCancelling ? 'Đang huỷ...' : 'Huỷ lồng tiếng'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
