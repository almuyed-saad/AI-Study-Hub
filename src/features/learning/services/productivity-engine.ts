import { db } from "../../../db/index.ts";
import {
  subjects,
  notes,
  documents,
  studyTasks,
  assignments,
  goals,
  goalTasks,
  exams,
  quizAttempts,
  quizzes,
  flashcardProgress,
  studySessions,
  aiStudyPlans,
  aiRecommendations,
  aiRevisionPlans,
} from "../../../db/schema.ts";
import { eq, and, desc, asc, lte, sql, isNull } from "drizzle-orm";
import { getAIClient } from "../../../services/ai.ts";
import { Type } from "@google/genai";

// =========================================================================
// 1. AI PRODUCTIVITY & STUDY METRICS SERVICE (Task 6)
// =========================================================================

export interface ProductivityScores {
  productivityScore: number;
  studyScore: number;
  streak: number;
  completedTasks: number;
  pendingTasks: number;
  weeklyGoalProgress: number;
}

export async function getAIProductivityMetrics(userId: string): Promise<ProductivityScores> {
  // Fetch raw data
  const userTasks = await db.select().from(studyTasks).where(eq(studyTasks.userId, userId));
  const userAssignments = await db.select().from(assignments).where(eq(assignments.userId, userId));
  const userGoals = await db.select().from(goals).where(eq(goals.userId, userId));
  const sessions = await db.select().from(studySessions).where(eq(studySessions.userId, userId));
  const attempts = await db.select().from(quizAttempts).where(eq(quizAttempts.userId, userId));

  // --- Calculate Productivity Score (0-100) ---
  // Completion rates of study tasks, assignments, and goals
  const totalTasks = userTasks.length;
  const completedTasks = userTasks.filter((t) => t.status === "completed").length;
  const taskRate = totalTasks > 0 ? completedTasks / totalTasks : 1.0;

  const totalAssignments = userAssignments.length;
  const completedAssignments = userAssignments.filter((a) => a.status === "completed").length;
  const assignmentRate = totalAssignments > 0 ? completedAssignments / totalAssignments : 1.0;

  // Goal average progress
  const totalGoals = userGoals.length;
  const averageGoalProgress = totalGoals > 0 
    ? userGoals.reduce((sum, g) => sum + g.progress, 0) / (totalGoals * 100) 
    : 1.0;

  // Study frequency component (number of study sessions logged in last 7 days, max 5 sessions)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentSessions = sessions.filter((s) => new Date(s.createdAt) >= sevenDaysAgo);
  const studySessionFactor = Math.min(recentSessions.length / 5, 1.0);

  // Weighted average: 30% tasks, 30% assignments, 20% goals progress, 20% study session consistency
  const rawProductivity = (taskRate * 0.3 + assignmentRate * 0.3 + averageGoalProgress * 0.2 + studySessionFactor * 0.2) * 100;
  const productivityScore = Math.max(15, Math.min(100, Math.round(rawProductivity)));

  // --- Calculate AI Study Score (0-100) ---
  // 1. Quiz average accuracy (40%)
  const averageQuizAccuracy = attempts.length > 0
    ? attempts.reduce((sum, a) => sum + a.accuracy, 0) / attempts.length
    : 70; // baseline accuracy if no quiz attempts

  // 2. Study Streak (consecutive study or completion days, max 7 days = 100%)
  const activityDates = new Set<string>();
  sessions.forEach((s) => activityDates.add(new Date(s.createdAt).toDateString()));
  userTasks.forEach((t) => {
    if (t.status === "completed" && t.updatedAt) {
      activityDates.add(new Date(t.updatedAt).toDateString());
    }
  });

  let streak = 0;
  const checkDate = new Date();
  if (!activityDates.has(checkDate.toDateString())) {
    checkDate.setDate(checkDate.getDate() - 1);
  }
  while (activityDates.has(checkDate.toDateString())) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  const streakFactor = Math.min(streak / 7, 1.0); // 30% weight

  // 3. Weekly Goal hours logged vs 15-hour target (30% weight)
  const thisWeekMinutes = recentSessions.reduce((acc, s) => acc + s.duration, 0);
  const thisWeekHours = thisWeekMinutes / 60;
  const weeklyGoalProgress = Math.min(Math.round((thisWeekHours / 15) * 100), 100);
  const hoursFactor = Math.min(thisWeekHours / 15, 1.0);

  const rawStudyScore = (averageQuizAccuracy * 0.4) + (streakFactor * 30) + (hoursFactor * 30);
  const studyScore = Math.max(20, Math.min(100, Math.round(rawStudyScore)));

  return {
    productivityScore,
    studyScore,
    streak,
    completedTasks,
    pendingTasks: totalTasks - completedTasks,
    weeklyGoalProgress,
  };
}

