import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart3,
  Clock,
  BookOpen,
  CheckSquare,
  Layers,
  HelpCircle,
  FileText,
  MessageSquare,
  Award,
  Flame,
  Calendar,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Sparkles,
  Download,
  Loader2,
  Trash2,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  FileText as PdfIcon,
  ChevronRight,
  UserCheck
} from "lucide-react";
import { Button } from "../../../components/ui/Button.tsx";
import { useToast } from "../../../components/ui/Toast.tsx";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from "recharts";

interface AnalyticsData {
  totalStudyHours: number;
  subjectsStudiedCount: number;
  completedTasksCount: number;
  pendingTasksCount: number;
  flashcardsReviewedCount: number;
  quizAttemptsCount: number;
  averageQuizScore: number;
  documentsUploadedCount: number;
  notesCreatedCount: number;
  aiConversationsCount: number;
  weeklyStudyHours: { day: string; hours: number }[];
  subjectDistribution: { subject: string; hours: number; color: string }[];
  quizScoreTrend: { date: string; score: number; quizTitle: string }[];
  taskCompletionTrend: { day: string; completed: number }[];
  studyStreak: number;
  weeklyGoalHours: number;
  weeklyGoalProgressPercent: number;
  upcomingExams: { id: number; title: string; dueDate: string; subjectTitle: string; priority: string }[];
  todaysFocusSubject: string;
  recentAchievements: { title: string; description: string; date: string; icon: string }[];
  recentSessions: { id: number; subjectId: number | null; duration: number; notes: string | null; createdAt: string; subjectTitle: string | null; subjectColor: string | null }[];
}

interface AIInsights {
  strongestSubject: string;
  weakestSubject: string;
  revisionTopics: string[];
  missedGoals: string;
  comparisonToLastWeek: string;
  todaysFocusRecommendation: string;
}

interface Subject {
  id: number;
  title: string;
  color: string;
}

