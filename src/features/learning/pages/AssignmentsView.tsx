import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../auth/hooks/use-auth.tsx";
import { useToast } from "../../../components/ui/Toast.tsx";
import { Button } from "../../../components/ui/Button.tsx";
import { Dialog } from "../../../components/ui/Dialog.tsx";
import { Card, CardContent } from "../../../components/ui/Card.tsx";
import { Input } from "../../../components/ui/Input.tsx";
import {
  Plus,
  Trash2,
  Edit3,
  Calendar as CalendarIcon,
  CheckCircle,
  Clock,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileText,
  X,
  Check,
  Search,
  BrainCircuit,
  Loader2,
  Paperclip,
  TrendingUp,
  Award,
  Bell,
  MapPin,
  Flame,
  HelpCircle
} from "lucide-react";

// Types matching database schema and joins
interface Subject {
  id: number;
  title: string;
  color: string;
}

interface Subtask {
  id: number;
  assignmentId: number;
  title: string;
  completed: boolean;
  estimatedTime: number | null;
  suggestedSchedule: string | null;
}

interface Assignment {
  id: number;
  userId: string;
  subjectId: number | null;
  title: string;
  description: string | null;
  dueDate: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in_progress" | "completed" | "overdue";
  attachments: string | null;
  createdAt: string;
  updatedAt: string;
  subjectTitle?: string;
  subjectColor?: string;
  subtasks: Subtask[];
}

interface GoalTask {
  id: number;
  goalId: number;
  title: string;
  completed: boolean;
}

interface Goal {
  id: number;
  userId: string;
  title: string;
  description: string | null;
  type: "daily" | "weekly" | "monthly";
  targetDate: string | null;
  completed: boolean;
  progress: number;
  tasks: GoalTask[];
}

interface Exam {
  id: number;
  userId: string;
  subjectId: number;
  title: string;
  description: string | null;
  examDate: string;
  location: string | null;
  subjectTitle?: string;
  subjectColor?: string;
}

