import { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Switch } from 'react-native';
import type { SubtitleSegment } from '@/types/lesson';
import { COLORS } from '@/lib/theme/colors';

interface TranscriptPanelProps {
  originalSubtitles: SubtitleSegment[];
  translatedSubtitles: SubtitleSegment[];
  currentSec: number;
  onSeek: (sec: number) => void;
}

function formatTimestamp(sec: number): string {
  const total = Number.isFinite(sec) && sec > 0 ? Math.floor(sec) : 0;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function findOverlapping(segments: SubtitleSegment[], startSec: number, endSec: number): SubtitleSegment | null {
  const mid = (startSec + endSec) / 2;
  return segments.find((s) => mid >= s.startSec && mid < s.endSec) ?? null;
}

export function TranscriptPanel({ originalSubtitles, translatedSubtitles, currentSec, onSeek }: TranscriptPanelProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Note: automatic scrolling to the active segment would require a FlatList or mapping refs to scroll offsets.
  // Given React Native limitations, auto-scrolling per segment in ScrollView needs Y layout tracking.
  // We'll keep it simple for now without the auto-scroll exact calculation.

  // Using sequence or index to determine active
  const activeIndex = originalSubtitles.findIndex((s) => currentSec >= s.startSec && currentSec < s.endSec);

  return (
    <View style={{ flex: 1, height: 300, backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.lineSoft, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.lineSoft, backgroundColor: COLORS.white }}>
        <Switch
          value={autoScroll}
          onValueChange={setAutoScroll}
          trackColor={{ false: COLORS.line, true: COLORS.accent }}
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />
        <Text style={{ fontSize: 13, color: COLORS.inkFaint }}>Tự động cuộn theo lời thoại</Text>
      </View>

      <ScrollView style={{ flex: 1, padding: 8 }}>
        {originalSubtitles.length === 0 ? (
          <Text style={{ padding: 16, fontSize: 13, color: COLORS.lineDot }}>Bài học này chưa có bản ghi lời thoại.</Text>
        ) : (
          originalSubtitles.map((seg, index) => {
            const translated = translatedSubtitles.length > 0 ? findOverlapping(translatedSubtitles, seg.startSec, seg.endSec) : null;
            const active = index === activeIndex;

            return (
              <Pressable
                key={index}
                onPress={() => onSeek(seg.startSec)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  backgroundColor: active ? COLORS.tint : 'transparent',
                  borderRadius: 8,
                }}
              >
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ fontSize: 11, fontFamily: 'monospace', color: COLORS.lineDot, marginTop: 2 }}>
                    {formatTimestamp(seg.startSec)}
                  </Text>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: 13, color: COLORS.ink, lineHeight: 20 }}>{seg.text}</Text>
                    {translated && (
                      <Text style={{ fontSize: 12, color: COLORS.inkFaint, fontStyle: 'italic', lineHeight: 18 }}>
                        {translated.text}
                      </Text>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
