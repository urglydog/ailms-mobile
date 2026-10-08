import { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { ChevronDown, Search } from 'lucide-react-native';
import type { LessonLanguage } from '@/types/lesson';

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
          backgroundColor: '#F8FAFC',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: open ? '#2563EB' : '#E2E8F0',
        }}
      >
        {active ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text>{active.flag}</Text>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#0F172A' }}>{active.label}</Text>
            {active.available ? (
              <Text style={{ color: '#16A34A', fontSize: 12, fontWeight: '700' }}>✓</Text>
            ) : (
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#F59E0B' }} />
            )}
          </View>
        ) : (
          <Text style={{ fontSize: 14, color: '#64748B' }}>Âm thanh gốc</Text>
        )}
        <ChevronDown size={16} color="#64748B" style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </Pressable>

      {open && (
        <View style={{
          marginTop: 8,
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          maxHeight: 280,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
            <Search size={16} color="#94A3B8" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Tìm ngôn ngữ…"
              style={{ flex: 1, marginLeft: 8, fontSize: 14, color: '#0F172A', padding: 0 }}
            />
          </View>
          <ScrollView style={{ maxHeight: 220 }}>
            {filteredLanguages.length === 0 && (
              <Text style={{ padding: 16, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Không tìm thấy ngôn ngữ nào</Text>
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
                    backgroundColor: isActive ? '#EFF6FF' : '#FFFFFF',
                    opacity: isSource ? 0.5 : 1,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text>{lang.flag}</Text>
                    <Text style={{ fontSize: 14, color: isActive ? '#2563EB' : '#0F172A', fontWeight: isActive ? '600' : '400' }}>
                      {lang.label} {isSource && <Text style={{ fontSize: 12, color: '#94A3B8' }}>(gốc)</Text>}
                    </Text>
                  </View>
                  {!isSource && (
                    lang.available ? (
                      <Text style={{ color: '#16A34A', fontSize: 14, fontWeight: '700' }}>✓</Text>
                    ) : (
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#F59E0B' }} />
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