// =========================================================================
// 2. AI WEAK TOPIC DETECTION (Task 3)
// =========================================================================

export interface WeakTopicAnalysis {
  weakTopics: { subject: string; topicName: string; accuracy?: number; recommendation: string }[];
  strongTopics: { subject: string; topicName: string; accuracy?: number }[];
  neglectedSubjects: { subject: string; reason: string }[];
}

export async function getAIWeakTopicAnalysis(userId: string): Promise<WeakTopicAnalysis> {
  const allSubjects = await db.select().from(subjects).where(eq(subjects.userId, userId));
  const userTasks = await db.select().from(studyTasks).where(eq(studyTasks.userId, userId));
  const attempts = await db
    .select({
      id: quizAttempts.id,
      accuracy: quizAttempts.accuracy,
      quizTitle: quizzes.title,
      subjectId: quizzes.subjectId,
    })
    .from(quizAttempts)
    .leftJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
    .where(eq(quizAttempts.userId, userId));

  const progress = await db.select().from(flashcardProgress).where(eq(flashcardProgress.userId, userId));
  const sessions = await db.select().from(studySessions).where(eq(studySessions.userId, userId));

  // If the user has no metrics yet, return a structured fallback based on their subjects
  if (allSubjects.length === 0) {
    return {
      weakTopics: [],
      strongTopics: [],
      neglectedSubjects: [],
    };
  }

  // Aggregate stats per subject
  const subjectStatsMap = allSubjects.map((sub) => {
    const subAttempts = attempts.filter((a) => a.subjectId === sub.id);
    const avgQuizAccuracy = subAttempts.length > 0
      ? Math.round(subAttempts.reduce((sum, a) => sum + a.accuracy, 0) / subAttempts.length)
      : null;

    const subSessions = sessions.filter((s) => s.subjectId === sub.id);
    const totalMinutes = subSessions.reduce((sum, s) => sum + s.duration, 0);

    const subTasks = userTasks.filter((t) => t.subjectId === sub.id);
    const totalTasks = subTasks.length;
    const completedTasks = subTasks.filter((t) => t.status === "completed").length;

    return {
      id: sub.id,
      title: sub.title,
      avgQuizAccuracy,
      quizCount: subAttempts.length,
      studyHours: Math.round((totalMinutes / 60) * 10) / 10,
      totalTasks,
      completedTasks,
      pendingTasks: totalTasks - completedTasks,
    };
  });

  // Call Gemini for advanced, custom topic analysis
  const ai = getAIClient();
  const prompt = `
Analyze the academic performance metrics of this student and identify their weak topics, strong topics, and neglected subjects.
Here are the aggregated statistics per subject:
${JSON.stringify(subjectStatsMap, null, 2)}

Active flashcard reviews rated 'hard' or 'medium':
${JSON.stringify(progress.filter(p => p.rating === "hard" || p.rating === "medium"), null, 2)}

Provide a highly personalized and accurate breakdown of:
1. "weakTopics": List 1 to 3 actual topics or subjects where the student has scored low in quizzes (e.g., accuracy < 75%) or has many pending study tasks. Provide a constructive, highly customized action tip for each topic.
2. "strongTopics": List 1 to 2 topics or subjects where they are excelling (quiz score > 80% or logged high study hours and completed tasks).
3. "neglectedSubjects": List subjects that have had 0 study sessions logged or very few tasks completed, with a warning explanation.

Ensure you refer specifically to the subjects in the statistics list. If there is insufficient data to find weak/strong topics, make smart recommendations using the enrolled subject list.

Your response MUST be a single structured JSON object containing:
{
  "weakTopics": [
    { "subject": "Subject Name", "topicName": "Specific Topic", "accuracy": 65, "recommendation": "Calculus integrals requires practice. Try generating a 5-question Socratic Quiz." }
  ],
  "strongTopics": [
    { "subject": "Subject Name", "topicName": "Specific Topic", "accuracy": 90 }
  ],
  "neglectedSubjects": [
    { "subject": "Subject Name", "reason": "No study sessions logged this week despite having 3 pending study tasks." }
  ]
}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            weakTopics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING },
                  topicName: { type: Type.STRING },
                  accuracy: { type: Type.INTEGER },
                  recommendation: { type: Type.STRING },
                },
                required: ["subject", "topicName", "recommendation"],
              },
            },
            strongTopics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING },
                  topicName: { type: Type.STRING },
                  accuracy: { type: Type.INTEGER },
                },
                required: ["subject", "topicName"],
              },
            },
            neglectedSubjects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ["subject", "reason"],
              },
            },
          },
          required: ["weakTopics", "strongTopics", "neglectedSubjects"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty AI response");
    return JSON.parse(text) as WeakTopicAnalysis;
  } catch (error) {
    console.error("AI Topic Detection failed, returning local estimate:", error);
    
    // Fallback: heuristic calculation based on raw metrics
    const weakTopics: any[] = [];
    const strongTopics: any[] = [];
    const neglectedSubjects: any[] = [];

    subjectStatsMap.forEach((s) => {
      if (s.avgQuizAccuracy !== null && s.avgQuizAccuracy < 75) {
        weakTopics.push({
          subject: s.title,
          topicName: "Concept Review",
          accuracy: s.avgQuizAccuracy,
          recommendation: `Your quiz accuracy is currently ${s.avgQuizAccuracy}%. Let's review past study notes or generate a focused flashcard practice.`,
        });
      } else if (s.avgQuizAccuracy !== null && s.avgQuizAccuracy >= 80) {
        strongTopics.push({
          subject: s.title,
          topicName: "Core Principles",
          accuracy: s.avgQuizAccuracy,
        });
      }

      if (s.studyHours === 0) {
        neglectedSubjects.push({
          subject: s.title,
          reason: "Zero focus hours logged in study sessions. Consider blocking out 30 minutes for a quick introduction.",
        });
      }
    });

    // Make sure we always return at least something
    if (weakTopics.length === 0 && subjectStatsMap.length > 0) {
      weakTopics.push({
        subject: subjectStatsMap[0].title,
        topicName: "Comprehensive Revision",
        recommendation: "Take a Socratic quiz in this subject to establish a performance baseline.",
      });
    }

    if (strongTopics.length === 0 && subjectStatsMap.length > 0) {
      strongTopics.push({
        subject: subjectStatsMap[subjectStatsMap.length - 1].title,
        topicName: "Active Overview",
      });
    }

    return { weakTopics, strongTopics, neglectedSubjects };
  }
}

