import React, { useState, useEffect } from "react";
import { useAuth } from "../../auth/hooks/use-auth.tsx";
import { useTheme, ACCENT_COLORS, FontSize, LayoutDensity } from "../../../hooks/use-theme.tsx";
import { useLanguage } from "../../../hooks/use-language.tsx";
import { useToast } from "../../../components/ui/Toast.tsx";
import { Button } from "../../../components/ui/Button.tsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/Card.tsx";
import { motion, AnimatePresence } from "motion/react";
import {
  Database,
  RefreshCw,
  Edit2,
  Check,
  Bell,
  Eye,
  Sliders,
  ShieldCheck,
  UserCheck,
  Keyboard,
  Languages,
  LayoutGrid,
  Trash2,
  LogOut,
  Sparkles,
  SlidersHorizontal,
  Moon,
  Sun,
  Laptop,
  Coffee,
  Leaf,
  AlertTriangle,
  Globe,
  Clock,
  ShieldAlert
} from "lucide-react";

// Mock Active Sessions representation for Security tab
const INITIAL_SESSIONS = [
  { id: "sess-1", device: "Chrome / Windows 11", ip: "192.168.1.45", location: "San Francisco, USA", current: true, activeSince: "Just now" },
  { id: "sess-2", device: "Safari / iPhone 15", ip: "172.56.21.109", location: "California, USA", current: false, activeSince: "2 days ago" },
  { id: "sess-3", device: "Firefox / macOS Sonoma", ip: "89.201.34.12", location: "London, UK", current: false, activeSince: "5 days ago" }
];

