import type { BundleCourseItem, CourseBundle } from '@/types/courseDetailExtras';

/**
 * Khớp gói combo (Bundle) với nội dung giỏ hàng (29/09/2026).
 *
 * Đây là nguồn tính toán DUY NHẤT dùng chung giữa `cart/page.tsx` và `checkout/cart/page.tsx`
 * — 2 trang phải hiển thị CÙNG 1 giá, và giá đó phải khớp chính xác với
 * `PaymentService.createBatchPayment` (be/src/main/java/com/lms/payment/service/PaymentService.java)
 * để không lệch giữa lúc preview và lúc chốt thanh toán.
 */

export interface MatchedBundle {
  bundle: CourseBundle;
  /** courseId (đang trong giỏ) -> giá cuối cùng sau pro-rated + rounding absorption. */
  pricedCourseIds: Map<number, number>;
  savings: number;
}

export interface PartialSuggestion {
  bundle: CourseBundle;
  missingCourse: BundleCourseItem;
}

export interface CartBundleMatch {
  matchedBundles: MatchedBundle[];
  partialSuggestions: PartialSuggestion[];
  /** courseId -> giá đã áp bundle, gộp từ mọi matchedBundles (tra cứu nhanh cho UI). */
  priceByCartCourseId: Map<number, number>;
  /** courseId -> bundle đang áp cho khóa đó (gắn badge "Gói combo"). */
  bundleByCartCourseId: Map<number, CourseBundle>;
}

interface MatchInput {
  /** Đã sort tăng dần trước khi truyền vào (xem useCartBundleMatches) — không bắt buộc với hàm
   * này nhưng giữ nhất quán với phần rounding absorption cũng sort theo id ASC. */
  cartCourseIds: number[];
  enrolledCourseIds: number[];
  bundles: CourseBundle[];
}

/**
 * Tính giá pro-rated + rounding absorption cho các khóa CỦA 1 BUNDLE đang có trong giỏ — khớp
 * chính xác thuật toán be/src/main/java/com/lms/payment/service/PaymentService.java:219-247:
 * sort theo id ASC, trừ dần từng khóa theo tỉ lệ %, khóa CUỐI CÙNG hấp thụ phần dư làm tròn.
 */
function computeBundlePricing(bundle: CourseBundle, cartCourseIdSet: Set<number>): Map<number, number> {
  const validCourses = bundle.courses
    .filter((c) => cartCourseIdSet.has(c.id))
    .slice()
    .sort((a, b) => a.id - b.id);

  const result = new Map<number, number>();
  if (validCourses.length === 0) return result;

  const originalSum = validCourses.reduce((sum, c) => sum + c.price, 0);
  const discountRatio = bundle.discountPercent / 100;
  const totalDiscount = Math.round(originalSum * discountRatio);
  const finalSum = originalSum - totalDiscount;

  let currentSum = 0;
  validCourses.forEach((c, i) => {
    if (i === validCourses.length - 1) {
      result.set(c.id, finalSum - currentSum);
      return;
    }
    const itemDiscount = Math.round(c.price * discountRatio);
    const finalPrice = c.price - itemDiscount;
    result.set(c.id, finalPrice);
    currentSum += finalPrice;
  });
  return result;
}

export function matchCartBundles({ cartCourseIds, enrolledCourseIds, bundles }: MatchInput): CartBundleMatch {
  const cartSet = new Set(cartCourseIds);
  const ownedSet = new Set(enrolledCourseIds);
  const availableSet = new Set<number>([...cartCourseIds, ...enrolledCourseIds]);

  // Bước A — ứng viên đủ điều kiện: mọi khóa của bundle ⊆ (giỏ ∪ đã sở hữu), VÀ có ít nhất 1
  // khóa thực sự nằm trong giỏ (nếu học viên đã sở hữu hết cả bundle thì không có gì để bán).
  interface Candidate {
    bundle: CourseBundle;
    savings: number;
    cartCourseIdsInBundle: number[];
  }
  const candidates: Candidate[] = [];
  for (const bundle of bundles) {
    if (!bundle.isActive) continue;
    const allAvailable = bundle.courses.every((c) => availableSet.has(c.id));
    const cartCourseIdsInBundle = bundle.courses.filter((c) => cartSet.has(c.id)).map((c) => c.id);
    if (allAvailable && cartCourseIdsInBundle.length > 0) {
      const savings = bundle.courses.reduce((sum, c) => sum + c.price, 0) * (bundle.discountPercent / 100);
      candidates.push({ bundle, savings, cartCourseIdsInBundle });
    }
  }

  // Bước B — greedy chọn tập bundle RỜI NHAU (không khóa nào trong giỏ bị 2 bundle cùng tính
  // tiền): ưu tiên savings cao nhất trước, tie-break theo id tăng dần cho xác định.
  candidates.sort((a, b) => b.savings - a.savings || a.bundle.id - b.bundle.id);
  const claimed = new Set<number>();
  const matchedBundles: MatchedBundle[] = [];
  for (const candidate of candidates) {
    const overlaps = candidate.cartCourseIdsInBundle.some((id) => claimed.has(id));
    if (overlaps) continue;
    candidate.cartCourseIdsInBundle.forEach((id) => claimed.add(id));
    matchedBundles.push({
      bundle: candidate.bundle,
      pricedCourseIds: computeBundlePricing(candidate.bundle, cartSet),
      savings: candidate.savings,
    });
  }

  // Bước C — gợi ý thiếu đúng 1 khóa (bỏ qua bundle đã match, hoặc bundle mà khóa-trong-giỏ của
  // nó đã bị bundle khác "nuốt" mất ở bước B).
  const matchedBundleIds = new Set(matchedBundles.map((m) => m.bundle.id));
  const partialSuggestions: PartialSuggestion[] = [];
  for (const bundle of bundles) {
    if (!bundle.isActive || matchedBundleIds.has(bundle.id)) continue;
    const cartCourseIdsInBundle = bundle.courses.filter((c) => cartSet.has(c.id)).map((c) => c.id);
    if (cartCourseIdsInBundle.length === 0 || cartCourseIdsInBundle.some((id) => claimed.has(id))) continue;
    const missing = bundle.courses.filter((c) => !cartSet.has(c.id) && !ownedSet.has(c.id));
    const [missingCourse] = missing;
    if (missing.length === 1 && missingCourse) {
      partialSuggestions.push({ bundle, missingCourse });
    }
  }

  const priceByCartCourseId = new Map<number, number>();
  const bundleByCartCourseId = new Map<number, CourseBundle>();
  for (const matched of matchedBundles) {
    matched.pricedCourseIds.forEach((price, courseId) => {
      priceByCartCourseId.set(courseId, price);
      bundleByCartCourseId.set(courseId, matched.bundle);
    });
  }

  return { matchedBundles, partialSuggestions, priceByCartCourseId, bundleByCartCourseId };
}
