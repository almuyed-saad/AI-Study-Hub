import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../auth/hooks/use-auth.tsx";
import { useToast } from "../../../components/ui/Toast.tsx";
import { Button } from "../../../components/ui/Button.tsx";
import { Dialog } from "../../../components/ui/Dialog.tsx";
import { Card, CardContent } from "../../../components/ui/Card.tsx";
import {
  Sparkles,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Edit3,
  CheckCircle,
  Clock,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileText,
  HelpCircle,
  X,
  List,
  Check,
  Search,
  SlidersHorizontal,
  BrainCircuit,
  Loader2,
  ArrowRight,
  BellRing
} from "lucide-react";

interface Subject {
  id: number;
  title: string;
  color: string;
}

interface StudyTask {
  id: number;
  userId: string;
  subjectId: number | null;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: "high" | "medium" | "low";
  status: "pending" | "completed";
  order: number;
  subjectTitle?: string;
  subjectColor?: string;
}

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

interface Quiz {
  id: number;
  title: string;
  subjectId?: number;
}

export function PlannerView() {
  const { firebaseUser } = useAuth();
  const toast = useToast();

  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState<"tasks" | "calendar" | "revision">("tasks");
  const [calendarSubTab, setCalendarSubTab] = useState<"month" | "week" | "day">("month");

  // Core Data States
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // AI Revision Specific States
  const [revisionType, setRevisionType] = useState<"daily" | "weekly">("weekly");
  const [revisionPlan, setRevisionPlan] = useState<any>(null);
  const [isRevisionLoading, setIsRevisionLoading] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Drag and Drop States
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Dialog States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Form Fields
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<"high" | "medium" | "low">("medium");
  const [taskSubjectId, setTaskSubjectId] = useState<string>("");
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);

  // AI Form Fields
  const [examDate, setExamDate] = useState("");
  const [availableHours, setAvailableHours] = useState("10");
  const [aiSelectedSubjects, setAiSelectedSubjects] = useState<string[]>([]);
  const [additionalGoals, setAdditionalGoals] = useState("");

  // Calendar Specific States
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date | null>(new Date());

  const fetchRevisionPlan = async (type: "daily" | "weekly") => {
    setIsRevisionLoading(true);
    try {
      const res = await fetch(`/api/productivity/revision-plan?type=${type}`);
      const data = await res.json();
      if (data.success && data.plan) {
        setRevisionPlan(data.plan);
      } else {
        setRevisionPlan(null);
      }
    } catch (err) {
      console.error("Error fetching revision plan:", err);
    } finally {
      setIsRevisionLoading(false);
    }
  };

  const handleGenerateRevisionPlan = async () => {
    setIsRevisionLoading(true);
    try {
      const res = await fetch("/api/productivity/revision-plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: revisionType })
      });
      const data = await res.json();
      if (data.success && data.plan) {
        setRevisionPlan(data.plan);
        toast.success(`Successfully generated AI ${revisionType} revision schedule! 🚀`);
      } else {
        toast.error("Failed to generate revision schedule.");
      }
    } catch (err) {
      console.error(err);
      toast.error("AI service timed out.");
    } finally {
      setIsRevisionLoading(false);
    }
  };

  // Fetch initial planner data
  const fetchPlannerData = async () => {
    setIsLoading(true);
    try {
      const [tasksRes, subjectsRes, notifRes, quizzesRes] = await Promise.all([
        fetch("/api/planner/tasks").then((r) => r.json()),
        fetch("/api/subjects").then((r) => r.json()),
        fetch("/api/planner/notifications").then((r) => r.json()),
        fetch("/api/learning/quizzes").then((r) => r.json()).catch(() => ({ quizzes: [] }))
      ]);

      if (tasksRes.success) setTasks(tasksRes.tasks || []);
      if (subjectsRes.subjects) setSubjects(subjectsRes.subjects || []);
      if (notifRes.success) setNotifications(notifRes.notifications || []);
      if (quizzesRes.success) setQuizzes(quizzesRes.quizzes || []);
    } catch (error) {
      console.error("Error loading study planner data:", error);
      toast.error("Failed to sync some study planner components.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlannerData();
    fetchRevisionPlan("weekly");
  }, []);

  // Sync / check reminders on sub-view load
  const triggerReminderCheck = async () => {
    try {
      const res = await fetch("/api/planner/notifications");
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error("Error refreshing study notifications:", e);
    }
  };

  // Add Task Handler
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast.error("Please enter a valid task title.");
      return;
    }

    try {
      const response = await fetch("/api/planner/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc,
          dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : undefined,
          priority: taskPriority,
          subjectId: taskSubjectId ? parseInt(taskSubjectId, 10) : undefined,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Study task scheduled successfully!");
        setTasks((prev) => [...prev, data.task]);
        setIsAddOpen(false);
        resetForm();
        triggerReminderCheck();
      } else {
        toast.error(data.error || "Failed to add study task.");
      }
    } catch (error) {
      console.error("Add task error:", error);
      toast.error("Network error. Please try again.");
    }
  };

  // Edit Task Handler
  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !taskTitle.trim()) return;

    try {
      const response = await fetch(`/api/planner/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc,
          dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : null,
          priority: taskPriority,
          subjectId: taskSubjectId ? parseInt(taskSubjectId, 10) : null,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Study task updated successfully.");
        // Refetch to ensure joined attributes are synced properly
        const freshTasksRes = await fetch("/api/planner/tasks").then((r) => r.json());
        if (freshTasksRes.success) setTasks(freshTasksRes.tasks);
        setIsEditOpen(false);
        resetForm();
        triggerReminderCheck();
      } else {
        toast.error(data.error || "Failed to update study task.");
      }
    } catch (error) {
      console.error("Edit task error:", error);
      toast.error("Failed to update study task.");
    }
  };

  // Delete Task Handler
  const handleDeleteTask = async (taskId: number) => {
    try {
      const response = await fetch(`/api/planner/tasks/${taskId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Study task removed.");
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        triggerReminderCheck();
      } else {
        toast.error(data.error || "Failed to delete task.");
      }
    } catch (error) {
      console.error("Delete task error:", error);
      toast.error("Failed to delete study task.");
    }
  };

  // Toggle Completion Status Handler
  const handleToggleStatus = async (task: StudyTask) => {
    const nextStatus = task.status === "pending" ? "completed" : "pending";
    try {
      const response = await fetch(`/api/planner/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(
          nextStatus === "completed" ? "Goal completed! 🎉" : "Task marked as active."
        );
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
        );
        triggerReminderCheck();
      }
    } catch (error) {
      console.error("Toggle status error:", error);
      toast.error("Failed to update task status.");
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedTaskId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggedTaskId === null || draggedTaskId === targetId) return;

    const dragIdx = tasks.findIndex((t) => t.id === draggedTaskId);
    const dropIdx = tasks.findIndex((t) => t.id === targetId);

    if (dragIdx === -1 || dropIdx === -1) return;

    const updatedTasks = [...tasks];
    const [draggedItem] = updatedTasks.splice(dragIdx, 1);
    updatedTasks.splice(dropIdx, 0, draggedItem);

    setTasks(updatedTasks);

    // Save reorder
    try {
      const response = await fetch("/api/planner/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: updatedTasks.map((t) => t.id) }),
      });
      const data = await response.json();
      if (!data.success) {
        toast.error("Failed to save task arrangement.");
      }
    } catch (e) {
      console.error("Reorder tasks error:", e);
    } finally {
      setDraggedTaskId(null);
    }
  };

  // AI Plan Generation Handler
  const handleAiPlanGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examDate) {
      toast.error("Please provide a target exam date.");
      return;
    }
    if (aiSelectedSubjects.length === 0) {
      toast.error("Please pick at least one subject to generate study schedules.");
      return;
    }

    setIsAiLoading(true);
    try {
      const response = await fetch("/api/planner/ai-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examDate,
          availableHours: parseInt(availableHours, 10),
          subjects: aiSelectedSubjects,
          additionalInfo: additionalGoals,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`AI generated ${data.tasks.length} optimized study schedules! 🚀`);
        // Refresh planner
        const freshTasksRes = await fetch("/api/planner/tasks").then((r) => r.json());
        if (freshTasksRes.success) setTasks(freshTasksRes.tasks);
        setIsAiOpen(false);
        triggerReminderCheck();
      } else {
        toast.error(data.error || "AI could not complete study scheduling.");
      }
    } catch (error) {
      console.error("AI Planner error:", error);
      toast.error("AI service timed out. Please try again.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Notification Mark Read Handler
  const handleMarkNotificationsRead = async () => {
    try {
      const response = await fetch("/api/planner/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        toast.success("Clear notifications list.");
      }
    } catch (error) {
      console.error("Mark notifications read error:", error);
    }
  };

  const openAddDialog = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const openEditDialog = (task: StudyTask) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description || "");
    setTaskDueDate(task.dueDate ? new Date(task.dueDate).toISOString().substring(0, 16) : "");
    setTaskPriority(task.priority);
    setTaskSubjectId(task.subjectId ? task.subjectId.toString() : "");
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setTaskTitle("");
    setTaskDesc("");
    setTaskDueDate("");
    setTaskPriority("medium");
    setTaskSubjectId("");
    setEditingTask(null);
  };

  const toggleAiSubjectSelection = (title: string) => {
    setAiSelectedSubjects((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  // Filter study tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && task.status === "pending") ||
      (statusFilter === "completed" && task.status === "completed");
    const matchesSubject =
      subjectFilter === "all" || task.subjectId?.toString() === subjectFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesSubject && matchesPriority;
  });

  // Calendar Helpers
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Filter tasks, quizzes, etc for a specific day
  const getEventsForDate = (date: Date) => {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    const dayTasks = tasks.filter((t) => {
      if (!t.dueDate) return false;
      const tTime = new Date(t.dueDate).getTime();
      return tTime >= startOfDay && tTime < endOfDay;
    });

    // Mock up some events for quizzes/reminder matching if they fall on this day
    const dayQuizzes = quizzes.filter((q) => {
      // For calendar simulation, match subjectId if the subject has a task today
      return false; 
    });

    return [...dayTasks.map(t => ({ ...t, type: "task" }))];
  };

  // Generate calendar grid
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const calendarDays = [];
  // Padding for first day
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(new Date(year, month, i));
  }

  // Active day details (for side checklist panel)
  const activeDayEvents = selectedCalendarDay ? getEventsForDate(selectedCalendarDay) : [];

  // Color mappings
  const getPriorityBadgeColor = (p: string) => {
    switch (p) {
      case "high": return "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50";
      case "medium": return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50";
      default: return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50";
    }
  };

  const getSubjectBadgeStyle = (color?: string) => {
    const c = color || "violet";
    return `bg-${c}-50 dark:bg-${c}-950/20 text-${c}-600 dark:text-${c}-400 border border-${c}-200/50 dark:border-${c}-800/30`;
  };

  return (
    <div id="study-planner-container" className="w-full max-w-7xl mx-auto space-y-6">
      
      {/* Dynamic Coaching Header with Quick Action and AI Trigger */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
              <CalendarIcon className="h-5 w-5" />
            </span>
            <h1 className="text-xl md:text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-slate-50">
              Smart Study Planner
            </h1>
          </div>
          <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
            Schedule lectures, arrange assignment due-dates, track recall tests, and generate AI-driven study calendars perfectly calibrated to your exams.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Plan My Study Trigger */}
          <button
            onClick={() => {
              setExamDate("");
              setAdditionalGoals("");
              setAiSelectedSubjects(subjects.map(s => s.title).slice(0, 3));
              setIsAiOpen(true);
            }}
            className="h-9 px-3.5 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:text-violet-800 dark:bg-violet-950/20 dark:text-violet-300 dark:hover:bg-violet-950/40 font-semibold flex items-center gap-1.5 text-xs shadow-sm transition-all cursor-pointer"
          >
            <BrainCircuit className="h-4 w-4 animate-pulse" />
            <span>AI Plan My Study</span>
          </button>

          {/* Add Study Task trigger */}
          <button
            onClick={openAddDialog}
            className="h-9 px-3.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold flex items-center gap-1 text-xs shadow-sm shadow-violet-500/10 cursor-pointer transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add Study Task</span>
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center justify-between border-b border-slate-200/40 dark:border-slate-800/40 pb-px">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("tasks")}
            className={`pb-2.5 text-xs font-semibold border-b-2 px-1 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "tasks"
                ? "border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400"
                : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <List className="h-4 w-4" />
            <span>Study Tasks ({tasks.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={`pb-2.5 text-xs font-semibold border-b-2 px-1 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "calendar"
                ? "border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400"
                : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <CalendarIcon className="h-4 w-4" />
            <span>Unified Calendar</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("revision");
              fetchRevisionPlan(revisionType);
            }}
            className={`pb-2.5 text-xs font-semibold border-b-2 px-1 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "revision"
                ? "border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400"
                : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <BrainCircuit className="h-4 w-4" />
            <span>AI Revision Planner</span>
          </button>
        </div>

        {/* Notifications & warnings pill */}
        {notifications.filter(n => !n.read).length > 0 && (
          <button
            onClick={handleMarkNotificationsRead}
            className="px-2 py-1 rounded-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold flex items-center gap-1 border border-rose-200/40 transition-all"
            title="Mark all study notifications as read"
          >
            <BellRing className="h-3 w-3 text-rose-500" />
            <span>{notifications.filter(n => !n.read).length} Unresolved Warnings</span>
            <X className="h-2.5 w-2.5 ml-1 text-rose-400" />
          </button>
        )}
      </div>

      {/* VIEW PANEL CONDITIONAL */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-24 space-y-3"
          >
            <Loader2 className="h-8 w-8 text-violet-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Synchronizing curriculum boards...</p>
          </motion.div>
        ) : activeTab === "tasks" ? (
          <motion.div
            key="tasks-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 p-3 rounded-xl shadow-sm">
              <div className="flex items-center flex-1 max-w-sm border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 px-2.5 py-1.5 rounded-lg text-xs">
                <Search className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Search scheduled tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent outline-none border-none text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none font-semibold text-slate-800 dark:text-slate-100 shadow-sm cursor-pointer hover:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all duration-150"
                >
                  <option value="all" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">All States</option>
                  <option value="pending" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Pending</option>
                  <option value="completed" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Completed</option>
                </select>

                {/* Subject Filter */}
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none font-semibold text-slate-800 dark:text-slate-100 shadow-sm cursor-pointer hover:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all duration-150"
                >
                  <option value="all" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">All Subjects</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id.toString()} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                      {sub.title}
                    </option>
                  ))}
                </select>

                {/* Priority Filter */}
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none font-semibold text-slate-800 dark:text-slate-100 shadow-sm cursor-pointer hover:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all duration-150"
                >
                  <option value="all" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">All Priorities</option>
                  <option value="high" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">High Priority</option>
                  <option value="medium" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Medium Priority</option>
                  <option value="low" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Low Priority</option>
                </select>
              </div>
            </div>

            {/* Draggable Task List */}
            {filteredTasks.length > 0 ? (
              <div className="space-y-2.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  💡 Hint: Grab any task block and drag to arrange curriculum queue priorities
                </p>
                {filteredTasks.map((task) => {
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status === "pending";
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, task.id)}
                      className={`group relative flex items-start gap-4 p-4 border rounded-xl bg-white dark:bg-slate-900 transition-all hover:shadow-md cursor-grab active:cursor-grabbing ${
                        task.status === "completed"
                          ? "border-slate-200/50 opacity-65 dark:border-slate-800/40"
                          : isOverdue
                          ? "border-rose-200 dark:border-rose-950 bg-rose-50/10"
                          : "border-slate-200/70 dark:border-slate-800/80"
                      } ${draggedTaskId === task.id ? "opacity-30 border-dashed border-violet-500" : ""}`}
                    >
                      {/* Checkbox Trigger */}
                      <button
                        onClick={() => handleToggleStatus(task)}
                        className={`mt-1 h-5 w-5 shrink-0 rounded border flex items-center justify-center transition-all cursor-pointer ${
                          task.status === "completed"
                            ? "bg-violet-600 border-violet-600 text-white shadow-sm"
                            : isOverdue
                            ? "border-rose-400 hover:bg-rose-50/30 text-rose-500"
                            : "border-slate-300 dark:border-slate-700 hover:border-violet-500 dark:hover:border-violet-400 text-transparent"
                        }`}
                      >
                        <Check className="h-3 w-3 font-extrabold stroke-[3]" />
                      </button>

                      {/* Content block */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <h3
                            className={`text-xs font-bold truncate tracking-tight text-slate-800 dark:text-slate-100 ${
                              task.status === "completed" ? "line-through text-slate-400 dark:text-slate-600" : ""
                            }`}
                          >
                            {task.title}
                          </h3>

                          {/* Subject Badge */}
                          {task.subjectTitle && (
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-${task.subjectColor || "violet"}-50 text-${task.subjectColor || "violet"}-600 dark:bg-${task.subjectColor || "violet"}-950/20 dark:text-${task.subjectColor || "violet"}-400 border border-${task.subjectColor || "violet"}-200/40`}
                            >
                              {task.subjectTitle}
                            </span>
                          )}

                          {/* Priority Badge */}
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${getPriorityBadgeColor(task.priority)}`}>
                            {task.priority}
                          </span>

                          {/* Overdue Warning */}
                          {isOverdue && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 text-[9px] font-bold border border-rose-200/50 uppercase">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Overdue</span>
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-xs text-slate-500 leading-relaxed mb-2 max-w-2xl line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        {/* Metadata line */}
                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                            <Clock className="h-3 w-3" />
                            <span>Due on: {new Date(task.dueDate).toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        {deleteConfirmId === task.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/20 px-2 py-1 rounded-lg border border-rose-200/50 dark:border-rose-900/30">
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider mr-1">Delete?</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task.id);
                                setDeleteConfirmId(null);
                              }}
                              className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(null);
                              }}
                              className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="md:opacity-0 md:group-hover:opacity-100 flex items-center gap-1.5 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(task);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                              title="Edit task parameters"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(task.id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg cursor-pointer"
                              title="Delete study task"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Card className="border-dashed border-slate-200 dark:border-slate-800">
                <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900 text-slate-400">
                    <List className="h-6 w-6" />
                  </div>
                  <div className="text-center max-w-sm space-y-1">
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">No scheduled study tasks</h3>
                    <p className="text-xs text-slate-400">
                      Your calendar is completely clean. Click "AI Plan My Study" to populate your workspace instantly with an optimized syllabus.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAiOpen(true)}
                    className="h-8 px-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold flex items-center gap-1 text-xs shadow-sm transition-all cursor-pointer"
                  >
                    <BrainCircuit className="h-3.5 w-3.5" />
                    <span>Generate AI Schedule</span>
                  </button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        ) : activeTab === "calendar" ? (
          <motion.div
            key="calendar-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Calendar Primary Block (Left / 2 Cols) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl shadow-sm space-y-4">
              
              {/* Calendar subheader & view selector */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/40 dark:border-slate-700/50 text-slate-500"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    {monthNames[month]} {year}
                  </span>
                  <button
                    onClick={handleNextMonth}
                    className="p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/40 dark:border-slate-700/50 text-slate-500"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center border border-slate-200/50 dark:border-slate-800 p-0.5 rounded-lg bg-slate-50 dark:bg-slate-950/30 text-[10px] font-bold">
                  {(["month", "week", "day"] as const).map((view) => (
                    <button
                      key={view}
                      onClick={() => setCalendarSubTab(view)}
                      className={`px-2 py-1 rounded-md capitalize transition-all cursor-pointer ${
                        calendarSubTab === view
                          ? "bg-white dark:bg-slate-800 shadow-sm text-violet-600 dark:text-violet-400"
                          : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      }`}
                    >
                      {view}
                    </button>
                  ))}
                </div>
              </div>

              {/* CALENDAR BODY */}
              {calendarSubTab === "month" ? (
                <div>
                  {/* Weekday Names */}
                  <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] uppercase tracking-wider text-slate-400 mb-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="py-1">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Day Grid */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {calendarDays.map((day, idx) => {
                      if (!day) {
                        return <div key={`empty-${idx}`} className="h-14 bg-slate-50/20 dark:bg-slate-950/5 rounded-lg border border-transparent" />;
                      }

                      const dayEvents = getEventsForDate(day);
                      const isToday = day.toDateString() === new Date().toDateString();
                      const isSelected = selectedCalendarDay && day.toDateString() === selectedCalendarDay.toDateString();

                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => setSelectedCalendarDay(day)}
                          className={`h-16 p-1 rounded-lg border text-left flex flex-col justify-between transition-all group relative cursor-pointer ${
                            isSelected
                              ? "bg-violet-50/30 border-violet-500/80 dark:border-violet-500 dark:bg-violet-950/10"
                              : isToday
                              ? "border-violet-300 bg-slate-50/50 dark:border-violet-800/60"
                              : "border-slate-100/70 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50/60 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <span
                            className={`text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full ${
                              isToday
                                ? "bg-violet-600 text-white"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {day.getDate()}
                          </span>

                          {/* Events Display Inside Grid Day */}
                          <div className="flex flex-wrap gap-0.5 mt-1 overflow-hidden h-6">
                            {dayEvents.slice(0, 3).map((event: any, eIdx) => (
                              <span
                                key={event.id}
                                className={`h-1.5 w-1.5 rounded-full bg-${event.subjectColor || "violet"}-500`}
                                title={event.title}
                              />
                            ))}
                            {dayEvents.length > 3 && (
                              <span className="text-[7px] text-slate-400 font-bold">+{dayEvents.length - 3}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : calendarSubTab === "week" ? (
                <div className="space-y-3">
                  {/* Week layout */}
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                    Agenda Schedule for the selected month range
                  </p>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const d = new Date(currentDate);
                      d.setDate(d.getDate() - d.getDay() + i);
                      const dayEvents = getEventsForDate(d);

                      return (
                        <div key={i} className="py-3 flex items-start gap-4">
                          <div className="w-16 shrink-0">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {d.toLocaleDateString("en-US", { weekday: "short" })}
                            </p>
                            <p className="text-[10px] text-slate-400 font-semibold">{d.getDate()} {monthNames[d.getMonth()].slice(0, 3)}</p>
                          </div>
                          <div className="flex-1 space-y-1.5">
                            {dayEvents.length > 0 ? (
                              dayEvents.map((evt: any) => (
                                <div
                                  key={evt.id}
                                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`h-2 w-2 rounded-full bg-${evt.subjectColor || "violet"}-500`} />
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{evt.title}</span>
                                  </div>
                                  <span className="text-[9px] text-slate-400">{evt.dueDate ? new Date(evt.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "No time"}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-400 italic">No scheduled study modules</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Daily Timeline */}
                  <div className="flex items-center justify-between border-b pb-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Timeline for {selectedCalendarDay ? selectedCalendarDay.toLocaleDateString() : "Selected Day"}
                    </p>
                  </div>
                  <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-4 pl-6 space-y-6 py-2">
                    {/* Hourly Blocks */}
                    {["09:00 AM", "11:00 AM", "01:00 PM", "03:00 PM", "05:00 PM", "07:00 PM"].map((hour, idx) => {
                      // Match events closest to this hour for illustrative flow
                      const matchingTask = selectedCalendarDay ? getEventsForDate(selectedCalendarDay)[idx] : null;

                      return (
                        <div key={hour} className="relative">
                          {/* Timeline dot */}
                          <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-slate-300 dark:border-slate-900 dark:bg-slate-700" />
                          <p className="text-[10px] text-slate-400 font-bold mb-1">{hour}</p>

                          {matchingTask ? (
                            <div className="p-3 rounded-lg border border-violet-100 bg-violet-50/20 dark:border-violet-950/40 dark:bg-violet-950/5 max-w-lg">
                              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{matchingTask.title}</h4>
                              {matchingTask.description && (
                                <p className="text-[11px] text-slate-500 mt-0.5">{matchingTask.description}</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic pl-1">Self-directed review segment</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Checklist Drawer Panel (Right / 1 Col) */}
            <div className="space-y-4">
              <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm bg-slate-50/50 dark:bg-slate-900/30">
                <CardContent className="p-4 space-y-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Day Agenda
                    </h3>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                      {selectedCalendarDay ? selectedCalendarDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "None Selected"}
                    </p>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {activeDayEvents.length > 0 ? (
                      activeDayEvents.map((evt: any) => (
                        <div
                          key={evt.id}
                          className="p-3 rounded-lg border border-slate-100 dark:border-slate-800/85 bg-white dark:bg-slate-900 shadow-xs space-y-1"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full bg-${evt.subjectColor || "violet"}-500`} />
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate flex-1">
                              {evt.title}
                            </h4>
                          </div>
                          {evt.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 leading-normal">
                              {evt.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold pt-1">
                            <span className="uppercase">{evt.priority} priority</span>
                            {evt.dueDate && (
                              <span>{new Date(evt.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic py-8 text-center">
                        No scheduled deliverables on this date.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        ) : activeTab === "revision" ? (
          <motion.div
            key="revision-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Revision Planner Banner Header */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-700 rounded-xl p-5 md:p-6 text-white border border-violet-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-amber-300 animate-pulse" />
                  AI Revision Planner & Topic Prioritization
                </h3>
                <p className="text-xs text-violet-100/90 leading-relaxed mt-1 max-w-2xl">
                  Gemini analyzes your historical quiz performance, study logs, and upcoming assignment deadlines to generate structured revision schedules. Weakest syllabus elements are dynamically prioritized.
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                {/* Daily / Weekly Choice */}
                <div className="bg-white/10 p-1 rounded-lg flex border border-white/10 text-xs">
                  <button
                    onClick={() => {
                      setRevisionType("weekly");
                      fetchRevisionPlan("weekly");
                    }}
                    type="button"
                    className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      revisionType === "weekly"
                        ? "bg-white text-violet-950 shadow-xs"
                        : "text-white hover:bg-white/25 hover:text-white"
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => {
                      setRevisionType("daily");
                      fetchRevisionPlan("daily");
                    }}
                    type="button"
                    className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      revisionType === "daily"
                        ? "bg-white text-violet-950 shadow-xs"
                        : "text-white hover:bg-white/25 hover:text-white"
                    }`}
                  >
                    Daily
                  </button>
                </div>
                <Button
                  onClick={handleGenerateRevisionPlan}
                  disabled={isRevisionLoading}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-900 border-none text-xs font-bold h-9 px-4 shrink-0 flex items-center gap-1.5"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate AI Plan
                </Button>
              </div>
            </div>

            {/* Loading Indicator */}
            {isRevisionLoading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                <p className="text-xs font-medium">Socratic engine synthesizing weak areas and building schedule blocks...</p>
              </div>
            ) : revisionPlan ? (
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Left side: Schedule Blocks (Spans 2) */}
                <div className="lg:col-span-2 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Your {revisionType === "weekly" ? "Weekly Revision Calendar" : "Daily Revision Steps"}
                  </h4>

                  {revisionType === "weekly" ? (
                    /* WEEKLY VIEW BLOCK */
                    <div className="space-y-4">
                      {revisionPlan.weeklySchedule?.map((day: any) => (
                        <Card key={day.dayOfWeek} className="border-slate-200/50 dark:border-slate-800 shadow-xs overflow-hidden">
                          <div className="bg-slate-50/50 dark:bg-slate-900/50 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-display">
                              {day.dayOfWeek}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-400">
                              {day.revisionBlocks?.length || 0} Block(s) scheduled
                            </span>
                          </div>
                          <CardContent className="p-4 space-y-3.5">
                            {day.revisionBlocks && day.revisionBlocks.length > 0 ? (
                              <div className="grid gap-3 sm:grid-cols-2">
                                {day.revisionBlocks.map((block: any, bIdx: number) => {
                                  const priorityColors = {
                                    high: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200/20",
                                    medium: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/20",
                                    low: "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-250/20"
                                  } as any;
                                  return (
                                    <div key={bIdx} className="bg-slate-50/40 dark:bg-slate-900/40 p-4.5 border border-slate-200/40 dark:border-slate-800/60 rounded-xl space-y-3 flex flex-col justify-between">
                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between gap-1.5 text-[9px] font-bold">
                                          <span className="text-violet-600 dark:text-violet-400 uppercase tracking-wide font-extrabold">
                                            {block.subject}
                                          </span>
                                          <span className={`px-1.5 py-0.25 rounded uppercase text-[8px] ${priorityColors[block.priority || "medium"]}`}>
                                            {block.priority || "medium"}
                                          </span>
                                        </div>
                                        <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                          {block.focusTopic}
                                        </h5>
                                        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                                          {block.why}
                                        </p>
                                      </div>

                                      <div className="border-t border-slate-100 dark:border-slate-800/60 pt-3 flex items-center justify-between gap-1.5 text-[10px] font-semibold text-slate-400 mt-2">
                                        <div className="flex items-center gap-1">
                                          <Clock className="h-3 w-3 text-slate-400" />
                                          <span>{block.recommendedDurationMinutes} mins</span>
                                        </div>
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            toast.success(`Active Revision: Opening ${block.focusTopic} review...`);
                                            window.location.hash = "/dashboard/learning/chatbot";
                                          }}
                                          className="h-6.5 text-[9px] px-2 bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-100 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-900/40 font-bold"
                                        >
                                          Start Revision
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic py-2">No revision blocks scheduled. Complete rest or self-directed study segments.</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    /* DAILY VIEW BLOCK */
                    <div className="space-y-3">
                      {revisionPlan.dailySchedule?.map((block: any, bIdx: number) => {
                        const priorityColors = {
                          high: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200/20",
                          medium: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/20",
                          low: "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-250/20"
                        } as any;
                        return (
                          <div key={bIdx} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-[10px] text-violet-600 dark:text-violet-400 uppercase tracking-wide">
                                  {block.subject}
                                </span>
                                <span className="text-[10px] text-slate-300">•</span>
                                <span className={`px-1.5 py-0.25 rounded text-[8px] font-bold uppercase ${priorityColors[block.priority || "medium"]}`}>
                                  {block.priority || "medium"}
                                </span>
                              </div>
                              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                {block.focusTopic}
                              </h5>
                              <p className="text-[11px] text-slate-500 leading-relaxed max-w-xl">
                                {block.why}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                              <div className="flex items-center gap-1 font-mono text-xs font-bold text-slate-400">
                                <Clock className="h-3.5 w-3.5 text-slate-300" />
                                <span>{block.recommendedDurationMinutes} mins</span>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => {
                                  toast.success(`Navigating to study chat...`);
                                  window.location.hash = "/dashboard/learning/chatbot";
                                }}
                                className="h-7 text-[10px] px-2.5 bg-violet-600 hover:bg-violet-700 text-white"
                              >
                                Revise Topic
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right side: Coaching Context panel */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Study Coach Advice
                  </h4>

                  <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm bg-slate-50/50 dark:bg-slate-900/30">
                    <CardContent className="p-4 space-y-4">
                      {/* Strategic Coach Insight */}
                      {revisionPlan.strategicInsight && (
                        <div className="space-y-1.5 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Core Coach Advice:</span>
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                            "{revisionPlan.strategicInsight}"
                          </p>
                        </div>
                      )}

                      {/* Flashcard/Quiz/Material Guidance */}
                      <div className="space-y-3">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Recommended Revision Tools:</span>

                        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/40 dark:border-slate-800 shadow-xs flex items-center justify-between">
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Review Decks</p>
                            <p className="text-[10px] text-slate-400 font-medium">Use dynamic active recall cards</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => window.location.hash = "/dashboard/learning/flashcards"}
                            className="h-6.5 text-[9px] px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                          >
                            Decks
                          </Button>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/40 dark:border-slate-800 shadow-xs flex items-center justify-between">
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Take Quiz</p>
                            <p className="text-[10px] text-slate-400 font-medium">Test active topic comprehension</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => window.location.hash = "/dashboard/learning/quizzes"}
                            className="h-6.5 text-[9px] px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                          >
                            Quizzes
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Visual Onboarding Guide */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="text-center max-w-xl mx-auto space-y-2">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 mb-2">
                      <BrainCircuit className="h-6 w-6" />
                    </div>
                    <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">Welcome to the AI Revision Planner</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Optimize your exam preparation with personalized revision tracks built around your actual strengths and weakness diagnostics.
                    </p>
                  </div>

                  {/* 3-Step Bento/Grid explaining features */}
                  <div className="grid gap-4 sm:grid-cols-3 pt-2">
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-950/30 rounded-xl border border-slate-100 dark:border-slate-850 space-y-2">
                      <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-xs font-bold text-amber-700 dark:text-amber-400 font-mono">1</div>
                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 font-display">Continuous Diagnostics</h5>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                        Automatically scans your practice quizzes and assignment deadlines to map out high-risk subjects.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50/50 dark:bg-slate-950/30 rounded-xl border border-slate-100 dark:border-slate-850 space-y-2">
                      <div className="h-7 w-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-400 font-mono">2</div>
                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 font-display">Spaced Repetition</h5>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                        Schedules bite-sized revision sessions spaced optimally over time to maximize recall retention.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50/50 dark:bg-slate-950/30 rounded-xl border border-slate-100 dark:border-slate-850 space-y-2">
                      <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-400 font-mono">3</div>
                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 font-display">Direct Revision Portals</h5>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                        Start flashcard reviews, take quick assessments, or engage your study assistant instantly for chosen topics.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-center pt-4 border-t border-slate-100 dark:border-slate-800/80">
                    <Button
                      onClick={handleGenerateRevisionPlan}
                      className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs h-10 px-5 inline-flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Sparkles className="h-4.5 w-4.5 text-amber-300" />
                      Generate AI Revision Schedule
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* --- ADD TASK DIALOG PORTAL --- */}
      <Dialog isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Schedule Study Task">
        <form onSubmit={handleAddTask} className="space-y-4 w-full">
          <div className="space-y-3.5">
            {/* Title */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Task Title</label>
              <input
                type="text"
                placeholder="Review Database Indexing Lectures..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg outline-none text-slate-800 dark:text-slate-100 focus:border-violet-500 transition-colors"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Description / Action Steps</label>
              <textarea
                placeholder="Review notes, draft cheat-sheet for B-Trees, and take a quick custom quiz..."
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                className="w-full text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg outline-none text-slate-800 dark:text-slate-100 h-20 focus:border-violet-500 transition-colors resize-none"
              />
            </div>

            {/* Subject Dropdown */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Academic Subject</label>
                <select
                  value={taskSubjectId}
                  onChange={(e) => setTaskSubjectId(e.target.value)}
                  className="w-full text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg outline-none text-slate-800 dark:text-slate-100 focus:border-violet-500 transition-colors cursor-pointer"
                >
                  <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">General (No Subject)</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id.toString()} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                      {sub.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Task Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as any)}
                  className="w-full text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg outline-none text-slate-800 dark:text-slate-100 focus:border-violet-500 transition-colors cursor-pointer"
                >
                  <option value="low" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Low Priority</option>
                  <option value="medium" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Medium Priority</option>
                  <option value="high" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">High Priority</option>
                </select>
              </div>
            </div>

            {/* Due Date Picker */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Due Date & Time</label>
              <input
                type="datetime-local"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="w-full text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg outline-none text-slate-800 dark:text-slate-100 focus:border-violet-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit">
              Schedule Task
            </Button>
          </div>
        </form>
      </Dialog>

      {/* --- EDIT TASK DIALOG PORTAL --- */}
      <Dialog isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Update Study Task">
        <form onSubmit={handleEditTask} className="space-y-4 w-full">
          <div className="space-y-3.5">
            {/* Title */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Task Title</label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg outline-none text-slate-800 dark:text-slate-100 focus:border-violet-500 transition-colors"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Description</label>
              <textarea
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                className="w-full text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg outline-none text-slate-800 dark:text-slate-100 h-20 focus:border-violet-500 transition-colors resize-none"
              />
            </div>

            {/* Subject & Priority */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Subject</label>
                <select
                  value={taskSubjectId}
                  onChange={(e) => setTaskSubjectId(e.target.value)}
                  className="w-full text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg outline-none text-slate-800 dark:text-slate-100 focus:border-violet-500 transition-colors cursor-pointer"
                >
                  <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">General</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id.toString()} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                      {sub.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as any)}
                  className="w-full text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg outline-none text-slate-800 dark:text-slate-100 focus:border-violet-500 transition-colors cursor-pointer"
                >
                  <option value="low" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Low</option>
                  <option value="medium" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Medium</option>
                  <option value="high" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">High</option>
                </select>
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Due Date</label>
              <input
                type="datetime-local"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="w-full text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg outline-none text-slate-800 dark:text-slate-100 focus:border-violet-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>

      {/* --- AI PLAN MY STUDY DIALOG --- */}
      <Dialog isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} title="AI Study Plan Generator">
        {isAiLoading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <Loader2 className="h-10 w-10 text-violet-600 animate-spin" />
            <div className="text-center space-y-1">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 animate-pulse">
                Gemini is custom-tailoring your learning roadmap...
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                Analyzing your subjects, available study sessions, and exam timeline to build high-yield action steps.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleAiPlanGenerate} className="space-y-4 w-full">
            <div className="p-3 bg-violet-50/40 dark:bg-violet-950/10 border border-violet-100 dark:border-violet-900/50 rounded-xl flex items-start gap-2.5">
              <Sparkles className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                Input your exam dates and constraints, and our Socratic Coach will generate a fully integrated calendar of bite-sized, practical modules to master your topics.
              </p>
            </div>

            <div className="space-y-3">
              {/* Exam date */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Target Exam Date</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full text-xs border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 px-3 py-2 rounded-lg outline-none text-slate-850 dark:text-slate-50 focus:border-violet-500 transition-colors"
                  required
                />
              </div>

              {/* Study Hours */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Weekly Study Hours Commitment</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="2"
                    max="40"
                    value={availableHours}
                    onChange={(e) => setAvailableHours(e.target.value)}
                    className="flex-1 accent-violet-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer dark:bg-slate-800"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 w-12 text-right">
                    {availableHours} hrs
                  </span>
                </div>
              </div>

              {/* Subjects to focus */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Syllabus Focus (Select Subjects)</label>
                {subjects.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {subjects.map((sub) => {
                      const isSelected = aiSelectedSubjects.includes(sub.title);
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => toggleAiSubjectSelection(sub.title)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border flex items-center gap-1 cursor-pointer ${
                            isSelected
                              ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                              : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[2.5]" />}
                          <span>{sub.title}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No existing academic subjects found. Create a subject in the "Subjects" view first.</p>
                )}
              </div>

              {/* Additional comments / goals */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Additional Study Priorities / Goals</label>
                <textarea
                  placeholder="e.g. Focus on mastering recursive functions and neural network backpropagation..."
                  value={additionalGoals}
                  onChange={(e) => setAdditionalGoals(e.target.value)}
                  className="w-full text-xs border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 px-3 py-2 rounded-lg outline-none text-slate-850 dark:text-slate-50 h-16 focus:border-violet-500 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsAiOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={subjects.length === 0}>
                Generate Plan
              </Button>
            </div>
          </form>
        )}
      </Dialog>

    </div>
  );
}
