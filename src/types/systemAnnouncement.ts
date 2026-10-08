export type AnnouncementSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface SystemAnnouncementBanner {
  id: number;
  title: string;
  content: string;
  severity: AnnouncementSeverity;
}
