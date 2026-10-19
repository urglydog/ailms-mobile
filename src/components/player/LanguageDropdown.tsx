import { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { ChevronDown, Search } from 'lucide-react-native';
import type { LessonLanguage } from '@/types/lesson';
import { COLORS } from '@/lib/theme/colors';

interface LanguageDropdownProps {
  languages: LessonLanguage[];
  activeCode: string | null;
  sourceLanguage: string | null;
  onSelect: (code: string) => void;
}

export function LanguageDropdown({ languages, activeCode, sourceLanguage, onSelect }: LanguageDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  
  const active = languages.find((l) => l.code === activeCode) ?? null;

  const normalizedQuery = query.trim().toLowerCase();
  const filteredLanguages = normalizedQuery
    ? languages.filter(
        (l) => l.label.toLowerCase().includes(normalizedQuery) || l.code.toLowerCase().includes(normalizedQuery),
      )
    : languages;

  const handlePick = (lang: LessonLanguage) => {
    if (lang.code === sourceLanguage) return;
    onSelect(lang.code);
    setOpen(false);
  };

  return (
    <View style={{ zIndex: 50 }}>
      <Pressable
        onPress={() => setOpen(!open)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: COLORS.surface,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: open ? COLORS.accent : COLORS.lineSoft,
        }}
      >
        {active ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text>{active.flag}</Text>
            <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.ink }}>{active.label}</Text>
            {active.available ? (
              <Text style={{ color: COLORS.success, fontSize: 12, fontWeight: '700' }}>✓</Text>
            ) : (
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.star }} />
            )}
          </View>
        ) : (
          <Text style={{ fontSize: 14, color: COLORS.inkFaint }}>Âm thanh gốc</Text>
        )}
        <ChevronDown size={16} color={COLORS.inkFaint} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </Pressable>

      {open && (
        <View style={{
          marginTop: 8,
          backgroundColor: COLORS.white,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: COLORS.lineSoft,
          maxHeight: 280,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.surface }}>
            <Search size={16} color={COLORS.lineDot} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Tìm ngôn ngữ…"
              style={{ flex: 1, marginLeft: 8, fontSize: 14, color: COLORS.ink, padding: 0 }}
            />
          </View>
          <ScrollView style={{ maxHeight: 220 }}>
            {filteredLanguages.length === 0 && (
              <Text style={{ padding: 16, textAlign: 'center', color: COLORS.lineDot, fontSize: 13 }}>Không tìm thấy ngôn ngữ nào</Text>
            )}
            {filteredLanguages.map((lang) => {
              const isSource = lang.code === sourceLanguage;
              const isActive = lang.code === activeCode;
              return (
                <Pressable
                  key={lang.code}
                  onPress={() => handlePick(lang)}
                  disabled={isSource}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: isActive ? COLORS.tint : COLORS.white,
                    opacity: isSource ? 0.5 : 1,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text>{lang.flag}</Text>
                    <Text style={{ fontSize: 14, color: isActive ? COLORS.accent : COLORS.ink, fontWeight: isActive ? '600' : '400' }}>
                      {lang.label} {isSource && <Text style={{ fontSize: 12, color: COLORS.lineDot }}>(gốc)</Text>}
                    </Text>
                  </View>
                  {!isSource && (
                    lang.available ? (
                      <Text style={{ color: COLORS.success, fontSize: 14, fontWeight: '700' }}>✓</Text>
                    ) : (
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.star }} />
                    )
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