// =========================================================================
// 3. PERSISTENT AI RECOMMENDATIONS ENGINE (Task 4 & Task 7)
// =========================================================================

export async function generateAIRecommendations(userId: string) {
  const allSubjects = await db.select().from(subjects).where(eq(subjects.userId, userId));
  const metrics = await getAIProductivityMetrics(userId);
  const analysis = await getAIWeakTopicAnalysis(userId);
  const userExams = await db.select().from(exams).where(eq(exams.userId, userId)).orderBy(asc(exams.examDate));

  // Compose prompt using real performance data
  const prompt = `
Generate exactly 3 to 5 highly personalized study recommendations based on this student's real metrics:
- Productivity Score: ${metrics.productivityScore}/100
- AI Study Score: ${metrics.studyScore}/100
- Study Streak: ${metrics.streak} days
- Pending Study Tasks: ${metrics.pendingTasks}
- Upcoming Exams: ${JSON.stringify(userExams.slice(0, 3).map(e => ({ title: e.title, date: e.examDate })))}
- Weak Topics identified: ${JSON.stringify(analysis.weakTopics)}
- Neglected Subjects identified: ${JSON.stringify(analysis.neglectedSubjects)}

For each recommendation, generate:
1. Simple, direct action text (e.g., "Spend 45 minutes on Calculus integrals today.", "Revise Data Structures before your midterm on Friday.")
2. Type of recommendation: Must be exactly "task" (planner, assignment actions), "revision" (quiz, weak topics), "alert" (exam warning, high backlog), or "general" (motivation, study habit)
3. Priority: "high", "medium", or "low"
4. actionUrl: Suggest an appropriate application route from: "/dashboard", "/dashboard/learning/quizzes", "/dashboard/learning/flashcards", "/dashboard/learning/planner", "/dashboard/learning/subjects"

Format the response strictly as a JSON object with a single "recommendations" array.
`;

  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  type: { type: Type.STRING, description: "Must be: 'task', 'revision', 'alert', 'general'" },
                  priority: { type: Type.STRING, description: "Must be: 'high', 'medium', 'low'" },
                  actionUrl: { type: Type.STRING },
                },
                required: ["text", "type", "priority", "actionUrl"],
              },
            },
          },
          required: ["recommendations"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty recommendations response");
    const parsed = JSON.parse(text);
    const recs = parsed.recommendations || [];

    // Store in the database under aiRecommendations
    // To keep recommendations fresh and avoid duplicates, we can clear un-dismissed existing recommendations and insert new ones
    await db.delete(aiRecommendations).where(and(eq(aiRecommendations.userId, userId), eq(aiRecommendations.dismissed, false)));

    const inserted = [];
    for (const r of recs) {
      const [newRec] = await db
        .insert(aiRecommendations)
        .values({
          userId,
          text: r.text,
          type: r.type,
          priority: r.priority,
          actionUrl: r.actionUrl,
          dismissed: false,
        })
        .returning();
      if (newRec) inserted.push(newRec);
    }

    return inserted;
  } catch (error) {
    console.error("Failed to generate and store recommendations:", error);
    
    // Fallback: clear and seed standard recommendations using user subjects
    await db.delete(aiRecommendations).where(and(eq(aiRecommendations.userId, userId), eq(aiRecommendations.dismissed, false)));
    
    const fallbackRecs = [];
    if (analysis.weakTopics.length > 0) {
      fallbackRecs.push({
        userId,
        text: `Spend 45 minutes on ${analysis.weakTopics[0].subject} to focus on ${analysis.weakTopics[0].topicName} today.`,
        type: "revision",
        priority: "high",
        actionUrl: "/dashboard/learning/quizzes",
      });
    } else {
      fallbackRecs.push({
        userId,
        text: "Tackle your highest priority pending task in the study planner.",
        type: "task",
        priority: "medium",
        actionUrl: "/dashboard/learning/planner",
      });
    }

    if (analysis.neglectedSubjects.length > 0) {
      fallbackRecs.push({
        userId,
        text: `Schedule a short review session for your neglected subject: ${analysis.neglectedSubjects[0].subject}.`,
        type: "alert",
        priority: "high",
        actionUrl: "/dashboard/learning/subjects",
      });
    }

    fallbackRecs.push({
      userId,
      text: "Maintain your consecutive study streak! Review 10 flashcards in your weakest area.",
      type: "general",
      priority: "medium",
      actionUrl: "/dashboard/learning/flashcards",
    });

    const inserted = [];
    for (const f of fallbackRecs) {
      const [i] = await db.insert(aiRecommendations).values(f).returning();
      if (i) inserted.push(i);
    }
    return inserted;
  }
}

