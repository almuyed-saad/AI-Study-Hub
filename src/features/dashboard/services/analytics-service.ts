import { db } from "../../../db/index.ts";
import {
  subjects,
  notes,
  documents,
  conversations,
  quizAttempts,
  flashcardProgress,
  studyTasks,
  studySessions
} from "../../../db/schema.ts";
import { eq, and, asc, desc, lte, gte, inArray, sql, isNull } from "drizzle-orm";
import { getAIClient } from "../../../services/ai.ts";

export interface DashboardAnalyticsData {
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
  
  // Charts
  weeklyStudyHours: { day: string; hours: number }[];
  monthlyStudyHours: { label: string; value: number }[];
  subjectDistribution: { subject: string; hours: number; color: string }[];
  quizScoreTrend: { date: string; score: number; quizTitle: string }[];
  taskCompletionTrend: { day: string; completed: number }[];
  
  // Widgets
  studyStreak: number;
  weeklyGoalHours: number;
  weeklyGoalProgressPercent: number;
  upcomingExams: { id: number; title: string; dueDate: string; subjectTitle: string; priority: string }[];
  todaysFocusSubject: string;
  recentAchievements: { title: string; description: string; date: string; icon: string }[];
  recentSessions: { id: number; subjectId: number | null; duration: number; notes: string | null; createdAt: Date; subjectTitle: string | null; subjectColor: string | null }[];
}

// Ensure the user has study session records to display in charts. If none exist, auto-seed realistic historical data.
async function ensureSeededSessions(userId: string) {
  const existing = await db
    .select()
    .from(studySessions)
    .where(eq(studySessions.userId, userId))
    .limit(1);

  if (existing.length > 0) return;

  // 1. Fetch user's subjects
  const userSubjects = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.userId, userId), isNull(subjects.deletedAt)));

  let subjectIds = userSubjects.map((s) => s.id);

  // If they have no subjects, create three generic ones so they have a beautiful customized experience
  if (subjectIds.length === 0) {
    const defaultSubjects = [
      { title: "Computer Science", color: "#6366f1", icon: "Code", credits: 4 },
      { title: "Mathematics", color: "#ec4899", icon: "Calculator", credits: 3 },
      { title: "Academic Writing", color: "#10b981", icon: "BookOpen", credits: 2 }
    ];

    const inserted = [];
    for (const s of defaultSubjects) {
      const [newSub] = await db
        .insert(subjects)
        .values({
          userId,
          title: s.title,
          color: s.color,
          icon: s.icon,
          credits: s.credits,
          semester: "Semester 1",
          instructor: "Dr. Professor"
        })
        .returning();
      if (newSub) {
        inserted.push(newSub);
      }
    }
    subjectIds = inserted.map((s) => s.id);
  }

  // 2. Generate study sessions spread over the past 7 days
  const now = new Date();
  const seeded = [];
  const notesOptions = [
    "Reviewed lecture recordings and drafted summarizing notes.",
    "Completed chapter practice exercises and reviewed vocabulary.",
    "Worked on mock questions and prepared flashcard definitions.",
    "Collaborated with AI tutor to refine project architecture.",
    "Polished midterm assignment deliverables and checked rubrics."
  ];

  // Seed 25 sessions over the last 28 days
  for (let i = 0; i < 25; i++) {
    const daysAgo = Math.floor(Math.random() * 28);
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 5 * 60 * 60 * 1000);
    const duration = [30, 45, 60, 90, 120, 150][Math.floor(Math.random() * 6)];
    const subjectId = subjectIds.length > 0 ? subjectIds[Math.floor(Math.random() * subjectIds.length)] : null;
    const notesText = notesOptions[Math.floor(Math.random() * notesOptions.length)];

    seeded.push({
      userId,
      subjectId,
      duration,
      notes: notesText,
      createdAt: date
    });
  }

  if (seeded.length > 0) {
    await db.insert(studySessions).values(seeded);
  }
}

