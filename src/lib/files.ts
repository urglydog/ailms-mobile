import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/**
 * Lưu 1 Blob (PDF, ảnh...) xuống cache rồi mở bảng chia sẻ của OS (lưu/in/gửi) — cách chuẩn
 * trên mobile vì không có "tải xuống thư mục Downloads" kiểu trình duyệt desktop.
 * Trên web (`npx expo start --web`) không có Share Sheet native — mở bằng link blob: thay thế.
 */
export async function saveAndShareBlob(blob: Blob, filename: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const dir = new Directory(Paths.cache, 'downloads');
  if (!dir.exists) dir.create({ intermediates: true });

  const file = new File(dir, filename);
  if (file.exists) file.delete();
  file.create();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  file.write(bytes);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType });
  }
}
