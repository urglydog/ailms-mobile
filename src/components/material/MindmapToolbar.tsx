import { Pressable, Text, View } from 'react-native';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Copy, Download, Pencil } from 'lucide-react-native';

import type { MermaidDirection } from './mermaidHtml';

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
  onEdit: () => void;
  downloadDisabled?: boolean;
}

/** Port từ `fe/components/materials/MermaidViewer.tsx` (4 nút xoay hướng + Copy Code + Download)
 * — giữ nguyên convention màu hex inline đã dùng ở `DiscoveryChat.tsx`/`BottomNav.tsx`, không
 * dùng Tailwind/NativeWind. */
export function MindmapToolbar({ direction, onDirectionChange, onCopyCode, onDownload, onEdit, downloadDisabled }: MindmapToolbarProps) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 8, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
      <View style={{ flexDirection: 'row', gap: 4, backgroundColor: '#fff', padding: 4, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
        {DIRECTIONS.map(({ id, label, Icon }) => {
          const active = direction === id;
          return (
            <Pressable
              key={id}
              onPress={() => onDirectionChange(id)}
              hitSlop={6}
              style={{ padding: 8, borderRadius: 8, backgroundColor: active ? '#2563EB' : 'transparent' }}
              accessibilityLabel={`Xoay sơ đồ hướng ${label}`}
            >
              <Icon size={16} color={active ? '#fff' : '#64748B'} strokeWidth={2} />
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={onEdit}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' }}
        >
          <Pencil size={14} color="#64748B" strokeWidth={2} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#334155' }}>Sửa</Text>
        </Pressable>
        <Pressable
          onPress={onCopyCode}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' }}
        >
          <Copy size={14} color="#64748B" strokeWidth={2} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#334155' }}>Copy</Text>
        </Pressable>
        <Pressable
          onPress={onDownload}
          disabled={downloadDisabled}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', opacity: downloadDisabled ? 0.5 : 1 }}
        >
          <Download size={14} color="#64748B" strokeWidth={2} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#334155' }}>Tải về</Text>
        </Pressable>
      </View>
    </View>
  );
}