export async function getDashboardAnalytics(userId: string): Promise<DashboardAnalyticsData> {
  // 1. No auto-seeding for new users (allows fresh dynamic onboarding states)

  // 2. Fetch all raw data required
  const userSubjects = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.userId, userId), isNull(subjects.deletedAt)));

  const userNotes = await db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, userId), isNull(notes.deletedAt)));

  const userDocs = await db
    .select()
    .from(documents)
    .where(and(eq(documents.userId, userId), isNull(documents.deletedAt)));

  const userConversations = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.userId, userId), isNull(conversations.deletedAt)));

  const userTasks = await db
    .select({
      id: studyTasks.id,
      title: studyTasks.title,
      dueDate: studyTasks.dueDate,
      priority: studyTasks.priority,
      status: studyTasks.status,
      subjectId: studyTasks.subjectId,
      createdAt: studyTasks.createdAt,
      updatedAt: studyTasks.updatedAt,
      subjectTitle: subjects.title
    })
    .from(studyTasks)
    .leftJoin(subjects, eq(studyTasks.subjectId, subjects.id))
    .where(eq(studyTasks.userId, userId));

  const userSessions = await db
    .select({
      id: studySessions.id,
      subjectId: studySessions.subjectId,
      duration: studySessions.duration,
      notes: studySessions.notes,
      createdAt: studySessions.createdAt,
      subjectTitle: subjects.title,
      subjectColor: subjects.color
    })
    .from(studySessions)
    .leftJoin(subjects, eq(studySessions.subjectId, subjects.id))
    .where(eq(studySessions.userId, userId))
    .orderBy(asc(studySessions.createdAt));

  const userQuizAttempts = await db
    .select()
    .from(quizAttempts)
    .where(eq(quizAttempts.userId, userId))
    .orderBy(asc(quizAttempts.createdAt));

  const userFlashcardProgress = await db
    .select()
    .from(flashcardProgress)
    .where(eq(flashcardProgress.userId, userId));

  // --- 3. Compute Basic Metrics ---
  const totalStudyMinutes = userSessions.reduce((acc, s) => acc + s.duration, 0);
  const totalStudyHours = Math.round((totalStudyMinutes / 60) * 10) / 10;

  const subjectsStudiedCount = userSubjects.length;
  const completedTasksCount = userTasks.filter((t) => t.status === "completed").length;
  const pendingTasksCount = userTasks.filter((t) => t.status === "pending").length;
  const flashcardsReviewedCount = userFlashcardProgress.length;
  const quizAttemptsCount = userQuizAttempts.length;

  const averageQuizScore =
    quizAttemptsCount > 0
      ? Math.round(userQuizAttempts.reduce((acc, a) => acc + a.accuracy, 0) / quizAttemptsCount)
      : 0;

  const documentsUploadedCount = userDocs.length;
  const notesCreatedCount = userNotes.length;
  const aiConversationsCount = userConversations.length;

  // --- 4. Charts - Weekly Study Hours (Last 7 Days) ---
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date();
  
  const weeklyStudyMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const label = `${daysOfWeek[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
    weeklyStudyMap[label] = 0;
  }

  userSessions.forEach((s) => {
    const sDate = new Date(s.createdAt);
    const label = `${daysOfWeek[sDate.getDay()]} ${sDate.getMonth() + 1}/${sDate.getDate()}`;
    if (weeklyStudyMap[label] !== undefined) {
      weeklyStudyMap[label] += s.duration / 60;
    }
  });

  const weeklyStudyHours = Object.entries(weeklyStudyMap).map(([day, hours]) => ({
    day,
    hours: Math.round(hours * 10) / 10
  }));

  // --- 4b. Charts - Monthly Study Hours (Last 4 Weeks) ---
  const monthlyStudyMap = [
    { label: "Week 1", value: 0 },
    { label: "Week 2", value: 0 },
    { label: "Week 3", value: 0 },
    { label: "Week 4", value: 0 }
  ];

  const oneDayMs = 24 * 60 * 60 * 1000;
  const nowMs = now.getTime();
  userSessions.forEach((s) => {
    const sDate = new Date(s.createdAt);
    const sMs = sDate.getTime();
    const diffDays = Math.floor((nowMs - sMs) / oneDayMs);
    if (diffDays >= 0 && diffDays < 7) {
      monthlyStudyMap[3].value += s.duration / 60;
    } else if (diffDays >= 7 && diffDays < 14) {
      monthlyStudyMap[2].value += s.duration / 60;
    } else if (diffDays >= 14 && diffDays < 21) {
      monthlyStudyMap[1].value += s.duration / 60;
    } else if (diffDays >= 21 && diffDays < 28) {
      monthlyStudyMap[0].value += s.duration / 60;
    }
  });

  const monthlyStudyHours = monthlyStudyMap.map((w) => ({
    label: w.label,
    value: Math.round(w.value * 10) / 10
  }));

  // --- 5. Charts - Subject-wise Study Distribution ---
  const subjectDistributionMap: Record<string, { hours: number; color: string }> = {};
  userSessions.forEach((s) => {
    const key = s.subjectTitle || "General Study";
    const color = s.subjectColor || "#64748b"; // Slate-500
    if (!subjectDistributionMap[key]) {
      subjectDistributionMap[key] = { hours: 0, color };
    }
    subjectDistributionMap[key].hours += s.duration / 60;
  });

  const subjectDistribution = Object.entries(subjectDistributionMap).map(([subject, data]) => ({
    subject,
    hours: Math.round(data.hours * 10) / 10,
    color: data.color
  }));

  // --- 6. Charts - Quiz Score Trend (Last 10 attempts) ---
  const quizScoreTrend = userQuizAttempts.slice(-10).map((attempt) => ({
    date: new Date(attempt.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    score: attempt.accuracy,
    quizTitle: `Quiz #${attempt.quizId}`
  }));

  // --- 7. Charts - Task Completion Trend (Last 7 Days) ---
  const taskCompletionMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const label = `${daysOfWeek[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
    taskCompletionMap[label] = 0;
  }

  userTasks.forEach((t) => {
    if (t.status === "completed" && t.updatedAt) {
      const uDate = new Date(t.updatedAt);
      const label = `${daysOfWeek[uDate.getDay()]} ${uDate.getMonth() + 1}/${uDate.getDate()}`;
      if (taskCompletionMap[label] !== undefined) {
        taskCompletionMap[label] += 1;
      }
    }
  });

  const taskCompletionTrend = Object.entries(taskCompletionMap).map(([day, completed]) => ({
    day,
    completed
  }));

  // --- 8. Widgets - Study Streak (consecutive days with study sessions or task completions) ---
  const activityDates = new Set<string>();
  userSessions.forEach((s) => activityDates.add(new Date(s.createdAt).toDateString()));
  userTasks.forEach((t) => {
    if (t.status === "completed" && t.updatedAt) {
      activityDates.add(new Date(t.updatedAt).toDateString());
    }
  });

  let studyStreak = 0;
  let checkDate = new Date();
  
  // If no activity today, check starting from yesterday
  if (!activityDates.has(checkDate.toDateString())) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (activityDates.has(checkDate.toDateString())) {
    studyStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // --- 9. Widgets - Weekly Goal ---
  const weeklyGoalHours = 15; // default weekly goal
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisWeekSessions = userSessions.filter((s) => new Date(s.createdAt) >= startOfWeek);
  const thisWeekMinutes = thisWeekSessions.reduce((acc, s) => acc + s.duration, 0);
  const thisWeekHours = thisWeekMinutes / 60;
  const weeklyGoalProgressPercent = Math.min(Math.round((thisWeekHours / weeklyGoalHours) * 100), 100);

  // --- 10. Widgets - Upcoming High Priority Tasks/Exams ---
  const upcomingExams = userTasks
    .filter((t) => t.status === "pending" && t.dueDate && new Date(t.dueDate) >= now)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 3)
    .map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: new Date(t.dueDate!).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      subjectTitle: t.subjectTitle || "General",
      priority: t.priority
    }));

  // --- 11. Widgets - Today's Focus Subject ---
  const subjectTaskCounts: Record<string, number> = {};
  userTasks.forEach((t) => {
    if (t.status === "pending" && t.subjectTitle) {
      subjectTaskCounts[t.subjectTitle] = (subjectTaskCounts[t.subjectTitle] || 0) + 1;
    }
  });

  let todaysFocusSubject = "General Revision";
  let maxCount = 0;
  Object.entries(subjectTaskCounts).forEach(([subj, count]) => {
    if (count > maxCount) {
      maxCount = count;
      todaysFocusSubject = subj;
    }
  });

  // --- 12. Widgets - Recent Achievements ---
  const recentAchievements = [];
  if (totalStudyHours >= 10) {
    recentAchievements.push({
      title: "Deep Focus Master",
      description: "Logged over 10 hours of focused study.",
      date: "Unlocked",
      icon: "Award"
    });
  }
  if (completedTasksCount >= 5) {
    recentAchievements.push({
      title: "Task Crusher",
      description: "Successfully marked off 5+ curriculum milestones.",
      date: "Unlocked",
      icon: "CheckCircle"
    });
  }
  if (averageQuizScore >= 80 && quizAttemptsCount > 0) {
    recentAchievements.push({
      title: "High Achiever",
      description: "Maintained a quiz average score of 80% or above.",
      date: "Unlocked",
      icon: "Zap"
    });
  }
  if (studyStreak >= 3) {
    recentAchievements.push({
      title: "Unstoppable Streak",
      description: "Maintained a solid 3+ day consecutive study rhythm.",
      date: "Unlocked",
      icon: "Flame"
    });
  }
  if (recentAchievements.length === 0) {
    recentAchievements.push({
      title: "Rising Scholar",
      description: "Begin completing tasks and taking quizzes to unlock milestones.",
      date: "In Progress",
      icon: "TrendingUp"
    });
  }

  return {
    totalStudyHours,
    subjectsStudiedCount,
    completedTasksCount,
    pendingTasksCount,
    flashcardsReviewedCount,
    quizAttemptsCount,
    averageQuizScore,
    documentsUploadedCount,
    notesCreatedCount,
    aiConversationsCount,
    weeklyStudyHours,
    monthlyStudyHours,
    subjectDistribution,
    quizScoreTrend,
    taskCompletionTrend,
    studyStreak,
    weeklyGoalHours,
    weeklyGoalProgressPercent,
    upcomingExams,
    todaysFocusSubject,
    recentAchievements: recentAchievements.slice(0, 3),
    recentSessions: userSessions.slice().reverse().slice(0, 10)
  };
}

export async function logStudySession(
  userId: string,
  data: { subjectId?: number; duration: number; notes?: string }
) {
  const [newSession] = await db
    .insert(studySessions)
    .values({
      userId,
      subjectId: data.subjectId || null,
      duration: data.duration,
      notes: data.notes || null,
      createdAt: new Date()
    })
    .returning();

  return newSession;
}

export async function getAIRecommendations(userId: string): Promise<string> {
  const analytics = await getDashboardAnalytics(userId);

  // Compose a robust profile to feed Gemini
  const prompt = `
