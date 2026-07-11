export interface User {
  id: number;
  uid: string;
  email: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  role: string;
  accountStatus: string;
  createdAt: Date;
  updatedAt: Date;

  // Custom Profile fields
  bio: string | null;
  university: string | null;
  department: string | null;
  semester: string | null;
  timezone: string | null;

  // Appearance settings
  theme: string;
  accentColor: string;
  fontSize: string;
  layoutDensity: string;

  // Notification settings
  notifyStudyReminders: boolean;
  notifyPlannerReminders: boolean;
  notifyAssignmentReminders: boolean;
  notifyAiNotifications: boolean;
  notifyEmailNotifications: boolean;

  // AI settings
  aiDefaultModel: string;
  aiResponseLength: string;
  aiStreaming: boolean;
  aiExplanationStyle: string;
  aiAutoSaveConversations: boolean;

  // Productivity settings
  keyboardShortcutsEnabled: boolean;
  autoSavePreferences: boolean;
  defaultLandingPage: string;
  languagePreference: string;
}

export type Theme = "light" | "dark" | "sepia" | "forest" | "system";

export interface AuthState {
  user: User | null;
  firebaseUser: any | null;
  loading: boolean;
  token: string | null;
}
