import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../auth/hooks/use-auth.tsx";
import { useTheme } from "../../../hooks/use-theme.tsx";
import { useLanguage } from "../../../hooks/use-language.tsx";
import { useToast } from "../../../components/ui/Toast.tsx";
import { Button } from "../../../components/ui/Button.tsx";
import { Dialog } from "../../../components/ui/Dialog.tsx";
import { PageId } from "../../../types/navigation.ts";
const DashboardView = React.lazy(() => import("../pages/DashboardView.tsx").then(module => ({ default: module.DashboardView })));
const ProfileView = React.lazy(() => import("../pages/ProfileView.tsx").then(module => ({ default: module.ProfileView })));
const SettingsView = React.lazy(() => import("../pages/SettingsView.tsx").then(module => ({ default: module.SettingsView })));
const SubjectsView = React.lazy(() => import("../../subjects/pages/SubjectsView.tsx").then(module => ({ default: module.SubjectsView })));
const NotesView = React.lazy(() => import("../../notes/pages/NotesView.tsx").then(module => ({ default: module.NotesView })));
const DocumentsView = React.lazy(() => import("../../documents/pages/DocumentsView.tsx").then(module => ({ default: module.DocumentsView })));
const AIWorkspaceView = React.lazy(() => import("../../ai/pages/AIWorkspaceView.tsx").then(module => ({ default: module.AIWorkspaceView })));
const FlashcardsView = React.lazy(() => import("../../learning/pages/FlashcardsView.tsx").then(module => ({ default: module.FlashcardsView })));
const QuizzesView = React.lazy(() => import("../../learning/pages/QuizzesView.tsx").then(module => ({ default: module.QuizzesView })));
const PlannerView = React.lazy(() => import("../../learning/pages/PlannerView.tsx").then(module => ({ default: module.PlannerView })));
const AssignmentsView = React.lazy(() => import("../../learning/pages/AssignmentsView.tsx").then(module => ({ default: module.AssignmentsView })));
const AnalyticsView = React.lazy(() => import("../pages/AnalyticsView.tsx").then(module => ({ default: module.AnalyticsView })));
const GenericPageView = React.lazy(() => import("../pages/GenericPageView.tsx").then(module => ({ default: module.GenericPageView })));
import { SupportAICoPilot } from "./SupportAICoPilot.tsx";


import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  LayoutGrid,
  BookOpen,
  FileText,
  BrainCircuit,
  Layers,
  HelpCircle,
  CheckSquare,
  Calendar,
  BarChart3,
  FolderOpen,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Search,
  Bell,
  Sun,
  Moon,
  Laptop,
  Power,
  Command,
  Plus,
  HelpCircle as SupportIcon,
  MessageSquare,
  Check,
  RefreshCw,
  Coffee,
  Leaf
} from "lucide-react";

interface SaaSShellProps {
  onLogout: () => void;
}

interface SidebarItem {
  id: PageId;
  label: string;
  icon: React.ComponentType<any>;
  category: "core" | "academic" | "tools" | "personal";
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid, category: "core" },
  { id: "subjects", label: "Subjects", icon: BookOpen, category: "academic" },
  { id: "notes", label: "Notes", icon: FileText, category: "academic" },
  { id: "ai-assistant", label: "AI Study Assistant", icon: BrainCircuit, category: "tools" },
  { id: "flashcards", label: "Flashcards", icon: Layers, category: "tools" },
  { id: "quizzes", label: "Quizzes", icon: HelpCircle, category: "tools" },
  { id: "assignments", label: "Assignments", icon: CheckSquare, category: "academic" },
  { id: "planner", label: "Study Planner", icon: Calendar, category: "academic" },
  { id: "analytics", label: "Analytics", icon: BarChart3, category: "personal" },
  { id: "resources", label: "Documents", icon: FolderOpen, category: "personal" },
  { id: "settings", label: "Settings", icon: Settings, category: "personal" },
  { id: "profile", label: "Profile", icon: User, category: "personal" }
];

