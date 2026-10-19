import Markdown from 'react-native-markdown-display';
import { COLORS } from '@/lib/theme/colors';

/** Mobile chưa có renderer markdown nào trước đây (TutorChat/ExplainWrongAnswer/DiscoveryChat
 * đều hiện text thô — bug thật 12/10/2026, user báo cáo thấy nguyên `**text**`/`- item` chưa parse
 * trong câu trả lời AI). `react-native-markdown-display` thuần JS (dựa trên `markdown-it`), không
 * cần native linking, chạy được Expo Go. Style tối giản khớp màu/cỡ chữ đang dùng trong các bubble
 * chat hiện có, không theo theme đầy đủ của `fe`'s `MarkdownRenderer.tsx` (web có nhiều biến CSS
 * riêng, mobile chỉ cần đủ đọc được bold/list/heading). */
export function MarkdownRenderer({ content, color = '#1E293B' }: { content: string; color?: string }) {
  return (
    <Markdown
      style={{
        body: { color, fontSize: 13.5, lineHeight: 19 },
        strong: { fontWeight: '700' },
        bullet_list: { marginVertical: 2 },
        ordered_list: { marginVertical: 2 },
        list_item: { marginVertical: 1 },
        heading1: { fontSize: 16, fontWeight: '700', marginTop: 6, marginBottom: 4, color },
        heading2: { fontSize: 15, fontWeight: '700', marginTop: 6, marginBottom: 4, color },
        heading3: { fontSize: 14, fontWeight: '700', marginTop: 4, marginBottom: 3, color },
        code_inline: { backgroundColor: COLORS.surface, paddingHorizontal: 4, borderRadius: 4, fontSize: 12.5 },
        paragraph: { marginTop: 0, marginBottom: 4 },
      }}
    >
      {content}
    </Markdown>
  );
}
