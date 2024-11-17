export interface UserSettings {
  emailNotifications?: {
    marketing?: boolean;
    security?: boolean;
    updates?: boolean;
    newsletters?: boolean;
    activitySummary?: boolean;
    mentions?: boolean;
    reminders?: boolean;
  };
  privacy?: {
    profileVisibility?: 'public' | 'private' | 'connections';
    showEmail?: boolean;
    showPhone?: boolean;
    showLocation?: boolean;
    showBirthday?: boolean;
    showSocialLinks?: boolean;
    allowMessagesFrom?: 'everyone' | 'connections' | 'none';
    allowTagging?: boolean;
    searchableByEmail?: boolean;
    searchableByPhone?: boolean;
  };
  security?: {
    twoFactorEnabled?: boolean;
    loginNotifications?: boolean;
    lastPasswordChange?: Date;
    trustedDevices?: Array<{
      id: string;
      deviceName: string;
      browser: string;
      operatingSystem: string;
      lastUsed: Date;
      ipAddress: string;
    }>;
  };
}
