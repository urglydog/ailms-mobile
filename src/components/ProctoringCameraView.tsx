import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { ShieldAlert, Video } from 'lucide-react-native';
import { quizzesApi } from '@/lib/api/quizzes';
import type { ProctorFrameRes } from '@/types/quiz';

export interface ProctoringRecording {
  uri: string;
  durationSec: number;
}

export interface ProctoringHandle {
  /** Dừng ghi hình và trả file video (tối đa ~8s chờ; `null` nếu không có bản ghi). Gọi TRƯỚC khi gỡ camera. */
  finish: () => Promise<ProctoringRecording | null>;
}

interface Props {
  attemptId: number;
  isStarted: boolean;
  onViolation: (type: string, detail: string) => void;
  /** Kết quả BE (Gemini Vision) chấm 1 khung hình chụp định kỳ — nguồn vi phạm hình ảnh được SERVER xác thực. */
  onProctorResult: (res: ProctorFrameRes) => void;
}

/** Random 30-60s giữa 2 lần chụp, giống `fe`'s `scheduleNext` — học viên không thể căn giờ. */
function randomProctorDelayMs(): number {
  return 30_000 + Math.random() * 30_000;
}

/** Rời app dưới ngưỡng này (ms) không tính vi phạm — tránh báo nhầm khi hộp thoại hệ thống/thanh thông báo kéo xuống. */
const MIN_AWAY_MS = 2000;
/** Bỏ qua vi phạm "rời app" trong khoảng đầu mới vào thi (ms): thường là hộp thoại xin quyền/camera khởi động. */
const START_GRACE_MS = 6000;

export const ProctoringCameraView = forwardRef<ProctoringHandle, Props>(function ProctoringCameraView(
  { attemptId, isStarted, onViolation, onProctorResult },
  ref,
) {
  const [camPermission, requestCam] = useCameraPermissions();
  const [micPermission, requestMic] = useMicrophonePermissions();
  const cameraRef = useRef<any>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const startTimeRef = useRef<number>(0);
  const startedAtRef = useRef<number>(Date.now());
  const recordPromiseRef = useRef<Promise<ProctoringRecording | null> | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const proctorFrameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!camPermission?.granted) requestCam();
    if (!micPermission?.granted) requestMic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camPermission?.granted, micPermission?.granted]);

  // "Chuyển tab/rời app": chỉ tính khi RỜI ≥ 2s và đã qua giai đoạn khởi động (thay vì báo ngay mỗi lần app
  // 'inactive' — hộp thoại xin quyền camera/mic cũng làm app 'inactive' nên trước đây vừa vào thi đã báo vi phạm).
  useEffect(() => {
    let leftAt: number | null = null;
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (!isStarted) return;
      if (next !== 'active') {
        if (leftAt === null) leftAt = Date.now();
        return;
      }
      const away = leftAt === null ? 0 : Date.now() - leftAt;
      leftAt = null;
      if (away >= MIN_AWAY_MS && Date.now() - startedAtRef.current > START_GRACE_MS) {
        onViolation('TAB_SWITCH', `Học viên rời khỏi ứng dụng ${Math.round(away / 1000)} giây trong lúc thi`);
      }
    });
    return () => sub.remove();
  }, [isStarted, onViolation]);

  const startRecording = () => {
    if (!cameraRef.current || isRecordingRef.current) return;
    isRecordingRef.current = true;
    startTimeRef.current = Date.now();
    recordPromiseRef.current = (async () => {
      try {
        const video = await cameraRef.current.recordAsync({ maxDuration: 60 * 60 * 2, mute: false });
        isRecordingRef.current = false;
        if (!video?.uri) return null;
        return { uri: video.uri as string, durationSec: Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000)) };
      } catch (err) {
        console.warn('Record error:', err);
        isRecordingRef.current = false;
        return null;
      }
    })();
  };

  useImperativeHandle(ref, () => ({
    finish: async () => {
      const pending = recordPromiseRef.current;
      if (!pending) return null;
      try {
        if (isRecordingRef.current) cameraRef.current?.stopRecording();
      } catch {
        // bỏ qua
      }
      return Promise.race([pending, new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))]);
    },
  }));

  // Chỉ bắt đầu ghi khi camera ĐÃ SẴN SÀNG (trước đây gọi recordAsync ngay lúc có quyền, camera chưa mở nên không quay được).
  useEffect(() => {
    if (isStarted && cameraReady && camPermission?.granted && micPermission?.granted) {
      startRecording();
    }
  }, [isStarted, cameraReady, camPermission?.granted, micPermission?.granted]);

  // Chụp 1 khung hình định kỳ (random 30-60s) gửi BE để Gemini Vision xác thực (face detection on-device không có
  // trong expo-camera managed). CHƯA xác nhận trên thiết bị thật `takePictureAsync()` có làm gián đoạn
  // `recordAsync()` đang quay song song hay không — nếu video bị cắt ngắn, cân nhắc chỉ dựa vào chuỗi frame.
  useEffect(() => {
    if (!isStarted || !cameraReady) {
      if (proctorFrameTimer.current) clearTimeout(proctorFrameTimer.current);
      return;
    }

    const captureAndSend = async () => {
      try {
        if (!cameraRef.current) return;
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
        if (!photo?.base64) return;
        const clientOffsetSec = Math.round((Date.now() - startTimeRef.current) / 1000);
        const res = await quizzesApi.analyzeProctorFrame(attemptId, {
          imageBase64: photo.base64,
          mimeType: 'image/jpeg',
          clientOffsetSec,
        });
        onProctorResult(res);
      } catch (err) {
        console.warn('Proctor frame error:', err);
      }
    };

    const scheduleNext = () => {
      proctorFrameTimer.current = setTimeout(() => {
        captureAndSend().finally(scheduleNext);
      }, randomProctorDelayMs());
    };
    scheduleNext();

    return () => {
      if (proctorFrameTimer.current) clearTimeout(proctorFrameTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStarted, cameraReady, attemptId]);

  if (!camPermission?.granted || !micPermission?.granted) {
    return (
      <View style={styles.container}>
        <ShieldAlert size={24} color="#EF4444" />
        <Text style={styles.text}>Vui lòng cấp quyền Camera và Micro để tiếp tục thi.</Text>
      </View>
    );
  }

  return (
    <View style={styles.cameraWrapper}>
      <CameraView ref={cameraRef} style={styles.camera} facing="front" mode="video" onCameraReady={() => setCameraReady(true)} />
      <View style={styles.badge}>
        <Video size={12} color="#fff" />
        <Text style={styles.badgeText}>REC</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },
  text: {
    color: '#991B1B',
    textAlign: 'center',
    fontSize: 13,
  },
  cameraWrapper: {
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 100,
    borderWidth: 2,
    borderColor: '#3B82F6',
    backgroundColor: '#000',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  camera: {
    flex: 1,
  },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
