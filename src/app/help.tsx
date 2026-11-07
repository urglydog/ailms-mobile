import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ChevronDown, ChevronUp, Send } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { BackButton } from '@/components/BackButton';
import { ApiError } from '@/lib/api/client';
import { supportApi } from '@/lib/api/support';
import { usersApi } from '@/lib/api/users';
import { useAuth } from '@/lib/auth/AuthContext';
import { CATEGORY_INFO, FAQS, SUPPORT_CATEGORIES, type SupportCategory } from '@/lib/support/helpContent';
import { COLORS } from '@/lib/theme/colors';
import type { PickedEvidence } from '@/types/dispute';

const MAX_FILES = 3;
const MAX_SIZE_MB = 5;
const SUBJECT_MAX = 200;

const inputStyle = {
  borderWidth: 1,
  borderColor: COLORS.line,
  borderRadius: 8,
  padding: 12,
  backgroundColor: '#fff',
  color: COLORS.ink,
} as const;

interface Topic {
  category: SupportCategory;
  subject?: string;
  hint?: string;
}

function parseCategory(v: string | undefined): SupportCategory | null {
  return SUPPORT_CATEGORIES.find((c) => c === v) ?? null;
}

export default function HelpScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const { isAuthenticated } = useAuth();
  const [selected, setSelected] = useState<SupportCategory | null>(parseCategory(params.category));
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.getMe(),
    enabled: isAuthenticated === true,
  });

  const buildSubject = (category: SupportCategory, issue: string) =>
    `${CATEGORY_INFO[category].title} › ${issue}`.slice(0, SUBJECT_MAX);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <Stack.Screen options={{ headerShown: true, title: 'Trợ giúp & Hỗ trợ', headerLeft: () => <BackButton /> }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: COLORS.inkMuted, fontSize: 14, lineHeight: 21 }}>
          Chọn nhóm vấn đề để xem câu trả lời nhanh. Nếu chưa giải quyết được, gửi yêu cầu để đội ngũ hỗ trợ phản hồi qua email.
        </Text>

        <Text style={{ fontWeight: '700', fontSize: 16, color: COLORS.ink }}>Bạn cần giúp về vấn đề nào?</Text>
        <View style={{ gap: 8 }}>
          {SUPPORT_CATEGORIES.map((id) => (
            <Pressable
              key={id}
              onPress={() => { setSelected(id); setTopic(null); setOpenFaq(null); }}
              style={{
                backgroundColor: selected === id ? COLORS.tint : '#fff',
                borderWidth: 1,
                borderColor: selected === id ? COLORS.accent : COLORS.line,
                borderRadius: 12,
                padding: 12,
              }}
            >
              <Text style={{ fontWeight: '700', color: COLORS.ink }}>{CATEGORY_INFO[id].title}</Text>
              <Text style={{ fontSize: 12, color: COLORS.inkMuted, marginTop: 2 }}>{CATEGORY_INFO[id].desc}</Text>
            </Pressable>
          ))}
        </View>

        {selected ? (
          <View style={{ gap: 8 }}>
            <Text style={{ fontWeight: '700', fontSize: 16, color: COLORS.ink }}>Câu hỏi thường gặp</Text>
            <View style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: COLORS.line }}>
              {FAQS[selected].map((faq, i) => {
                const open = openFaq === faq.q;
                return (
                  <View key={faq.q} style={{ padding: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: COLORS.lineSoft, gap: 8 }}>
                    <Pressable onPress={() => setOpenFaq(open ? null : faq.q)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ flex: 1, fontWeight: '600', color: COLORS.ink }}>{faq.q}</Text>
                      {open ? <ChevronUp size={16} color={COLORS.inkMuted} /> : <ChevronDown size={16} color={COLORS.inkMuted} />}
                    </Pressable>
                    {open ? (
                      <>
                        <Text style={{ color: COLORS.inkMuted, lineHeight: 21 }}>{faq.a}</Text>
                        <Pressable
                          onPress={() => setTopic({ category: selected, subject: buildSubject(selected, faq.q), hint: faq.hint })}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
                        >
                          <Send size={13} color={COLORS.accentDark} />
                          <Text style={{ color: COLORS.accentDark, fontWeight: '700', fontSize: 12 }}>
                            Vấn đề này chưa được giải quyết? Gửi yêu cầu
                          </Text>
                        </Pressable>
                      </>
                    ) : null}
                  </View>
                );
              })}
              <Pressable
                onPress={() => setTopic({ category: selected, subject: buildSubject(selected, 'Vấn đề khác') })}
                style={{ padding: 14, borderTopWidth: 1, borderTopColor: COLORS.lineSoft }}
              >
                <Text style={{ color: COLORS.accentDark, fontWeight: '700', fontSize: 12 }}>Vấn đề khác trong nhóm này</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', fontSize: 16, color: COLORS.ink }}>Vẫn cần hỗ trợ?</Text>
            {topic ? (
              <Pressable onPress={() => setTopic(null)}>
                <Text style={{ color: COLORS.inkMuted, fontWeight: '600' }}>Đóng biểu mẫu</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setTopic({ category: selected ?? 'OTHER' })}
                style={{ backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Gửi yêu cầu hỗ trợ</Text>
              </Pressable>
            )}
          </View>
          {topic ? (
            <TicketForm
              key={`${topic.category}|${topic.subject ?? ''}`}
              initialCategory={topic.category}
              initialEmail={me?.email ?? ''}
              lockedSubject={topic.subject}
              hint={topic.hint}
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function TicketForm({ initialCategory, initialEmail, lockedSubject, hint }: {
  initialCategory: SupportCategory;
  initialEmail: string;
  lockedSubject?: string;
  hint?: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [category, setCategory] = useState<SupportCategory>(initialCategory);
  const [subject, setSubject] = useState(lockedSubject ?? '');
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<PickedEvidence[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  const pickImages = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_FILES - files.length,
      quality: 0.8,
    });
    if (res.canceled) return;
    const next = [...files];
    for (const [i, a] of res.assets.entries()) {
      if (a.fileSize && a.fileSize > MAX_SIZE_MB * 1024 * 1024) {
        Alert.alert('Ảnh quá lớn', `Mỗi ảnh tối đa ${MAX_SIZE_MB}MB.`);
        return;
      }
      next.push({ uri: a.uri, name: a.fileName ?? `image-${next.length + i + 1}.jpg`, mimeType: a.mimeType ?? 'image/jpeg' });
    }
    if (next.length > MAX_FILES) {
      Alert.alert('Quá số lượng', `Chỉ được đính kèm tối đa ${MAX_FILES} ảnh.`);
      return;
    }
    setFiles(next);
  };

  const submit = useMutation({
    mutationFn: () =>
      supportApi.create({ email: email.trim(), category, subject: subject.trim(), message: message.trim() }, files),
    onSuccess: (res) => { setCode(res.code); setError(null); },
    onError: (err: unknown) => setError(err instanceof ApiError ? err.message : 'Không gửi được yêu cầu, vui lòng thử lại.'),
  });

  const valid = /\S+@\S+\.\S+/.test(email) && subject.trim().length > 0 && message.trim().length >= 10;

  if (code) {
    return (
      <View style={{ backgroundColor: COLORS.successTint, borderRadius: 12, padding: 16, gap: 6 }}>
        <Text style={{ fontWeight: '700', color: COLORS.successInk }}>Đã gửi yêu cầu</Text>
        <Text style={{ color: COLORS.ink }}>
          Mã yêu cầu của bạn là {code}. Chúng tôi đã gửi email xác nhận và sẽ phản hồi trong 24-48 giờ. Nếu không thấy email, hãy kiểm tra thư mục Spam.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, padding: 14, gap: 12 }}>
      {error ? (
        <Text style={{ color: COLORS.danger, borderWidth: 1, borderColor: COLORS.danger, borderRadius: 8, padding: 8 }}>{error}</Text>
      ) : null}

      <TextInput
        placeholder="Email nhận phản hồi"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={inputStyle}
      />

      {lockedSubject ? (
        <View style={{ gap: 4 }}>
          <Text style={{ fontWeight: '600', color: COLORS.ink }}>Chủ đề</Text>
          <Text style={{ borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 10, backgroundColor: COLORS.surface, color: COLORS.ink }}>
            {lockedSubject}
          </Text>
        </View>
      ) : (
        <>
          <View style={{ gap: 6 }}>
            <Text style={{ fontWeight: '600', color: COLORS.ink }}>Nhóm vấn đề</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {SUPPORT_CATEGORIES.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: category === c ? COLORS.accent : COLORS.line,
                    backgroundColor: category === c ? COLORS.tint : '#fff',
                  }}
                >
                  <Text style={{ color: COLORS.ink, fontSize: 12 }}>{CATEGORY_INFO[c].title}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <TextInput placeholder="Tiêu đề" value={subject} onChangeText={setSubject} maxLength={200} style={inputStyle} />
        </>
      )}

      <View style={{ gap: 4 }}>
        <TextInput
          placeholder={lockedSubject ? 'Mô tả thêm tình huống của bạn' : 'Mô tả chi tiết (tối thiểu 10 ký tự)'}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={3000}
          style={[inputStyle, { minHeight: 110, textAlignVertical: 'top' }]}
        />
        <Text style={{ fontSize: 12, color: COLORS.inkMuted }}>
          {hint ? `Nên nêu rõ: ${hint}` : 'Mô tả càng rõ, chúng tôi xử lý càng nhanh.'}
        </Text>
      </View>

      <View style={{ gap: 6 }}>
        <Pressable
          disabled={files.length >= MAX_FILES}
          onPress={() => void pickImages()}
          style={{ borderWidth: 1, borderColor: COLORS.accent, borderRadius: 8, padding: 10, alignItems: 'center', opacity: files.length >= MAX_FILES ? 0.5 : 1 }}
        >
          <Text style={{ color: COLORS.accent, fontWeight: '600' }}>
            Đính kèm ảnh (tối đa {MAX_FILES} ảnh, mỗi ảnh {MAX_SIZE_MB}MB)
          </Text>
        </Pressable>
        {files.map((f, i) => (
          <View key={f.uri} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 12, color: COLORS.inkMuted, flex: 1 }} numberOfLines={1}>• {f.name}</Text>
            <Pressable onPress={() => setFiles(files.filter((_, idx) => idx !== i))}>
              <Text style={{ color: COLORS.danger, fontSize: 12 }}>Xóa</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <Pressable
        disabled={!valid || submit.isPending}
        onPress={() => submit.mutate()}
        style={{ backgroundColor: COLORS.accent, borderRadius: 8, padding: 12, alignItems: 'center', opacity: !valid || submit.isPending ? 0.5 : 1 }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>{submit.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}</Text>
      </Pressable>
    </View>
  );
}