export function AssignmentsView() {
  const toast = useToast();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"assignments" | "goals" | "exams" | "calendar">("assignments");

  // Core data states
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Modal open states
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Form states - Assignment
  const [assignmentId, setAssignmentId] = useState<number | null>(null);
  const [asgTitle, setAsgTitle] = useState("");
  const [asgDesc, setAsgDesc] = useState("");
  const [asgDueDate, setAsgDueDate] = useState("");
  const [asgPriority, setAsgPriority] = useState<"high" | "medium" | "low">("medium");
  const [asgStatus, setAsgStatus] = useState<"pending" | "in_progress" | "completed">("pending");
  const [asgSubjectId, setAsgSubjectId] = useState("");
  const [asgReminders, setAsgReminders] = useState<string[]>(["1_day_before"]);
  const [asgAttachments, setAsgAttachments] = useState<{ name: string; url: string }[]>([]);

  // File Upload states (Attachments simulator)
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states - Goal
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDesc, setGoalDesc] = useState("");
  const [goalType, setGoalType] = useState<"daily" | "weekly" | "monthly">("daily");
  const [goalTargetDate, setGoalTargetDate] = useState("");
  const [goalTasksRaw, setGoalTasksRaw] = useState("");

  // Form states - Exam
  const [examTitle, setExamTitle] = useState("");
  const [examDesc, setExamDesc] = useState("");
  const [examDateStr, setExamDateStr] = useState("");
  const [examLocation, setExamLocation] = useState("");
  const [examSubjectId, setExamSubjectId] = useState("");
  const [examReminders, setExamReminders] = useState<string[]>(["1_day_before"]);

  // Details Modal Active State
  const [selectedAsg, setSelectedAsg] = useState<Assignment | null>(null);
  const [isAiBreakingDown, setIsAiBreakingDown] = useState(false);

  // Calendar states
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  // Trigger loading details
  const loadSuiteData = async () => {
    setIsLoading(true);
    try {
      const [subjRes, asgRes, goalsRes, examsRes] = await Promise.all([
        fetch("/api/subjects").then((r) => r.json()),
        fetch("/api/assignments").then((r) => r.json()),
        fetch("/api/goals").then((r) => r.json()),
        fetch("/api/exams").then((r) => r.json()),
      ]);

      if (subjRes.subjects) setSubjects(subjRes.subjects);
      if (asgRes.success) setAssignments(asgRes.assignments);
      if (goalsRes.success) setGoals(goalsRes.goals);
      if (examsRes.success) setExams(examsRes.exams);
    } catch (err) {
      console.error("Error loading productivity data:", err);
      toast.error("Failed to load Productivity Suite metrics.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuiteData();
  }, []);

  useEffect(() => {
    if (localStorage.getItem("trigger-new-assignment") === "true") {
      localStorage.removeItem("trigger-new-assignment");
      setIsAssignmentModalOpen(true);
    }
  }, []);

  useEffect(() => {
    const activeId = localStorage.getItem("active-assignment-id");
    if (activeId && assignments.length > 0) {
      const parsed = parseInt(activeId, 10);
      const assignmentToOpen = assignments.find((a) => a.id === parsed);
      if (assignmentToOpen) {
        localStorage.removeItem("active-assignment-id");
        setSelectedAsg(assignmentToOpen);
        setIsDetailModalOpen(true);
      }
    }
  }, [assignments]);

  // Quick helper to categorize assignments
  const getCategorizedAssignments = () => {
    const now = new Date();
    return assignments.map((a) => {
      const due = new Date(a.dueDate);
      let calculatedStatus = a.status;
      if (calculatedStatus !== "completed" && due < now) {
        calculatedStatus = "overdue";
      }
      return {
        ...a,
        status: calculatedStatus,
      };
    });
  };

  const processedAssignments = getCategorizedAssignments();

  // Filtered lists
  const filteredAssignments = processedAssignments.filter((a) => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSubject = subjectFilter === "all" || a.subjectId === parseInt(subjectFilter, 10);
    const matchesPriority = priorityFilter === "all" || a.priority === priorityFilter;
    return matchesSearch && matchesSubject && matchesPriority;
  });

  // ==========================================
  // FILE ATTACHMENTS UX HANDLERS
  // ==========================================
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    addUploadedFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      addUploadedFiles(files);
    }
  };

  const addUploadedFiles = (files: any[]) => {
    const newAttachments = files.map((f) => ({
      name: f.name,
      url: `/uploads/${encodeURIComponent(f.name)}`, // Future-ready upload route simulator
    }));
    setAsgAttachments((prev) => [...prev, ...newAttachments]);
    toast.success(`Attached ${files.length} file(s) successfully!`);
  };

  const removeAttachment = (idx: number) => {
    setAsgAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  // ==========================================
  // CRUD ACTIONS
  // ==========================================

  // Assignments
  const openAddAsg = () => {
    setAssignmentId(null);
    setAsgTitle("");
    setAsgDesc("");
    setAsgDueDate("");
    setAsgPriority("medium");
    setAsgStatus("pending");
    setAsgSubjectId("");
    setAsgReminders(["1_day_before"]);
    setAsgAttachments([]);
    setIsAssignmentModalOpen(true);
  };

  const openEditAsg = (a: Assignment) => {
    setAssignmentId(a.id);
    setAsgTitle(a.title);
    setAsgDesc(a.description || "");
    // Formats date nicely for datetime-local input: YYYY-MM-DDTHH:MM
    const dateObj = new Date(a.dueDate);
    const tzOffset = dateObj.getTimezoneOffset() * 60000;
    const localISOTime = new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 16);
    setAsgDueDate(localISOTime);
    setAsgPriority(a.priority);
    setAsgStatus(a.status === "overdue" ? "pending" : a.status);
    setAsgSubjectId(a.subjectId ? String(a.subjectId) : "");
    setAsgReminders(["1_day_before"]);
    try {
      setAsgAttachments(a.attachments ? JSON.parse(a.attachments) : []);
    } catch {
      setAsgAttachments([]);
    }
    setIsAssignmentModalOpen(true);
  };

  const handleSaveAsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asgTitle.trim() || !asgDueDate) {
      toast.error("Please provide an assignment title and due date.");
      return;
    }

    const payload = {
      title: asgTitle,
      description: asgDesc,
      dueDate: new Date(asgDueDate).toISOString(),
      priority: asgPriority,
      status: asgStatus,
      subjectId: asgSubjectId ? parseInt(asgSubjectId, 10) : null,
      attachments: asgAttachments,
      reminderOptions: asgReminders,
    };

    try {
      const url = assignmentId ? `/api/assignments/${assignmentId}` : "/api/assignments";
      const method = assignmentId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(assignmentId ? "Assignment updated successfully!" : "New assignment scheduled.");
        setIsAssignmentModalOpen(false);
        loadSuiteData();
      } else {
        toast.error(data.error || "Failed to save assignment.");
      }
    } catch {
      toast.error("Server connection failure. Try again.");
    }
  };

  const handleDeleteAsg = async (id: number) => {
    if (!confirm("Remove this assignment? All AI breakdowns will be deleted.")) return;
    try {
      const res = await fetch(`/api/assignments/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Assignment removed.");
        loadSuiteData();
        setIsDetailModalOpen(false);
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Deletion failed.");
    }
  };

  // Subtasks
  const handleToggleSubtask = async (sub: Subtask) => {
    try {
      const updatedStatus = !sub.completed;
      const res = await fetch(`/api/assignments/subtasks/${sub.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: updatedStatus }),
      });
      const data = await res.json();
      if (data.success) {
        // Update local subtask state
        setAssignments((prev) =>
          prev.map((a) => {
            if (a.id === sub.assignmentId) {
              return {
                ...a,
                subtasks: a.subtasks.map((s) => (s.id === sub.id ? { ...s, completed: updatedStatus } : s)),
              };
            }
            return a;
          })
        );
        // Sync detail modal view
        if (selectedAsg && selectedAsg.id === sub.assignmentId) {
          setSelectedAsg((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              subtasks: prev.subtasks.map((s) => (s.id === sub.id ? { ...s, completed: updatedStatus } : s)),
            };
          });
        }
      }
    } catch {
      toast.error("Failed to update subtask status.");
    }
  };

  // AI Breakdown generator
  const handleBreakdownAI = async () => {
    if (!selectedAsg) return;
    setIsAiBreakingDown(true);
    try {
      const res = await fetch(`/api/assignments/${selectedAsg.id}/breakdown`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("Gemini has parsed and split your assignment successfully!");
        // Refresh local items
        const updatedAsgRes = await fetch("/api/assignments").then((r) => r.json());
        if (updatedAsgRes.success) {
          setAssignments(updatedAsgRes.assignments);
          const freshSelected = updatedAsgRes.assignments.find((a: any) => a.id === selectedAsg.id);
          if (freshSelected) setSelectedAsg(freshSelected);
        }
      } else {
        toast.error(data.error || "AI breakdown failed. Try again.");
      }
    } catch {
      toast.error("Failed to connect to Gemini academic planner.");
    } finally {
      setIsAiBreakingDown(false);
    }
  };

  // Goals
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) {
      toast.error("Please specify a goal description.");
      return;
    }

    const tasksList = goalTasksRaw
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const payload = {
      title: goalTitle,
      description: goalDesc,
      type: goalType,
      targetDate: goalTargetDate ? new Date(goalTargetDate).toISOString() : null,
      tasks: tasksList,
    };

    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Goal set successfully!");
        setIsGoalModalOpen(false);
        // Clear forms
        setGoalTitle("");
        setGoalDesc("");
        setGoalTargetDate("");
        setGoalTasksRaw("");
        loadSuiteData();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Failed to save goal.");
    }
  };

  const handleDeleteGoal = async (id: number) => {
    if (!confirm("Are you sure you want to delete this goal and its checkpoint checklist?")) return;
    try {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Goal deleted.");
        loadSuiteData();
      }
    } catch {
      toast.error("Goal removal failed.");
    }
  };

  const handleToggleGoalTask = async (goalId: number, taskId: number, currentCompleted: boolean) => {
    try {
      const res = await fetch(`/api/goals/${goalId}/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !currentCompleted }),
      });
      if (res.ok) {
        // Sync local goal progress
        const goalsRes = await fetch("/api/goals").then((r) => r.json());
        if (goalsRes.success) setGoals(goalsRes.goals);
      }
    } catch {
      toast.error("Failed to check off goal task.");
    }
  };

  // Exams
  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim() || !examDateStr || !examSubjectId) {
      toast.error("Title, exam date, and associated subject are required.");
      return;
    }

    const payload = {
      title: examTitle,
      description: examDesc,
      examDate: new Date(examDateStr).toISOString(),
      location: examLocation,
      subjectId: examSubjectId,
      reminderOptions: examReminders,
    };

    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success("Exam scheduled. Dynamic reminders activated!");
        setIsExamModalOpen(false);
        // Clear
        setExamTitle("");
        setExamDesc("");
        setExamDateStr("");
        setExamLocation("");
        setExamSubjectId("");
        loadSuiteData();
      }
    } catch {
      toast.error("Failed to schedule exam.");
    }
  };

  const handleDeleteExam = async (id: number) => {
    if (!confirm("Cancel this scheduled exam?")) return;
    try {
      const res = await fetch(`/api/exams/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Exam removed.");
        loadSuiteData();
      }
    } catch {
      toast.error("Removal failed.");
    }
  };

  // ==========================================
  // CALENDAR CALCULATION HELPERS
  // ==========================================
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const numberOfDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Pad previous month days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month, -i),
        isCurrentMonth: false,
      });
    }
    // Current month days
    for (let i = 1; i <= numberOfDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }
    return days;
  };

  const calendarDays = getDaysInMonth(currentCalendarDate);

  const getCalendarItemsForDate = (date: Date) => {
    const dStr = date.toDateString();
    const matchedAssignments = processedAssignments.filter((a) => new Date(a.dueDate).toDateString() === dStr);
    const matchedExams = exams.filter((e) => new Date(e.examDate).toDateString() === dStr);
    const matchedGoals = goals.filter((g) => g.targetDate && new Date(g.targetDate).toDateString() === dStr);

    return {
      assignments: matchedAssignments,
      exams: matchedExams,
      goals: matchedGoals,
    };
  };

  // ==========================================
  // VIEW RENDERERS
  // ==========================================

  const renderAssignmentsTab = () => {
    return (
      <div className="space-y-6">
        {/* Filters and Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="all">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="high">🔥 High</option>
              <option value="medium">⚡ Medium</option>
              <option value="low">🌱 Low</option>
            </select>

            <Button onClick={openAddAsg} className="bg-violet-600 hover:bg-violet-700 text-white font-medium">
              <Plus className="mr-2 h-4 w-4" /> Schedule Assignment
            </Button>
          </div>
        </div>

        {/* Assignments Grid */}
        {filteredAssignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-slate-900/50">
            <CheckCircle className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-slate-600 dark:text-slate-400 font-medium text-lg">No assignments match your search</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Get started by creating a new academic target.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssignments.map((asg) => {
              const completedCount = asg.subtasks.filter((s) => s.completed).length;
              const subtaskProgress =
                asg.subtasks.length > 0 ? Math.round((completedCount / asg.subtasks.length) * 100) : 0;

              return (
                <motion.div
                  key={asg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group relative flex flex-col justify-between p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 shadow-sm hover:shadow-md hover:border-violet-500/30 transition-all cursor-pointer"
                  onClick={() => {
                    setSelectedAsg(asg);
                    setIsDetailModalOpen(true);
                  }}
                >
                  <div className="space-y-4">
                    {/* Header line */}
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                        style={{
                          backgroundColor: asg.subjectColor ? `${asg.subjectColor}20` : "#8b5cf620",
                          color: asg.subjectColor || "#8b5cf6",
                        }}
                      >
                        {asg.subjectTitle || "General Study"}
                      </span>

                      <div className="flex items-center gap-2">
                        {asg.priority === "high" && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold uppercase">
                            High Priority
                          </span>
                        )}
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            asg.status === "completed"
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                              : asg.status === "overdue"
                              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 animate-pulse"
                              : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {asg.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <h4 className="font-semibold text-lg text-slate-900 dark:text-slate-100 group-hover:text-violet-600 transition-colors">
                        {asg.title}
                      </h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                        {asg.description || "No description provided."}
                      </p>
                    </div>

                    {/* Subtasks Progress */}
                    {asg.subtasks.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                          <span className="flex items-center gap-1">
                            <BrainCircuit className="h-3.5 w-3.5 text-violet-500" /> AI Checklist
                          </span>
                          <span>
                            {completedCount}/{asg.subtasks.length} ({subtaskProgress}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-violet-600 transition-all duration-300"
                            style={{ width: `${subtaskProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer metadata */}
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 mt-5 pt-4 text-xs text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> Due {new Date(asg.dueDate).toLocaleDateString()}
                    </span>
                    {asg.attachments && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <Paperclip className="h-3 w-3" /> Attached References
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderGoalsTab = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-violet-500" /> Metrics & Milestones
            </h3>
            <p className="text-slate-500 text-sm">Define daily habits, weekly targets, and monthly milestones.</p>
          </div>
          <Button onClick={() => setIsGoalModalOpen(true)} className="bg-violet-600 hover:bg-violet-700 text-white">
            <Plus className="mr-2 h-4 w-4" /> New Milestone Goal
          </Button>
        </div>

        {goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white/50">
            <Award className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-600 font-semibold">No goals active right now</p>
            <p className="text-slate-400 text-sm mt-1">Setup your targets to stay motivated and track dynamic streak points.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals.map((g) => (
              <Card key={g.id} className="bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  {/* Goal Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
                        {g.type}
                      </span>
                      <h4 className="font-bold text-lg text-slate-900 dark:text-slate-100 mt-1">{g.title}</h4>
                    </div>
                    <button
                      onClick={() => handleDeleteGoal(g.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {g.description && <p className="text-sm text-slate-500 dark:text-slate-400">{g.description}</p>}

                  {/* Progress info */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500">Completeness Level</span>
                      <span className="text-violet-600 dark:text-violet-400">{g.progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-600 transition-all duration-300"
                        style={{ width: `${g.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Task list checkpoints */}
                  {g.tasks.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2.5">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Checkpoints</span>
                      <div className="space-y-2">
                        {g.tasks.map((gt) => (
                          <div
                            key={gt.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={gt.completed}
                              onChange={() => handleToggleGoalTask(g.id, gt.id, gt.completed)}
                              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-800"
                            />
                            <span
                              className={`text-sm font-medium ${
                                gt.completed ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {gt.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {g.targetDate && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <CalendarIcon className="h-3.5 w-3.5" /> Complete by {new Date(g.targetDate).toLocaleDateString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderExamsTab = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-violet-500" /> Exam Schedule
            </h3>
            <p className="text-slate-500 text-sm">Schedule upcoming quizzes, exams, or major presentations.</p>
          </div>
          <Button onClick={() => setIsExamModalOpen(true)} className="bg-violet-600 hover:bg-violet-700 text-white">
            <Plus className="mr-2 h-4 w-4" /> Add Exam Checkpoint
          </Button>
        </div>

        {exams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white/50">
            <Bell className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-600 font-semibold">No examinations scheduled</p>
            <p className="text-slate-400 text-sm mt-1">Insert upcoming tests to generate alert reminders automatically.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => (
              <Card key={exam.id} className="bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/60 shadow-sm relative">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                      style={{
                        backgroundColor: exam.subjectColor ? `${exam.subjectColor}20` : "#8b5cf620",
                        color: exam.subjectColor || "#8b5cf6",
                      }}
                    >
                      {exam.subjectTitle || "General"}
                    </span>

                    <button
                      onClick={() => handleDeleteExam(exam.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div>
                    <h4 className="font-bold text-lg text-slate-900 dark:text-slate-100">{exam.title}</h4>
                    {exam.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{exam.description}</p>}
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span>{new Date(exam.examDate).toLocaleString()}</span>
                    </div>
                    {exam.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span>{exam.location}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCalendarTab = () => {
    const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const monthName = currentCalendarDate.toLocaleString("default", { month: "long" });
    const year = currentCalendarDate.getFullYear();

    const handlePrevMonth = () => {
      setCurrentCalendarDate(new Date(year, currentCalendarDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
      setCurrentCalendarDate(new Date(year, currentCalendarDate.getMonth() + 1, 1));
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Interactive Academic Planner
            </h3>
            <p className="text-slate-500 text-sm">Visualize assignments, goals, and examinations in month view.</p>
          </div>

          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 min-w-[120px] text-center">
              {monthName} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-400 text-slate-600 dark:text-slate-400 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Days grid */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-sm overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 py-3 text-center text-xs font-bold text-slate-400 tracking-wider">
            {daysOfWeek.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800 border-l border-t border-slate-100 dark:border-slate-800">
            {calendarDays.map((dayObj, index) => {
              const { assignments: dayAsgs, exams: dayExams, goals: dayGoals } = getCalendarItemsForDate(dayObj.date);
              const isToday = dayObj.date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={index}
                  className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors ${
                    dayObj.isCurrentMonth ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-950/20 text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold h-6 w-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? "bg-violet-600 text-white"
                          : dayObj.isCurrentMonth
                          ? "text-slate-700 dark:text-slate-300"
                          : "text-slate-300 dark:text-slate-600"
                      }`}
                    >
                      {dayObj.date.getDate()}
                    </span>
                  </div>

                  {/* Bullet badges */}
                  <div className="mt-2 space-y-1 overflow-hidden">
                    {dayAsgs.map((a) => (
                      <div
                        key={a.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAsg(a);
                          setIsDetailModalOpen(true);
                        }}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 truncate cursor-pointer font-bold hover:scale-105 transition-transform"
                      >
                        📝 {a.title}
                      </div>
                    ))}
                    {dayExams.map((e) => (
                      <div
                        key={e.id}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 truncate font-bold"
                      >
                        🔔 {e.title}
                      </div>
                    ))}
                    {dayGoals.map((g) => (
                      <div
                        key={g.id}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 truncate font-bold"
                      >
                        🎯 {g.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Upper Panel HUD */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Productivity Suite <Flame className="h-6 w-6 text-orange-500 animate-pulse" />
          </h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">
            Your centralized hub for Assignments, AI Subtask Planners, Milestones, and Dynamic Calendars.
          </p>
        </div>

        {/* Navigation tabs switcher */}
        <div className="flex border border-slate-200/60 dark:border-slate-800/60 rounded-xl bg-white dark:bg-slate-900 p-1 shadow-sm shrink-0">
          <button
            onClick={() => setActiveTab("assignments")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "assignments"
                ? "bg-violet-600 text-white shadow"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            Assignments
          </button>
          <button
            onClick={() => setActiveTab("goals")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "goals"
                ? "bg-violet-600 text-white shadow"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            Milestones
          </button>
          <button
            onClick={() => setActiveTab("exams")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "exams"
                ? "bg-violet-600 text-white shadow"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            Exams
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "calendar"
                ? "bg-violet-600 text-white shadow"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            Calendar
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 text-violet-600 animate-spin" />
          <span className="text-sm font-semibold text-slate-400 mt-3 uppercase tracking-wider">
            Loading Productivity Hub...
          </span>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "assignments" && renderAssignmentsTab()}
            {activeTab === "goals" && renderGoalsTab()}
            {activeTab === "exams" && renderExamsTab()}
            {activeTab === "calendar" && renderCalendarTab()}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ==========================================
          ASSIGNMENT SCHEDULER DIALOG
          ========================================== */}
      <Dialog isOpen={isAssignmentModalOpen} onClose={() => setIsAssignmentModalOpen(false)} title={assignmentId ? "Edit Assignment" : "Schedule New Assignment"}>
        <form onSubmit={handleSaveAsg} className="space-y-5 p-2">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assignment Title</label>
              <Input
                placeholder="e.g., Organic Chemistry Midterm Lab Report"
                value={asgTitle}
                onChange={(e) => setAsgTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description (Rich Details)</label>
              <textarea
                placeholder="List criteria, grading rubric, or outline guidelines..."
                value={asgDesc}
                onChange={(e) => setAsgDesc(e.target.value)}
                className="w-full h-24 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:border-violet-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Due Date & Time</label>
                <Input
                  type="datetime-local"
                  value={asgDueDate}
                  onChange={(e) => setAsgDueDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Academic Subject</label>
                <select
                  value={asgSubjectId}
                  onChange={(e) => setAsgSubjectId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-violet-500 cursor-pointer"
                >
                  <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">General (No subject)</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={String(s.id)} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Priority Weight</label>
                <select
                  value={asgPriority}
                  onChange={(e) => setAsgPriority(e.target.value as any)}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-violet-500"
                >
                  <option value="high">🔥 High Weight</option>
                  <option value="medium">⚡ Medium Weight</option>
                  <option value="low">🌱 Low Weight</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Status</label>
                <select
                  value={asgStatus}
                  onChange={(e) => setAsgStatus(e.target.value as any)}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-violet-500"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            {/* Smart reminders setup */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Smart Alerts</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={asgReminders.includes("1_day_before")}
                    onChange={(e) => {
                      if (e.target.checked) setAsgReminders((p) => [...p, "1_day_before"]);
                      else setAsgReminders((p) => p.filter((r) => r !== "1_day_before"));
                    }}
                    className="rounded text-violet-600"
                  />
                  1 Day Before
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={asgReminders.includes("1_hour_before")}
                    onChange={(e) => {
                      if (e.target.checked) setAsgReminders((p) => [...p, "1_hour_before"]);
                      else setAsgReminders((p) => p.filter((r) => r !== "1_hour_before"));
                    }}
                    className="rounded text-violet-600"
                  />
                  1 Hour Before
                </label>
              </div>
            </div>

            {/* File attachments uploader */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attachments & References</label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-violet-500 bg-violet-50/50 dark:bg-violet-950/20"
                    : "border-slate-200 dark:border-slate-800 hover:border-violet-500/50"
                }`}
              >
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Paperclip className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                  Drag and drop research files or click to upload
                </span>
              </div>

              {asgAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {asgAttachments.map((f, i) => (
                    <span
                      key={i}
                      className="text-xs bg-slate-100 dark:bg-slate-800 pl-2 pr-1 py-1 rounded-lg flex items-center gap-1 text-slate-600 dark:text-slate-300"
                    >
                      {f.name}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAttachment(i);
                        }}
                        className="p-0.5 rounded hover:bg-slate-200 text-slate-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsAssignmentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white font-semibold">
              Save Academic Target
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ==========================================
          ASSIGNMENT DETAILED DETAILS & AI GENERATOR DIALOG
          ========================================== */}
      <Dialog isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Assignment Overview">
        {selectedAsg && (
          <div className="space-y-6 p-2">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-violet-600">
                  {selectedAsg.subjectTitle || "General Curriculum"}
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                  {selectedAsg.title}
                </h3>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
                  📅 Due Date: {new Date(selectedAsg.dueDate).toLocaleString()}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
                  ⚖️ Priority: {selectedAsg.priority}
                </span>
              </div>

              <div>
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Details & Guidelines</h5>
                <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                  {selectedAsg.description || "No description loaded."}
                </p>
              </div>

              {/* Subtasks with AI planning generator */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Plan Checklist</h5>
                  <Button
                    onClick={handleBreakdownAI}
                    disabled={isAiBreakingDown}
                    className="h-8 bg-violet-600/10 hover:bg-violet-600/20 text-violet-600 dark:text-violet-400 font-bold text-xs px-3 rounded-lg"
                  >
                    {isAiBreakingDown ? (
                      <>
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Splitting...
                      </>
                    ) : (
                      <>
                        <BrainCircuit className="mr-1 h-3.5 w-3.5" /> Break into Smaller Tasks
                      </>
                    )}
                  </Button>
                </div>

                {selectedAsg.subtasks.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50">
                    <BrainCircuit className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">No checklists generated yet.</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Let Gemini analyze this assignment to create practical step-by-step tasks.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedAsg.subtasks.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={sub.completed}
                            onChange={() => handleToggleSubtask(sub)}
                            className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                          />
                          <div>
                            <span
                              className={`text-sm font-semibold block ${
                                sub.completed ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-200"
                              }`}
                            >
                              {sub.title}
                            </span>
                            {sub.suggestedSchedule && (
                              <span className="text-[10px] font-medium text-slate-400 uppercase block mt-0.5">
                                Suggested: {sub.suggestedSchedule}
                              </span>
                            )}
                          </div>
                        </div>

                        {sub.estimatedTime && (
                          <span className="text-xs bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded text-slate-500 font-medium shrink-0">
                            ⏱️ {sub.estimatedTime}m
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <Button variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => handleDeleteAsg(selectedAsg.id)}>
                Delete Assignment
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => openEditAsg(selectedAsg)}>
                  <Edit3 className="mr-1 h-4 w-4" /> Edit Target
                </Button>
                <Button className="bg-violet-600 text-white" onClick={() => setIsDetailModalOpen(false)}>
                  Close Overview
                </Button>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* ==========================================
          GOAL SETTER DIALOG
          ========================================== */}
      <Dialog isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} title="Set Milestone Goal">
        <form onSubmit={handleSaveGoal} className="space-y-5 p-2">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Goal Title</label>
              <Input
                placeholder="e.g., Complete 30 hours of Biology reviews"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Goal Description</label>
              <textarea
                placeholder="Describe what success looks like..."
                value={goalDesc}
                onChange={(e) => setGoalDesc(e.target.value)}
                className="w-full h-20 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:border-violet-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Milestone Cadence</label>
                <select
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value as any)}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-violet-500"
                >
                  <option value="daily">Daily Target</option>
                  <option value="weekly">Weekly Target</option>
                  <option value="monthly">Monthly Milestone</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Accomplish Date</label>
                <Input
                  type="date"
                  value={goalTargetDate}
                  onChange={(e) => setGoalTargetDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Initial Checkpoints / Actionable Tasks (One per line)
              </label>
              <textarea
                placeholder="Read Chapter 4&#10;Write practice flashcards&#10;Complete Chapter 4 Review Quiz"
                value={goalTasksRaw}
                onChange={(e) => setGoalTasksRaw(e.target.value)}
                className="w-full h-24 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-mono outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsGoalModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white font-semibold">
              Establish Milestone Goal
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ==========================================
          EXAM SCHEDULER DIALOG
          ========================================== */}
      <Dialog isOpen={isExamModalOpen} onClose={() => setIsExamModalOpen(false)} title="Schedule Examination Checkpoint">
        <form onSubmit={handleSaveExam} className="space-y-5 p-2">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Exam Title</label>
              <Input
                placeholder="e.g., Physics II Classical Electromagnetism Exam"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Exam Syllabus Description</label>
              <textarea
                placeholder="Topics covered, equation sheets permitted, or exam instructions..."
                value={examDesc}
                onChange={(e) => setExamDesc(e.target.value)}
                className="w-full h-20 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:border-violet-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Exam Date & Time</label>
                <Input
                  type="datetime-local"
                  value={examDateStr}
                  onChange={(e) => setExamDateStr(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subject Association</label>
                <select
                  value={examSubjectId}
                  onChange={(e) => setExamSubjectId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-violet-500 cursor-pointer"
                  required
                >
                  <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Select associated subject...</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={String(s.id)} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hall Location / Link</label>
              <Input
                placeholder="e.g., Science Hall Room 304 or Zoom URL"
                value={examLocation}
                onChange={(e) => setExamLocation(e.target.value)}
              />
            </div>

            {/* Smart reminders setup */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Smart Alerts</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={examReminders.includes("1_day_before")}
                    onChange={(e) => {
                      if (e.target.checked) setExamReminders((p) => [...p, "1_day_before"]);
                      else setExamReminders((p) => p.filter((r) => r !== "1_day_before"));
                    }}
                    className="rounded text-violet-600"
                  />
                  1 Day Before Exam
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={examReminders.includes("1_hour_before")}
                    onChange={(e) => {
                      if (e.target.checked) setExamReminders((p) => [...p, "1_hour_before"]);
                      else setExamReminders((p) => p.filter((r) => r !== "1_hour_before"));
                    }}
                    className="rounded text-violet-600"
                  />
                  1 Hour Before Exam
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsExamModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white font-semibold">
              Activate Exam Tracker
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