// =========================================================================
// 4. AI DAILY & WEEKLY REVISION PLANNER (Task 2)
// =========================================================================

export async function generateRevisionPlan(userId: string, scheduleType: 'daily' | 'weekly') {
  const analysis = await getAIWeakTopicAnalysis(userId);
  const userExams = await db.select().from(exams).where(eq(exams.userId, userId)).orderBy(asc(exams.examDate));
  const userSubjects = await db.select().from(subjects).where(eq(subjects.userId, userId));

  const subjectList = userSubjects.map(s => s.title).join(", ");
  const examsList = userExams.map(e => `- ${e.title} on ${new Date(e.examDate).toLocaleDateString()}`).join("\n");
  const weakTopicsList = analysis.weakTopics.map(w => `- Subject: ${w.subject}, Focus: ${w.topicName} (accuracy: ${w.accuracy || 'low'}%)`).join("\n");

  const prompt = `
Generate an optimized, personalized academic revision schedule for a student.
Schedule Type: ${scheduleType} (Must be strictly 'daily' or 'weekly' layout)
Enrolled Subjects: [${subjectList}]
Upcoming Exams:
${examsList || "No upcoming exams scheduled."}
Weak Topics to prioritize:
${weakTopicsList || "No specific weak topics identified yet. Ensure a balanced schedule across all subjects."}

Please build a highly strategic schedule:
- For Daily Plan: Breakdown the day into structured 25-minute Pomodoro focus sessions and rest intervals. Specifically recommend which topic to study, prioritizing weak topics first.
- For Weekly Plan: Breakdown the week day-by-day (Monday through Sunday) with dedicated revision times, recommended frequency of studying each subject based on weak areas, and specific milestones.

Your response MUST be a single structured JSON object formatted exactly as:
{
  "title": "Socratic Revision Roadmap",
  "scheduleType": "${scheduleType}",
  "goals": ["Goal 1", "Goal 2"],
  "blocks": [
    {
      "timeLabel": "e.g., Morning Block, or Monday",
      "subject": "Name of Subject",
      "activity": "Detailed topic review instructions",
      "durationMinutes": 45,
      "priority": "high"
    }
  ]
}
`;

  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            scheduleType: { type: Type.STRING },
            goals: { type: Type.ARRAY, items: { type: Type.STRING } },
            blocks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timeLabel: { type: Type.STRING, description: "e.g. 'Monday', '09:00 - 09:45'" },
                  subject: { type: Type.STRING },
                  activity: { type: Type.STRING },
                  durationMinutes: { type: Type.INTEGER },
                  priority: { type: Type.STRING, description: "'high', 'medium', or 'low'" },
                },
                required: ["timeLabel", "subject", "activity", "durationMinutes", "priority"],
              },
            },
          },
          required: ["title", "scheduleType", "goals", "blocks"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    // Store in the database
    // To prevent duplicate schedules, remove existing revision plan for the same type first
    await db.delete(aiRevisionPlans).where(and(eq(aiRevisionPlans.userId, userId), eq(aiRevisionPlans.scheduleType, scheduleType)));

    const [savedPlan] = await db
      .insert(aiRevisionPlans)
      .values({
        userId,
        scheduleType,
        planData: text,
      })
      .returning();

    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to generate revision plan via AI:", error);
    
    // Fallback: simple default schedule structure
    const fallbackPlan = {
      title: `${scheduleType === 'daily' ? 'Daily' : 'Weekly'} Study Schedule`,
      scheduleType,
      goals: ["Master active recall with flashcards", "Tackle toughest concepts first"],
      blocks: [
        {
          timeLabel: scheduleType === 'daily' ? "10:00 - 10:45" : "Monday",
          subject: userSubjects[0]?.title || "General Study",
          activity: "Focus on active recall by taking practice questions on weak chapters.",
          durationMinutes: 45,
          priority: "high",
        },
        {
          timeLabel: scheduleType === 'daily' ? "11:00 - 11:30" : "Wednesday",
          subject: userSubjects[0]?.title || "General Study",
          activity: "Flashcards review session and formulas review.",
          durationMinutes: 30,
          priority: "medium",
        }
      ]
    };

    await db.delete(aiRevisionPlans).where(and(eq(aiRevisionPlans.userId, userId), eq(aiRevisionPlans.scheduleType, scheduleType)));
    await db.insert(aiRevisionPlans).values({
      userId,
      scheduleType,
      planData: JSON.stringify(fallbackPlan),
    });

    return fallbackPlan;
  }
}

