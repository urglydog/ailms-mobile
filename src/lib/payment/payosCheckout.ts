/**
 * Thanh toán PayOS trên mobile — khác hẳn Google OAuth (xem `lib/auth/googleAuth.ts`): trang
 * thanh toán là web thật của PayOS (không redirect ngược về app được/cần thiết), và BE xác
 * nhận giao dịch qua webhook PayOS gọi thẳng, độc lập hoàn toàn với trình duyệt — y hệt cách
 * web hiện tại hoạt động (trang `/payments/callback` bên web cũng chỉ hiển thị, không tự xác
 * nhận gì). Vì vậy mobile chỉ cần mở trình duyệt thường rồi poll kết quả qua `/payments/mine`,
 * không cần cơ chế bounce-back deep link nào.
 */
import * as WebBrowser from 'expo-web-browser';

import { paymentsApi } from '@/lib/api/payments';
import type { CreatePaymentRequest, PaymentRecord } from '@/types/payment';

const POLL_INTERVAL_MS = 3000;
// Payment tự chuyển EXPIRED sau 15 phút không có callback (BR-PAY-03) — không bắt người dùng
// ngồi chờ app lâu vậy, họ có thể tự xem lại "Lịch sử thanh toán" sau nếu bỏ ngang/mạng chậm.
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

export async function purchaseCourseWithPayOs(
  req: Omit<CreatePaymentRequest, 'paymentMethod'>,
): Promise<PaymentRecord> {
  const { paymentUrl, txnRef } = await paymentsApi.create({ ...req, paymentMethod: 'PAYOS' });

  await WebBrowser.openBrowserAsync(paymentUrl);

  return pollPaymentResult(txnRef);
}

export async function purchaseBatchWithPayOs(
  req: Omit<import('@/types/payment').CreateBatchPaymentReq, 'paymentMethod'>,
): Promise<PaymentRecord> {
  const { paymentUrl, txnRef } = await paymentsApi.createBatch({ ...req, paymentMethod: 'PAYOS' });

  await WebBrowser.openBrowserAsync(paymentUrl);

  return pollPaymentResult(txnRef);
}

async function pollPaymentResult(txnRef: string): Promise<PaymentRecord> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const payments = await paymentsApi.listMine();
    const payment = payments.find((p) => p.txnRef === txnRef);
    if (payment && payment.status !== 'PENDING') {
      return payment;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(
    'Chưa nhận được xác nhận thanh toán. Nếu bạn đã thanh toán xong, hãy kiểm tra lại sau ít phút — khoá học sẽ tự xuất hiện trong "Khoá học của tôi".',
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
