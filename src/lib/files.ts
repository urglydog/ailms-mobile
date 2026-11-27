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

  // `Blob` của React Native không có `.arrayBuffer()` (nên tải chứng chỉ/biên lai PDF luôn báo lỗi) — đọc qua FileReader ra data URL rồi ghi như ảnh.
  await saveAndShareDataUrl(await blobToDataUrl(blob), filename, mimeType);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Không đọc được tệp tải về.')));
    reader.onerror = () => reject(reader.error ?? new Error('Không đọc được tệp tải về.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Lưu + chia sẻ 1 `data:` URL (vd `canvas.toDataURL('image/png')`) — KHÔNG đi qua
 * `Blob`/`arrayBuffer()` như `saveAndShareBlob`. `Blob` polyfill của React Native (tạo tay bằng
 * `new Blob([...])`, không đến từ network response) không implement đầy đủ `.arrayBuffer()`, ném
 * lỗi runtime (bug thật: nút "Tải ảnh" của mindmap luôn báo "Không thể lưu sơ đồ"). Tách phần
 * base64 ra khỏi data URL rồi ghi thẳng bằng `File.writeSync(..., {encoding:'base64'})`.
 */
export async function saveAndShareDataUrl(dataUrl: string, filename: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'web') {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
    return;
  }

  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);

  const dir = new Directory(Paths.cache, 'downloads');
  if (!dir.exists) dir.create({ intermediates: true });

  const file = new File(dir, filename);
  if (file.exists) file.delete();
  file.create();
  file.writeSync(base64, { encoding: 'base64' });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType });
  }
}
