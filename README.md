# LinguaLearn Mobile (App Native cho Học viên)

App native React Native/Expo cho vai trò **Học viên** của LMS — xem roadmap đầy đủ ở
`/var/lms/be/UpComming_Plan.md` (epic "Mobile Native App"). Giảng viên/Admin tiếp tục dùng
web Next.js (`fe`), không có trong app này.

## Cách chạy (workflow chính — Expo Go + tunnel)

Mã nguồn sống trên server (qua SSH) để giữ context làm việc, nhưng **Metro bundler nên chạy
trên máy cá nhân (laptop)**, không chạy trên server Hetzner — server đang căng RAM, chạy thêm
tiến trình dev có thể ảnh hưởng `be`/`ai-worker` production.

1. Trên laptop: `git clone git@github.com:urglydog/ailms-mobile.git && cd ailms-mobile`
2. `npm install`
3. Copy `.env.example` → `.env`, điền `EXPO_PUBLIC_API_URL` (xem comment trong file — điện
   thoại không dùng `localhost` được, cần domain thật hoặc IP LAN/tunnel).
4. `npx expo start` → quét mã QR bằng app **Expo Go** (free, tải từ App Store/Play Store)
   trên điện thoại thật. Không cần Mac, không cần tài khoản Apple Developer trả phí.

## EAS Build (tuỳ chọn, không bắt buộc)

Chỉ cần nếu muốn file `.ipa`/`.apk` độc lập không phụ thuộc Expo Go, hoặc submit lên store —
không cần cho việc phát triển/demo khoá luận. Build cho iPhone thật qua EAS vẫn cần tài khoản
Apple Developer Program ($99/năm); Android thì free hoàn toàn.

## Cấu trúc

- `src/app/` — màn hình, dùng Expo Router (file-based routing, giống App Router Next.js).
- `src/lib/api/client.ts` — client gọi API, port từ `fe/lib/api/client.ts`: cùng pattern
  `api.get/post/put/patch/delete` + tự refresh JWT khi 401/403, chỉ khác chỗ lưu token bằng
  `expo-secure-store` (Keychain/Keystore) thay `localStorage`.
