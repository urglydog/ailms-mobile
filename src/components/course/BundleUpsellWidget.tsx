import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { Gift } from 'lucide-react-native';

import { bundlesApi } from '@/lib/api/bundles';
import type { CourseBundle } from '@/types/courseDetailExtras';

function fmt(amount: number) {
  return amount.toLocaleString('vi-VN') + '₫';
}

/** Port từ `fe/components/bundles/BundleUpsellWidget.tsx` — chỉ hiển thị thông tin gói combo
 * (KHÔNG có nút "thêm vào giỏ", mobile chưa có giỏ hàng/checkout nhiều khoá — mục #6 trong bảng
 * ưu tiên UpComming_Plan.md, chưa được chọn). Gợi ý mua gói qua web để tiết kiệm hơn. */
export function BundleUpsellWidget({ courseId }: { courseId: number }) {
  const { data: bundles, isLoading } = useQuery({
    queryKey: ['bundles', 'course', courseId],
    queryFn: () => bundlesApi.getForCourse(courseId),
  });

  if (isLoading || !bundles || bundles.length === 0) return null;

  return (
    <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0', borderStyle: 'dashed', paddingTop: 14 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' }}>
        💡 Tiết kiệm hơn với gói combo
      </Text>
      {bundles.map((bundle) => (
        <BundleCard key={bundle.id} bundle={bundle} currentCourseId={courseId} />
      ))}
    </View>
  );
}

function BundleCard({ bundle, currentCourseId }: { bundle: CourseBundle; currentCourseId: number }) {
  const otherCourses = bundle.courses.filter((c) => c.id !== currentCourseId);

  return (
    <View style={{ borderWidth: 1, borderColor: '#A5F3FC', borderRadius: 14, backgroundColor: '#ECFEFF', overflow: 'hidden' }}>
      <View style={{ height: 3, backgroundColor: '#06B6D4' }} />
      <View style={{ padding: 14, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0891B2', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Gift size={11} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>-{bundle.discountPercent}%</Text>
          </View>
          <Text style={{ flex: 1, fontWeight: '700', fontSize: 13, color: '#0F172A' }}>{bundle.title}</Text>
        </View>

        {otherCourses.length > 0 ? (
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Đi kèm trong gói:</Text>
            {otherCourses.map((c) => (
              <Text key={c.id} numberOfLines={1} style={{ fontSize: 12, color: '#334155' }}>
                ✓ {c.title}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 10 }}>
          <Text style={{ fontSize: 11.5, color: '#94A3B8', textDecorationLine: 'line-through' }}>{fmt(bundle.originalPrice)}</Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#0E7490' }}>{fmt(bundle.finalPrice)}</Text>
        </View>

        <Text style={{ fontSize: 11, color: '#64748B', textAlign: 'center' }}>Mua gói combo này trên phiên bản web</Text>
      </View>
    </View>
  );
}
