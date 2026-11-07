/** Địa chỉ web LinguaLearn — dùng để mở các trang chưa có bản native (vd phòng xem Live dùng WebRTC)
 * trong trình duyệt. Đổi bằng `EXPO_PUBLIC_WEB_URL`. */
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? 'https://ailms-web-client.vercel.app').replace(/\/$/, '');
