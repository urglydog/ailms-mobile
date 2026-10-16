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

/**
 * Lưu + chia sẻ 1 chuỗi text (SVG, JSON...) — KHÔNG đi qua `Blob`/`arrayBuffer()` như
 * `saveAndShareBlob`. `Blob` polyfill của React Native (tạo tay bằng `new Blob([...])`, không
 * đến từ network response) không implement đầy đủ `.arrayBuffer()`, ném lỗi runtime (bug thật:
 * nút "Tải ảnh" của mindmap luôn báo "Không thể lưu sơ đồ"). `File.write()` nhận thẳng string
 * nên không cần Blob ở bước này.
 */
export async function saveAndShareText(content: string, filename: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: mimeType });
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
  file.write(content);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType });
  }
}
