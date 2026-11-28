import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, type Href } from 'expo-router';
import { Camera, ShieldAlert, Timer } from 'lucide-react-native';
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

/** Quy định giám sát hiển thị trước khi bắt đầu bài thi có giám sát (cùng nội dung với trang web, có thêm lưu ý riêng cho điện thoại). */
const PROCTOR_RULES = [
  'Giữ nguyên màn hình bài thi suốt thời gian làm bài: không chuyển sang ứng dụng khác, không thoát khỏi ứng dụng.',
  'Khuôn mặt của bạn phải luôn nằm trong khung camera, ở nơi đủ sáng, và không có người khác xuất hiện trong khung hình.',
  'Không chụp, quay hoặc chia sẻ màn hình bài thi. Khi thiết bị hỗ trợ, ứng dụng sẽ ghi nhận hành động này là vi phạm.',
  'Ứng dụng quay camera trong lúc thi để giảng viên xem lại. Video được tải lên sau khi bạn nộp bài (khoảng 20 MB), nên dùng Wi-Fi và giữ ứng dụng mở cho tới khi lưu xong.',
  'Hành vi bất thường mà AI hoặc hệ thống phát hiện sẽ được đánh dấu là vi phạm. Khi số lần vi phạm đạt giới hạn của bài thi, bài làm được tự động nộp và đóng lại.',
  'Một số kiểm tra phụ thuộc vào thiết bị và hệ điều hành. Kiểm tra nào thiết bị không hỗ trợ sẽ không được áp dụng, nhưng các quy định trên vẫn có hiệu lực.',
];

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
/** Có lượt đang làm dở không (đã được xác nhận quy định từ lúc bắt đầu lượt đó). */
function ongoingForConsent(history: QuizAttemptHistoryItem[] | undefined): boolean {
  return (history ?? []).some((h) => h.status === 'IN_PROGRESS');
}

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
  const [camPermission, requestCam] = useCameraPermissions();
  const [checkingCamera, setCheckingCamera] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const completed = (history ?? []).filter((h) => h.status !== 'IN_PROGRESS');
  const ongoing = (history ?? []).some((h) => h.status === 'IN_PROGRESS');
  const highest = completed.length > 0 ? completed.reduce((a, b) => (b.score > a.score ? b : a)) : null;
  const [now] = useState(() => Date.now());
  const notOpenYet = info.startTime ? now < new Date(info.startTime).getTime() : false;
  const closed = info.endTime ? now > new Date(info.endTime).getTime() : false;
  const archived = (history ?? []).some((h) => h.isArchived);
  // Lượt đang làm dở đã được xác nhận quy định từ lúc bắt đầu; chỉ lượt mới cần xác nhận.
  const needsConsent = !!info.isProctored && !ongoingForConsent(history);
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
              Bài thi này được giám sát bằng camera và AI. Vui lòng đọc kỹ các quy định dưới đây trước khi bắt đầu.
            </Text>
            {PROCTOR_RULES.map((rule, i) => (
              <View key={rule} style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ color: COLORS.dangerInk, fontSize: 12.5, fontWeight: '700' }}>{i + 1}.</Text>
                <Text style={{ flex: 1, color: COLORS.dangerInk, fontSize: 12.5, lineHeight: 19 }}>{rule}</Text>
              </View>
            ))}

            <View style={{ marginTop: 6, gap: 8 }}>
              <Pressable
                onPress={async () => {
                  if (!camPermission?.granted) {
                    const res = await requestCam();
                    if (!res.granted) return;
                  }
                  setCheckingCamera((v) => !v);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.danger, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start' }}
              >
                <Camera size={16} color={COLORS.danger} />
                <Text style={{ color: COLORS.danger, fontWeight: '700', fontSize: 13 }}>{checkingCamera ? 'Đóng kiểm tra camera' : 'Kiểm tra camera trước khi thi'}</Text>
              </Pressable>
              {checkingCamera ? (
                <View style={{ gap: 6, alignItems: 'flex-start' }}>
                  <View style={{ width: 150, height: 200, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: COLORS.accent, backgroundColor: COLORS.black }}>
                    <CameraView style={{ flex: 1 }} facing="front" />
                  </View>
                  <Text style={{ color: COLORS.dangerInk, fontSize: 12, lineHeight: 17 }}>
                    Khuôn mặt cần nằm trọn trong khung, đủ sáng, nhìn thẳng vào màn hình. Nếu chưa thấy rõ mặt mình, hãy chỉnh lại góc đặt điện thoại.
                  </Text>
                </View>
              ) : null}
            </View>

            {needsConsent ? (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 6 }}>
                <Switch value={accepted} onValueChange={setAccepted} />
                <Text style={{ flex: 1, color: COLORS.dangerInk, fontSize: 12.5, fontWeight: '700', lineHeight: 19 }}>
                  Tôi đã đọc và đồng ý tuân thủ các quy định giám sát trên.
                </Text>
              </View>
            ) : null}
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
        <Pressable
          onPress={() => {
            setCheckingCamera(false);
            onStart();
          }}
          disabled={starting || (needsConsent && !accepted)}
          style={{ backgroundColor: COLORS.accent, borderRadius: 10, padding: 15, alignItems: 'center', opacity: starting || (needsConsent && !accepted) ? 0.5 : 1 }}
        >
          <Text style={{ color: COLORS.white, fontWeight: '800', fontSize: 15 }}>
            {starting ? 'Đang chuẩn bị...' : ongoing ? 'Tiếp tục làm bài' : info.isProctored ? 'Bật Camera & Bắt đầu thi' : 'Bắt đầu làm bài'}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
