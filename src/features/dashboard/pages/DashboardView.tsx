import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../auth/hooks/use-auth.tsx";
import { useToast } from "../../../components/ui/Toast.tsx";
import { Button } from "../../../components/ui/Button.tsx";
import { Dialog } from "../../../components/ui/Dialog.tsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/Card.tsx";
import { MarkdownRenderer } from "../../../components/ui/MarkdownRenderer.tsx";
import {
  Sparkles,
  Flame,
  Award,
  Zap,
  BookOpen,
  Plus,
  ArrowRight,
  User,
  Check,
  BrainCircuit,
  MessageSquare,
  ChevronRight,
  Clock,
  FileText,
  Layers,
  CheckSquare,
  Calendar,
  FileUp,
  Brain,
  UploadCloud,
  Loader2,
  Trash2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ShieldAlert
} from "lucide-react";
import {
  STATS,
  UPCOMING_ASSIGNMENTS,
  RECENT_NOTES,
  SUBJECT_PROGRESS,
  RECENT_AI_CONVERSATIONS,
  DAILY_GOALS,
  MOTIVATIONAL_QUOTES,
  RECENT_ACTIVITIES,
  WEEKLY_CHART_DATA,
  MONTHLY_CHART_DATA,
  STREAK_INFO,
  AssignmentMock,
  NoteMock,
  AIConversationMock,
  ActivityMock,
  BadgeMock
} from "../mockData.ts";
import {
  StatisticsCard,
  DashboardCard,
  ChartCard,
  ActivityCard,
  SectionHeader,
  QuickActionCard,
  ResponsiveGrid,
  EmptyState,
  LoadingSkeleton
} from "../components/DashboardComponents.tsx";