export function AnalyticsView() {
  const toast = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [aiInsights, setAIInsights] = useState<AIInsights | null>(null);
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Manual Log Session State
  const [logSubjectId, setLogSubjectId] = useState<string>("");
  const [logDuration, setLogDuration] = useState<string>("");
  const [logNotes, setLogNotes] = useState<string>("");
  const [logSubmitting, setLogSubmitting] = useState(false);

  // Active Timer State
  const [timerSubjectId, setTimerSubjectId] = useState<string>("");
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timerNotes, setTimerNotes] = useState("");

  // Fetch all core dashboard analytics, subjects, and AI insights on load
  const loadData = async (showSilently = false) => {
    if (!showSilently) setLoading(true);
    try {
      // 1. Core Analytics
      const analRes = await fetch("/api/analytics");
      const analData = await analRes.json();
      if (analData.success) {
        setAnalytics(analData.analytics);
      }

      // 2. Subjects List
      const subjRes = await fetch("/api/subjects");
      const subjData = await subjRes.json();
      if (subjData.success) {
        setSubjectsList(subjData.subjects || []);
      }
    } catch (err) {
      console.error("Failed to load analytics data:", err);
      toast.error("Failed to sync latest study statistics.");
    } finally {
      if (!showSilently) setLoading(false);
    }
  };

  // Generate or refresh AI recommendations using Gemini
  const fetchAIInsights = async () => {
    setInsightsLoading(true);
    try {
      const response = await fetch("/api/analytics/insights");
      const data = await response.json();
      if (data.success) {
        setAIInsights(data.insights);
        toast.success("AI academic insights refreshed successfully!");
      } else {
        toast.error("Failed to formulate AI study planner insights.");
      }
    } catch (err) {
      console.error("Failed to generate AI insights:", err);
      toast.error("Error communicating with AI recommendations service.");
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    fetchAIInsights();
  }, []);

  // Handle active study timer tick
  useEffect(() => {
    let interval: any = null;
    if (timerActive) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  // Handle logging a study session
  const handleLogSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logDuration || isNaN(parseInt(logDuration, 10)) || parseInt(logDuration, 10) <= 0) {
      toast.error("Please enter a valid study duration in minutes.");
      return;
    }

    setLogSubmitting(true);
    try {
      const res = await fetch("/api/analytics/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: logSubjectId ? parseInt(logSubjectId, 10) : undefined,
          duration: parseInt(logDuration, 10),
          notes: logNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Successfully logged ${logDuration} minutes of study!`);
        setLogDuration("");
        setLogNotes("");
        setLogSubjectId("");
        loadData(true); // Silent reload to refresh charts and streak
      } else {
        toast.error(data.error || "Failed to log study session.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error logging study session.");
    } finally {
      setLogSubmitting(false);
    }
  };

  // Handle completing active timer session
  const handleFinishTimer = async () => {
    if (timerSeconds < 10) {
      toast.info("Timer was running for less than 10 seconds. Session not logged.");
      setTimerActive(false);
      setTimerSeconds(0);
      return;
    }

    const durationMinutes = Math.max(1, Math.round(timerSeconds / 60));
    setTimerActive(false);

    try {
      const res = await fetch("/api/analytics/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: timerSubjectId ? parseInt(timerSubjectId, 10) : undefined,
          duration: durationMinutes,
          notes: timerNotes || "Timed study sprint."
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Amazing job! Timed study session of ${durationMinutes} min logged.`);
        setTimerSeconds(0);
        setTimerNotes("");
        setTimerSubjectId("");
        loadData(true);
      } else {
        toast.error("Failed to log timed study session.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving timed session.");
    }
  };

  // Reset active study timer
  const handleResetTimer = () => {
    setTimerActive(false);
    setTimerSeconds(0);
    toast.info("Study timer reset to zero.");
  };

  // Delete a study session log
  const handleDeleteSession = async (sessionId: number) => {
    try {
      const res = await fetch(`/api/analytics/session/${sessionId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Study session log deleted.");
        loadData(true); // Silent reload to update charts and list
      } else {
        toast.error(data.error || "Failed to delete study session log.");
      }
    } catch (err) {
      console.error("Failed to delete study session:", err);
      toast.error("Error deleting study session.");
    }
  };

  // Export as CSV File
  const handleExportCSV = () => {
    if (!analytics) return;
    try {
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Category,Metric Name,Value\n";
      csvContent += `Overall,Total Study Hours,${analytics.totalStudyHours}\n`;
      csvContent += `Overall,Subjects Studied,${analytics.subjectsStudiedCount}\n`;
      csvContent += `Overall,Completed Tasks,${analytics.completedTasksCount}\n`;
      csvContent += `Overall,Pending Tasks,${analytics.pendingTasksCount}\n`;
      csvContent += `Overall,Flashcards Reviewed,${analytics.flashcardsReviewedCount}\n`;
      csvContent += `Overall,Quiz Attempts,${analytics.quizAttemptsCount}\n`;
      csvContent += `Overall,Average Quiz Score,${analytics.averageQuizScore}%\n`;
      csvContent += `Overall,Notes Created,${analytics.notesCreatedCount}\n`;
      csvContent += `Overall,Documents Uploaded,${analytics.documentsUploadedCount}\n`;
      csvContent += `Overall,AI Conversations,${analytics.aiConversationsCount}\n`;
      csvContent += `Weekly Progress,Weekly Study Streak,${analytics.studyStreak} Days\n`;
      csvContent += `Weekly Progress,Goal Progress,${analytics.weeklyGoalProgressPercent}%\n`;

      csvContent += "\nSubject,Hours Studied\n";
      analytics.subjectDistribution.forEach((s) => {
        csvContent += `"${s.subject}",${s.hours}\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `AI_Study_Hub_Analytics_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV Summary exported successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to compile CSV data.");
    }
  };

  // Export as PDF Printable Report
  const handleExportPDF = () => {
    if (!analytics) return;
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Please allow popups to download/print PDF reports.");
        return;
      }

      const html = `
        <html>
        <head>
          <title>AI Academic Performance Report</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            .header { border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 28px; font-weight: bold; color: #4f46e5; margin: 0; }
            .subtitle { font-size: 14px; color: #64748b; margin-top: 5px; }
            .section-title { font-size: 18px; font-weight: bold; color: #334155; margin-top: 30px; margin-bottom: 15px; border-left: 4px solid #6366f1; padding-left: 10px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; }
            .card-val { font-size: 22px; font-weight: bold; color: #4f46e5; margin-top: 5px; }
            .card-lbl { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .table th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 13px; color: #475569; border-bottom: 2px solid #cbd5e1; }
            .table td { padding: 10px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
            .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">AI Academic Performance Report</h1>
              <div class="subtitle">Personalized Study Metrics & AI Recommendations</div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #64748b;">
              Generated: ${new Date().toLocaleString()}<br/>
              User: iamsaad236@gmail.com
            </div>
          </div>

          <div class="section-title">Core Academic Performance Metrics</div>
          <div class="grid">
            <div class="card">
              <div class="card-lbl">Total Study Hours</div>
              <div class="card-val">${analytics.totalStudyHours} hrs</div>
            </div>
            <div class="card">
              <div class="card-lbl">Subjects Studied</div>
              <div class="card-val">${analytics.subjectsStudiedCount} Modules</div>
            </div>
            <div class="card">
              <div class="card-lbl">Completed Milestones</div>
              <div class="card-val">${analytics.completedTasksCount} / ${analytics.completedTasksCount + analytics.pendingTasksCount} Tasks</div>
            </div>
            <div class="card">
              <div class="card-lbl">Flashcards Mastered</div>
              <div class="card-val">${analytics.flashcardsReviewedCount} Cards</div>
            </div>
            <div class="card">
              <div class="card-lbl">AI Quizzes Taken</div>
              <div class="card-val">${analytics.quizAttemptsCount} attempts</div>
            </div>
            <div class="card">
              <div class="card-lbl">Average Accuracy</div>
              <div class="card-val">${analytics.averageQuizScore}%</div>
            </div>
          </div>

          <div class="section-title">Subject-wise Study Allocation</div>
          <table class="table">
            <thead>
              <tr>
                <th>Subject Area</th>
                <th>Focus Duration</th>
                <th>Percent of Total Allocation</th>
              </tr>
            </thead>
            <tbody>
              ${analytics.subjectDistribution.map(s => {
                const pct = analytics.totalStudyHours > 0 ? Math.round((s.hours / analytics.totalStudyHours) * 100) : 0;
                return `
                  <tr>
                    <td><strong>${s.subject}</strong></td>
                    <td>${s.hours} hours</td>
                    <td>${pct}%</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>

          <div class="section-title">Active AI Learning Analytics Recommendations</div>
          <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 20px; font-size: 13px;">
            <p><strong>🌟 Primary Academic Strength:</strong> ${aiInsights?.strongestSubject || "Not formulated yet"}</p>
            <p><strong>⚠️ Core Area of Review:</strong> ${aiInsights?.weakestSubject || "Not formulated yet"}</p>
            <p><strong>🎯 Guided Study Focus Today:</strong> ${aiInsights?.todaysFocusRecommendation || "Not formulated yet"}</p>
            <p><strong>📈 Core Assessment vs Last Week:</strong> ${aiInsights?.comparisonToLastWeek || "Not formulated yet"}</p>
            <p><strong>📋 Academic Milestone Progress Alerts:</strong> ${aiInsights?.missedGoals || "Not formulated yet"}</p>
          </div>

          <div class="footer">
            AI Study Hub - Fully Integrated Intelligent Learning Environment. Confidential.
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      toast.success("Printable PDF report generated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate printable PDF document.");
    }
  };

  // Render Time string (mm:ss)
  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs > 0 ? hrs + ":" : ""}${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-pulse">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="h-4 w-96 bg-slate-100 dark:bg-slate-900 rounded"></div>
          </div>
          <div className="h-10 w-44 bg-slate-200 dark:bg-slate-800 rounded"></div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 animate-pulse">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/40 dark:border-slate-800/40"></div>
          ))}
        </div>

        {/* Main Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-80 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200/40 dark:border-slate-800/40"></div>
            <div className="h-80 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200/40 dark:border-slate-800/40"></div>
          </div>
          <div className="space-y-6">
            <div className="h-96 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200/40 dark:border-slate-800/40"></div>
            <div className="h-80 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200/40 dark:border-slate-800/40"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto text-slate-700 dark:text-slate-300">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800/50 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="h-8 w-8 text-violet-500" />
            Smart Analytics Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Real-time, AI-augmented assessment of your academic progress, milestones, and focused studies.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="flex items-center gap-2 border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 text-xs text-slate-600 dark:text-slate-300"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="flex items-center gap-2 border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 text-xs text-slate-600 dark:text-slate-300"
          >
            <PdfIcon className="h-4 w-4 text-rose-500" />
            Print Report (PDF)
          </Button>
        </div>
      </div>

      {/* Explainer Banner explaining what the Analytics section is for */}
      <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-500/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles className="h-40 w-40 text-white" />
        </div>
        <div className="relative z-10 space-y-3 max-w-4xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-white/20 text-white rounded-full uppercase tracking-wider backdrop-blur-md">
              Student Environment Cockpit
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
            How does the Analytics Dashboard work?
          </h2>
          <p className="text-sm text-indigo-100 leading-relaxed">
            Welcome to your academic monitoring center. This dashboard automatically consolidates your study sessions, 
            quiz scores, and milestone tasks into a unified picture of your habits. Based on your active performance patterns, 
            the <strong>Gemini Study Insights</strong> acts as your personal virtual mentor, identifying your strong suits, 
            pinpointing review topics, and giving you actionable focus guidelines for today.
          </p>
        </div>
      </div>

      {/* 2. Core Dashboard Analytics Grid (10 Metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Study Time", val: `${analytics?.totalStudyHours} hrs`, icon: Clock, color: "violet" },
          { label: "Subjects Enrolled", val: `${analytics?.subjectsStudiedCount} Subjects`, icon: BookOpen, color: "indigo" },
          { label: "Completed Milestones", val: `${analytics?.completedTasksCount} Tasks`, icon: CheckSquare, color: "emerald" },
          { label: "Pending Tasks", val: `${analytics?.pendingTasksCount} Tasks`, icon: AlertTriangle, color: "amber" },
          { label: "Flashcards Mastered", val: `${analytics?.flashcardsReviewedCount} Cards`, icon: Layers, color: "pink" },
          { label: "AI Quizzes Taken", val: `${analytics?.quizAttemptsCount} attempts`, icon: HelpCircle, color: "rose" },
          { label: "Quiz Accuracy Avg", val: `${analytics?.averageQuizScore}%`, icon: Award, color: "blue" },
          { label: "Research Uploads", val: `${analytics?.documentsUploadedCount} Files`, icon: FileText, color: "teal" },
          { label: "Notes Captured", val: `${analytics?.notesCreatedCount} Notes`, icon: FileText, color: "cyan" },
          { label: "AI Consultations", val: `${analytics?.aiConversationsCount} Chats`, icon: MessageSquare, color: "purple" }
        ].map((stat, idx) => (
          <div
            key={idx}
            className="p-4 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/40 hover:border-violet-500/20 transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {stat.label}
              </span>
              <stat.icon className="h-4 w-4 text-violet-500 opacity-80" />
            </div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-2">
              {stat.val}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Main Grid layout: Left column = charts, Right column = widgets & log tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (Charts) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Chart 1 & Chart 2 (study hours & subject wise) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Weekly Study Hours */}
            <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/40 p-5">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-violet-500" />
                Weekly Study Hours
              </h3>
              <div className="h-64 text-xs">
                {analytics && analytics.weeklyStudyHours.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.weeklyStudyHours}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.08} />
                      <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ background: "#0f172a", borderRadius: "8px", border: "none", color: "#fff", fontSize: "11px" }} />
                      <Bar dataKey="hours" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    No weekly trend data found.
                  </div>
                )}
              </div>
            </div>

            {/* Subject study distribution */}
            <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/40 p-5">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <BookOpen className="h-4.5 w-4.5 text-indigo-500" />
                Subject Distribution
              </h3>
              <div className="h-64 text-xs">
                {analytics && analytics.subjectDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.subjectDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="hours"
                        nameKey="subject"
                      >
                        {analytics.subjectDistribution.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color || "#6366f1"} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#0f172a", borderRadius: "8px", border: "none", color: "#fff", fontSize: "11px" }} />
                      <Legend formatter={(val) => <span className="text-slate-600 dark:text-slate-400 font-medium text-[10px]">{val}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    No subject allocations found.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chart 3 & Chart 4 (quiz score & task completion) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quiz score trend */}
            <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/40 p-5">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Award className="h-4.5 w-4.5 text-rose-500" />
                Quiz Score Trend
              </h3>
              <div className="h-64 text-xs">
                {analytics && analytics.quizScoreTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.quizScoreTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
                      <Tooltip contentStyle={{ background: "#0f172a", borderRadius: "8px", border: "none", color: "#fff", fontSize: "11px" }} />
                      <Line type="monotone" dataKey="score" stroke="#f43f5e" strokeWidth={3} dot={{ fill: "#f43f5e" }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 py-12 text-center">
                    No quiz attempts recorded yet. Take an AI Quiz in the Quizzes module to start tracking!
                  </div>
                )}
              </div>
            </div>

            {/* Task completion trend */}
            <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/40 p-5">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckSquare className="h-4.5 w-4.5 text-emerald-500" />
                Task Completion Trend
              </h3>
              <div className="h-64 text-xs">
                {analytics && analytics.taskCompletionTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.taskCompletionTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                      <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <Tooltip contentStyle={{ background: "#0f172a", borderRadius: "8px", border: "none", color: "#fff", fontSize: "11px" }} />
                      <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={3} dot={{ fill: "#10b981" }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    No task completions found.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Insights Recommendations Block */}
          <div className="bg-gradient-to-br from-violet-500/5 to-indigo-500/5 dark:from-violet-950/10 dark:to-indigo-950/10 rounded-2xl border border-violet-500/10 dark:border-violet-500/20 p-6 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-500 animate-pulse" />
                  Gemini Study Insights & Guidance
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  AI-driven, personalized performance assessments, computed dynamically based on your study history.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAIInsights}
                disabled={insightsLoading}
                className="text-xs h-8 flex items-center gap-1.5 border-violet-500/20 text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/30"
              >
                {insightsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Refresh Insights
              </Button>
            </div>

            {insightsLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                <span className="text-xs font-semibold animate-pulse">Retrieving tailored recommendations from Gemini...</span>
              </div>
            ) : aiInsights ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/40 rounded-xl p-4">
                    <span className="text-[10px] font-bold text-violet-500 uppercase tracking-widest block mb-1">🌟 Your Academic Superpower</span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{aiInsights.strongestSubject}</h4>
                    <p className="text-xs text-slate-500 mt-1">Outstanding revision regularity or high quiz scores logged.</p>
                  </div>

                  <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/40 rounded-xl p-4">
                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest block mb-1">⚠️ Target Revision Area</span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{aiInsights.weakestSubject}</h4>
                    <p className="text-xs text-slate-500 mt-1">Requires deliberate focus or revised study flashcards.</p>
                  </div>

                  <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/40 rounded-xl p-4">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-1">🎯 Personal Focus Strategy</span>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{aiInsights.todaysFocusRecommendation}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/40 rounded-xl p-4">
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block mb-1">📋 Milestone Watch & Goals</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{aiInsights.missedGoals}</p>
                  </div>

                  <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/40 rounded-xl p-4">
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block mb-1">📈 Study Efficiency Trend</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{aiInsights.comparisonToLastWeek}</p>
                  </div>

                  <div className="p-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">📚 Suggested Revision Topics</span>
                    <div className="space-y-2">
                      {aiInsights.revisionTopics.map((topic, index) => (
                        <div key={index} className="flex items-start gap-2 text-xs">
                          <CheckCircle2 className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                          <span className="text-slate-600 dark:text-slate-300">{topic}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                AI Recommendations are not computed yet. Click the refresh button above.
              </div>
            )}
          </div>

          {/* Recent Study Activity Logs (Shows manual & timer logged sessions) */}
          <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/40 p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="h-4.5 w-4.5 text-violet-500" />
                  Logged Study Sessions History
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  See where your manual & timer entries compile. Manage, review notes, or delete session records.
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
                {analytics?.recentSessions.length || 0} Saved Sessions
              </span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {analytics && analytics.recentSessions.length > 0 ? (
                analytics.recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-950/30 rounded-xl border border-slate-100 dark:border-slate-800/40 hover:border-violet-500/15 transition-all group"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="px-2 py-0.5 rounded text-[9px] font-bold text-white shrink-0"
                          style={{ backgroundColor: session.subjectColor || "#8b5cf6" }}
                        >
                          {session.subjectTitle || "General Revision"}
                        </span>
                        <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {session.duration} mins
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {new Date(session.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                      {session.notes ? (
                        <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                          "{session.notes}"
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">No notes logged for this focus sprint.</p>
                      )}
                    </div>

                    <div className="flex items-center justify-end shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSession(session.id)}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        title="Delete Session Log"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  No logs compiled yet. Complete a study session or use the manual logger to save your activity!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Widgets, Loggers & Active Timer) */}
        <div className="space-y-8">
          
          {/* Active Study Timer */}
          <div className="bg-gradient-to-br from-slate-950 to-slate-900 rounded-2xl border border-slate-800 p-6 text-white space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-violet-400" />
                Live Study Timer
              </h3>
              {timerActive && (
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-violet-500 text-white animate-pulse uppercase">
                  Active Sprint
                </span>
              )}
            </div>

            <div className="text-center py-4 space-y-2">
              <div className="text-5xl font-extrabold tracking-widest font-mono text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400 drop-shadow-sm">
                {formatTimer(timerSeconds)}
              </div>
              <p className="text-[10px] text-slate-400">
                Track your study intervals and log hours directly.
              </p>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Associate with Subject
                </label>
                <select
                  value={timerSubjectId}
                  onChange={(e) => setTimerSubjectId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value="">General / Unassociated Study</option>
                  {subjectsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Quick Session Notes
                </label>
                <input
                  type="text"
                  value={timerNotes}
                  onChange={(e) => setTimerNotes(e.target.value)}
                  placeholder="What are you studying right now?"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder-slate-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                {!timerActive ? (
                  <>
                    <Button
                      onClick={() => setTimerActive(true)}
                      className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold flex items-center justify-center gap-1.5 h-10"
                    >
                      <Play className="h-4 w-4" />
                      {timerSeconds > 0 ? "Resume Timer" : "Start Timer"}
                    </Button>
                    {timerSeconds > 0 && (
                      <Button
                        onClick={handleResetTimer}
                        variant="outline"
                        className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white h-10 px-3 shrink-0"
                        title="Reset Timer"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => setTimerActive(false)}
                      variant="outline"
                      className="w-1/3 border-slate-700 text-slate-300 hover:bg-slate-800 h-10"
                    >
                      <Pause className="h-4 w-4 mr-1" />
                      Pause
                    </Button>
                    <Button
                      onClick={handleResetTimer}
                      variant="outline"
                      className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white h-10 px-3 shrink-0"
                      title="Reset Timer"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={handleFinishTimer}
                      className="w-1/2 bg-violet-600 hover:bg-violet-700 text-white font-bold h-10"
                    >
                      Finish & Log
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Study Streak & Weekly Goal Progress Widgets */}
          <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/40 p-5 space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                <Flame className="h-6 w-6 text-orange-500 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Current Study Streak
                </h4>
                <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
                  {analytics?.studyStreak || 0} Days Streak
                  {analytics?.studyStreak && analytics.studyStreak > 0 ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500">
                      On Fire! 🔥
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* 7-Day Visual Habit Grid */}
            <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800/50">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Activity Calendar (Last 7 Days)
              </span>
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/40">
                {analytics?.weeklyStudyHours.map((dayObj, index) => {
                  const hasActivity = dayObj.hours > 0;
                  // Split "Mon 7/6" or "Mon" to get just the day name
                  const dayLabel = dayObj.day.split(" ")[0];
                  return (
                    <div key={index} className="flex flex-col items-center gap-1">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">{dayLabel}</span>
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center transition-all ${
                          hasActivity
                            ? "bg-orange-500 text-white shadow-md shadow-orange-500/20 scale-105"
                            : "bg-slate-100 dark:bg-slate-800/60 text-slate-300 dark:text-slate-700"
                        }`}
                        title={`${dayObj.day}: ${dayObj.hours} hours`}
                      >
                        {hasActivity ? (
                          <Flame className="h-4 w-4 text-white" />
                        ) : (
                          <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weekly Goal Progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Weekly Target Focus</span>
                <span className="font-semibold text-violet-500 font-mono">
                  {analytics?.weeklyGoalProgressPercent || 0}%
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, analytics?.weeklyGoalProgressPercent || 0)}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                Aim for 15 logged study hours per week. Consistency unlocks premium achievements!
              </p>
            </div>
          </div>

          {/* Manual Log study session */}
          <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/40 p-5">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Plus className="h-4.5 w-4.5 text-emerald-500" />
              Log Study Session
            </h3>
            <form onSubmit={handleLogSessionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Subject Area
                </label>
                <select
                  value={logSubjectId}
                  onChange={(e) => setLogSubjectId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value="">General Revision</option>
                  {subjectsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  value={logDuration}
                  onChange={(e) => setLogDuration(e.target.value)}
                  placeholder="e.g. 45"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Study Sprint Notes
                </label>
                <textarea
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="Describe your focus, topics revised..."
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <Button
                type="submit"
                disabled={logSubmitting}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold h-9"
              >
                {logSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log study Session"}
              </Button>
            </form>
          </div>

          {/* Upcoming Academic Exams / Deadlines */}
          <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/40 p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-4.5 w-4.5 text-rose-500" />
              Critical Deadlines
            </h3>
            <div className="space-y-3.5">
              {analytics && analytics.upcomingExams.length > 0 ? (
                analytics.upcomingExams.map((exam) => (
                  <div key={exam.id} className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800/40 pb-3 last:border-0 last:pb-0">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {exam.title}
                      </h4>
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block">
                        {exam.subjectTitle}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-extrabold text-rose-500 block">
                        {exam.dueDate}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase mt-1 inline-block ${
                        exam.priority === "high" ? "bg-rose-50 text-rose-600 dark:bg-rose-950/20" : "bg-slate-100 text-slate-600 dark:bg-slate-800"
                      }`}>
                        {exam.priority}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-slate-400 text-xs">
                  All clear! No upcoming major deadlines.
                </div>
              )}
            </div>
          </div>

          {/* Achievements shelf */}
          <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/40 p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="h-4.5 w-4.5 text-amber-500 animate-bounce" />
              Recent Achievements
            </h3>
            <div className="space-y-3">
              {analytics?.recentAchievements.map((ach, idx) => (
                <div key={idx} className="flex gap-3 items-center">
                  <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Award className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {ach.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      {ach.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