Generate high-quality, professional, and action-oriented AI recommendations and educational insights based on this student's real performance metrics:

STUDENT SUMMARY PROFILE:
- Total study time logged: ${analytics.totalStudyHours} hours
- Active subjects enrolled: ${analytics.subjectsStudiedCount}
- Tasks completed: ${analytics.completedTasksCount}
- Tasks pending/backlog: ${analytics.pendingTasksCount}
- Flashcards reviewed: ${analytics.flashcardsReviewedCount}
- AI Quizzes attempted: ${analytics.quizAttemptsCount}
- Average AI Quiz accuracy: ${analytics.averageQuizScore}%
- Smart notes captured: ${analytics.notesCreatedCount}
- Research documents uploaded: ${analytics.documentsUploadedCount}
- Continuous study streak: ${analytics.studyStreak} days
- Current weekly goal progress: ${analytics.weeklyGoalProgressPercent}% of 15-hour target

CURRENT DYNAMIC CHART DATA:
- Subject Study Breakdown: ${JSON.stringify(analytics.subjectDistribution)}
- Recent quiz history trend: ${JSON.stringify(analytics.quizScoreTrend)}

You must return a raw JSON object containing exactly these fields (strictly in JSON format, no markdown wrapping block, just raw JSON, do not include \`\`\`json blocks):
{
  "strongestSubject": "Identify the subject where they have spent the most hours OR scored highest in quizzes",
  "weakestSubject": "Identify the subject needing review (lowest quiz scores or low study time relative to tasks)",
  "revisionTopics": ["Topic 1 to revise", "Topic 2 to revise", "Topic 3 to revise"],
  "missedGoals": "Describe any missed targets, pending overdue workloads, or warning indicators",
  "comparisonToLastWeek": "Provide a detailed positive comparison or assessment of their current week performance",
  "todaysFocusRecommendation": "Direct, actionable, motivating study focus recommendation for today"
}
`;

  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text || "{}";
    return responseText;
  } catch (error) {
    console.error("Failed to generate AI insights via Gemini:", error);
    // Graceful fallback with rich default calculations based on actual user metrics
    const strongest = analytics.subjectDistribution[0]?.subject || "Computer Science";
    const weakest = analytics.subjectDistribution[analytics.subjectDistribution.length - 1]?.subject || "Mathematics";
    return JSON.stringify({
      strongestSubject: strongest,
      weakestSubject: weakest,
      revisionTopics: [
        `Consolidate definitions for ${weakest} key concepts`,
        `Review past wrong answers in recent quizzes`,
        "Go through uploaded notes and generate supplementary flashcard decks"
      ],
      missedGoals: analytics.pendingTasksCount > 0 
        ? `You currently have ${analytics.pendingTasksCount} pending curriculum tasks. Try to tackle high-priority items first!` 
        : "Excellent work! Your curriculum schedule is perfectly clear of backlog.",
      comparisonToLastWeek: `You logged ${analytics.totalStudyHours} total study hours this week, meeting ${analytics.weeklyGoalProgressPercent}% of your active goals.`,
      todaysFocusRecommendation: `Allocate a 45-minute sprint to ${weakest} revision today, then wrap up active notes on ${strongest}.`
    });
  }
}
