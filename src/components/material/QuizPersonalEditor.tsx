import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { CheckCircle2, Plus, Trash2, X } from 'lucide-react-native';

import { ApiError } from '@/lib/api/client';
import { personalQuizApi, type QuizOptionReq } from '@/lib/api/quizzes';
import type { QuizQuestion } from '@/types/material';
import { COLORS } from '@/lib/theme/colors';

interface Props {
  questions: QuizQuestion[];
  quizId: number;
  materialId: number;
}

/** Port từ `fe/components/materials/QuizPersonalEditor.tsx` (12/10/2026) — chỉ hiện ở quiz cá
 * nhân của chính học viên (`!material.isOfficial`, xem `material/[id].tsx`), BE tự chặn server-side
 * nếu cố sửa học liệu Official. Dùng `Modal` built-in của React Native thay cho overlay `<div
 * fixed>` của web — chưa có pattern Modal nào khác trong app để tái dùng. */
export function QuizPersonalEditor({ questions, quizId, materialId }: Props) {
  const queryClient = useQueryClient();
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['material', materialId] });

  const handleSave = async (q: { id: number; content: string; isMultipleChoice: boolean; options: QuizOptionReq[] }) => {
    setSaving(true);
    try {
      const data = { content: q.content, isMultipleChoice: q.isMultipleChoice, options: q.options };
      if (isAdding) {
        await personalQuizApi.addQuestion(quizId, data);
      } else {
        await personalQuizApi.updateQuestion(q.id, data);
      }
      await invalidate();
      setEditingQuestion(null);
      setIsAdding(false);
    } catch (err) {
      Alert.alert('Lỗi', err instanceof ApiError ? err.message : 'Lưu câu hỏi thất bại, thử lại sau.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Xoá câu hỏi', 'Bạn chắc chắn muốn xoá câu hỏi này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            await personalQuizApi.deleteQuestion(id);
            await invalidate();
          } catch (err) {
            Alert.alert('Lỗi', err instanceof ApiError ? err.message : 'Xoá câu hỏi thất bại, thử lại sau.');
          }
        },
      },
    ]);
  };

  const editorTarget = isAdding
    ? { id: 0, content: '', isMultipleChoice: false, options: [{ content: '', isCorrect: true }, { content: '', isCorrect: false }] }
    : editingQuestion
      ? { id: editingQuestion.id, content: editingQuestion.content, isMultipleChoice: false, options: editingQuestion.options.map((o) => ({ id: o.id, content: o.content, isCorrect: o.isCorrect })) }
      : null;

  return (
    <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Pressable
          onPress={() => setIsAdding(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 }}
        >
          <Plus size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Thêm câu hỏi</Text>
        </Pressable>
      </View>

      {questions.map((q, idx) => (
        <View key={q.id} style={{ borderWidth: 1, borderColor: COLORS.lineSoft, borderRadius: 10, padding: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            <Text style={{ flex: 1, fontWeight: '700', fontSize: 13.5, color: COLORS.ink }}>
              <Text style={{ color: COLORS.accent }}>Câu {idx + 1}: </Text>
              {q.content}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => setEditingQuestion(q)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: COLORS.surface }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: COLORS.ink }}>Sửa</Text>
              </Pressable>
              <Pressable onPress={() => handleDelete(q.id)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: '#FEF2F2' }}>
                <Trash2 size={14} color={COLORS.danger} />
              </Pressable>
            </View>
          </View>
          <View style={{ gap: 6 }}>
            {q.options.map((opt) => (
              <View
                key={opt.id}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  borderRadius: 8, borderWidth: 1, padding: 10,
                  borderColor: opt.isCorrect ? '#86EFAC' : COLORS.lineSoft,
                  backgroundColor: opt.isCorrect ? '#F0FDF4' : COLORS.surface,
                }}
              >
                <Text style={{ flex: 1, fontSize: 13, color: opt.isCorrect ? '#15803D' : COLORS.inkMuted, fontWeight: opt.isCorrect ? '700' : '500' }}>
                  {opt.content}
                </Text>
                {opt.isCorrect ? <CheckCircle2 size={16} color={COLORS.success} /> : null}
              </View>
            ))}
          </View>
        </View>
      ))}

      <Modal visible={!!editorTarget} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setEditingQuestion(null); setIsAdding(false); }}>
        {editorTarget ? (
          <QuestionForm
            initial={editorTarget}
            saving={saving}
            onCancel={() => { setEditingQuestion(null); setIsAdding(false); }}
            onSave={handleSave}
          />
        ) : null}
      </Modal>
    </ScrollView>
  );
}

