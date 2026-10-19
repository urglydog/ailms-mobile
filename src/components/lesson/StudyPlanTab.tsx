import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { AlertTriangle, CheckCircle2, Clock, Download, Sparkles, Trash2, X } from 'lucide-react-native';
import { router, type Href } from 'expo-router';

import { ApiError } from '@/lib/api/client';
import { studyPlanApi } from '@/lib/api/studyPlan';
import { LockedFeatureNotice } from '@/components/lesson/LockedFeatureNotice';
import { saveAndShareBlob } from '@/lib/files';
import type { StudyDay } from '@/types/lessonPlayer';
import { COLORS } from '@/lib/theme/colors';

interface Props {
  courseId: number;
  enrolled: boolean;
  courseSlug: string;
  /** Để tô "đã học" (tick xanh/gạch ngang) đúng ngữ cảnh khoá học hiện tại — port từ `fe`'s
   * `completedLessonIds`/`allLessons` props (`CourseStudyPlanTab`). */
  completedLessonIds?: number[];
  allLessons?: { lessonId: number; durationSec?: number }[];
}

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function diffCalendarDays(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86_400_000);
}

/** Port từ `fe/components/course/CourseStudyPlanTab.tsx` (12/10/2026, bổ sung đầy đủ — bản
 * trước chỉ có xem/tạo/xoá, thiếu "Cập nhật tiến độ" khi trễ lịch, xuất .ics, tick tiến độ hoàn
 * thành, và ngày mục tiêu bị hardcode +30 ngày không cho chọn). Không có date-picker native nào
 * cài sẵn trong app — dùng `TextInput` dạng `yyyy-MM-dd` thay cho `<input type="date">` của web,
 * tránh thêm dependency mới. */