// =========================================================================
// 5. AI DAILY BRIEFING (Task 5)
// =========================================================================

export interface DailyBriefing {
  date: string;
  tasksCount: number;
  totalDurationMinutes: number;
  studyOrder: { id: number; title: string; subject?: string; recommendedOrder: number; why: string }[];
  reminders: string[];
  motivationalQuote: string;
}

export async function getAIDailyBriefing(userId: string): Promise<DailyBriefing> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  // Get active tasks and assignments due today or overdue
  const rawTasks = await db
    .select({
      id: studyTasks.id,
      title: studyTasks.title,
      dueDate: studyTasks.dueDate,
      priority: studyTasks.priority,
      subjectTitle: subjects.title,
    })
    .from(studyTasks)
    .leftJoin(subjects, eq(studyTasks.subjectId, subjects.id))
    .where(and(eq(studyTasks.userId, userId), eq(studyTasks.status, "pending")));

  const todaysTasks = rawTasks.filter(t => t.dueDate && new Date(t.dueDate) <= endOfToday);

  const rawAssignments = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      dueDate: assignments.dueDate,
      priority: assignments.priority,
      subjectTitle: subjects.title,
    })
    .from(assignments)
    .leftJoin(subjects, eq(assignments.subjectId, subjects.id))
    .where(and(eq(assignments.userId, userId), eq(assignments.status, "pending")));

  const todaysAssignments = rawAssignments.filter(a => a.dueDate && new Date(a.dueDate) <= endOfToday);

  // Streak & stats
  const metrics = await getAIProductivityMetrics(userId);
  const analysis = await getAIWeakTopicAnalysis(userId);

  const combinedItems = [
    ...todaysTasks.map(t => ({ id: t.id, title: t.title, type: "task", subject: t.subjectTitle || "General", priority: t.priority })),
    ...todaysAssignments.map(a => ({ id: a.id, title: a.title, type: "assignment", subject: a.subjectTitle || "General", priority: a.priority }))
  ];

  if (combinedItems.length === 0) {
    return {
      date: now.toDateString(),
      tasksCount: 0,
      totalDurationMinutes: 0,
      studyOrder: [],
      reminders: [
        "No study sessions or assignments are strictly due today!",
        analysis.neglectedSubjects.length > 0 
          ? `Great time to pay attention to your neglected subject: ${analysis.neglectedSubjects[0].subject}.`
          : "Feel free to generate a new custom AI study schedule or review your active flashcards."
      ],
      motivationalQuote: "The secret of getting ahead is getting started. Today is a great day to learn something new!",
    };
  }

  const prompt = `
Generate a structured daily study briefing for a student with the following items on their desk today:
Items list: ${JSON.stringify(combinedItems)}
Student Study Streak: ${metrics.streak} days
Weak topics currently being tracked: ${JSON.stringify(analysis.weakTopics)}

Please structure:
1. "studyOrder": Strategize and suggest the absolute best order to complete these tasks based on cognitive load, deadlines, and weak areas. Provide a single-sentence reason ("why") for each task's placement (e.g. "Do this high-yield task first when your cognitive energy is highest.").
2. "reminders": Generate 2 to 3 practical alerts or reminders for today.
3. "motivationalQuote": A personalized, uplifting encouragement from a Socratic mentor.
4. "totalDurationMinutes": Heuristically calculate total minutes required (e.g. 45 minutes per task).

Your response MUST be a single structured JSON object:
{
  "studyOrder": [
    { "id": 1, "title": "Task title", "subject": "Subject", "recommendedOrder": 1, "why": "Starting with this math exercise warms up your problem-solving skills." }
  ],
  "reminders": ["Reminder text 1", "Reminder text 2"],
  "motivationalQuote": "Quote text",
  "totalDurationMinutes": 135
}
`;

  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            studyOrder: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  subject: { type: Type.STRING },
                  recommendedOrder: { type: Type.INTEGER },
                  why: { type: Type.STRING },
                },
                required: ["id", "title", "recommendedOrder", "why"],
              },
            },
            reminders: { type: Type.ARRAY, items: { type: Type.STRING } },
            motivationalQuote: { type: Type.STRING },
            totalDurationMinutes: { type: Type.INTEGER },
          },
          required: ["studyOrder", "reminders", "motivationalQuote", "totalDurationMinutes"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty briefing text");
    const parsed = JSON.parse(text);

    return {
      date: now.toDateString(),
      tasksCount: combinedItems.length,
      ...parsed,
    };
  } catch (error) {
    console.error("AI Daily Briefing failed, using fallback:", error);
    
    // Heuristic fallback
    const studyOrder = combinedItems.map((item, idx) => ({
      id: item.id,
      title: item.title,
      subject: item.subject,
      recommendedOrder: idx + 1,
      why: `High-priority item in ${item.subject}. Tackle early for best results.`,
    }));

    return {
      date: now.toDateString(),
      tasksCount: combinedItems.length,
      totalDurationMinutes: combinedItems.length * 45,
      studyOrder,
      reminders: [
        `You have ${combinedItems.length} active assignments or study milestones slated for today.`,
        "Stay hydrated and utilize 5-minute Pomodoro rests between topics."
      ],
      motivationalQuote: "Consistency beats intensity. Keep pushing towards your academic milestones!",
    };
  }
}
