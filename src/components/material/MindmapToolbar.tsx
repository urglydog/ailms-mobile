import { Pressable, Text, View } from 'react-native';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Copy, Download } from 'lucide-react-native';

import type { MermaidDirection } from './mermaidHtml';
import { COLORS } from '@/lib/theme/colors';

const DIRECTIONS = [
  { id: 'TB' as const, label: 'Trên-Dưới', Icon: ArrowDown },
  { id: 'LR' as const, label: 'Trái-Phải', Icon: ArrowRight },
  { id: 'BT' as const, label: 'Dưới-Trên', Icon: ArrowUp },
  { id: 'RL' as const, label: 'Phải-Trái', Icon: ArrowLeft },
];

interface MindmapToolbarProps {
  direction: MermaidDirection | null;
  onDirectionChange: (direction: MermaidDirection) => void;
  onCopyCode: () => void;
  onDownload: () => void;
  downloadDisabled?: boolean;
}

/** Port từ `fe/components/materials/MermaidViewer.tsx` — giữ nguyên convention màu hex inline đã
 * dùng ở `DiscoveryChat.tsx`/`BottomNav.tsx`, không dùng Tailwind/NativeWind. 4 nút xoay hướng chỉ
 * là đổi CÁCH XEM (không sửa dữ liệu), nên hiện cho cả học liệu Official lẫn cá nhân — không gate
 * theo `isOfficial` như phản hồi 16/10/2026 (khác KHÔNG có nút sửa code — đã gỡ hẳn, xem rà soát
 * trước đó: `MermaidCodeEditor.tsx` chỉ dùng ở `CourseMaterialsManager.tsx` phía giảng viên). */
export function MindmapToolbar({ direction, onDirectionChange, onCopyCode, onDownload, downloadDisabled }: MindmapToolbarProps) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 8, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.lineSoft }}>
      <View style={{ flexDirection: 'row', gap: 4, backgroundColor: '#fff', padding: 4, borderRadius: 10, borderWidth: 1, borderColor: COLORS.lineSoft }}>
        {DIRECTIONS.map(({ id, label, Icon }) => {
          const active = direction === id;
          return (
            <Pressable
              key={id}
              onPress={() => onDirectionChange(id)}
              hitSlop={6}
              style={{ padding: 8, borderRadius: 8, backgroundColor: active ? COLORS.accent : 'transparent' }}
              accessibilityLabel={`Xoay sơ đồ hướng ${label}`}
            >
              <Icon size={16} color={active ? '#fff' : COLORS.inkFaint} strokeWidth={2} />
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={onCopyCode}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.lineSoft }}
        >
          <Copy size={14} color={COLORS.inkFaint} strokeWidth={2} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.ink }}>Copy</Text>
        </Pressable>
        <Pressable
          onPress={onDownload}
          disabled={downloadDisabled}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.lineSoft, opacity: downloadDisabled ? 0.5 : 1 }}
        >
          <Download size={14} color={COLORS.inkFaint} strokeWidth={2} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.ink }}>Tải về</Text>
        </Pressable>
      </View>
    </View>
  );
}
