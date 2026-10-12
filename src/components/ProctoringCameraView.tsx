import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { ShieldAlert, Video } from 'lucide-react-native';
import { quizzesApi } from '@/lib/api/quizzes';
import type { ProctorFrameRes } from '@/types/quiz';

interface Props {
  attemptId: number;
  isStarted: boolean;
  onViolation: (type: string, detail: string) => void;
  onRecordingReady: (fileUri: string, durationSec: number) => void;
  /** Kết quả BE (Gemini Vision) chấm 1 khung hình chụp định kỳ — port từ `fe`'s
   * `analyzeProctorFrame`/`sendProctorFrame`, nguồn vi phạm hình ảnh được SERVER xác thực, khác
   * `onViolation` (chỉ bắt được `TAB_SWITCH` phía client). */
  onProctorResult: (res: ProctorFrameRes) => void;
}

/** Random 30-60s giữa 2 lần chụp, giống `fe`'s `scheduleNext` — học viên không thể căn giờ. */
function randomProctorDelayMs(): number {
  return 30_000 + Math.random() * 30_000;
}

export function ProctoringCameraView({ attemptId, isStarted, onViolation, onRecordingReady, onProctorResult }: Props) {
  const [camPermission, requestCam] = useCameraPermissions();
  const [micPermission, requestMic] = useMicrophonePermissions();
  const cameraRef = useRef<any>(null);

  const startTimeRef = useRef<number>(0);
  const isRecordingRef = useRef<boolean>(false);
  const proctorFrameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!camPermission?.granted) requestCam();
    if (!micPermission?.granted) requestMic();
  }, [camPermission, micPermission]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (isStarted && (nextState === 'background' || nextState === 'inactive')) {
        onViolation('TAB_SWITCH', 'Học viên rời khỏi ứng dụng trong lúc thi');
      }
    });
    return () => sub.remove();
  }, [isStarted, onViolation]);

  const startRecording = async () => {
    if (!cameraRef.current || isRecordingRef.current) return;
    try {
      isRecordingRef.current = true;
      startTimeRef.current = Date.now();
      const video = await cameraRef.current.recordAsync({
        maxDuration: 60 * 60 * 2, // 2 hours max
        mute: false,
      });
      if (video?.uri) {
        const durationSec = Math.round((Date.now() - startTimeRef.current) / 1000);
        onRecordingReady(video.uri, durationSec);
      }
    } catch (err) {
      console.warn('Record error:', err);
      isRecordingRef.current = false;
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecordingRef.current) {
      cameraRef.current.stopRecording();
      isRecordingRef.current = false;
    }
  };

  useEffect(() => {
    if (isStarted && camPermission?.granted && micPermission?.granted) {
      startRecording();
    } else if (!isStarted && isRecordingRef.current) {
      stopRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStarted, camPermission, micPermission]);

  // `expo-camera`'s `CameraView` (managed workflow) không hỗ trợ face detection trực tiếp
  // (`onFacesDetected` không tồn tại trên API hiện tại — khác bản cũ `expo-face-detector` đã bị
  // loại khỏi Expo SDK) — nên NO_FACE/MULTIPLE_FACES/HEAD_TURNED/GAZE_AWAY không thể phát hiện
  // on-device như web (`@vladmandic/face-api`). Thay vào đó, chụp 1 khung hình định kỳ (random
  // 30-60s, giống `fe`'s `scheduleNext`) gửi lên BE để Gemini Vision xác thực — đúng nguồn vi
  // phạm hình ảnh web cũng dùng làm xác thực chính (client face-api chỉ là "cò súng" hiển thị,
  // không phải nguồn xác thực). CHƯA xác nhận trên thiết bị thật `takePictureAsync()` có làm
  // gián đoạn `recordAsync()` đang quay song song hay không — nếu phát hiện video bị cắt ngắn khi
  // chụp frame, cân nhắc bỏ quay video liên tục, chỉ dựa vào chuỗi frame định kỳ.
  useEffect(() => {
    if (!isStarted) {
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
  }, [isStarted, attemptId]);

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
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="front"
        mode="video"
      />
      <View style={styles.badge}>
        <Video size={12} color="#fff" />
        <Text style={styles.badgeText}>REC</Text>
      </View>
    </View>
  );
}

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