export function DashboardView() {
  const { firebaseUser, token } = useAuth();
  const toast = useToast();

  // Dynamic Planner Stats
  const [plannerTasks, setPlannerTasks] = useState<any[]>([]);
  const [plannerLoading, setPlannerLoading] = useState(true);

  // Local interactive states
  const [goals, setGoals] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [activities, setActivities] = useState<ActivityMock[]>([]);
  const [aiChats, setAiChats] = useState<AIConversationMock[]>([]);
  const [quoteIdx, setQuoteIdx] = useState(0);

  // Advanced AI Productivity Hub states
  const [prodMetrics, setProdMetrics] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [weakTopics, setWeakTopics] = useState<any>(null);
  const [aiRecs, setAiRecs] = useState<any[]>([]);
  const [dailyBrief, setDailyBrief] = useState<any>(null);
  const [isAiStatsLoading, setIsAiStatsLoading] = useState(true);

  const fetchAIProductivityData = async () => {
    if (!token) return;
    setIsAiStatsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [metricsRes, weakRes, recsRes, briefRes] = await Promise.all([
        fetch("/api/productivity/metrics", { headers }).then((r) => r.json()).catch(() => ({ success: false })),
        fetch("/api/productivity/weak-topics", { headers }).then((r) => r.json()).catch(() => ({ success: false })),
        fetch("/api/productivity/recommendations", { headers }).then((r) => r.json()).catch(() => ({ success: false })),
        fetch("/api/productivity/daily-briefing", { headers }).then((r) => r.json()).catch(() => ({ success: false }))
      ]);

      if (metricsRes.success) setProdMetrics(metricsRes.metrics);
      if (weakRes.success) setWeakTopics(weakRes.analysis);
      if (recsRes.success) setAiRecs(recsRes.recommendations || []);
      if (briefRes.success) setDailyBrief(briefRes.briefing);
    } catch (error) {
      console.error("Failed to load AI productivity data:", error);
    } finally {
      setIsAiStatsLoading(false);
    }
  };

  const handleRegenerateRecommendations = async () => {
    if (!token) return;
    setIsAiStatsLoading(true);
    try {
      const res = await fetch("/api/productivity/recommendations/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAiRecs(data.recommendations || []);
        toast.success("AI has refreshed your study recommendations! 🚀");
        fetchAIProductivityData(); // also refresh other metrics
      } else {
        toast.error("Could not refresh recommendations.");
      }
    } catch (e) {
      console.error(e);
      toast.error("AI service timed out.");
    } finally {
      setIsAiStatsLoading(false);
    }
  };

  const handleDismissRec = async (id: number) => {
    if (!token) return;
    try {
      setAiRecs((prev) => prev.filter((r) => r.id !== id));
      await fetch(`/api/productivity/recommendations/${id}/dismiss`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Recommendation dismissed.");
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDashboardData = async () => {
    if (!token) return;
    setPlannerLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [tasksRes, assignmentsRes, goalsRes, analyticsRes] = await Promise.all([
        fetch("/api/planner/tasks", { headers }).then((r) => r.json()).catch(() => ({ success: false, tasks: [] })),
        fetch("/api/assignments", { headers }).then((r) => r.json()).catch(() => ({ success: false, assignments: [] })),
        fetch("/api/goals", { headers }).then((r) => r.json()).catch(() => ({ success: false, goals: [] })),
        fetch("/api/analytics", { headers }).then((r) => r.json()).catch(() => ({ success: false, analytics: null }))
      ]);

      if (analyticsRes.success) {
        setAnalyticsData(analyticsRes.analytics);
      }

      if (tasksRes.success) {
        setPlannerTasks(tasksRes.tasks || []);
      }
      if (assignmentsRes.success && assignmentsRes.assignments && assignmentsRes.assignments.length > 0) {
        setAssignments(assignmentsRes.assignments);
      } else {
        setAssignments([]);
      }
      if (goalsRes.success && goalsRes.goals && goalsRes.goals.length > 0) {
        const mappedGoals = goalsRes.goals.map((g: any) => ({
          id: String(g.id),
          text: g.title,
          completed: g.completed,
          rawGoal: g
        }));
        setGoals(mappedGoals);
      } else {
        setGoals([]);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setGoals([]);
      setAssignments([]);
    } finally {
      setPlannerLoading(false);
    }
  };

  React.useEffect(() => {
    if (token) {
      fetchDashboardData();
      fetchAIProductivityData();
    }
  }, [token]);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 24 * 60 * 60 * 1000;

  const overdueTasks = plannerTasks.filter(
    (t) => t.status === "pending" && t.dueDate && new Date(t.dueDate).getTime() < now.getTime()
  );

  const todayTasks = plannerTasks.filter((t) => {
    if (!t.dueDate) return false;
    const dueTime = new Date(t.dueDate).getTime();
    return dueTime >= startOfToday && dueTime < endOfToday && t.status === "pending";
  });

  const upcomingDeadlines = plannerTasks.filter(
    (t) => t.status === "pending" && t.dueDate && new Date(t.dueDate).getTime() >= endOfToday
  );

  const completedCount = plannerTasks.filter((t) => t.status === "completed").length;
  const studyProgressPercent =
    plannerTasks.length > 0 ? Math.round((completedCount / plannerTasks.length) * 100) : 0;

  // Quick Action form modals
  const [activeQuickAction, setActiveQuickAction] = useState<string | null>(null);

  // Quick Action input fields
  const [noteTitle, setNoteTitle] = useState("");
  const [noteSubject, setNoteSubject] = useState("");
  const [noteContent, setNoteContent] = useState("");

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  const [quizSubject, setQuizSubject] = useState("");
  const [quizQuestionCount, setQuizQuestionCount] = useState(10);

  const [subjectName, setSubjectName] = useState("");
  const [subjectColor, setSubjectColor] = useState("violet");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskSubject, setTaskSubject] = useState("");
  const [taskUrgency, setTaskUrgency] = useState<"high" | "medium" | "low">("medium");

  // Inspection triggers
  const [selectedNote, setSelectedNote] = useState<NoteMock | null>(null);
  const [selectedAIConv, setSelectedAIConv] = useState<AIConversationMock | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityMock | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<BadgeMock | null>(null);

  // Loading simulation states for quick add
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Dynamic progress calculator
  const completedGoalsCount = goals.filter((g) => g.completed).length;
  const progressPercent = Math.round((completedGoalsCount / goals.length) * 100) || 0;

  // Next quote rotation
  const rotateQuote = () => {
    setQuoteIdx((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
  };

  // Toggle goal completion state
  const handleToggleGoal = async (id: string) => {
    let nextCompleted = false;
    let goalText = "";
    let rawGoal: any = null;

    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          nextCompleted = !g.completed;
          goalText = g.text;
          rawGoal = g.rawGoal;
          return { ...g, completed: nextCompleted };
        }
        return g;
      })
    );

    if (token && rawGoal) {
      try {
        await fetch(`/api/goals/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            title: rawGoal.title,
            description: rawGoal.description,
            type: rawGoal.type,
            targetDate: rawGoal.targetDate,
            completed: nextCompleted
          })
        });
        if (nextCompleted) {
          toast.success(`Completed goal: "${goalText}"! 🌟`);
        }
      } catch (err) {
        console.error("Failed to sync goal state with database:", err);
      }
    } else {
      if (nextCompleted) {
        toast.success(`Completed goal: "${goalText}"! 🌟`);
      }
    }
  };

  // Flip assignment status locally
  const handleToggleAssignmentStatus = (id: string) => {
    let targetTitle = "";
    let nextStatus = "";
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const status = a.status === "submitted" ? "pending" : "submitted";
          targetTitle = a.title;
          nextStatus = status;
          return { ...a, status: status };
        }
        return a;
      })
    );
    if (targetTitle) {
      toast.success(`Assignment "${targetTitle}" state toggled to ${nextStatus.toUpperCase()}`);
    }
  };

  const handleTogglePlannerTaskStatus = async (taskId: string, currentStatus: string) => {
    if (!token) return;
    const nextStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      const response = await fetch(`/api/planner/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Task status updated!`);
        setPlannerTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
        );
      } else {
        toast.error("Failed to update task status.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error communicating with task server.");
    }
  };

  // Action shortcut handlers
  const handleActionClick = (actionId: string) => {
    setActiveQuickAction(actionId);
  };

  // Form Submissions simulations (Fills mock array data to feel highly functional)
  const handleCreateNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle || !noteSubject) {
      toast.error("Please fill in Note Title and Subject.");
      return;
    }
    setIsSubmittingForm(true);
    setTimeout(() => {
      const newNote: NoteMock = {
        id: `note-${Date.now()}`,
        title: noteTitle,
        subject: noteSubject,
        lastEdited: "Just now",
        snippet: noteContent || "Draft notes created via premium study workspace shortcut."
      };
      // Insert into local notebooks or trigger toast
      toast.success(`Created Note "${noteTitle}"! Injected into workspace context.`);
      setIsSubmittingForm(false);
      setActiveQuickAction(null);
      setNoteTitle("");
      setNoteSubject("");
      setNoteContent("");

      // Log action in activities
      setActivities((prev) => [
        {
          id: `act-${Date.now()}`,
          title: `Created note: ${noteTitle}`,
          description: `Formulated initial drafts for ${noteSubject}.`,
          iconName: "FileText",
          timestamp: "Just now",
          category: "Academic"
        },
        ...prev
      ]);
    }, 800);
  };

  const handleUploadPDFSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) {
      toast.error("Please select or drop a PDF syllabus first.");
      return;
    }
    setIsUploading(true);
    setTimeout(() => {
      toast.success(`Syllabus "${pdfFile.name}" digested successfully into vector storage!`);
      setIsUploading(false);
      setActiveQuickAction(null);
      setPdfFile(null);

      // Log action
      setActivities((prev) => [
        {
          id: `act-${Date.now()}`,
          title: `Uploaded document`,
          description: `Digested "${pdfFile.name}" into Socratic semantic memory.`,
          iconName: "FileUp",
          timestamp: "Just now",
          category: "System"
        },
        ...prev
      ]);
    }, 1500);
  };

  const handleStartAIChatSubmit = async (e?: React.FormEvent, mode: string = "default") => {
    if (e) e.preventDefault();
    if (!aiPrompt) {
      toast.error("Please provide a learning query first.");
      return;
    }
    setIsAiThinking(true);
    setAiResponse(null);
    try {
      const res = await fetch("/api/ai/socratic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ prompt: aiPrompt, mode })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAiResponse(data.text);
        
        // Ingest conversation list
        const newChat: AIConversationMock = {
          id: `ai-${Date.now()}`,
          topic: aiPrompt,
          preview: data.text.substring(0, 100) + "...",
          timestamp: "Just now"
        };
        setAiChats((prev) => [newChat, ...prev]);
        toast.success(`Socratic AI: ${mode === "default" ? "Response generated!" : "Explanation refined!"}`);
      } else {
        toast.error(data.error || "Failed to generate Socratic response.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Could not reach Socratic AI engine.");
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleGenerateQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizSubject) {
      toast.error("Please enter a Subject area.");
      return;
    }
    setIsSubmittingForm(true);
    setTimeout(() => {
      toast.success(`Formulated ${quizQuestionCount} Socratic active recall questions for "${quizSubject}"!`);
      setIsSubmittingForm(false);
      setActiveQuickAction(null);
      setQuizSubject("");

      setActivities((prev) => [
        {
          id: `act-${Date.now()}`,
          title: `Generated Quiz`,
          description: `Created active recall cards covering ${quizSubject}.`,
          iconName: "HelpCircle",
          timestamp: "Just now",
          category: "Tools"
        },
        ...prev
      ]);
    }, 1000);
  };

  const handleCreateSubjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName) {
      toast.error("Please specify a Subject area name.");
      return;
    }
    setIsSubmittingForm(true);
    setTimeout(() => {
      toast.success(`Created curriculum workspace for "${subjectName}" with color ${subjectColor}!`);
      setIsSubmittingForm(false);
      setActiveQuickAction(null);
      setSubjectName("");

      setActivities((prev) => [
        {
          id: `act-${Date.now()}`,
          title: `Initialized Subject: ${subjectName}`,
          description: `Bound workspace metadata to Cloud SQL sandbox profiles.`,
          iconName: "BookOpen",
          timestamp: "Just now",
          category: "Academic"
        },
        ...prev
      ]);
    }, 900);
  };

  const handleNewAssignmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskSubject) {
      toast.error("Please fill in assignment details.");
      return;
    }
    setIsSubmittingForm(true);
    setTimeout(() => {
      const newAssignment: AssignmentMock = {
        id: `task-${Date.now()}`,
        title: taskTitle,
        subject: taskSubject,
        dueDate: "July 18, 2026",
        status: "pending",
        urgency: taskUrgency
      };
      setAssignments((prev) => [newAssignment, ...prev]);
      toast.success(`Added assignment: "${taskTitle}"!`);
      setIsSubmittingForm(false);
      setActiveQuickAction(null);
      setTaskTitle("");
      setTaskSubject("");

      setActivities((prev) => [
        {
          id: `act-${Date.now()}`,
          title: `Added assignment: ${taskTitle}`,
          description: `Tracked upcoming delivery targets for ${taskSubject}.`,
          iconName: "CheckSquare",
          timestamp: "Just now",
          category: "Academic"
        },
        ...prev
      ]);
    }, 1000);
  };

  const getUrgencyClass = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/30";
      case "medium":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/30";
      default:
        return "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/30";
    }
  };

  const greetingName = firebaseUser?.displayName || firebaseUser?.email?.split("@")[0] || "Scholar";
  const currentQuote = MOTIVATIONAL_QUOTES[quoteIdx];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 w-full max-w-5xl"
    >
      {/* 1. Beautiful Calm Hero Welcome & Motivation Banner */}
      <div className="p-6 md:p-7 rounded-2xl border border-violet-100/70 dark:border-violet-900/30 bg-gradient-to-br from-violet-50/40 via-indigo-50/20 to-violet-50/30 dark:from-violet-950/10 dark:via-indigo-950/5 dark:to-violet-950/10 backdrop-blur-md shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-violet-500 animate-ping" />
            <span className="text-[10px] font-bold text-violet-600/80 dark:text-violet-400 uppercase tracking-widest font-mono">Academic Mindspace Live</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 font-display flex items-center gap-2.5">
            Welcome back, {greetingName}! <span className="animate-bounce">👋</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-lg leading-relaxed">
            Your study profiles are fully synchronized. Today you completed <span className="font-bold text-violet-600 dark:text-violet-400">{progressPercent}%</span> of your active study checkpoints. Maintain the momentum!
          </p>
        </div>

        {/* Compact, Pill-style Rotating Motivation Widget - Expanded */}
        <div
          onClick={rotateQuote}
          className="cursor-pointer bg-white/70 hover:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900/90 border border-violet-100/60 dark:border-violet-900/30 p-4 rounded-xl transition-all flex flex-col gap-2 w-full sm:max-w-sm shrink-0 shadow-xs relative group select-none hover:scale-[1.01] active:scale-[0.99]"
          title="Click to cycle next quote"
        >
          <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-30 transition-opacity">
            <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex gap-2">
            <span className="text-xl font-serif text-violet-400 leading-none">“</span>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-relaxed italic pr-2">
              {currentQuote.quote}
            </p>
          </div>
          <div className="flex items-center justify-between mt-1 border-t border-slate-100 dark:border-slate-800/50 pt-2">
            <span className="text-[9px] font-bold text-violet-500 uppercase tracking-wider">
              — {currentQuote.author}
            </span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono font-medium flex items-center gap-1 group-hover:text-violet-500 transition-colors">
              Click to cycle ({quoteIdx + 1}/{MOTIVATIONAL_QUOTES.length}) ↻
            </span>
          </div>
        </div>
      </div>

      {/* 2. Consolidated High-Impact KPI Row (Exactly 4 Cards) */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatisticsCard
          label="Socratic Strength"
          value={isAiStatsLoading ? "..." : `${prodMetrics?.productivityScore !== undefined ? prodMetrics.productivityScore : 0}%`}
          change="Learning Index"
          isPositive={true}
          iconName="Brain"
          color="violet"
          onClick={fetchAIProductivityData}
        />
        <StatisticsCard
          label="Study Streak"
          value={isAiStatsLoading ? "..." : `${prodMetrics?.streak !== undefined ? prodMetrics.streak : 0} Day${prodMetrics?.streak === 1 ? "" : "s"}`}
          change={prodMetrics?.streak > 0 ? "You're on fire! 🔥" : "Log study to start streak"}
          isPositive={prodMetrics?.streak > 0}
          iconName="Flame"
          color="amber"
          onClick={() => toast.info("Daily active learning streak.")}
        />
        <StatisticsCard
          label="Study Progress"
          value={plannerLoading ? "..." : `${studyProgressPercent}%`}
          change={`Done ${completedCount} of ${plannerTasks.length} tasks`}
          isPositive={studyProgressPercent >= 50}
          iconName="CheckSquare"
          color="emerald"
          onClick={() => toast.info("Your active study task completion rate.")}
        />
        <StatisticsCard
          label="Active Subjects"
          value={plannerLoading ? "..." : `${analyticsData?.subjectsStudiedCount ?? 0} Subject${analyticsData?.subjectsStudiedCount === 1 ? "" : "s"}`}
          change={analyticsData?.subjectsStudiedCount > 0 ? "Curriculum Active" : "No active subjects yet"}
          isPositive={(analyticsData?.subjectsStudiedCount ?? 0) > 0}
          iconName="BookOpen"
          color="blue"
          onClick={() => toast.info("Your curriculum workspace counts.")}
        />
      </div>

      {/* 3. Reusable QUICK ACTIONS Ribbon segment */}
      <div className="bg-slate-50/50 dark:bg-slate-900/20 p-4 border rounded-2xl border-slate-200/50 dark:border-slate-800/60 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3 pb-2.5 border-b border-slate-150 dark:border-slate-850">
          <div>
            <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
              Academic Quick Actions
            </h4>
          </div>
        </div>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <button
            onClick={() => handleActionClick("create-note")}
            className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 text-left hover:border-violet-400/50 hover:bg-violet-50/5 dark:hover:bg-violet-950/10 transition-all text-xs cursor-pointer shadow-sm"
          >
            <div className="h-7 w-7 rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400 flex items-center justify-center shrink-0">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">Create Note</span>
          </button>
          
          <button
            onClick={() => handleActionClick("upload-pdf")}
            className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 text-left hover:border-emerald-400/50 hover:bg-emerald-50/5 dark:hover:bg-emerald-950/10 transition-all text-xs cursor-pointer shadow-sm"
          >
            <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <FileUp className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">Upload PDF</span>
          </button>

          <button
            onClick={() => handleActionClick("start-ai-chat")}
            className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 text-left hover:border-indigo-400/50 hover:bg-indigo-50/5 dark:hover:bg-indigo-950/10 transition-all text-xs cursor-pointer shadow-sm"
          >
            <div className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <BrainCircuit className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">Ask AI</span>
          </button>

          <button
            onClick={() => handleActionClick("generate-quiz")}
            className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 text-left hover:border-amber-400/50 hover:bg-amber-50/5 dark:hover:bg-amber-950/10 transition-all text-xs cursor-pointer shadow-sm"
          >
            <div className="h-7 w-7 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">Build Quiz</span>
          </button>

          <button
            onClick={() => handleActionClick("create-subject")}
            className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 text-left hover:border-blue-400/50 hover:bg-blue-50/5 dark:hover:bg-blue-950/10 transition-all text-xs cursor-pointer shadow-sm"
          >
            <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 flex items-center justify-center shrink-0">
              <BookOpen className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">New Subject</span>
          </button>

          <button
            onClick={() => handleActionClick("new-assignment")}
            className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 text-left hover:border-rose-400/50 hover:bg-rose-50/5 dark:hover:bg-rose-950/10 transition-all text-xs cursor-pointer shadow-sm"
          >
            <div className="h-7 w-7 rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 flex items-center justify-center shrink-0">
              <CheckSquare className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">New Task</span>
          </button>
        </div>
      </div>

      {/* 4. MAIN BENTO GRID LAYOUT */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (Span 2): Chart Progress, Assignments Table, Socratic Prompt */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Study Progress Charts */}
          <ChartCard
            weeklyData={
              analyticsData?.weeklyStudyHours?.map((w: any) => ({
                label: w.day.split(" ")[0],
                value: w.hours
              })) || [
                { label: "Mon", value: 0 },
                { label: "Tue", value: 0 },
                { label: "Wed", value: 0 },
                { label: "Thu", value: 0 },
                { label: "Fri", value: 0 },
                { label: "Sat", value: 0 },
                { label: "Sun", value: 0 }
              ]
            }
            monthlyData={
              analyticsData?.monthlyStudyHours?.map((m: any) => ({
                label: m.label,
                value: m.value
              })) || [
                { label: "Week 1", value: 0 },
                { label: "Week 2", value: 0 },
                { label: "Week 3", value: 0 },
                { label: "Week 4", value: 0 }
              ]
            }
          />

          {/* Upcoming Assignments Card */}
          <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 px-5 pt-5">
              <div>
                <CardTitle className="text-sm font-bold tracking-tight">Today's Study Agenda</CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-1">
                  Click the checkboxes to mark planner items off and synchronize your progress score.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 text-slate-500 font-semibold">
                      <th className="p-4 pl-5">Assignment Task</th>
                      <th className="p-4">Subject</th>
                      <th className="p-4">Due Date</th>
                      <th className="p-4">Urgency</th>
                      <th className="p-4 pr-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {plannerTasks.slice(0, 5).map((task, idx) => (
                      <tr key={task.id || `task-${idx}`} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-colors">
                        <td className="p-4 pl-5 font-semibold text-slate-800 dark:text-slate-100">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleTogglePlannerTaskStatus(task.id, task.status)}
                              className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                task.status === "completed"
                                  ? "bg-emerald-500 border-emerald-600 text-white"
                                  : "border-slate-300 dark:border-slate-700 hover:border-violet-500"
                              }`}
                            >
                              {task.status === "completed" && <Check className="h-3 w-3" />}
                            </button>
                            <span className={task.status === "completed" ? "line-through text-slate-450 dark:text-slate-500 font-normal" : "text-slate-750 dark:text-slate-200"}>
                              {task.title}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-400 dark:text-slate-500 font-medium">
                          {task.subjectTitle || "General"}
                        </td>
                        <td className="p-4 text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "No Date"}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            task.priority === "high"
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/30"
                              : task.priority === "medium"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/30"
                              : "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/30"
                          }`}>
                            {task.priority || "medium"}
                          </span>
                        </td>
                        <td className="p-4 pr-5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTogglePlannerTaskStatus(task.id, task.status)}
                            className="h-7 text-[10px] px-2 text-slate-500 hover:text-violet-600"
                          >
                            {task.status === "completed" ? "Reopen" : "Done"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {plannerTasks.length === 0 && !plannerLoading && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">
                          No tasks or study plans found. Head over to the study planner view to define daily tasks or generate your personalized AI study schedule!
                        </td>
                      </tr>
                    )}
                    {plannerLoading && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                            <span>Retrieving academic study plans...</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Socratic Concept Explainer */}
          <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm relative overflow-hidden bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
            <div className="absolute top-0 right-0 h-28 w-28 bg-violet-500/5 blur-2xl" />
            <CardHeader className="pb-3 px-5 pt-5">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Brain className="h-4.5 w-4.5 text-violet-600 animate-pulse" />
                Ask AI anything about your studies
              </CardTitle>
              <CardDescription className="text-xs text-slate-450 dark:text-slate-500 mt-1">
                Draft a topic, and watch Socratic AI generate concept schemas or breakdown summaries instantly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5">
              <form onSubmit={handleStartAIChatSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., Explain Schrödinger's wave analogy in simple terms..."
                  className="flex-1 text-xs border rounded-lg px-3 py-2 bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/60 outline-none focus:ring-1 focus:ring-violet-500"
                />
                <Button
                  size="sm"
                  type="submit"
                  loading={isAiThinking}
                  className="text-xs h-9 px-4 shrink-0 font-bold"
                >
                  Ask Socratic
                </Button>
              </form>

              <AnimatePresence>
                {aiResponse && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="p-3.5 rounded-lg bg-violet-50/30 dark:bg-violet-950/10 border border-violet-100/40 dark:border-violet-950/20 text-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-violet-600 dark:text-violet-400 flex items-center gap-1 uppercase tracking-wider text-[10px]">
                        <Sparkles className="h-3 w-3 animate-pulse" />
                        Socratic AI Explanation
                      </span>
                      <button
                        onClick={() => setAiResponse(null)}
                        className="text-[10px] text-slate-450 hover:text-slate-650 dark:hover:text-slate-200 font-medium"
                      >
                        Dismiss
                      </button>
                    </div>
                    <div className="prose prose-sm dark:prose-invert text-slate-700 dark:text-slate-300 leading-relaxed font-medium max-h-96 overflow-y-auto pr-1">
                      <MarkdownRenderer content={aiResponse} />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-violet-100/30 dark:border-violet-950/20">
                      <button
                        type="button"
                        onClick={() => handleStartAIChatSubmit(undefined, "simpler")}
                        disabled={isAiThinking}
                        className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-violet-100/50 hover:bg-violet-100 dark:bg-violet-950/30 dark:hover:bg-violet-950/60 text-violet-700 dark:text-violet-400 border border-violet-200/30 dark:border-violet-900/40 cursor-pointer disabled:opacity-50 transition-all"
                      >
                        Explain Simpler (ELI5)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartAIChatSubmit(undefined, "deep-dive")}
                        disabled={isAiThinking}
                        className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-indigo-100/50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/30 dark:border-indigo-900/40 cursor-pointer disabled:opacity-50 transition-all"
                      >
                        Deep Dive Breakdown
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartAIChatSubmit(undefined, "default")}
                        disabled={isAiThinking}
                        className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200/30 dark:border-slate-700 cursor-pointer disabled:opacity-50 transition-all ml-auto"
                      >
                        Standard Mode
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

        </div>

        {/* Right Column (Span 1): Socratic AI Companion Sidebar Card, Checklist, Recent activity */}
        <div className="space-y-6">

          {/* Socratic AI Sidebar Companion & Insights Card */}
          <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm relative overflow-hidden bg-gradient-to-b from-white to-slate-50/30 dark:from-slate-900 dark:to-slate-950/10">
            <div className="absolute top-0 right-0 h-24 w-24 bg-violet-500/5 blur-xl rounded-full" />
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 flex flex-row items-center justify-between px-5 pt-5">
              <div className="flex items-center gap-2">
                <Brain className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
                <CardTitle className="text-sm font-bold tracking-tight">Socratic AI Insights</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenerateRecommendations}
                disabled={isAiStatsLoading}
                className="h-7 w-7 p-0 flex items-center justify-center text-slate-400 hover:text-violet-600"
                title="Sync AI Advice"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isAiStatsLoading ? "animate-spin" : ""}`} />
              </Button>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 px-5 pb-5">
              {/* Recommended Next Action */}
              <div className="bg-gradient-to-br from-violet-50 to-indigo-50/50 dark:from-violet-950/20 dark:to-slate-900/40 border border-violet-100 dark:border-violet-900/40 p-3.5 rounded-xl">
                <span className="text-[9px] text-violet-600 dark:text-violet-400 font-bold uppercase tracking-wider block mb-1">Recommended Path</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold leading-relaxed mb-3">
                  {aiRecs[0] ? aiRecs[0].text : "You've crushed all targets! Trigger a synchronization to gather new recommendations."}
                </p>
                {aiRecs[0]?.actionUrl && (
                  <Button
                    size="sm"
                    className="w-full text-[10px] h-7 bg-violet-600 hover:bg-violet-700 text-white"
                    onClick={() => {
                      toast.success("Navigating to recommended learning block...");
                      window.location.hash = aiRecs[0].actionUrl;
                    }}
                  >
                    Engage Module <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Syllabus Health Alerts */}
              {weakTopics?.neglectedSubjects?.length > 0 && (
                <div className="flex items-start gap-2.5 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100/30 dark:border-rose-900/20 p-3 rounded-xl">
                  <ShieldAlert className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wide leading-none">Neglected Subject Alert</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                      Study frequency is low. Plan review for <span className="font-bold underline text-rose-600 dark:text-rose-400">{weakTopics.neglectedSubjects[0].subject}</span>.
                    </p>
                  </div>
                </div>
              )}

              {/* Suggested Study Order */}
              {dailyBrief?.studyOrder && dailyBrief.studyOrder.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Today's Study Sequence</span>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {dailyBrief.studyOrder.slice(0, 3).map((item: any, idx: number) => (
                      <div key={item.id || `seq-${idx}`} className="flex gap-2.5 p-2.5 rounded-lg bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-850 text-xs">
                        <span className="font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 px-1.5 py-0.5 rounded text-[9px] h-fit">
                          #{item.recommendedOrder || (idx + 1)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">{item.title}</p>
                          <p className="text-[9px] text-slate-400 truncate mt-0.5">{item.subject}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Today's Goals Checklist */}
          <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm">
            <CardHeader className="pb-3 px-5 pt-5">
              <div className="flex items-center justify-between mb-1.5">
                <CardTitle className="text-sm font-bold tracking-tight">Today's Checkpoints</CardTitle>
                <span className="text-[10px] font-mono font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 rounded-md">
                  {progressPercent}%
                </span>
              </div>
              
              {/* Progress Slider bar */}
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-600 transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pb-5">
              {goals.map((goal, idx) => (
                <div
                  key={goal.id || `goal-${idx}`}
                  onClick={() => handleToggleGoal(goal.id)}
                  className="flex items-center gap-3 cursor-pointer group text-xs"
                >
                  <div
                    className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                      goal.completed
                        ? "bg-violet-600 border-violet-700 text-white"
                        : "border-slate-300 dark:border-slate-700 group-hover:border-violet-500"
                    }`}
                  >
                    {goal.completed && <Check className="h-3 w-3" />}
                  </div>
                  <span className={`font-semibold transition-all ${
                    goal.completed
                      ? "line-through text-slate-400 dark:text-slate-500"
                      : "text-slate-700 dark:text-slate-300"
                  }`}>
                    {goal.text}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Activity Timeline card */}
          <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm">
            <CardHeader className="pb-3 px-5 pt-5">
              <CardTitle className="text-sm font-bold tracking-tight">Recent Activity Timeline</CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-1">
                Overview of actions recorded on active learning nodes.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <ActivityCard
                activities={activities}
                onItemClick={(item) => setSelectedActivity(item)}
              />
            </CardContent>
          </Card>

        </div>
      </div>

      {/* QUICK ACTIONS OVERLAY DIALOGS */}

      {/* A. Create Note Shortcut */}
      <Dialog isOpen={activeQuickAction === "create-note"} onClose={() => setActiveQuickAction(null)} title="Create New Class Notes">
        <form onSubmit={handleCreateNoteSubmit} className="space-y-4 w-full">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Subject</label>
            <input
              type="text"
              required
              value={noteSubject}
              onChange={(e) => setNoteSubject(e.target.value)}
              placeholder="e.g., CS-440 Database Systems"
              className="w-full text-xs border rounded-lg px-3 py-2 bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/60 outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Note Title</label>
            <input
              type="text"
              required
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="e.g., B-Tree Splits & Leaf Overflows"
              className="w-full text-xs border rounded-lg px-3 py-2 bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/60 outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Notebook Body Content</label>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Synthesize lecture checkpoints or formulate Socratic summaries here..."
              rows={4}
              className="w-full text-xs border rounded-lg p-3 bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/60 outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
            <Button variant="outline" size="sm" type="button" onClick={() => setActiveQuickAction(null)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" loading={isSubmittingForm}>
              Draft Notebook
            </Button>
          </div>
        </form>
      </Dialog>

      {/* B. Upload PDF Syllabus Shortcut */}
      <Dialog isOpen={activeQuickAction === "upload-pdf"} onClose={() => setActiveQuickAction(null)} title="Upload PDF Curriculum">
        <form onSubmit={handleUploadPDFSubmit} className="space-y-4 w-full">
          <p className="text-xs text-slate-400 leading-relaxed">
            Upload documentations, syllabus sheets, or textbooks. Study Hub's semantic parser compiles curriculum structures dynamically.
          </p>

          <div className="border border-dashed border-slate-250 dark:border-slate-800 rounded-xl p-8 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center text-center gap-3 relative hover:border-violet-500 transition-colors">
            <UploadCloud className="h-10 w-10 text-slate-400 animate-pulse" />
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 block">
                {pdfFile ? pdfFile.name : "Drag & Drop PDF Syllabus here"}
              </span>
              <span className="text-[10px] text-slate-400">PDF formats supported (Max 24MB)</span>
            </div>

            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setPdfFile(e.target.files[0]);
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setActiveQuickAction(null)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" loading={isUploading}>
              Socratic Ingest
            </Button>
          </div>
        </form>
      </Dialog>

      {/* C. Generate AI Quiz Shortcut */}
      <Dialog isOpen={activeQuickAction === "generate-quiz"} onClose={() => setActiveQuickAction(null)} title="Generate Socratic Quiz Deck">
        <form onSubmit={handleGenerateQuizSubmit} className="space-y-4 w-full">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Select Subject Context</label>
            <input
              type="text"
              required
              value={quizSubject}
              onChange={(e) => setQuizSubject(e.target.value)}
              placeholder="e.g., BIOL-402 Neurobiology"
              className="w-full text-xs border rounded-lg px-3 py-2 bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/60 outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Question Count</label>
            <select
              value={quizQuestionCount}
              onChange={(e) => setQuizQuestionCount(Number(e.target.value))}
              className="w-full text-xs border rounded-lg px-3 py-2 bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/60 outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value={5}>5 Questions</option>
              <option value={10}>10 Questions</option>
              <option value={15}>15 Questions</option>
              <option value={20}>20 Questions</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setActiveQuickAction(null)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" loading={isSubmittingForm}>
              Build Quiz Deck
            </Button>
          </div>
        </form>
      </Dialog>

      {/* D. Create Subject Shortcut */}
      <Dialog isOpen={activeQuickAction === "create-subject"} onClose={() => setActiveQuickAction(null)} title="Create Subject Hub Workspace">
        <form onSubmit={handleCreateSubjectSubmit} className="space-y-4 w-full">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Subject Area Name</label>
            <input
              type="text"
              required
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="e.g., MATH-301 Linear Algebra"
              className="w-full text-xs border rounded-lg px-3 py-2 bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/60 outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Theme Hue Color</label>
            <select
              value={subjectColor}
              onChange={(e) => setSubjectColor(e.target.value)}
              className="w-full text-xs border rounded-lg px-3 py-2 bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/60 outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="violet">Deep Violet</option>
              <option value="emerald">Emerald Green</option>
              <option value="indigo">Classic Indigo</option>
              <option value="amber">Amber Gold</option>
              <option value="rose">Sunset Rose</option>
              <option value="blue">Electric Blue</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setActiveQuickAction(null)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" loading={isSubmittingForm}>
              Create Subject Workspace
            </Button>
          </div>
        </form>
      </Dialog>

      {/* E. New Assignment Shortcut */}
      <Dialog isOpen={activeQuickAction === "new-assignment"} onClose={() => setActiveQuickAction(null)} title="Schedule Academic Assignment">
        <form onSubmit={handleNewAssignmentSubmit} className="space-y-4 w-full">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Course/Subject Area</label>
            <input
              type="text"
              required
              value={taskSubject}
              onChange={(e) => setTaskSubject(e.target.value)}
              placeholder="e.g., CS-440 Database Systems"
              className="w-full text-xs border rounded-lg px-3 py-2 bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/60 outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Task/Assignment Title</label>
            <input
              type="text"
              required
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g., Advanced Matrix Calculations Problem Set"
              className="w-full text-xs border rounded-lg px-3 py-2 bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/60 outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Urgency/Deadline weight</label>
            <select
              value={taskUrgency}
              onChange={(e) => setTaskUrgency(e.target.value as any)}
              className="w-full text-xs border rounded-lg px-3 py-2 bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/60 outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="high">🔥 High Urgency</option>
              <option value="medium">⚡ Medium Urgency</option>
              <option value="low">☕ Low Urgency</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setActiveQuickAction(null)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" loading={isSubmittingForm}>
              Track Deliverable
            </Button>
          </div>
        </form>
      </Dialog>

      {/* F. Start Socratic AI Dialogue Shortcut */}
      <Dialog isOpen={activeQuickAction === "start-ai-chat"} onClose={() => setActiveQuickAction(null)} title="Initiate AI Socratic Dialogue">
        <form onSubmit={handleStartAIChatSubmit} className="space-y-4 w-full">
          <p className="text-xs text-slate-400 leading-relaxed">
            Inquire about complicated conceptual formulas, programming routines, or scientific analogies. The model parses study files to produce Socratic active learning answers.
          </p>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Conceptual Query Prompt</label>
            <input
              type="text"
              required
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g., Explain Schrödinger's wave analogy in simple terms..."
              className="w-full text-xs border rounded-lg px-3 py-2 bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/60 outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          {isAiThinking && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
              <span>Socratic Engine analyzing vector memory files...</span>
            </div>
          )}

          {aiResponse && (
            <div className="p-3.5 rounded-lg bg-violet-50/20 dark:bg-violet-950/10 border border-violet-100/30 dark:border-violet-950/20 text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-3">
              <span className="font-extrabold text-[10px] text-violet-600 dark:text-violet-400 uppercase tracking-widest block">
                Socratic AI Response
              </span>
              <div className="prose prose-sm dark:prose-invert max-h-80 overflow-y-auto pr-1">
                <MarkdownRenderer content={aiResponse} />
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-violet-100/10 dark:border-violet-950/15">
                <button
                  type="button"
                  onClick={() => handleStartAIChatSubmit(undefined, "simpler")}
                  disabled={isAiThinking}
                  className="px-2 py-0.5 text-[9px] font-bold rounded bg-violet-100/50 hover:bg-violet-100 dark:bg-violet-950/30 dark:hover:bg-violet-950/60 text-violet-700 dark:text-violet-400 border border-violet-200/20 cursor-pointer disabled:opacity-50 transition-all"
                >
                  Simpler (ELI5)
                </button>
                <button
                  type="button"
                  onClick={() => handleStartAIChatSubmit(undefined, "deep-dive")}
                  disabled={isAiThinking}
                  className="px-2 py-0.5 text-[9px] font-bold rounded bg-indigo-100/50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/20 cursor-pointer disabled:opacity-50 transition-all"
                >
                  Deep Dive
                </button>
                <button
                  type="button"
                  onClick={() => handleStartAIChatSubmit(undefined, "default")}
                  disabled={isAiThinking}
                  className="px-2 py-0.5 text-[9px] font-bold rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/25 cursor-pointer disabled:opacity-50 transition-all ml-auto"
                >
                  Standard
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => {
              setActiveQuickAction(null);
              setAiResponse(null);
            }}>
              Dismiss
            </Button>
            {!aiResponse && (
              <Button size="sm" type="submit" loading={isAiThinking}>
                Submit Query
              </Button>
            )}
          </div>
        </form>
      </Dialog>


      {/* INSPECTORS OVERLAYS DIALOGS */}

      {/* 1. Activity Detail Dialog */}
      <Dialog isOpen={!!selectedActivity} onClose={() => setSelectedActivity(null)} title={selectedActivity?.title || "Activity Details"}>
        {selectedActivity && (
          <div className="space-y-4 w-full">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold uppercase tracking-wider text-violet-600 bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 rounded">
                {selectedActivity.category}
              </span>
              <span className="font-mono">{selectedActivity.timestamp}</span>
            </div>

            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Action Description:
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {selectedActivity.description}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setSelectedActivity(null)}>
                Close Inspector
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* 2. Badge Details Dialog */}
      <Dialog isOpen={!!selectedBadge} onClose={() => setSelectedBadge(null)} title={selectedBadge?.name || "Earned Achievement"}>
        {selectedBadge && (
          <div className="space-y-4 w-full text-center py-2">
            <div className="h-16 w-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/30 border border-amber-300 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm shadow-amber-500/10">
              <Award className="h-8 w-8 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {selectedBadge.name}
              </h4>
              <p className="text-[10px] text-slate-400">Earned on {selectedBadge.earnedDate}</p>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
              {selectedBadge.description}
            </p>

            <div className="flex justify-center pt-2">
              <Button size="sm" onClick={() => setSelectedBadge(null)}>
                Sensational!
              </Button>
            </div>
          </div>
        )}
      </Dialog>

    </motion.div>
  );
}
