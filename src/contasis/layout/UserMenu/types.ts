export interface UserData {
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface UserMenuProps {
  user: UserData;
  theme?: 'light' | 'dark';
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onHelpClick?: () => void;
  onPersonalSettingsClick?: () => void;
  onSwitchAccountClick?: () => void;
  onLogoutClick?: () => void;
}
