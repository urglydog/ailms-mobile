import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, View, Text } from 'react-native';
import { AlertTriangle, Info, ShieldAlert, X } from 'lucide-react-native';

import { systemAnnouncementsApi } from '@/lib/api/systemAnnouncements';
import type { AnnouncementSeverity } from '@/types/systemAnnouncement';
import { COLORS } from '@/lib/theme/colors';

export function SystemAnnouncementBanner() {
  const { data: banner } = useQuery({
    queryKey: ['system-announcement-banner'],
    queryFn: () => systemAnnouncementsApi.getActiveBanner(),
  });

  // UI v2: cho phép đóng banner trong phiên (thông báo dài chiếm gần 1/5 màn hình đầu trang).
  const [dismissedId, setDismissedId] = useState<string | number | null>(null);

  if (!banner || dismissedId === banner.id) return null;

  const style = getSeverityStyle(banner.severity);

  return (
    <View
      accessibilityRole="alert"
      style={{ backgroundColor: style.bg, marginHorizontal: 16, marginTop: 12, borderRadius: 12, paddingVertical: 10, paddingLeft: 12, paddingRight: 4, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}
    >
      {renderSeverityIcon(banner.severity, style.icon)}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13.5, fontWeight: '700', color: style.text }}>{banner.title}</Text>
        <Text style={{ fontSize: 13, color: style.text, marginTop: 2, lineHeight: 18 }} numberOfLines={2}>{banner.content}</Text>
      </View>
      <Pressable
        onPress={() => setDismissedId(banner.id)}
        accessibilityRole="button"
        accessibilityLabel="Đóng thông báo"
        hitSlop={8}
        style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
      >
        <X size={16} color={style.text} />
      </Pressable>
    </View>
  );
}

function getSeverityStyle(severity: AnnouncementSeverity) {
  switch (severity) {
    case 'HIGH':
      return { bg: COLORS.dangerTint, text: COLORS.dangerInk, icon: COLORS.danger };
    case 'MEDIUM':
      return { bg: COLORS.warningTint, text: COLORS.warningInk, icon: COLORS.warning };
    case 'LOW':
    default:
      return { bg: COLORS.tint, text: COLORS.accent, icon: COLORS.accent };
  }
}

function renderSeverityIcon(severity: AnnouncementSeverity, color: string) {
  const props = { size: 18, color, style: { marginTop: 1 } };
  switch (severity) {
    case 'HIGH':
      return <ShieldAlert {...props} />;
    case 'MEDIUM':
      return <AlertTriangle {...props} />;
    case 'LOW':
    default:
      return <Info {...props} />;
  }
}