export function SaaSShell({ onLogout }: SaaSShellProps) {
  const { firebaseUser, user, token } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const toast = useToast();

  // Core navigation state
  const [activeTab, setActiveTab] = useState<PageId>("dashboard");

  // Keep hash and activeTab in sync
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || "";
      if (!hash) return;
      const path = hash.replace("#", "").replace(/\/$/, "");
      
      if (path === "/dashboard") setActiveTab("dashboard");
      else if (path.includes("/quizzes")) setActiveTab("quizzes");
      else if (path.includes("/flashcards")) setActiveTab("flashcards");
      else if (path.includes("/planner")) setActiveTab("planner");
      else if (path.includes("/subjects")) setActiveTab("subjects");
      else if (path.includes("/notes")) setActiveTab("notes");
      else if (path.includes("/chatbot") || path.includes("/ai-assistant")) setActiveTab("ai-assistant");
      else if (path.includes("/documents") || path.includes("/resources")) setActiveTab("resources");
      else if (path.includes("/assignments")) setActiveTab("assignments");
      else if (path.includes("/analytics")) setActiveTab("analytics");
      else if (path.includes("/settings")) setActiveTab("settings");
      else if (path.includes("/profile")) setActiveTab("profile");
    };

    window.addEventListener("hashchange", handleHashChange);
    // Initial check
    if (window.location.hash) {
      handleHashChange();
    }
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Update hash when activeTab changes
  useEffect(() => {
    let hashPath = "/dashboard";
    if (activeTab === "quizzes") hashPath = "/dashboard/learning/quizzes";
    else if (activeTab === "flashcards") hashPath = "/dashboard/learning/flashcards";
    else if (activeTab === "planner") hashPath = "/dashboard/learning/planner";
    else if (activeTab === "subjects") hashPath = "/dashboard/learning/subjects";
    else if (activeTab === "notes") hashPath = "/dashboard/learning/notes";
    else if (activeTab === "ai-assistant") hashPath = "/dashboard/learning/chatbot";
    else if (activeTab === "resources") hashPath = "/dashboard/learning/documents";
    else if (activeTab === "assignments") hashPath = "/dashboard/learning/assignments";
    else if (activeTab === "analytics") hashPath = "/dashboard/learning/analytics";
    else if (activeTab === "settings") hashPath = "/dashboard/learning/settings";
    else if (activeTab === "profile") hashPath = "/dashboard/learning/profile";

    if (window.location.hash !== `#${hashPath}`) {
      window.location.hash = hashPath;
    }
  }, [activeTab]);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Floating menus and keyboard search states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showQuickAction, setShowQuickAction] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // Real Notifications list and index search loading states
  const [notifications, setNotifications] = useState<any[]>([]);
  const notificationsRef = useRef<any[]>([]);
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const [selectedResultIndex, setSelectedResultIndex] = useState(0);

  const [searchIndices, setSearchIndices] = useState<{
    subjects: any[];
    notes: any[];
    documents: any[];
    flashcards: any[];
    quizzes: any[];
    assignments: any[];
    conversations: any[];
  }>({
    subjects: [],
    notes: [],
    documents: [],
    flashcards: [],
    quizzes: [],
    assignments: [],
    conversations: []
  });
  const [loadingSearch, setLoadingSearch] = useState(false);
  const fetchingNotificationsRef = useRef(false);
  const isFirstLoadRef = useRef(true);

  const playNotificationSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, now); // E5
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);
      
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, now + 0.08); // A5
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(0.12, now + 0.13);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.7);
    } catch (err) {
      console.warn("Audio chime play blocked or unsupported:", err);
    }
  };

  const fetchNotifications = async () => {
    if (!token || fetchingNotificationsRef.current) return;
    fetchingNotificationsRef.current = true;
    try {
      // Fetch latest study task updates to trigger backend reminder generation
      await fetch("/api/planner/tasks", {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Fetch the actual notifications
      const res = await fetch("/api/planner/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const incoming = data.notifications || [];
        if (isFirstLoadRef.current) {
          isFirstLoadRef.current = false;
          setNotifications(incoming);
        } else {
          // Check for any new unread notifications that aren't in our current local state ref
          const prev = notificationsRef.current;
          const newUnread = incoming.filter(
            (inc: any) => !inc.read && !prev.some((p: any) => p.id === inc.id)
          );

          if (newUnread.length > 0) {
            playNotificationSound();
            newUnread.forEach((notif: any) => {
              toast.info(`🔔 ${notif.title}: ${notif.message}`);
            });
          }
          setNotifications(incoming);
        }
      }
    } catch (err) {
      console.log("Failed to fetch notification items:", err);
    } finally {
      fetchingNotificationsRef.current = false;
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s auto sync
    return () => clearInterval(interval);
  }, [token]);

  const loadSearchIndices = async () => {
    if (!token) return;
    setLoadingSearch(true);
    try {
      const [subsRes, notesRes, docsRes, decksRes, quizzesRes, asgsRes, convsRes] = await Promise.all([
        fetch("/api/subjects?includeDeleted=false", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/notes", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/documents", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/learning/flashcards", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/learning/quizzes", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/assignments", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/ai/conversations", { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const [subs, notesData, docsData, decksData, quizzesData, asgsData, convsData] = await Promise.all([
        subsRes.ok ? subsRes.json() : { success: false, subjects: [] },
        notesRes.ok ? notesRes.json() : { success: false, notes: [] },
        docsRes.ok ? docsRes.json() : { success: false, documents: [] },
        decksRes.ok ? decksRes.json() : { success: false, decks: [] },
        quizzesRes.ok ? quizzesRes.json() : { success: false, quizzes: [] },
        asgsRes.ok ? asgsRes.json() : { success: false, assignments: [] },
        convsRes.ok ? convsRes.json() : { success: false, conversations: [] }
      ]);

      setSearchIndices({
        subjects: subs.success ? subs.subjects : [],
        notes: notesData.success ? notesData.notes : [],
        documents: docsData.success ? docsData.documents : [],
        flashcards: decksData.success ? decksData.decks : [],
        quizzes: quizzesData.success ? quizzesData.quizzes : [],
        assignments: asgsData.success ? asgsData.assignments : [],
        conversations: convsData.success ? convsData.conversations : []
      });
    } catch (err) {
      console.log("Failed to load search index items", err);
    } finally {
      setLoadingSearch(false);
    }
  };

  useEffect(() => {
    if (isSearchOpen) {
      loadSearchIndices();
      setSelectedResultIndex(0);
    }
  }, [isSearchOpen, token]);

  // Handle Command+K toggle listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Sync ref helper to close overlays on outside actions
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSupportTrigger = () => {
    setIsSupportOpen(true);
  };

  const handleClearNotifications = async () => {
    if (!token || notifications.length === 0) return;
    try {
      const res = await fetch("/api/planner/notifications/read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notificationIds: notifications.map(n => n.id) })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        toast.success("All notifications marked as read!");
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleEraseAllNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/planner/notifications", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotifications([]);
        toast.success("Notification center completely cleared!");
      }
    } catch (err) {
      console.log(err);
    }
  };

  const activePageDetails = SIDEBAR_ITEMS.find((item) => item.id === activeTab) || SIDEBAR_ITEMS[0];

  // Render the proper Page Subview depending on state
  const renderActiveView = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView />;
      case "subjects":
        return <SubjectsView />;
      case "notes":
        return <NotesView />;
      case "resources":
        return <DocumentsView />;
      case "profile":
        return <ProfileView />;
      case "settings":
        return <SettingsView />;
      case "ai-assistant":
        return <AIWorkspaceView />;
      case "flashcards":
        return <FlashcardsView />;
      case "quizzes":
        return <QuizzesView />;
      case "planner":
        return <PlannerView />;
      case "assignments":
        return <AssignmentsView />;
      case "analytics":
        return <AnalyticsView />;


      default:
        // Render modular high fidelity Generic academic views
        return (
          <GenericPageView
            key={activeTab}
            pageId={activeTab}
            title={t(activePageDetails.id)}
            description={`${t("genericPageDescPre")} ${t(activePageDetails.id)}.`}
          />
        );
    }
  };

  // Static lists for the Command Palette
  const quickNavs = [
    { id: "nav-dash", type: "navigation", title: "Go to Dashboard", subtitle: "Overview & Analytics", action: () => setActiveTab("dashboard") },
    { id: "nav-ai", type: "navigation", title: "Go to AI Workspace", subtitle: "Intelligent study buddy chat", action: () => setActiveTab("ai-assistant") },
    { id: "nav-notes", type: "navigation", title: "Go to Notes", subtitle: "Manage academic notebooks", action: () => setActiveTab("notes") },
    { id: "nav-docs", type: "navigation", title: "Go to Documents", subtitle: "Study papers & files", action: () => setActiveTab("resources") },
    { id: "nav-planner", type: "navigation", title: "Go to Planner", subtitle: "Schedules & Reminders", action: () => setActiveTab("planner") },
    { id: "nav-analytics", type: "navigation", title: "Go to Analytics", subtitle: "Quiz & performance insights", action: () => setActiveTab("analytics") },
    { id: "nav-settings", type: "navigation", title: "Go to Settings", subtitle: "Configure personalization", action: () => setActiveTab("settings") },
  ];

  const quickActions = [
    {
      id: "act-note",
      type: "action",
      title: "New Note",
      subtitle: "Instantiate empty notebook page",
      action: () => {
        localStorage.setItem("trigger-new-note", "true");
        window.dispatchEvent(new Event("storage"));
        setActiveTab("notes");
      }
    },
    {
      id: "act-doc",
      type: "action",
      title: "Upload Document",
      subtitle: "Index new study material",
      action: () => {
        localStorage.setItem("trigger-upload-document", "true");
        window.dispatchEvent(new Event("storage"));
        setActiveTab("resources");
      }
    },
    {
      id: "act-asg",
      type: "action",
      title: "New Assignment",
      subtitle: "Log task milestone with deadline",
      action: () => {
        localStorage.setItem("trigger-new-assignment", "true");
        window.dispatchEvent(new Event("storage"));
        setActiveTab("assignments");
      }
    },
    {
      id: "act-chat",
      type: "action",
      title: "Start AI Chat",
      subtitle: "Begin new tutor dialogue",
      action: () => {
        localStorage.setItem("trigger-new-ai-chat", "true");
        window.dispatchEvent(new Event("storage"));
        setActiveTab("ai-assistant");
      }
    },
    {
      id: "act-deck",
      type: "action",
      title: "Generate Flashcards",
      subtitle: "Generate smart active-recall deck",
      action: () => {
        localStorage.setItem("trigger-generate-flashcards", "true");
        window.dispatchEvent(new Event("storage"));
        setActiveTab("flashcards");
      }
    },
    {
      id: "act-quiz",
      type: "action",
      title: "Generate Quiz",
      subtitle: "Synthetic testing generator",
      action: () => {
        localStorage.setItem("trigger-generate-quiz", "true");
        window.dispatchEvent(new Event("storage"));
        setActiveTab("quizzes");
      }
    },
  ];

  const query = searchQuery.trim().toLowerCase();

  const flatResults = React.useMemo(() => {
    let results: any[] = [];

    if (!query) {
      return [...quickNavs, ...quickActions];
    }

    // Filter Navigations
    quickNavs.forEach(nav => {
      if (nav.title.toLowerCase().includes(query) || nav.subtitle.toLowerCase().includes(query)) {
        results.push(nav);
      }
    });

    // Filter Quick Actions
    quickActions.forEach(act => {
      if (act.title.toLowerCase().includes(query) || act.subtitle.toLowerCase().includes(query)) {
        results.push(act);
      }
    });

    // Filter Subjects
    searchIndices.subjects.forEach(sub => {
      if (sub.title?.toLowerCase().includes(query) || sub.description?.toLowerCase().includes(query)) {
        results.push({
          id: `sub-${sub.id}`,
          type: "subject",
          title: sub.title,
          subtitle: `Subject Directory • ${sub.description || "No description"}`,
          action: () => {
            localStorage.setItem("active-subject-id", String(sub.id));
            window.dispatchEvent(new Event("storage"));
            setActiveTab("subjects");
          }
        });
      }
    });

    // Filter Notes
    searchIndices.notes.forEach(note => {
      if (note.title?.toLowerCase().includes(query) || note.content?.toLowerCase().includes(query)) {
        results.push({
          id: `note-${note.id}`,
          type: "note",
          title: note.title || "Untitled Notebook Page",
          subtitle: `Notebooks • ${note.content ? note.content.substring(0, 60) + "..." : "Empty note content"}`,
          action: () => {
            localStorage.setItem("active-note-id", String(note.id));
            window.dispatchEvent(new Event("storage"));
            setActiveTab("notes");
          }
        });
      }
    });

    // Filter Documents
    searchIndices.documents.forEach(doc => {
      if (doc.originalName?.toLowerCase().includes(query)) {
        results.push({
          id: `doc-${doc.id}`,
          type: "document",
          title: doc.originalName || "Untitled Resource File",
          subtitle: `Files Directory • Size: ${doc.size ? (doc.size / 1024).toFixed(1) + " KB" : "Unknown size"}`,
          action: () => {
            localStorage.setItem("active-document-id", String(doc.id));
            window.dispatchEvent(new Event("storage"));
            setActiveTab("resources");
          }
        });
      }
    });

    // Filter Decks (Flashcards)
    searchIndices.flashcards.forEach(deck => {
      if (deck.title?.toLowerCase().includes(query) || deck.description?.toLowerCase().includes(query)) {
        results.push({
          id: `deck-${deck.id}`,
          type: "flashcard",
          title: deck.title || "Untitled Study Deck",
          subtitle: `Flashcards • ${deck.description || "No description provided"}`,
          action: () => {
            localStorage.setItem("active-deck-id", String(deck.id));
            window.dispatchEvent(new Event("storage"));
            setActiveTab("flashcards");
          }
        });
      }
    });

    // Filter Quizzes
    searchIndices.quizzes.forEach(quiz => {
      if (quiz.title?.toLowerCase().includes(query) || quiz.description?.toLowerCase().includes(query)) {
        results.push({
          id: `quiz-${quiz.id}`,
          type: "quiz",
          title: quiz.title || "Practice Assessment",
          subtitle: `AI Quizzes • ${quiz.description || "No description provided"}`,
          action: () => {
            localStorage.setItem("active-quiz-id", String(quiz.id));
            window.dispatchEvent(new Event("storage"));
            setActiveTab("quizzes");
          }
        });
      }
    });

    // Filter Assignments
    searchIndices.assignments.forEach(asg => {
      if (asg.title?.toLowerCase().includes(query) || asg.subjectTitle?.toLowerCase().includes(query) || asg.status?.toLowerCase().includes(query)) {
        results.push({
          id: `asg-${asg.id}`,
          type: "assignment",
          title: asg.title || "Course Assignment",
          subtitle: `Milestones • Status: ${asg.status || "Pending"}${asg.subjectTitle ? ` • Subject: ${asg.subjectTitle}` : ""}`,
          action: () => {
            localStorage.setItem("active-assignment-id", String(asg.id));
            window.dispatchEvent(new Event("storage"));
            setActiveTab("assignments");
          }
        });
      }
    });

    // Filter AI Conversations
    searchIndices.conversations.forEach(conv => {
      if (conv.title?.toLowerCase().includes(query)) {
        results.push({
          id: `conv-${conv.id}`,
          type: "conversation",
          title: conv.title || "AI Session",
          subtitle: `AI Dialogues • ${new Date(conv.updatedAt || conv.createdAt).toLocaleDateString()}`,
          action: () => {
            localStorage.setItem("active-conversation-id", String(conv.id));
            window.dispatchEvent(new Event("storage"));
            setActiveTab("ai-assistant");
          }
        });
      }
    });

    return results;
  }, [query, searchIndices]);

  useEffect(() => {
    setSelectedResultIndex(0);
  }, [searchQuery]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedResultIndex((prev) => (prev + 1) % Math.max(1, flatResults.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedResultIndex((prev) => (prev - 1 + flatResults.length) % Math.max(1, flatResults.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const currentSelected = flatResults[selectedResultIndex];
      if (currentSelected) {
        currentSelected.action();
        setIsSearchOpen(false);
        setSearchQuery("");
        toast.info(`Executed: ${currentSelected.title}`);
      }
    }
  };

  const hasNewNotifications = notifications.some((n) => !n.read);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-50 flex">
      
      {/* 1. DESKTOP PERSISTENT SIDEBAR */}
      <aside
        className={`hidden md:flex flex-col border-r border-slate-200/60 dark:border-slate-800/60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0 h-screen sticky top-0 transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Workspace Brand / Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white shadow-md shadow-violet-500/10">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            {!isCollapsed && (
              <span className="font-display font-extrabold text-[15px] tracking-tight text-slate-900 dark:text-slate-50 truncate">
                AI Study Hub
              </span>
            )}
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg border border-slate-200/40 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all cursor-pointer"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          
          {/* Categorized Segments */}
          {["core", "academic", "tools", "personal"].map((cat) => {
            const items = SIDEBAR_ITEMS.filter((item) => item.category === cat);
            return (
              <div key={cat} className="space-y-1">
                {!isCollapsed && (
                  <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase px-3 py-1 font-sans">
                    {t(cat)}
                  </p>
                )}
                {items.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-150 cursor-pointer ${
                        isActive
                          ? "bg-violet-600 text-white shadow-md shadow-violet-500/10 font-semibold"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <ItemIcon className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-500"}`} />
                      {!isCollapsed && <span className="truncate">{t(item.id)}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Bottom Actions: Support & Collapse Info */}
        <div className="p-3 border-t border-slate-200/50 dark:border-slate-800/50 space-y-1">
          <button
            onClick={handleSupportTrigger}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 rounded-lg cursor-pointer"
          >
            <SupportIcon className="h-4.5 w-4.5 text-slate-400 shrink-0" />
            {!isCollapsed && <span>{t("support")}</span>}
          </button>
        </div>
      </aside>

      {/* 2. MOBILE DRAWER OVERLAY SIDEBAR */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-black"
            />

            {/* Sidebar content */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full flex flex-col p-4 shadow-2xl overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white shadow-sm">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <span className="font-display font-extrabold text-[14px] tracking-tight">
                    AI Study Hub
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Sidebar Links */}
              <nav className="flex-1 space-y-4">
                {["core", "academic", "tools", "personal"].map((cat) => {
                  const items = SIDEBAR_ITEMS.filter((item) => item.category === cat);
                  return (
                    <div key={cat} className="space-y-1">
                      <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase px-2 font-sans">
                        {t(cat)}
                      </p>
                      {items.map((item) => {
                        const ItemIcon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveTab(item.id);
                              setIsMobileOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                              isActive
                                ? "bg-violet-600 text-white shadow-sm"
                                : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/40"
                            }`}
                          >
                            <ItemIcon className="h-4.5 w-4.5 shrink-0" />
                            <span>{t(item.id)}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                <button
                  onClick={() => {
                    handleSupportTrigger();
                    setIsMobileOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-500 rounded-lg"
                >
                  <SupportIcon className="h-4.5 w-4.5 shrink-0" />
                  <span>{t("supportHub")}</span>
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* 3. MAIN WORKSPACE CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* PREMIUM TOP STICKY HEADER */}
        <header className="sticky top-0 z-30 h-16 border-b border-slate-200/50 bg-white/80 backdrop-blur-md dark:border-slate-800/50 dark:bg-slate-950/80 px-4 md:px-6 flex items-center justify-between">
          
          {/* Left Block: Mobile Menu & Breadcrumbs */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-1.5 md:hidden text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer border rounded-lg border-slate-200/60 dark:border-slate-800 shrink-0"
            >
              <Menu className="h-4 w-4" />
            </button>

            {/* Mobile Brand Title */}
            <span className="md:hidden font-display font-extrabold text-[13px] tracking-tight text-slate-900 dark:text-slate-50 truncate max-w-[130px] capitalize">
              {t(activePageDetails.id)}
            </span>

            {/* Breadcrumb pathing */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
              <span>{t("workspace")}</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-slate-700 dark:text-slate-300 font-semibold capitalize">
                {t(activePageDetails.id)}
              </span>
            </div>
          </div>

          {/* Center Block: Elegant Shortcut-bound Search Bar */}
          <div className="flex-1 max-w-md mx-4 hidden md:block min-w-0">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full h-9 flex items-center justify-between px-3 text-left border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/40 hover:bg-slate-50 dark:bg-slate-900/30 dark:hover:bg-slate-900/50 rounded-lg text-slate-400 transition-all cursor-pointer text-xs min-w-0"
            >
              <div className="flex items-center gap-2 min-w-0 mr-2">
                <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{t("searchCommands")}</span>
              </div>
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-400 font-bold border border-slate-200/40 dark:border-slate-700/50 shrink-0">
                <Command className="h-2.5 w-2.5" />
                <span>K</span>
              </div>
            </button>
          </div>

          {/* Right Block: Actions, Theme, Notifications, Avatar */}
          <div className="flex items-center gap-3">
            
            {/* Quick action button placeholder */}
            <button
              onClick={() => setShowQuickAction(true)}
              className="h-8.5 px-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold flex items-center gap-1 text-xs shadow-sm shadow-violet-500/10 cursor-pointer hidden md:flex transition-all shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t("quickAdd")}</span>
            </button>

            {/* Mobile search trigger */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-1.5 md:hidden text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
            >
              <Search className="h-4.5 w-4.5" />
            </button>

            {/* Language Switcher */}
            <div className="flex items-center border border-slate-200/60 dark:border-slate-800 p-0.5 rounded-lg bg-slate-100/30 dark:bg-slate-900/30 shrink-0">
              <button
                onClick={() => setLanguage("en")}
                className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                  language === "en"
                    ? "bg-white text-violet-600 shadow-sm dark:bg-slate-800 dark:text-violet-400"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
                title="English Language"
              >
                EN
              </button>
              <button
                onClick={() => setLanguage("bn")}
                className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                  language === "bn"
                    ? "bg-white text-violet-600 shadow-sm dark:bg-slate-800 dark:text-violet-400"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
                title="বাংলা ভাষা"
              >
                বাং
              </button>
            </div>

            {/* Theme selector */}
            <div className="hidden sm:flex items-center border border-slate-200/60 dark:border-slate-800 p-0.5 rounded-lg bg-slate-100/30 dark:bg-slate-900/30 shrink-0">
              <button
                onClick={() => setTheme("light")}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  theme === "light"
                    ? "bg-white text-violet-600 shadow-sm dark:bg-slate-800 dark:text-violet-400"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
                title="Light Theme"
              >
                <Sun className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setTheme("sepia")}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  theme === "sepia"
                    ? "bg-white text-amber-700 shadow-sm dark:bg-slate-800 dark:text-amber-500"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
                title="Warm Sepia Theme (Calm)"
              >
                <Coffee className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setTheme("forest")}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  theme === "forest"
                    ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-800 dark:text-emerald-400"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
                title="Calm Forest Theme (Mint)"
              >
                <Leaf className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  theme === "dark"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
                title="Dark Theme"
              >
                <Moon className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Notifications Popover */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer relative"
              >
                <Bell className="h-4.5 w-4.5" />
                {hasNewNotifications && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-950 animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden z-40"
                  >
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{t("studyNotifications")}</span>
                      <button
                        onClick={handleClearNotifications}
                        className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold hover:underline"
                      >
                        {t("readAll")}
                      </button>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-800 max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                          No study notifications. You're all caught up!
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div key={notif.id} className={`p-3 text-xs space-y-1 transition-colors ${!notif.read ? "bg-violet-50/25 dark:bg-violet-950/10 border-l-2 border-violet-500" : ""}`}>
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-slate-800 dark:text-slate-200">
                                {notif.title}
                              </p>
                              {!notif.read && (
                                <span className="h-1.5 w-1.5 rounded-full bg-violet-600 shrink-0" />
                              )}
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 font-normal leading-relaxed break-words">
                                {notif.message}
                            </p>
                            <p className="text-[9px] text-slate-400">
                              {new Date(notif.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Avatar with elegant nested menu */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="h-8 w-8 rounded-full border border-slate-200/60 dark:border-slate-800/60 overflow-hidden cursor-pointer shrink-0 shadow-sm"
              >
                <img
                  src={user?.avatar || firebaseUser?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${firebaseUser?.email}`}
                  alt="Claim Profile avatar"
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden z-40 p-1.5"
                  >
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/60 mb-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {user?.name || firebaseUser?.displayName || t("studentPioneer")}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{firebaseUser?.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        setActiveTab("profile");
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                    >
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>{t("myProfile")}</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab("settings");
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                    >
                      <Settings className="h-3.5 w-3.5 text-slate-400" />
                      <span>{t("mySettings")}</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer border-t border-slate-100 dark:border-slate-800 mt-1"
                    >
                      <Power className="h-3.5 w-3.5 shrink-0" />
                      <span>{t("logout")}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </header>

        {/* MAIN WORKSPACE CANVAS AND PAGE LOADER */}
        <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6 md:py-8 flex justify-center">
          <React.Suspense fallback={
            <div className="flex h-64 flex-col items-center justify-center space-y-3">
              <RefreshCw className="h-7 w-7 animate-spin text-violet-600" />
              <p className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest">
                Loading academic space...
              </p>
            </div>
          }>
            <AnimatePresence mode="wait">
              {renderActiveView()}
            </AnimatePresence>
          </React.Suspense>
        </main>
      </div>

      {/* 4. COMMAND+K INTERACTIVE DIRECT SEARCH MODAL */}
      <Dialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} title="Command Center Search">
        <div className="w-full">
          {/* Input field */}
          <div className="flex items-center pb-3.5 border-b border-slate-100 dark:border-slate-800">
            <Search className="h-4.5 w-4.5 text-slate-400 mr-2.5 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search or type a command..."
              className="w-full text-xs text-slate-800 dark:text-slate-100 bg-transparent outline-none border-none placeholder-slate-400"
              autoFocus
            />
          </div>

          {/* Results list */}
          <div className="max-h-80 overflow-y-auto pt-2 space-y-1">
            {loadingSearch ? (
              <div className="flex items-center justify-center py-8 space-x-2 text-xs text-slate-400">
                <RefreshCw className="h-4 w-4 animate-spin text-violet-600" />
                <span>Indexing workspace catalog...</span>
              </div>
            ) : flatResults.length > 0 ? (
              flatResults.map((item, index) => {
                const isSelected = index === selectedResultIndex;
                const getResultTypeIcon = (type: string) => {
                  switch (type) {
                    case "navigation": return "🌐";
                    case "action": return "⚡";
                    case "subject": return "📚";
                    case "note": return "📝";
                    case "document": return "📄";
                    case "flashcard": return "🗂️";
                    case "quiz": return "🧠";
                    case "assignment": return "📅";
                    case "conversation": return "🤖";
                    default: return "🔍";
                  }
                };
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      item.action();
                      setIsSearchOpen(false);
                      setSearchQuery("");
                    }}
                    onMouseEnter={() => setSelectedResultIndex(index)}
                    className={`w-full flex items-center justify-between gap-3 p-2 sm:p-2.5 rounded-lg text-xs transition-all text-left cursor-pointer border min-w-0 ${
                      isSelected
                        ? "bg-violet-600/10 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300 border-violet-500/30 font-semibold"
                        : "border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="text-sm sm:text-base shrink-0 select-none">
                        {getResultTypeIcon(item.type)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate text-[11px] sm:text-xs text-slate-800 dark:text-slate-200">{item.title}</p>
                        <p className="text-[9px] sm:text-[10px] text-slate-400 truncate leading-tight mt-0.5">{item.subtitle}</p>
                      </div>
                    </div>
                    <span className={`text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-full font-mono font-extrabold uppercase shrink-0 ${
                      item.type === "action"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                        : item.type === "navigation"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                    }`}>
                      {item.type}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">
                No matching workspace entries or commands found.
              </p>
            )}
          </div>
          
          {/* Footer tips */}
          <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-medium flex justify-between">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">↑↓</kbd> to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Enter</kbd> to select
            </span>
          </div>
        </div>
      </Dialog>

      {/* 5. QUICK ACTION MODAL PORTAL */}
      <Dialog isOpen={showQuickAction} onClose={() => setShowQuickAction(false)} title="New Study Instance">
        <div className="space-y-4 w-full">
          <p className="text-xs text-slate-500 leading-normal">
            Select an academic learning module to instantiate. Custom forms will bind to your personal PostgreSQL schema in future sprints.
          </p>

          <div className="grid gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <button
              onClick={() => {
                setShowQuickAction(false);
                setActiveTab("notes");
                toast.success("Drafting a new custom notebook page!");
              }}
              className="w-full p-2.5 border rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              📝 Create New Class Notes
            </button>
            <button
              onClick={() => {
                setShowQuickAction(false);
                setActiveTab("ai-assistant");
                toast.success("Launching active Socratic recall session with Coach AI!");
              }}
              className="w-full p-2.5 border rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              🤖 Initiate AI Study Dialogue
            </button>
            <button
              onClick={() => {
                setShowQuickAction(false);
                setActiveTab("flashcards");
                toast.success("Opening Flashcard decks compilation workspace!");
              }}
              className="w-full p-2.5 border rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              🗂️ Build Custom Recall Deck
            </button>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowQuickAction(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>

      <SupportAICoPilot 
        isOpen={isSupportOpen} 
        onClose={() => setIsSupportOpen(false)} 
        activeTab={activeTab} 
      />

    </div>
  );
}
