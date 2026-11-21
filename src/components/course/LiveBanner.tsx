import { useQuery } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, Text, View } from 'react-native';
import { Radio, Calendar } from 'lucide-react-native';

import { liveViewApi } from '@/lib/api/liveView';
import { COLORS } from '@/lib/theme/colors';
import { WEB_URL } from '@/lib/webUrl';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** Port từ `fe/components/live/CourseLiveBanner.tsx` — chạm vào mở phòng xem Live trên trình duyệt
 * (WebRTC của web chạy được trên Safari/Chrome di động; bản native cần LiveKit + EAS dev client, đã
 * hoãn — xem UpComming_Plan.md). Không hiện gì nếu không có phiên LIVE/SCHEDULED nào, giống web. */
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
    <Pressable
      onPress={() => void WebBrowser.openBrowserAsync(`${WEB_URL}/live/${session.id}`)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: COLORS.dangerTint,
        backgroundColor: COLORS.dangerTint,
        borderRadius: 10,
        padding: 14,
      }}
    >
      {liveNow ? <Radio size={18} color={COLORS.danger} /> : <Calendar size={18} color={COLORS.inkFaint} />}
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', fontSize: 13, color: COLORS.ink }}>
          {liveNow ? 'Đang live: ' : 'Sắp live: '}
          {session.title}
        </Text>
        {!liveNow && session.scheduledAt ? (
          <Text style={{ fontSize: 11.5, color: COLORS.inkFaint }}>Dự kiến {formatDateTime(session.scheduledAt)} — chạm để xem</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