export function SettingsView() {
  const { user, token, syncProfile, updateProfile, deleteAccount, signOutAllDevices, firebaseUser } = useAuth();
  const {
    theme, setTheme,
    accentColor, setAccentColor,
    fontSize, setFontSize,
    layoutDensity, setLayoutDensity
  } = useTheme();
  const { t, language, setLanguage: setGlobalLanguage } = useLanguage();
  const toast = useToast();

  const [profileSyncing, setProfileSyncing] = useState(false);
  const [onboardingProgress, setOnboardingProgress] = useState(false);

  // Appearance & Personalization Settings
  const [activeTheme, setActiveTheme] = useState(theme);
  const [activeAccent, setActiveAccent] = useState(accentColor);
  const [activeFontSize, setActiveFontSize] = useState<FontSize>(fontSize);
  const [activeDensity, setActiveDensity] = useState<LayoutDensity>(layoutDensity);

  // Notification Settings States
  const [notifyStudy, setNotifyStudy] = useState(true);
  const [notifyPlanner, setNotifyPlanner] = useState(true);
  const [notifyAssignment, setNotifyAssignment] = useState(true);
  const [notifyAi, setNotifyAi] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);

  // AI Preferences States
  const [aiModel, setAiModel] = useState("gemini-3.5-flash");
  const [aiLength, setAiLength] = useState("medium");
  const [aiStreaming, setAiStreaming] = useState(true);
  const [aiStyle, setAiStyle] = useState("balanced");
  const [aiAutoSave, setAiAutoSave] = useState(true);

  // Productivity Settings States
  const [shortcuts, setShortcuts] = useState(true);
  const [autoSavePrefs, setAutoSavePrefs] = useState(true);
  const [landingPage, setLandingPage] = useState("dashboard");

  // Security Toggles
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRevokeAllModal, setShowRevokeAllModal] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  const [revoking, setRevoking] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load saved preferences from database once loaded
  useEffect(() => {
    if (user) {
      setNotifyStudy(user.notifyStudyReminders);
      setNotifyPlanner(user.notifyPlannerReminders);
      setNotifyAssignment(user.notifyAssignmentReminders);
      setNotifyAi(user.notifyAiNotifications);
      setNotifyEmail(user.notifyEmailNotifications);

      setAiModel(user.aiDefaultModel || "gemini-3.5-flash");
      setAiLength(user.aiResponseLength || "medium");
      setAiStreaming(user.aiStreaming);
      setAiStyle(user.aiExplanationStyle || "balanced");
      setAiAutoSave(user.aiAutoSaveConversations);

      setShortcuts(user.keyboardShortcutsEnabled);
      setAutoSavePrefs(user.autoSavePreferences);
      setLandingPage(user.defaultLandingPage || "dashboard");
      setGlobalLanguage(user.languagePreference as any || "en");

      // Set global UI theme contexts if they mismatch local state
      setActiveTheme(user.theme as any || theme);
      setActiveAccent(user.accentColor || accentColor);
      setActiveFontSize(user.fontSize as any || fontSize);
      setActiveDensity(user.layoutDensity as any || layoutDensity);
    }
  }, [user]);

  // Unified auto-save triggers
  const triggerPrefUpdate = async (fields: Partial<typeof user>) => {
    if (!autoSavePrefs) return; // Skip if disabled
    try {
      await updateProfile(fields);
      // Success toast is subtle or skipped to prevent toast fatigue
    } catch (err) {
      console.error("Auto-save preference synchronization failed:", err);
    }
  };

  const handleThemeChange = (newTheme: typeof theme) => {
    setTheme(newTheme);
    setActiveTheme(newTheme);
    triggerPrefUpdate({ theme: newTheme });
    toast.success(`Theme preference updated: ${newTheme}`);
  };

  const handleAccentChange = (newAccent: string) => {
    setAccentColor(newAccent);
    setActiveAccent(newAccent);
    triggerPrefUpdate({ accentColor: newAccent });
    toast.success(`Color scheme switched to ${ACCENT_COLORS[newAccent as keyof typeof ACCENT_COLORS]?.name || newAccent}`);
  };

  const handleFontSizeChange = (newSize: FontSize) => {
    setFontSize(newSize);
    setActiveFontSize(newSize);
    triggerPrefUpdate({ fontSize: newSize });
    toast.success(`Text scaling configured to: ${newSize}`);
  };

  const handleDensityChange = (newDensity: LayoutDensity) => {
    setLayoutDensity(newDensity);
    setActiveDensity(newDensity);
    triggerPrefUpdate({ layoutDensity: newDensity });
    toast.success(`Workspace layout spacing is now: ${newDensity}`);
  };

  // Notification Toggles
  const toggleNotify = (key: string, currentVal: boolean, setter: (v: boolean) => void) => {
    const newVal = !currentVal;
    setter(newVal);
    
    // Map key to database user column
    const dbColumnMap: Record<string, string> = {
      study: "notifyStudyReminders",
      planner: "notifyPlannerReminders",
      assignment: "notifyAssignmentReminders",
      ai: "notifyAiNotifications",
      email: "notifyEmailNotifications"
    };

    triggerPrefUpdate({ [dbColumnMap[key]]: newVal });
    toast.success(`Study channel notifications ${newVal ? "enabled" : "disabled"}`);
  };

  // AI Parameter Updates
  const updateAiParam = (key: string, value: any) => {
    const dbColumnMap: Record<string, string> = {
      model: "aiDefaultModel",
      length: "aiResponseLength",
      streaming: "aiStreaming",
      style: "aiExplanationStyle",
      autosave: "aiAutoSaveConversations"
    };

    triggerPrefUpdate({ [dbColumnMap[key]]: value });
    toast.success(`AI assistant tuning updated: ${key} = ${value}`);
  };

  // Productivity Parameter Updates
  const updateProductivityParam = (key: string, value: any) => {
    const dbColumnMap: Record<string, string> = {
      shortcuts: "keyboardShortcutsEnabled",
      autosave: "autoSavePreferences",
      landing: "defaultLandingPage",
      lang: "languagePreference"
    };

    if (key === "lang") {
      setGlobalLanguage(value);
    }

    triggerPrefUpdate({ [dbColumnMap[key]]: value });
    toast.success(key === "lang" ? t("successSave") : t("successOnboarding"));
  };

  // Revoke specific session (Simulated)
  const handleRevokeSession = (id: string) => {
    setSessions(sessions.filter(s => s.id !== id));
    toast.success("Remote security session claims revoked successfully.");
  };

  // Revoke ALL sessions (Durable Cloud API call)
  const handleRevokeAllDevices = async () => {
    setRevoking(true);
    try {
      await signOutAllDevices();
      toast.success("Successfully logged out of all active devices. Signing you out...");
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke active sessions.");
      setRevoking(false);
      setShowRevokeAllModal(false);
    }
  };

  // Confirm permanent account deletion (PostgreSQL cascading + Firebase auth deletion)
  const handleDeleteAccount = async () => {
    if (confirmDeleteText !== "DELETE MY WORKSPACE") {
      toast.error("Please type the confirmation string exactly.");
      return;
    }
    setDeleting(true);
    try {
      await deleteAccount();
      toast.success("Your workspace account has been permanently deleted. Goodbye!");
    } catch (err: any) {
      toast.error(err.message || "Failed to completely wipe account credentials.");
      setDeleting(false);
    }
  };

  // Developer Sync
  const handleForceSync = async () => {
    if (!token) return;
    setProfileSyncing(true);
    try {
      await syncProfile(token);
      toast.success("PostgreSQL user directory synchronized with latest Firebase Auth claims!");
    } catch (err) {
      toast.error("Manual database sync verification failed.");
    } finally {
      setProfileSyncing(false);
    }
  };

  const handleToggleOnboarding = async () => {
    if (!token || !user) return;
    setOnboardingProgress(true);
    try {
      const response = await fetch("/api/auth/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        toast.success("User Onboarding state toggled in Cloud SQL!");
        await syncProfile(token);
      }
    } catch (err) {
      toast.error("Failed to toggle onboarding state.");
    } finally {
      setOnboardingProgress(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 w-full max-w-7xl mx-auto"
    >
      {/* Title */}
      <div className="border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
        <h1 className="text-3xl font-bold tracking-tight font-display bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-white dark:to-slate-300">
          {t("settingsTitle")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("settingsDesc")}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Left column: Appearance & Productivity */}
        <div className="md:col-span-1 space-y-6">
          
          {/* Appearance & Themes */}
          <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-accent-500">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{t("aestheticCanvas")}</span>
              </div>
              <CardTitle className="text-sm font-semibold">{t("workspaceAppearance")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              
              {/* Theme selectors */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800 dark:text-slate-200">{t("interfaceTheme")}</label>
                <div className="grid grid-cols-2 min-[420px]:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-1.5 bg-slate-100/50 dark:bg-slate-950 p-1.5 rounded-lg border border-slate-200/40 dark:border-slate-800/60">
                  {[
                    { mode: "light", icon: Sun, label: "Light" },
                    { mode: "sepia", icon: Coffee, label: "Sepia" },
                    { mode: "forest", icon: Leaf, label: "Forest" },
                    { mode: "dark", icon: Moon, label: "Dark" },
                    { mode: "system", icon: Laptop, label: "System" }
                  ].map(({ mode, icon: Icon, label }) => (
                    <button
                      key={mode}
                      onClick={() => handleThemeChange(mode as any)}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-md transition-all cursor-pointer ${
                        activeTheme === mode
                          ? "bg-accent-600 text-white font-bold shadow-sm"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      <Icon className="h-4 w-4 mb-1" />
                      <span className="text-[10px]">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Colors (5-8 premium colors) */}
              <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                <label className="font-semibold text-slate-800 dark:text-slate-200">{t("premiumColorAccent")}</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {Object.entries(ACCENT_COLORS).map(([key, config]) => {
                    const isSelected = activeAccent === key;
                    return (
                      <button
                        key={key}
                        onClick={() => handleAccentChange(key)}
                        style={{ backgroundColor: config.primary }}
                        title={config.name}
                        className={`h-6.5 w-6.5 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 shadow-sm cursor-pointer ${
                          isSelected 
                            ? "ring-2 ring-offset-2 ring-slate-800 dark:ring-offset-slate-950 scale-105" 
                            : "opacity-85 hover:opacity-100"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 font-bold" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Font Size Scaling */}
              <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                <label className="font-semibold text-slate-800 dark:text-slate-200">{t("fontSizeScaling")}</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-lg border border-slate-200/40 dark:border-slate-800">
                  {[
                    { val: "small", label: t("fontSmall") },
                    { val: "medium", label: t("fontMedium") },
                    { val: "large", label: t("fontLarge") }
                  ].map(({ val, label }) => (
                    <button
                      key={val}
                      onClick={() => handleFontSizeChange(val as FontSize)}
                      className={`text-[10px] capitalize font-medium py-1 rounded-md transition-all cursor-pointer ${
                        activeFontSize === val
                          ? "bg-accent-600 text-white font-bold"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Compact / Comfortable density layout */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 gap-2">
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{t("compactLayout")}</p>
                  <p className="text-slate-400 text-[10px] leading-tight">{t("compactLayoutDesc")}</p>
                </div>
                <button
                  onClick={() => handleDensityChange(activeDensity === "compact" ? "comfortable" : "compact")}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    activeDensity === "compact" ? "bg-accent-600" : "bg-slate-200 dark:bg-slate-800"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      activeDensity === "compact" ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

            </CardContent>
          </Card>

          {/* Productivity settings */}
          <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-accent-500">
                <LayoutGrid className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{t("productivityPrefs")}</span>
              </div>
              <CardTitle className="text-sm font-semibold">{t("productivityPrefsDesc")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              
              {/* Keyboard shortcuts */}
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <Keyboard className="h-3 w-3 text-slate-400" /> {t("keyboardShortcuts")}
                  </p>
                  <p className="text-slate-400 text-[10px] leading-tight">{t("keyboardShortcutsDesc")}</p>
                </div>
                <button
                  onClick={() => {
                    const nextVal = !shortcuts;
                    setShortcuts(nextVal);
                    updateProductivityParam("shortcuts", nextVal);
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    shortcuts ? "bg-accent-600" : "bg-slate-200 dark:bg-slate-800"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      shortcuts ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Auto-save preferences */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 gap-2">
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{t("autoSave")}</p>
                  <p className="text-slate-400 text-[10px] leading-tight">{t("autoSaveDesc")}</p>
                </div>
                <button
                  onClick={() => {
                    const nextVal = !autoSavePrefs;
                    setAutoSavePrefs(nextVal);
                    updateProductivityParam("autosave", nextVal);
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    autoSavePrefs ? "bg-accent-600" : "bg-slate-200 dark:bg-slate-800"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      autoSavePrefs ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Default Landing Page */}
              <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                <label className="font-semibold text-slate-800 dark:text-slate-200">{t("landingPage")}</label>
                <select
                  value={landingPage}
                  onChange={(e) => {
                    setLandingPage(e.target.value);
                    updateProductivityParam("landing", e.target.value);
                  }}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none"
                >
                  <option value="dashboard">{t("dashboard")}</option>
                  <option value="analytics">{t("analytics")}</option>
                  <option value="notes">{t("notes")}</option>
                  <option value="flashcards">{t("flashcards")}</option>
                </select>
              </div>

              {/* Language Preferences */}
              <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Languages className="h-3 w-3 text-slate-400" /> {t("languageLoc")}
                </label>
                <select
                  value={language}
                  onChange={(e) => {
                    updateProductivityParam("lang", e.target.value);
                  }}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none"
                >
                  <option value="en">English (US)</option>
                  <option value="bn">বাংলা (Bengali)</option>
                </select>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Middle/Right Columns: Notifications, AI Engine & Advanced Security */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Notifications Gateway */}
          <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-accent-500">
                <Bell className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{t("notificationGateway")}</span>
              </div>
              <CardTitle className="text-sm font-semibold">{t("notificationGateDesc")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 text-xs">
              
              <div className="space-y-3.5">
                {/* Study Reminders */}
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{t("studyReminders")}</p>
                    <p className="text-slate-400 text-[10px] leading-tight">{t("studyRemindersDesc")}</p>
                  </div>
                  <button
                    onClick={() => toggleNotify("study", notifyStudy, setNotifyStudy)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notifyStudy ? "bg-accent-600" : "bg-slate-200 dark:bg-slate-800"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        notifyStudy ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Planner Reminders */}
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">Planner reminders</p>
                    <p className="text-slate-400 text-[10px] leading-tight">Alert on newly set milestones.</p>
                  </div>
                  <button
                    onClick={() => toggleNotify("planner", notifyPlanner, setNotifyPlanner)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notifyPlanner ? "bg-accent-600" : "bg-slate-200 dark:bg-slate-800"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        notifyPlanner ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Assignment Reminders */}
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">Assignment reminders</p>
                    <p className="text-slate-400 text-[10px] leading-tight">Notify 24 hours prior to homework deadlines.</p>
                  </div>
                  <button
                    onClick={() => toggleNotify("assignment", notifyAssignment, setNotifyAssignment)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notifyAssignment ? "bg-accent-600" : "bg-slate-200 dark:bg-slate-800"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        notifyAssignment ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-3.5 sm:border-l sm:border-slate-100 sm:dark:border-slate-800 sm:pl-4">
                {/* AI Notifications */}
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{t("aiCognitiveAlerts")}</p>
                    <p className="text-slate-400 text-[10px] leading-tight">{t("aiCognitiveAlertsDesc")}</p>
                  </div>
                  <button
                    onClick={() => toggleNotify("ai", notifyAi, setNotifyAi)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notifyAi ? "bg-accent-600" : "bg-slate-200 dark:bg-slate-800"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        notifyAi ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Email Notifications */}
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">Email notifications</p>
                    <p className="text-slate-400 text-[10px] leading-tight">Weekly summaries & workspace reports.</p>
                  </div>
                  <button
                    onClick={() => toggleNotify("email", notifyEmail, setNotifyEmail)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notifyEmail ? "bg-accent-600" : "bg-slate-200 dark:bg-slate-800"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        notifyEmail ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* AI Preferences */}
          <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-accent-500">
                <Sliders className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{t("aiCognitiveTitle")}</span>
              </div>
              <CardTitle className="text-sm font-semibold">{t("aiCognitiveDesc")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Default AI Mode / Model */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-800 dark:text-slate-200">Default AI Model</label>
                  <select
                    value={aiModel}
                    onChange={(e) => {
                      setAiModel(e.target.value);
                      updateAiParam("model", e.target.value);
                    }}
                    className="w-full text-xs px-2.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none"
                  >
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash (Default)</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Heavy Reasoning)</option>
                  </select>
                </div>

                {/* Explanation Style */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-800 dark:text-slate-200">Preferred Explanation Style</label>
                  <select
                    value={aiStyle}
                    onChange={(e) => {
                      setAiStyle(e.target.value);
                      updateAiParam("style", e.target.value);
                    }}
                    className="w-full text-xs px-2.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none"
                  >
                    <option value="balanced">Balanced / Friendly (Default)</option>
                    <option value="conceptual">Conceptual / Analogy-Driven</option>
                    <option value="concise">Concise / Direct Summary</option>
                    <option value="verbose">Detailed / Technical Deep-dive</option>
                    <option value="step-by-step">Socratic / Step-by-Step</option>
                  </select>
                </div>

                {/* Response Length */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-800 dark:text-slate-200">Response Length Limit</label>
                  <select
                    value={aiLength}
                    onChange={(e) => {
                      setAiLength(e.target.value);
                      updateAiParam("length", e.target.value);
                    }}
                    className="w-full text-xs px-2.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none"
                  >
                    <option value="short">Short (~150 words)</option>
                    <option value="medium">Medium (~350 words)</option>
                    <option value="detailed">Detailed (Full summaries)</option>
                  </select>
                </div>

                {/* Streaming toggle */}
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/30 border border-slate-200/30 dark:border-slate-800/60 p-3.5 rounded-lg gap-2">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">Real-time Streaming</p>
                    <p className="text-slate-400 text-[10px] leading-tight">Stream tokens sequentially.</p>
                  </div>
                  <button
                    onClick={() => {
                      const nextVal = !aiStreaming;
                      setAiStreaming(nextVal);
                      updateAiParam("streaming", nextVal);
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      aiStreaming ? "bg-accent-600" : "bg-slate-200 dark:bg-slate-800"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        aiStreaming ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Auto-save conversations toggle */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 gap-2">
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Auto-save study conversations</p>
                  <p className="text-slate-400 text-[10px] leading-tight">Always preserve study chat logs to notes database.</p>
                </div>
                <button
                  onClick={() => {
                    const nextVal = !aiAutoSave;
                    setAiAutoSave(nextVal);
                    updateAiParam("autosave", nextVal);
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    aiAutoSave ? "bg-accent-600" : "bg-slate-200 dark:bg-slate-800"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      aiAutoSave ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

            </CardContent>
          </Card>

          {/* Advanced Security & Accounts */}
          <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-rose-500">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{t("securityTitle")}</span>
              </div>
              <CardTitle className="text-sm font-semibold">{t("securityDesc")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 text-xs">
              
              {/* Connected Auth status */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/30 border border-slate-200/30 dark:border-slate-800/60 rounded-lg gap-2 flex-wrap">
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{t("connectedIdentity")}</p>
                  <p className="text-slate-400 text-[10px] break-all">{firebaseUser?.email}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <Check className="h-3.5 w-3.5" /> {t("synchronized")}
                </span>
              </div>

              {/* Active Sessions list */}
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-700 dark:text-slate-300">{t("activeDeviceSession")}</h4>
                <div className="space-y-2.5">
                  {sessions.map((sess) => (
                    <div key={sess.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-lg gap-3 flex-wrap">
                      <div className="space-y-1 min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                          <span className="truncate">{sess.device}</span>
                          {sess.current && (
                            <span className="bg-accent-100 text-accent-700 dark:bg-accent-950/40 dark:text-accent-400 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded shrink-0">
                              {t("currentDevice")}
                            </span>
                          )}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-400 font-mono">
                          <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {sess.ip}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {sess.activeSince}</span>
                        </div>
                      </div>
                      {!sess.current && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeSession(sess.id)}
                          className="h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger zone actions */}
              <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-4">
                <h4 className="font-semibold text-rose-600 dark:text-rose-400 mb-3 uppercase tracking-wider text-[10px]">{t("dangerZone")}</h4>
                <div className="flex flex-wrap gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRevokeAllModal(true)}
                    className="h-9 text-xs border-rose-200 hover:border-rose-300 hover:bg-rose-50/20 text-rose-600 dark:border-rose-900/30 dark:hover:border-rose-900/50"
                    icon={<LogOut className="h-3.5 w-3.5" />}
                  >
                    {t("revokeDevices")}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteModal(true)}
                    className="h-9 text-xs border-rose-400 hover:border-rose-500 hover:bg-rose-100/10 text-rose-600 dark:border-rose-900/40 dark:hover:bg-rose-900/60"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                  >
                    {t("deleteAccount")}
                  </Button>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Dev PostgreSQL Synchronization Card */}
          <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-emerald-600">
                <Database className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{t("operationalTesting")}</span>
              </div>
              <CardTitle className="text-sm font-semibold">PostgreSQL & Auth Sync Status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2.5 text-xs">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9"
                loading={profileSyncing}
                onClick={handleForceSync}
                icon={<RefreshCw className="h-3.5 w-3.5" />}
              >
                {t("forceSync")}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9"
                loading={onboardingProgress}
                onClick={handleToggleOnboarding}
                icon={<Edit2 className="h-3.5 w-3.5" />}
              >
                {t("updateOnboarding")}
              </Button>
            </CardContent>
          </Card>

        </div>

      </div>

      {/* MODAL: Revoke All Sessions Confirmation */}
      <AnimatePresence>
        {showRevokeAllModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-2 bg-rose-100 dark:bg-rose-950/50 rounded-lg">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">Revoke All Device Tokens</h3>
                  <p className="text-xs text-slate-500">Security Access Revocation</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                You are about to terminate all active sessions, cookies, and tokens associated with this Google Auth uid. You will be signed out from this browser as well. Do you want to proceed?
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRevokeAllModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleRevokeAllDevices}
                  loading={revoking}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Yes, Revoke All Devices
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Permanent Account Deletion Confirmation Flow */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-xl border border-rose-500/30 p-6 max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-2 bg-rose-100 dark:bg-rose-950/50 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">Danger Zone: Delete Account</h3>
                  <p className="text-xs text-rose-500">This operation cannot be undone</p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  Deleting your account will permanently wipe:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1 text-slate-500 font-medium">
                  <li>Your user record in our PostgreSQL database</li>
                  <li>All synced subjects, study tasks, calendars, and schedules</li>
                  <li>All uploaded documents, notes, flashcards, and study scores</li>
                  <li>Your user account claims in Google Firebase Auth directory</li>
                </ul>
                <p className="font-semibold text-rose-600 dark:text-rose-400 pt-1">
                  Type <span className="font-mono bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded border border-rose-200/40">DELETE MY WORKSPACE</span> to confirm:
                </p>
              </div>

              <input
                type="text"
                value={confirmDeleteText}
                onChange={(e) => setConfirmDeleteText(e.target.value)}
                placeholder="DELETE MY WORKSPACE"
                className="w-full rounded-lg border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-rose-600 font-mono uppercase tracking-wider outline-none"
              />

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setConfirmDeleteText("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleDeleteAccount}
                  loading={deleting}
                  disabled={confirmDeleteText !== "DELETE MY WORKSPACE"}
                  className="bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
                >
                  Expunge Account Permanently
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
