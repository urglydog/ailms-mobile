import { useQuery } from '@tanstack/react-query';
import { View, Text } from 'react-native';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react-native';

import { systemAnnouncementsApi } from '@/lib/api/systemAnnouncements';
import type { AnnouncementSeverity } from '@/types/systemAnnouncement';

export function SystemAnnouncementBanner() {
  const { data: banner } = useQuery({
    queryKey: ['system-announcement-banner'],
    queryFn: () => systemAnnouncementsApi.getActiveBanner(),
  });

  if (!banner) return null;

  const style = getSeverityStyle(banner.severity);
  const Icon = getSeverityIcon(banner.severity);

  return (
    <View style={{ backgroundColor: style.bg, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      <Icon size={20} color={style.icon} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: style.text }}>{banner.title}</Text>
        <Text style={{ fontSize: 13, color: style.text, marginTop: 4, lineHeight: 18 }}>{banner.content}</Text>
      </View>
    </View>
  );
}

function getSeverityStyle(severity: AnnouncementSeverity) {
  switch (severity) {
    case 'HIGH':
      return { bg: '#FEF2F2', text: '#991B1B', icon: '#DC2626' };
    case 'MEDIUM':
      return { bg: '#FFFBEB', text: '#92400E', icon: '#D97706' };
    case 'LOW':
    default:
      return { bg: '#EFF6FF', text: '#1E40AF', icon: '#2563EB' };
  }
}

function getSeverityIcon(severity: AnnouncementSeverity) {
  switch (severity) {
    case 'HIGH':
      return ShieldAlert;
    case 'MEDIUM':
      return AlertTriangle;
    case 'LOW':
    default:
      return Info;
  }
}