export function StudyPlanTab({ courseId, enrolled, courseSlug, completedLessonIds = [], allLessons = [] }: Props) {
  const queryClient = useQueryClient();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [targetDate, setTargetDate] = useState(() => toDateInput(addDays(new Date(), 7)));
  const [hoursPerWeek, setHoursPerWeek] = useState('5');
  const [rescheduleTargetDate, setRescheduleTargetDate] = useState('');

  const { data: plan, isLoading } = useQuery({
    queryKey: ['study-plan', courseId],
    queryFn: () => studyPlanApi.getForCourse(courseId),
    enabled: enrolled,
  });

  const generate = useMutation({
    mutationFn: () => studyPlanApi.generate(courseId, { targetDate, hoursPerWeek: Math.max(1, Number(hoursPerWeek) || 5) }),
    onSuccess: (data) => {
      queryClient.setQueryData(['study-plan', courseId], data);
      setShowGenerateModal(false);
    },
  });

  const remove = useMutation({
    mutationFn: () => studyPlanApi.delete(courseId),
    onSuccess: () => queryClient.setQueryData(['study-plan', courseId], null),
  });

  const reschedule = useMutation({
    mutationFn: () => studyPlanApi.reschedule(courseId, rescheduleTargetDate || undefined),
    onSuccess: (data) => {
      queryClient.setQueryData(['study-plan', courseId], data);
      setShowRescheduleModal(false);
      setRescheduleTargetDate('');
    },
  });

  const days = useMemo<StudyDay[]>(() => {
    if (!plan?.planData) return [];
    try {
      return JSON.parse(plan.planData) as StudyDay[];
    } catch {
      return [];
    }
  }, [plan]);

  const hasPlan = days.length > 0;

  const isBehindSchedule = useMemo(() => {
    if (!hasPlan) return false;
    const todayStr = toDateInput(new Date());
    return days.some((day) => day.date < todayStr && day.lessons.some((l) => !completedLessonIds.includes(l.lesson_id)));
  }, [hasPlan, days, completedLessonIds]);

  // Số liệu xem trước cho modal "Cập nhật tiến độ" — khớp `fe`'s khối RESCHEDULE PREVIEW STATS.
  const effectiveTarget = rescheduleTargetDate || plan?.targetDate || '';
  const isValidTarget = !!effectiveTarget && !isNaN(Date.parse(effectiveTarget));
  const uniqueUncompleted = useMemo(() => {
    const seen = new Set<number>();
    return days
      .flatMap((d) => d.lessons)
      .filter((l) => !completedLessonIds.includes(l.lesson_id))
      .filter((l) => (seen.has(l.lesson_id) ? false : (seen.add(l.lesson_id), true)));
  }, [days, completedLessonIds]);
  const totalMinutes = uniqueUncompleted.reduce((s, l) => s + l.duration_minutes, 0);
  const today = startOfDay(new Date());
  const targetStart = isValidTarget ? startOfDay(new Date(effectiveTarget)) : today;
  const isDeadlinePassed = isValidTarget ? targetStart.getTime() < today.getTime() : true;
  const daysRemaining = !isValidTarget || isDeadlinePassed ? 0 : Math.max(1, diffCalendarDays(targetStart, today) + 1);
  const avgMinPerDay = daysRemaining > 0 ? Math.ceil(totalMinutes / daysRemaining) : Infinity;
  const isOverloaded = avgMinPerDay > 120;

  const icsEscape = (text: string) => text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');

  const handleExportIcs = async () => {
    if (!days.length) return;
    const addDaysUtc = (dateStr: string, add: number) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      dt.setUTCDate(dt.getUTCDate() + add);
      return `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, '0')}${String(dt.getUTCDate()).padStart(2, '0')}`;
    };
    const dtstamp = `${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
    let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//LMS//Study Plan//EN\n';
    for (const day of days) {
      if (!day.lessons.length) continue;
      const description = `Mục tiêu: ${icsEscape(day.objective)}\\n\\nBài giảng:\\n${day.lessons.map((l) => `- ${icsEscape(l.title)} (${l.duration_minutes} phút)`).join('\\n')}`;
      ics += 'BEGIN:VEVENT\n';
      ics += `UID:lms-studyplan-${courseId}-${day.date}@lms\n`;
      ics += `DTSTAMP:${dtstamp}\n`;
      ics += `DTSTART;VALUE=DATE:${day.date.replace(/-/g, '')}\n`;
      ics += `DTEND;VALUE=DATE:${addDaysUtc(day.date, 1)}\n`;
      ics += `SUMMARY:Học LMS - ${icsEscape(day.lessons[0]?.title ?? 'Bài học')}...\n`;
      ics += `DESCRIPTION:${description}\n`;
      ics += 'END:VEVENT\n';
    }
    ics += 'END:VCALENDAR';

    try {
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      await saveAndShareBlob(blob, `study-plan-${courseId}.ics`, 'text/calendar');
    } catch {
      Alert.alert('Lỗi', 'Không xuất được file Calendar.');
    }
  };

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

  return (
    <View style={{ padding: 16, gap: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.ink }}>Lộ trình học AI (Cá nhân hóa)</Text>
          <Text style={{ fontSize: 12, color: COLORS.inkFaint, marginTop: 2 }}>
            Được phân bổ tự động bởi AI dựa trên tiến độ và mục tiêu của bạn.
          </Text>
        </View>
        {hasPlan ? (
          <Pressable onPress={() => remove.mutate()} disabled={remove.isPending} hitSlop={8}>
            <Trash2 size={18} color={COLORS.danger} />
          </Pressable>
        ) : null}
      </View>

      {isBehindSchedule ? (
        <View style={{ flexDirection: 'row', gap: 10, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA', borderRadius: 10, padding: 12 }}>
          <Text style={{ fontSize: 18 }}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#9A3412' }}>Bạn đang trễ tiến độ!</Text>
            <Text style={{ fontSize: 12, color: '#C2410C', marginTop: 2 }}>
              Có bài học trong quá khứ chưa hoàn thành. Bấm &quot;Cập nhật tiến độ&quot; để dời các bài chưa học vào lịch còn lại.
            </Text>
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {hasPlan ? (
          <Pressable
            onPress={handleExportIcs}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 }}
          >
            <Download size={15} color={COLORS.ink} />
            <Text style={{ fontSize: 12.5, fontWeight: '600', color: COLORS.ink }}>Xuất Calendar</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => (isBehindSchedule ? setShowRescheduleModal(true) : setShowGenerateModal(true))}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            backgroundColor: isBehindSchedule ? '#F97316' : COLORS.accent, borderRadius: 8, paddingVertical: 10,
          }}
        >
          {isBehindSchedule ? <Clock size={16} color="#fff" /> : <Sparkles size={16} color="#fff" />}
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
            {!hasPlan ? 'Tạo lộ trình ngay' : isBehindSchedule ? 'Cập nhật tiến độ' : 'Điều chỉnh lộ trình'}
          </Text>
        </Pressable>
      </View>

      {!hasPlan ? (
        <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.line, borderRadius: 12, paddingVertical: 28, alignItems: 'center', gap: 8 }}>
          <Sparkles size={28} color={COLORS.accent} />
          <Text style={{ fontWeight: '700', color: COLORS.ink }}>Chưa có lộ trình học nào</Text>
          <Text style={{ fontSize: 12.5, color: COLORS.inkFaint, textAlign: 'center', paddingHorizontal: 20 }}>
            Thiết lập mục tiêu ngày hoàn thành để AI tạo lịch học chi tiết cho từng ngày.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 16, backgroundColor: COLORS.surface, borderRadius: 10, padding: 12 }}>
            <Text style={{ fontSize: 12.5, color: COLORS.ink }}>
              Mục tiêu: <Text style={{ fontWeight: '700' }}>{new Date(plan!.targetDate).toLocaleDateString('vi-VN')}</Text>
            </Text>
            <Text style={{ fontSize: 12.5, color: COLORS.ink }}>
              Cam kết: <Text style={{ fontWeight: '700' }}>{plan!.hoursPerWeek}h/tuần</Text>
            </Text>
          </View>

          <ScrollView style={{ maxHeight: 460 }} nestedScrollEnabled>
            <View style={{ gap: 12 }}>
              {days.map((day) => (
                <View key={day.date} style={{ borderWidth: 1, borderColor: COLORS.lineSoft, borderRadius: 10, padding: 12, gap: 6 }}>
                  <Text style={{ fontWeight: '700', fontSize: 13, color: COLORS.ink }}>
                    {new Date(day.date).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '600', color: COLORS.accent }}>{day.objective}</Text>
                  <View style={{ gap: 6, marginTop: 4 }}>
                    {day.lessons.map((lesson) => {
                      const isCompleted = completedLessonIds.includes(lesson.lesson_id);
                      const real = allLessons.find((l) => l.lessonId === lesson.lesson_id);
                      const hasVideo = !!real?.durationSec && real.durationSec > 0;
                      return (
                        <Pressable
                          key={lesson.lesson_id}
                          onPress={() => router.push(`/lessons/${lesson.lesson_id}` as Href)}
                          style={{
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                            borderWidth: 1, borderRadius: 8, padding: 10,
                            borderColor: isCompleted ? '#BBF7D0' : COLORS.lineSoft,
                            backgroundColor: isCompleted ? '#F0FDF4' : '#fff',
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            {isCompleted ? (
                              <CheckCircle2 size={16} color={COLORS.success} />
                            ) : (
                              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.line }} />
                            )}
                            <Text
                              style={{ fontSize: 12.5, fontWeight: '600', color: COLORS.ink, flex: 1, textDecorationLine: isCompleted ? 'line-through' : 'none', opacity: isCompleted ? 0.7 : 1 }}
                              numberOfLines={2}
                            >
                              {lesson.title}
                            </Text>
                          </View>
                          {hasVideo ? (
                            <Text style={{ fontSize: 10.5, color: COLORS.inkFaint, backgroundColor: COLORS.surface, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
                              {lesson.duration_minutes} phút
                            </Text>
                          ) : (
                            <Text style={{ fontSize: 10, color: COLORS.lineDot, borderWidth: 1, borderColor: COLORS.lineSoft, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 }}>
                              Không có video
                            </Text>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      <Modal visible={showGenerateModal} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={() => setShowGenerateModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.ink }}>Cấu hình lộ trình học AI</Text>
              <Pressable onPress={() => setShowGenerateModal(false)} hitSlop={8}>
                <X size={20} color={COLORS.inkFaint} />
              </Pressable>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: COLORS.ink }}>Ngày hoàn thành dự kiến (yyyy-mm-dd)</Text>
              <TextInput
                value={targetDate}
                onChangeText={setTargetDate}
                placeholder="2026-12-31"
                style={{ borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 10, fontSize: 13.5 }}
              />
              <Text style={{ fontSize: 11, color: COLORS.lineDot }}>Lịch học sẽ được chia đều từ hôm nay đến ngày này.</Text>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: COLORS.ink }}>Thời gian học (giờ/tuần)</Text>
              <TextInput
                value={hoursPerWeek}
                onChangeText={setHoursPerWeek}
                keyboardType="numeric"
                style={{ borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 10, fontSize: 13.5 }}
              />
            </View>

            {generate.error ? (
              <Text style={{ color: COLORS.danger, fontSize: 12 }}>
                {generate.error instanceof ApiError ? generate.error.message : 'Không tạo được lộ trình.'}
              </Text>
            ) : null}

            <Pressable
              disabled={generate.isPending}
              onPress={() => generate.mutate()}
              style={{ backgroundColor: COLORS.accent, borderRadius: 8, padding: 12, alignItems: 'center', opacity: generate.isPending ? 0.6 : 1 }}
            >
              {generate.isPending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Tạo lộ trình</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showRescheduleModal} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={() => setShowRescheduleModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.ink }}>Cập nhật tiến độ</Text>
              <Pressable onPress={() => setShowRescheduleModal(false)} hitSlop={8}>
                <X size={20} color={COLORS.inkFaint} />
              </Pressable>
            </View>

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.surface }}>
                <Text style={{ fontSize: 12.5, color: COLORS.inkFaint }}>Còn lại:</Text>
                <Text style={{ fontSize: 12.5, fontWeight: '600' }}>{uniqueUncompleted.length} bài ({totalMinutes} phút)</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.surface }}>
                <Text style={{ fontSize: 12.5, color: COLORS.inkFaint }}>Đến hạn:</Text>
                <Text style={{ fontSize: 12.5, fontWeight: '600' }}>
                  {isValidTarget ? new Date(effectiveTarget).toLocaleDateString('vi-VN') : '--'} ({daysRemaining} ngày)
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.surface }}>
                <Text style={{ fontSize: 12.5, color: COLORS.inkFaint }}>Tốc độ cần thiết:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '600', color: isOverloaded ? COLORS.danger : COLORS.success }}>
                    ~{avgMinPerDay === Infinity ? '--' : avgMinPerDay} phút/ngày
                  </Text>
                  {isOverloaded ? <AlertTriangle size={14} color={COLORS.danger} /> : <CheckCircle2 size={14} color={COLORS.success} />}
                </View>
              </View>
            </View>

            {isOverloaded || isDeadlinePassed || !isValidTarget ? (
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: COLORS.ink }}>
                  Chọn ngày hoàn thành mới {isDeadlinePassed || !isValidTarget ? '*' : ''}
                </Text>
                <TextInput
                  value={rescheduleTargetDate}
                  onChangeText={setRescheduleTargetDate}
                  placeholder="2026-12-31"
                  style={{ borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 10, fontSize: 13.5 }}
                />
                {isOverloaded && !isDeadlinePassed && isValidTarget ? (
                  <Text style={{ fontSize: 11, color: '#EA580C' }}>Khối lượng bài học quá nặng. Vui lòng dời deadline để giảm tải.</Text>
                ) : null}
                {isDeadlinePassed || !isValidTarget ? (
                  <Text style={{ fontSize: 11, color: COLORS.danger }}>Deadline đã qua hoặc không hợp lệ. Bạn bắt buộc phải chọn ngày mới.</Text>
                ) : null}
              </View>
            ) : null}

            {reschedule.error ? (
              <Text style={{ color: COLORS.danger, fontSize: 12 }}>
                {reschedule.error instanceof ApiError ? reschedule.error.message : 'Có lỗi xảy ra.'}
              </Text>
            ) : null}

            <Pressable
              disabled={reschedule.isPending || !isValidTarget || isDeadlinePassed}
              onPress={() => reschedule.mutate()}
              style={{ backgroundColor: '#F97316', borderRadius: 8, padding: 12, alignItems: 'center', opacity: reschedule.isPending || !isValidTarget || isDeadlinePassed ? 0.5 : 1 }}
            >
              {reschedule.isPending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Xác nhận cập nhật</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
