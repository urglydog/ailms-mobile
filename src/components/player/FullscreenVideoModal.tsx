import { Modal, StatusBar, View, useWindowDimensions } from 'react-native';
import type { ReactNode } from 'react';

/** Toàn màn hình do app tự vẽ: nội dung (`PlayerSurface` có điều khiển + phụ đề) được đặt trong Modal đen. Giọng lồng
 * tiếng phát ở màn cha (vẫn mounted) nên không mất. App khoá dọc (`orientation: portrait`) nên khi máy đang dọc,
 * khung được xoay 90° để lấp đầy màn hình như xem ngang. */
export function FullscreenVideoModal({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const rotate = height > width;
  const boxW = rotate ? height : width;
  const boxH = rotate ? width : height;
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent supportedOrientations={['portrait', 'landscape']}>
      <StatusBar hidden />
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <View
          style={{
            position: 'absolute',
            width: boxW,
            height: boxH,
            left: (width - boxW) / 2,
            top: (height - boxH) / 2,
            transform: rotate ? [{ rotate: '90deg' }] : [],
            backgroundColor: '#000',
          }}
        >
          {visible ? children : null}
        </View>
      </View>
    </Modal>
  );
}
