import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { Radio, Calendar } from 'lucide-react-native';

import { liveViewApi } from '@/lib/api/liveView';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** Port từ `fe/components/live/CourseLiveBanner.tsx` — chỉ hiển thị thông tin (KHÔNG điều
 * hướng tới màn xem live, mobile chưa có `/live/[sessionId]` — đó là mục #8 trong bảng ưu tiên
 * UpComming_Plan.md, chưa được chọn ở lần port này). Không hiện gì nếu không có phiên LIVE/
 * SCHEDULED nào, giống hành vi bản web. */
export function LiveBanner({ courseId }: { courseId: number }) {
  const { data: sessions } = useQuery({
    queryKey: ['live-view', 'course', courseId],
    queryFn: () => liveViewApi.listForCourse(courseId),
    refetchInterval: 30000,
  });

  const liveNow = sessions?.find((s) => s.status === 'LIVE');
  const upcoming = sessions?.find((s) => s.status === 'SCHEDULED');
  const session = liveNow ?? upcoming;

  if (!session) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: '#FECACA',
        backgroundColor: '#FEF2F2',
        borderRadius: 10,
        padding: 14,
      }}
    >
      {liveNow ? <Radio size={18} color="#DC2626" /> : <Calendar size={18} color="#64748B" />}
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', fontSize: 13, color: '#0F172A' }}>
          {liveNow ? 'Đang live: ' : 'Sắp live: '}
          {session.title}
        </Text>
        {!liveNow && session.scheduledAt ? (
          <Text style={{ fontSize: 11.5, color: '#64748B' }}>Dự kiến {formatDateTime(session.scheduledAt)} — xem trên web</Text>
        ) : null}
      </View>
    </View>
  );
}
