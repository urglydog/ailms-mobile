import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { ShieldAlert, Video } from 'lucide-react-native';
import { quizzesApi } from '@/lib/api/quizzes';

interface Props {
  attemptId: number;
  isStarted: boolean;
  onViolation: (type: string, detail: string) => void;
  onRecordingReady: (fileUri: string, durationSec: number) => void;
}

export function ProctoringCameraView({ attemptId, isStarted, onViolation, onRecordingReady }: Props) {
  const [camPermission, requestCam] = useCameraPermissions();
  const [micPermission, requestMic] = useMicrophonePermissions();
  const cameraRef = useRef<any>(null);
  
  const startTimeRef = useRef<number>(0);
  const isRecordingRef = useRef<boolean>(false);
  
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

  useEffect(() => {
    if (isStarted && camPermission?.granted && micPermission?.granted) {
      startRecording();
    } else if (!isStarted && isRecordingRef.current) {
      stopRecording();
    }
  }, [isStarted, camPermission, micPermission]);

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

  const handleFacesDetected = ({ faces }: any) => {
    if (!isStarted) return;
    if (faces.length === 0) {
      // Too noisy to trigger immediately, but we could throttle this
      // onViolation('NO_FACE', 'Không tìm thấy khuôn mặt học viên');
    } else if (faces.length > 1) {
      onViolation('MULTIPLE_FACES', 'Phát hiện nhiều người trong khung hình');
    }
  };

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
