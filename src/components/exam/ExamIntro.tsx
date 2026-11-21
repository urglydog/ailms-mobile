import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { ShieldAlert, Timer } from 'lucide-react-native';
import { COLORS } from '@/lib/theme/colors';
import type { QuizAttemptHistoryItem } from '@/types/quiz';

export interface ExamInfo {
  title: string;
  durationMinutes: number | null;
  maxAttempts: number | null;
  questionCount: number | null;
  startTime: string | null;
  endTime: string | null;
  /** `null` = chưa biết (mở không qua danh sách học liệu) — sẽ biết khi bắt đầu lượt thi. */
  isProctored: boolean | null;
}

function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString('vi-VN') : 'Không giới hạn';
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Text style={{ width: 110, color: COLORS.inkMuted, fontWeight: '600', fontSize: 13 }}>{label}</Text>
      <Text style={{ flex: 1, color: COLORS.ink, fontWeight: '600', fontSize: 13 }}>{value}</Text>
    </View>
  );
}

/** Trang giới thiệu bài thi trước khi bắt đầu — cổng từ trang "landing" của `fe/app/(student)/exam/[quizId]/page.tsx`:
 * thông tin bài thi, cảnh báo giám sát, điểm cao nhất + lịch sử, và nút bắt đầu/tiếp tục (hoặc lý do không làm được). */
export function ExamIntro({
  quizId,
  info,
  history,
  starting,
  permissionError,
  onStart,
}: {
  quizId: number;
  info: ExamInfo;
  history: QuizAttemptHistoryItem[] | undefined;
  starting: boolean;
  permissionError: string | null;
  onStart: () => void;
}) {
  const completed = (history ?? []).filter((h) => h.status !== 'IN_PROGRESS');
  const ongoing = (history ?? []).some((h) => h.status === 'IN_PROGRESS');
  const highest = completed.length > 0 ? completed.reduce((a, b) => (b.score > a.score ? b : a)) : null;
  const [now] = useState(() => Date.now());
  const notOpenYet = info.startTime ? now < new Date(info.startTime).getTime() : false;
  const closed = info.endTime ? now > new Date(info.endTime).getTime() : false;
  const archived = (history ?? []).some((h) => h.isArchived);
  const canStartNew = !info.maxAttempts || info.maxAttempts <= 0 || completed.length < info.maxAttempts;

  let blocked: string | null = null;
  if (!ongoing) {
    if (notOpenYet) blocked = 'Bài thi chưa mở. Vui lòng quay lại sau.';
    else if (closed) blocked = 'Bài thi đã đóng. Bạn không thể làm bài nữa.';
    else if (archived) blocked = 'Bài thi này đã bị giảng viên thu hồi hoặc xóa.';
    else if (!canStartNew) blocked = `Đã hết số lượt làm bài (${completed.length}/${info.maxAttempts})`;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.surface }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View style={{ backgroundColor: COLORS.surfaceRaised, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.lineSoft, backgroundColor: COLORS.tint }}>
          <View style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Timer size={24} color={COLORS.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.inkMuted, letterSpacing: 0.5 }}>
              TRẮC NGHIỆM{info.isProctored ? ' · CÓ GIÁM SÁT CAMERA' : ''}
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.ink }}>{info.title}</Text>
          </View>
        </View>

        <View style={{ padding: 16, gap: 10 }}>
          <Info label="Mở bài" value={fmt(info.startTime)} />
          <Info label="Đóng bài" value={fmt(info.endTime)} />
          <Info label="Số câu" value={info.questionCount ? `${info.questionCount} câu` : '—'} />
          <Info label="Thời gian" value={info.durationMinutes ? `${info.durationMinutes} phút` : 'Không giới hạn'} />
          <Info label="Số lượt làm" value={info.maxAttempts ? `${info.maxAttempts} lần (đã làm ${completed.length})` : `Không giới hạn (đã làm ${completed.length})`} />
        </View>

        {info.isProctored ? (
          <View style={{ margin: 16, marginTop: 0, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.dangerOnNight, backgroundColor: COLORS.dangerTint, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ShieldAlert size={18} color={COLORS.danger} />
              <Text style={{ fontWeight: '800', color: COLORS.danger }}>Bài thi có giám sát</Text>
            </View>
            <Text style={{ color: COLORS.dangerInk, fontSize: 12.5, lineHeight: 19 }}>
              • Cần bật Camera và Micro: hệ thống quay video suốt bài thi và chụp ảnh ngẫu nhiên để AI kiểm tra.{'\n'}
              • Không rời khỏi ứng dụng, không chuyển sang ứng dụng khác trong lúc làm bài.{'\n'}
              • Chỉ một người trong khung hình, nhìn vào màn hình.{'\n'}
              • Vi phạm quá số lần cho phép, bài thi sẽ tự động được nộp.
            </Text>
          </View>
        ) : null}
      </View>

      {highest ? (
        <View style={{ backgroundColor: COLORS.successTint, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', color: COLORS.successInk }}>Điểm chính thức của bạn</Text>
            <Text style={{ color: COLORS.successInk, fontSize: 12 }}>Hệ thống ghi nhận điểm cao nhất trong các lần thi.</Text>
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: COLORS.successInk }}>{highest.score.toFixed(1)}</Text>
        </View>
      ) : null}

      {completed.length > 0 ? (
        <Pressable onPress={() => router.push(`/exam/${quizId}/history` as Href)} style={{ borderWidth: 1, borderColor: COLORS.accent, borderRadius: 10, padding: 12, alignItems: 'center' }}>
          <Text style={{ color: COLORS.accentDark, fontWeight: '700' }}>Xem lịch sử {completed.length} lần làm bài</Text>
        </Pressable>
      ) : null}

      {permissionError ? <Text style={{ color: COLORS.danger, fontSize: 13 }}>{permissionError}</Text> : null}

      {blocked ? (
        <View style={{ backgroundColor: COLORS.lineSoft, borderRadius: 10, padding: 14, alignItems: 'center' }}>
          <Text style={{ color: COLORS.inkMuted, fontWeight: '600', textAlign: 'center' }}>{blocked}</Text>
        </View>
      ) : (
        <Pressable onPress={onStart} disabled={starting} style={{ backgroundColor: COLORS.accent, borderRadius: 10, padding: 15, alignItems: 'center', opacity: starting ? 0.6 : 1 }}>
          <Text style={{ color: COLORS.white, fontWeight: '800', fontSize: 15 }}>
            {starting ? 'Đang chuẩn bị...' : ongoing ? 'Tiếp tục làm bài' : info.isProctored ? 'Bật Camera & Bắt đầu thi' : 'Bắt đầu làm bài'}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
