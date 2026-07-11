import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "../features/auth/hooks/use-auth.tsx";

export type Language = "en" | "bn";

interface TranslationDictionary {
  [key: string]: {
    en: string;
    bn: string;
  };
}

const TRANSLATIONS: TranslationDictionary = {
  // Navigation / Shell
  dashboard: { en: "Dashboard", bn: "ড্যাশবোর্ড" },
  subjects: { en: "Subjects", bn: "বিষয়সমূহ" },
  aiWorkspace: { en: "AI Workspace", bn: "এআই ওয়ার্কস্পেস" },
  "ai-assistant": { en: "AI Study Assistant", bn: "এআই স্টাডি অ্যাসিস্ট্যান্ট" },
  notes: { en: "Notes", bn: "নোটসমূহ" },
  documents: { en: "Documents", bn: "ডকুমেন্টস" },
  resources: { en: "Documents", bn: "ডকুমেন্টস" },
  flashcards: { en: "Flashcards", bn: "ফ্ল্যাশকার্ড" },
  quizzes: { en: "Quizzes", bn: "কুইজ" },
  planner: { en: "Planner", bn: "প্ল্যানার" },
  assignments: { en: "Assignments", bn: "অ্যাসাইনমেন্ট" },
  exams: { en: "Exams", bn: "পরীক্ষাসমূহ" },
  analytics: { en: "Analytics", bn: "অ্যানালিটিক্স" },
  settings: { en: "Settings", bn: "সেটিংস" },
  profile: { en: "Profile", bn: "প্রোফাইল" },
  logout: { en: "Log Out", bn: "লগ আউট" },
  welcomeBack: { en: "Welcome back", bn: "আপনাকে পুনরায় স্বাগতম" },
  studySmarter: { en: "Study smarter with AI-driven workspaces", bn: "এআই-চালিত ওয়ার্কস্পেসের সাহায্যে স্মার্টলি অধ্যায়ন করুন" },
  core: { en: "core", bn: "প্রধান" },
  academic: { en: "academic", bn: "একাডেমিক" },
  tools: { en: "tools", bn: "টুলস" },
  personal: { en: "personal", bn: "ব্যক্তিগত" },
  quickAdd: { en: "Quick Add", bn: "কুইক অ্যাড" },
  searchCommands: { en: "Search dashboard commands...", bn: "ড্যাশবোর্ড কমান্ড অনুসন্ধান করুন..." },
  studyNotifications: { en: "Study Notifications", bn: "অধ্যয়ন নোটিফিকেশন" },
  readAll: { en: "Read all", bn: "সব পড়ুন" },
  supportHub: { en: "Support Hub", bn: "সহায়তা কেন্দ্র" },
  support: { en: "Support", bn: "সহায়তা" },
  workspace: { en: "Workspace", bn: "ওয়ার্কস্পেস" },
  myProfile: { en: "My Profile", bn: "আমার প্রোফাইল" },
  mySettings: { en: "My Settings", bn: "আমার সেটিংস" },
  studentPioneer: { en: "Student Pioneer", bn: "অগ্রগামী শিক্ষার্থী" },
  genericPageDescPre: { en: "Coordinate curriculum benchmarks, mock datasets, and files for ", bn: "এর জন্য কারিকুলাম বেঞ্চমার্ক, মক ডেটাসেট এবং ফাইলগুলো কোঅর্ডিনেট করুন: " },

  // Settings Titles & Headers
  settingsTitle: { en: "Settings & Personalization", bn: "সেটিংস ও ব্যক্তিগতকরণ" },
  settingsDesc: { en: "Configure interface appearance themes, custom notification gates, AI tutor presets, and workspace security credentials.", bn: "ইন্টারফেসের উপস্থিতি থিম, কাস্টম নোটিফিকেশন গেট, এআই টিউটর প্রিসেট এবং ওয়ার্কস্পেসের নিরাপত্তা সেটিংস কনফিগার করুন।" },
  aestheticCanvas: { en: "Aesthetic Canvas", bn: "নান্দনিক ক্যানভাস" },
  workspaceAppearance: { en: "Workspace Appearance", bn: "ওয়ার্কস্পেসের উপস্থিতি" },
  interfaceTheme: { en: "Interface Theme", bn: "ইন্টারফেস থিম" },
  premiumColorAccent: { en: "Premium Color Accent", bn: "প্রিমিউম কালার অ্যাকসেন্ট" },
  fontSizeScaling: { en: "Font Size Scaling", bn: "ফন্টের আকার পরিবর্তন" },
  fontSmall: { en: "Small", bn: "ছোট" },
  fontMedium: { en: "Medium", bn: "মাঝারি" },
  fontLarge: { en: "Large", bn: "বড়" },
  compactLayout: { en: "Compact Interface Density", bn: "কম্প্যাক্ট ইন্টারফেস ঘনত্ব" },
  compactLayoutDesc: { en: "Reduces spacing and padding for custom high-density data viewing.", bn: "উচ্চ ঘনত্বের ডেটা দেখার জন্য মার্জিন এবং প্যাডিং হ্রাস করুন।" },
  productivityPrefs: { en: "Productivity Preferences", bn: "উৎপাদনশীলতার পছন্দসমূহ" },
  productivityPrefsDesc: { en: "Toggles, shortcuts, auto-save settings, and region settings.", bn: "টগল, শর্টকাট, অটো-সেভ সেটিংস এবং রিজিওনাল সেটিংস।" },
  keyboardShortcuts: { en: "Keyboard Shortcuts", bn: "কীবোর্ড শর্টকাট" },
  keyboardShortcutsDesc: { en: "Enable global hotkeys to summon AI quick command panels.", bn: "এআই কুইক কমান্ড প্যানেল চালু করতে গ্লোবাল হটকি সক্রিয় করুন।" },
  autoSave: { en: "Auto-Save Preferences", bn: "অটো-সেভ সেটিংস" },
  autoSaveDesc: { en: "Automatically commits changes to PostgreSQL on blur/timeout.", bn: "ব্লার বা টাইমআউটে স্বয়ংক্রিয়ভাবে ডেটাবেজে পরিবর্তনসমূহ সংরক্ষণ করুন।" },
  landingPage: { en: "Default Landing Page", bn: "ডিফল্ট ল্যান্ডিং পেজ" },
  languageLoc: { en: "Language / Localization", bn: "ভাষা এবং অনুবাদ" },
  chooseLang: { en: "Choose your primary workspace language:", bn: "আপনার মূল ওয়ার্কস্পেস ভাষা নির্বাচন করুন:" },

  // Notification Gateway Section
  notificationGateway: { en: "Notification Gateway", bn: "নোটিফিকেশন গেটওয়ে" },
  notificationGateDesc: { en: "Configure real-time hooks, browser notifications, and sound effects.", bn: "রিয়েল-টাইম হুক, ব্রাউজার নোটিফিকেশন এবং সাউন্ড ইফেক্ট কনফিগার করুন।" },
  studyReminders: { en: "Study Reminders", bn: "অধ্যায়নের অনুস্মারক" },
  studyRemindersDesc: { en: "Get daily nudge cues for scheduled goals.", bn: "পরিকল্পিত লক্ষ্যের জন্য দৈনিক অনুস্মারক বা সংকেত পান।" },
  aiCognitiveAlerts: { en: "AI Cognitive Tuning Alerts", bn: "এআই কগনিটিভ টিউনিং অ্যালার্ট" },
  aiCognitiveAlertsDesc: { en: "Get notifications when the AI model refines its behavior.", bn: "এআই মডেল যখন তার আচরণ পরিমার্জন করে তখন বিজ্ঞপ্তি পান।" },
  browserNotif: { en: "Browser Push Notifications", bn: "ব্রাউজার পুশ নোটিফিকেশন" },
  browserNotifDesc: { en: "Deliver high-priority alerts even when tab is idle.", bn: "ট্যাবটি নিষ্ক্রিয় থাকলেও উচ্চ-অগ্রাধিকারের সতর্কতা বার্তা পান।" },
  soundEffects: { en: "Sound Effects & Audio Cues", bn: "সাউন্ড ইফেক্ট এবং অডিও সংকেত" },
  soundEffectsDesc: { en: "Play premium micro-tones upon completing study tasks.", bn: "পড়ার কাজ শেষ হলে প্রিমিয়াম মাইক্রো-টোন প্লে করুন।" },

  // AI Cognitive Tuning Section
  aiCognitiveTitle: { en: "AI Cognitive Tuning", bn: "এআই কগনিটিভ টিউনিং" },
  aiCognitiveDesc: { en: "Adjust parameters of your local server-side Gemini intelligence models.", bn: "আপনার লোকাল সার্ভার-সাইড জেমিনি ইন্টেলিজেন্স মডেলের প্যারামিটার সামঞ্জস্য করুন।" },
  aiCreativity: { en: "AI Response Creativity (Temperature)", bn: "এআই রেসপন্স ক্রিয়েটিভিটি (টেম্পারেচার)" },
  aiCreativityBalanced: { en: "Balanced & Precise", bn: "ভারসাম্যপূর্ণ ও সুনির্দিষ্ট" },
  aiCreativityCreative: { en: "Creative & Conceptual", bn: "সৃজনশীল ও ধারণাগত" },
  aiCreativityStrict: { en: "Strict & Analytical", bn: "কঠোর ও বিশ্লেষণাত্মক" },
  tutorPersona: { en: "Tutor Cognitive Persona", bn: "টিউটর কগনিটিভ ব্যক্তিত্ব" },
  personaSocratic: { en: "Socratic Method (Ask questions to guide you)", bn: "সক্রেটিক পদ্ধতি (আপনাকে গাইড করতে প্রশ্ন জিজ্ঞাসা করবে)" },
  personaDirect: { en: "Direct Explanations (Clear, dense summarizations)", bn: "সরাসরি ব্যাখ্যা (স্পষ্ট, সংক্ষিপ্ত ও ঘন সারসংক্ষেপ)" },
  personaHumorous: { en: "Supportive Coach (Highly encouraging, motivating)", bn: "সহায়ক কোচ (অত্যন্ত উৎসাহব্যঞ্জক এবং অনুপ্রেরণামূলক)" },
  retentionEngine: { en: "Memory Retention Engine", bn: "মেমোরি রিটেনশন ইঞ্জিন" },
  retentionSpaced: { en: "Spaced Repetition priority prompts", bn: "স্পেসড রিপিটিশন অগ্রাধিকার প্রম্পট" },
  retentionSummaries: { en: "Automated synthesis summaries after conversations", bn: "কথোপকথনের পর স্বয়ংক্রিয় সংশ্লেষণ সারসংক্ষেপ" },

  // Advanced Security & Accounts Section
  securityTitle: { en: "Advanced Security & User Account Directory", bn: "উন্নত নিরাপত্তা এবং ব্যবহারকারী অ্যাকাউন্ট ডিরেক্টরি" },
  securityDesc: { en: "Manage active Firebase auth sessions, PostgreSQL sync, and danger zone protocols.", bn: "সক্রিয় ফায়ারবেস অথ সেশন, পোস্টগ্রেসকিউএল সিঙ্ক এবং ডেঞ্জার জোন প্রোটোকল পরিচালনা করুন।" },
  connectedIdentity: { en: "Connected Google Identity", bn: "সংযুক্ত গুগল আইডি" },
  synchronized: { en: "Synchronized", bn: "সিঙ্ক করা হয়েছে" },
  activeDeviceSession: { en: "Active Device Session", bn: "সক্রিয় ডিভাইস সেশন" },
  currentDevice: { en: "Current Device", bn: "বর্তমান ডিভাইস" },
  onboardingStatus: { en: "Onboarding Status", bn: "অনবোর্ডিং অবস্থা" },
  completed: { en: "Completed", bn: "সম্পন্ন" },
  notStarted: { en: "Not Started", bn: "শুরু হয়নি" },
  operationalTesting: { en: "Operational Testing & Synchrony Verification", bn: "অপারেশনাল টেস্টিং এবং সিঙ্ক ভেরিফিকেশন" },
  forceSync: { en: "Force DB Sync Handshake", bn: "ডিবি সিঙ্ক হ্যান্ডশেক জোরপূর্বক করুন" },
  updateOnboarding: { en: "Update Onboarding State", bn: "অনবোর্ডিং অবস্থা আপডেট করুন" },
  dangerZone: { en: "Danger Zone Protocols", bn: "ডেঞ্জার জোন প্রোটোকল" },
  revokeDevices: { en: "Revoke All Other Devices", bn: "অন্যান্য সকল ডিভাইস অ্যাক্সেস বাতিল করুন" },
  deleteAccount: { en: "Permanently Delete Workspace", bn: "ওয়ার্কস্পেস স্থায়ীভাবে মুছে ফেলুন" },

  // Documents Academic Storage Section
  academicStorage: { en: "Academic Storage Quota", bn: "একাডেমিক স্টোরেজ কোটা" },
  usedOf: { en: "used of", bn: "ব্যবহৃত, মোট" },
  increaseQuota: { en: "Can we increase that? 100 MB is not that much right? Yes, we have upgraded it to 10 GB!", bn: "আমরা কি এটা বাড়াতে পারি? ১০০ এমবি তো খুব বেশি নয়, তাই না? হ্যাঁ, আমরা এটিকে ১০ জিবি-তে উন্নীত করেছি!" },
  
  // Flashcards UI
  flashcardsTitle: { en: "Dynamic Flashcards", bn: "ডাইনামিক ফ্ল্যাশকার্ড" },
  studySet: { en: "Study Set", bn: "স্টাডি সেট" },
  createCard: { en: "Create Flashcard", bn: "ফ্ল্যাশকার্ড তৈরি করুন" },
  frontSide: { en: "Front Side", bn: "সামনের অংশ" },
  backSide: { en: "Back Side", bn: "পেছনের অংশ" },
  flip: { en: "Flip Card", bn: "কার্ড উল্টান" },
  next: { en: "Next", bn: "পরবর্তী" },
  previous: { en: "Previous", bn: "পূর্ববর্তী" },
  
  // Analytics UI
  analyticsTitle: { en: "Study Progress Analytics", bn: "অধ্যয়ন অগ্রগতি বিশ্লেষণ" },
  weeklyStudyTime: { en: "Weekly Study Time (Hours)", bn: "সাপ্তাহিক অধ্যয়নের সময় (ঘণ্টা)" },
  subjectPerformance: { en: "Subject-wise Performance Score", bn: "বিষয়ভিত্তিক পারফরম্যান্স স্কোর" },
  overallAverage: { en: "Overall Performance Average", bn: "সামগ্রিক গড় পারফরম্যান্স" },
  focusDistribution: { en: "Cognitive Focus Distribution", bn: "কগনিটিভ ফোকাস বন্টন" },
  retentionRate: { en: "Memory Retention Index", bn: "স্মৃতি ধরে রাখার সূচক" },
  activeDaysStreak: { en: "Active Days Streak", bn: "সক্রিয় দিনের ধারাবাহিকতা" },
  daysStreak: { en: "days", bn: "দিন" },
  achievements: { en: "Milestone Achievements", bn: "মাইলফলক অর্জনসমূহ" },

  // General Status & Toast Messages
  successSave: { en: "Settings saved successfully to cloud repository!", bn: "সেটিংস সফলভাবে ক্লাউড রিপোজিটরিতে সংরক্ষণ করা হয়েছে!" },
  errorSave: { en: "Failed to save settings to cloud database.", bn: "ক্লাউড ডেটাবেজে সেটিংস সংরক্ষণ করতে ব্যর্থ হয়েছে।" },
  successOnboarding: { en: "Onboarding state updated and written to DB!", bn: "অনবোর্ডিং অবস্থা সফলভাবে আপডেট এবং ডিবিতে সংরক্ষণ করা হয়েছে!" },
  successRevoke: { en: "All other active device sessions have been expunged successfully!", bn: "অন্যান্য সমস্ত সক্রিয় ডিভাইস সেশন সফলভাবে বাতিল করা হয়েছে!" },
  confirmDeleteTextPrompt: { en: "Type DELETE MY WORKSPACE to confirm:", bn: "নিশ্চিত করতে DELETE MY WORKSPACE লিখুন:" },
  expungeAccount: { en: "Expunge Account Permanently", bn: "স্থায়ীভাবে অ্যাকাউন্ট মুছে ফেলুন" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("ai-study-hub-lang") as Language) || "en";
    }
    return "en";
  });

  // Sync language with authenticated user profile preferred language
  useEffect(() => {
    if (user?.languagePreference) {
      const dbLang = user.languagePreference === "bn" ? "bn" : "en";
      setLanguageState(dbLang);
      localStorage.setItem("ai-study-hub-lang", dbLang);
    }
  }, [user]);

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    localStorage.setItem("ai-study-hub-lang", newLang);
  };

  const t = (key: string): string => {
    const term = TRANSLATIONS[key];
    if (!term) return key;
    return term[language] || term["en"] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