function QuestionForm({
  initial, saving, onCancel, onSave,
}: {
  initial: { id: number; content: string; isMultipleChoice: boolean; options: QuizOptionReq[] };
  saving: boolean;
  onCancel: () => void;
  onSave: (q: { id: number; content: string; isMultipleChoice: boolean; options: QuizOptionReq[] }) => void;
}) {
  const [content, setContent] = useState(initial.content);
  const [isMultipleChoice, setIsMultipleChoice] = useState(initial.isMultipleChoice);
  const [options, setOptions] = useState<QuizOptionReq[]>(initial.options);

  const toggleCorrect = (idx: number) => {
    setOptions((prev) => {
      if (!isMultipleChoice) {
        return prev.map((o, i) => ({ ...o, isCorrect: i === idx }));
      }
      return prev.map((o, i) => (i === idx ? { ...o, isCorrect: !o.isCorrect } : o));
    });
  };

  const canSave = content.trim().length > 0 && options.length >= 2 && options.some((o) => o.isCorrect) && options.every((o) => o.content.trim().length > 0);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.ink }}>{initial.id ? 'Sửa câu hỏi' : 'Thêm câu hỏi'}</Text>
        <Pressable onPress={onCancel} hitSlop={8}>
          <X size={22} color={COLORS.inkFaint} />
        </Pressable>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: COLORS.inkMuted }}>Nội dung câu hỏi</Text>
        <TextInput
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={3}
          style={{ borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 10, fontSize: 13.5, textAlignVertical: 'top', minHeight: 70 }}
        />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.ink }}>Nhiều đáp án đúng</Text>
        <Switch
          value={isMultipleChoice}
          onValueChange={(v) => {
            setIsMultipleChoice(v);
            if (!v) {
              let found = false;
              setOptions((prev) => prev.map((o) => {
                if (o.isCorrect && !found) { found = true; return o; }
                return { ...o, isCorrect: false };
              }));
            }
          }}
        />
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: COLORS.inkMuted }}>Đáp án (chạm vào dấu tick để đánh dấu đúng)</Text>
        {options.map((opt, idx) => (
          <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              onPress={() => toggleCorrect(idx)}
              style={{
                width: 26, height: 26, borderRadius: isMultipleChoice ? 6 : 13, borderWidth: 2,
                borderColor: opt.isCorrect ? COLORS.success : COLORS.lineDot,
                backgroundColor: opt.isCorrect ? COLORS.success : 'transparent',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              {opt.isCorrect ? <CheckCircle2 size={14} color="#fff" /> : null}
            </Pressable>
            <TextInput
              value={opt.content}
              onChangeText={(text) => setOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, content: text } : o)))}
              placeholder={`Đáp án ${idx + 1}`}
              style={{ flex: 1, borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 10, fontSize: 13.5 }}
            />
            <Pressable onPress={() => setOptions((prev) => prev.filter((_, i) => i !== idx))} hitSlop={6}>
              <X size={18} color={COLORS.danger} />
            </Pressable>
          </View>
        ))}
        <Pressable onPress={() => setOptions((prev) => [...prev, { content: '', isCorrect: false }])}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.accent }}>+ Thêm lựa chọn</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingTop: 8 }}>
        <Pressable onPress={onCancel} style={{ paddingVertical: 10, paddingHorizontal: 16 }}>
          <Text style={{ fontWeight: '600', color: COLORS.inkFaint }}>Huỷ bỏ</Text>
        </Pressable>
        <Pressable
          onPress={() => onSave({ id: initial.id, content, isMultipleChoice, options })}
          disabled={!canSave || saving}
          style={{ backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20, opacity: !canSave || saving ? 0.5 : 1 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>{saving ? 'Đang lưu...' : 'Lưu câu hỏi'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
