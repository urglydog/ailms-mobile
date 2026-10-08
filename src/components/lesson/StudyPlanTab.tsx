import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Sparkles, Trash2 } from 'lucide-react-native';

import { ApiError } from '@/lib/api/client';
import { studyPlanApi } from '@/lib/api/studyPlan';
import { LockedFeatureNotice } from '@/components/lesson/LockedFeatureNotice';
import type { StudyDay } from '@/types/lessonPlayer';

/** Port từ `fe/components/course/CourseStudyPlanTab.tsx` — chỉ xem/tạo/xoá. Bỏ "dời lịch"
 * (reschedule) và xuất .ics để giữ scope gọn (xem ghi chú ở `studyPlanApi`). */
export function StudyPlanTab({ courseId, enrolled, courseSlug }: { courseId: number; enrolled: boolean; courseSlug: string }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [hoursPerWeek, setHoursPerWeek] = useState('5');

  const { data: plan, isLoading } = useQuery({
    queryKey: ['study-plan', courseId],
    queryFn: () => studyPlanApi.getForCourse(courseId),
    enabled: enrolled,
  });

  const generate = useMutation({
    mutationFn: () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 30);
      return studyPlanApi.generate(courseId, {
        targetDate: targetDate.toISOString().slice(0, 10),
        hoursPerWeek: Math.max(1, Number(hoursPerWeek) || 5),
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['study-plan', courseId], data);
      setShowForm(false);
    },
  });

  const remove = useMutation({
    mutationFn: () => studyPlanApi.delete(courseId),
    onSuccess: () => queryClient.setQueryData(['study-plan', courseId], null),
  });

  const days = useMemo<StudyDay[]>(() => {
    if (!plan?.planData) return [];
    try {
      return JSON.parse(plan.planData) as StudyDay[];
    } catch {
      return [];
    }
  }, [plan]);

  if (!enrolled) {
    return <LockedFeatureNotice feature="Lộ trình học cá nhân hóa" courseSlug={courseSlug} />;
  }

  if (isLoading) {
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={{ padding: 16, gap: 12 }}>
        {showForm ? (
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 13, color: '#334155' }}>Bạn có thể học bao nhiêu giờ mỗi tuần?</Text>
            <TextInput
              value={hoursPerWeek}
              onChangeText={setHoursPerWeek}
              keyboardType="numeric"
              style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 14 }}
            />
            {generate.error ? (
              <Text style={{ color: '#DC2626', fontSize: 12.5 }}>
                {generate.error instanceof ApiError ? generate.error.message : 'Không tạo được lộ trình.'}
              </Text>
            ) : null}
            <Pressable
              disabled={generate.isPending}
              onPress={() => generate.mutate()}
              style={{ backgroundColor: '#2563EB', borderRadius: 8, padding: 12, alignItems: 'center', opacity: generate.isPending ? 0.6 : 1 }}
            >
              {generate.isPending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Tạo lộ trình</Text>}
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setShowForm(true)}
            style={{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed', borderRadius: 10, padding: 16 }}
          >
            <Sparkles size={18} color="#2563EB" />
            <Text style={{ color: '#2563EB', fontWeight: '700' }}>Tạo lộ trình học bằng AI</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: '#475569' }}>
          Mục tiêu: {new Date(plan.targetDate).toLocaleDateString('vi-VN')} · {plan.hoursPerWeek}h/tuần
        </Text>
        <Pressable onPress={() => remove.mutate()} disabled={remove.isPending} hitSlop={8}>
          <Trash2 size={16} color="#DC2626" />
        </Pressable>
      </View>

      <ScrollView style={{ maxHeight: 420 }} nestedScrollEnabled>
        <View style={{ gap: 10 }}>
          {days.map((day) => (
            <View key={day.date} style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, gap: 4 }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: '#0F172A' }}>
                {new Date(day.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
              </Text>
              <Text style={{ fontSize: 12.5, color: '#64748B' }}>{day.objective}</Text>
              {day.lessons.map((l) => (
                <Text key={l.lesson_id} style={{ fontSize: 12, color: '#334155' }}>
                  • {l.title} ({l.duration_minutes} phút)
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
