export interface UserPreferences {
  theme?: 'light' | 'dark';
  notifications?: boolean;
  newsletter?: boolean;
  language?: string;
  timezone?: string;
  currency?: string;
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
  weekStart?: 'monday' | 'sunday';
  accessibility?: {
    highContrast?: boolean;
    fontSize?: 'small' | 'medium' | 'large';
    reduceMotion?: boolean;
  };
  display?: {
    compactView?: boolean;
    showAvatar?: boolean;
    listViewPreference?: 'list' | 'grid';
  };
}
