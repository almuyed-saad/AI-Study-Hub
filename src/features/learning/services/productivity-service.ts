import { db } from "../../../db/index.ts";
import {
  assignments,
  assignmentSubtasks,
  goals,
  goalTasks,
  exams,
  reminders,
  notifications,
  subjects,
  studyTasks
} from "../../../db/schema.ts";
import { eq, and, asc, desc, lte, sql } from "drizzle-orm";
import { getAIClient } from "../../../services/ai.ts";
import { Type } from "@google/genai";

// ==========================================
// 1. ASSIGNMENTS SERVICE
// ==========================================

export async function getAssignments(userId: string) {
  const result = await db
    .select({
      id: assignments.id,
      userId: assignments.userId,
      subjectId: assignments.subjectId,
      title: assignments.title,
      description: assignments.description,
      dueDate: assignments.dueDate,
      priority: assignments.priority,
      status: assignments.status,
      attachments: assignments.attachments,
      createdAt: assignments.createdAt,
      updatedAt: assignments.updatedAt,
      subjectTitle: subjects.title,
      subjectColor: subjects.color,
    })
    .from(assignments)
    .leftJoin(subjects, eq(assignments.subjectId, subjects.id))
    .where(eq(assignments.userId, userId))
    .orderBy(asc(assignments.dueDate));

  // Fetch subtasks for each assignment
  const assignmentsWithSubtasks = [];
  for (const item of result) {
    const subtasks = await db
      .select()
      .from(assignmentSubtasks)
      .where(eq(assignmentSubtasks.assignmentId, item.id))
      .orderBy(asc(assignmentSubtasks.id));

    assignmentsWithSubtasks.push({
      ...item,
      subtasks,
    });
  }

  return assignmentsWithSubtasks;
}

export async function createAssignment(
  userId: string,
  data: {
    title: string;
    description?: string;
    dueDate: string;
    priority: string;
    status: string;
    subjectId?: number;
    attachments?: string;
  }
) {
  const [newAssignment] = await db
    .insert(assignments)
    .values({
      userId,
      subjectId: data.subjectId || null,
      title: data.title,
      description: data.description || null,
      dueDate: new Date(data.dueDate),
      priority: data.priority as any,
      status: data.status as any,
      attachments: data.attachments || null,
    })
    .returning();

  return newAssignment;
}

export async function updateAssignment(
  userId: string,
  id: number,
  data: {
    title?: string;
    description?: string;
    dueDate?: string;
    priority?: string;
    status?: string;
    subjectId?: number | null;
    attachments?: string | null;
  }
) {
  const updates: any = {
    updatedAt: new Date(),
  };

  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.dueDate !== undefined) updates.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.priority !== undefined) updates.priority = data.priority;
  if (data.status !== undefined) updates.status = data.status;
  if (data.subjectId !== undefined) updates.subjectId = data.subjectId;
  if (data.attachments !== undefined) updates.attachments = data.attachments;

  const [updated] = await db
    .update(assignments)
    .set(updates)
    .where(and(eq(assignments.userId, userId), eq(assignments.id, id)))
    .returning();

  return updated;
}

export async function deleteAssignment(userId: string, id: number) {
  return await db
    .delete(assignments)
    .where(and(eq(assignments.userId, userId), eq(assignments.id, id)))
    .returning();
}

// Subtasks CRUD
export async function toggleAssignmentSubtask(subtaskId: number, completed: boolean) {
  return await db
    .update(assignmentSubtasks)
    .set({ completed, updatedAt: new Date() })
    .where(eq(assignmentSubtasks.id, subtaskId))
    .returning();
}

// AI Break down Assignment
export async function breakdownAssignmentAI(userId: string, assignmentId: number) {
  const [assignment] = await db
    .select()
    .from(assignments)
    .where(and(eq(assignments.userId, userId), eq(assignments.id, assignmentId)))
    .limit(1);

  if (!assignment) {
    throw new Error("Assignment not found.");
  }

  // Get subject info if any
  let subjectName = "General Study";
  if (assignment.subjectId) {
    const [subj] = await db.select().from(subjects).where(eq(subjects.id, assignment.subjectId)).limit(1);
    if (subj) subjectName = subj.title;
  }

  const ai = getAIClient();
  const prompt = `
Break down the following academic assignment into 4-6 smaller, manageable study subtasks:
Assignment Title: ${assignment.title}
Subject: ${subjectName}
Due Date: ${new Date(assignment.dueDate).toLocaleDateString()}
Description: ${assignment.description || "No description provided"}

For each subtask, generate:
1. Title (actionable name)
2. Estimated study time (integer, in minutes)
3. Suggested completion schedule / timeline relative to the due date.

Provide the response STRICTLY as a JSON object matching the requested schema.
`;

  const systemInstruction = `
You are a highly efficient academic productivity tutor.
Your response MUST be formatted strictly according to the requested JSON schema.
Each subtask title must be distinct, highly specific, and actionable.
Ensure 'estimatedTime' is in minutes (e.g. 45, 60, 90).
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subtasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  estimatedTime: { type: Type.INTEGER, description: "Estimated study time in minutes" },
                  suggestedSchedule: { type: Type.STRING, description: "When to work on this, e.g., '3 days before due', 'Day 1'" },
                },
                required: ["title", "estimatedTime", "suggestedSchedule"],
              },
            },
          },
          required: ["subtasks"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI.");

    const parsed = JSON.parse(text);
    const subtasksData = parsed.subtasks || [];

    // Delete existing subtasks for fresh regeneration
    await db.delete(assignmentSubtasks).where(eq(assignmentSubtasks.assignmentId, assignmentId));

    const insertedSubtasks = [];
    for (const sub of subtasksData) {
      const [inserted] = await db
        .insert(assignmentSubtasks)
        .values({
          assignmentId,
          title: sub.title,
          completed: false,
          estimatedTime: sub.estimatedTime || null,
          suggestedSchedule: sub.suggestedSchedule || null,
        })
        .returning();
      if (inserted) insertedSubtasks.push(inserted);
    }

    return insertedSubtasks;
  } catch (error) {
    console.error("Error breaking down assignment:", error);
    throw error;
  }
}

// ==========================================
// 2. GOALS SERVICE
// ==========================================

export async function getGoals(userId: string) {
  const result = await db
    .select()
    .from(goals)
    .where(eq(goals.userId, userId))
    .orderBy(desc(goals.createdAt));

  const goalsWithTasks = [];
  for (const goal of result) {
    const tasks = await db
      .select()
      .from(goalTasks)
      .where(eq(goalTasks.goalId, goal.id))
      .orderBy(asc(goalTasks.id));

    goalsWithTasks.push({
      ...goal,
      tasks,
    });
  }

  return goalsWithTasks;
}

export async function createGoal(
  userId: string,
  data: {
    title: string;
    description?: string;
    type: string; // 'daily' | 'weekly' | 'monthly'
    targetDate?: string;
    tasks?: string[]; // initial list of tasks
  }
) {
  const [newGoal] = await db
    .insert(goals)
    .values({
      userId,
      title: data.title,
      description: data.description || null,
      type: data.type,
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
      completed: false,
      progress: 0,
    })
    .returning();

  if (data.tasks && data.tasks.length > 0) {
    for (const taskTitle of data.tasks) {
      if (taskTitle.trim()) {
        await db.insert(goalTasks).values({
          goalId: newGoal.id,
          title: taskTitle.trim(),
          completed: false,
        });
      }
    }
  }

  // Recalculate progress for return
  return await getGoalWithCalculatedProgress(newGoal.id);
}

export async function updateGoal(
  userId: string,
  id: number,
  data: {
    title?: string;
    description?: string;
    type?: string;
    targetDate?: string | null;
    completed?: boolean;
  }
) {
  const updates: any = {
    updatedAt: new Date(),
  };

  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.type !== undefined) updates.type = data.type;
  if (data.targetDate !== undefined) updates.targetDate = data.targetDate ? new Date(data.targetDate) : null;
  if (data.completed !== undefined) updates.completed = data.completed;

  const [updated] = await db
    .update(goals)
    .set(updates)
    .where(and(eq(goals.userId, userId), eq(goals.id, id)))
    .returning();

  return await getGoalWithCalculatedProgress(id);
}

export async function deleteGoal(userId: string, id: number) {
  return await db
    .delete(goals)
    .where(and(eq(goals.userId, userId), eq(goals.id, id)))
    .returning();
}

// Goal Tasks
export async function addGoalTask(goalId: number, title: string) {
  const [inserted] = await db
    .insert(goalTasks)
    .values({
      goalId,
      title,
      completed: false,
    })
    .returning();

  await syncGoalProgress(goalId);
  return inserted;
}

export async function toggleGoalTask(goalId: number, taskId: number, completed: boolean) {
  const [updated] = await db
    .update(goalTasks)
    .set({ completed, updatedAt: new Date() })
    .where(and(eq(goalTasks.id, taskId), eq(goalTasks.goalId, goalId)))
    .returning();

  await syncGoalProgress(goalId);
  return updated;
}

export async function deleteGoalTask(goalId: number, taskId: number) {
  const deleted = await db
    .delete(goalTasks)
    .where(and(eq(goalTasks.id, taskId), eq(goalTasks.goalId, goalId)))
    .returning();

  await syncGoalProgress(goalId);
  return deleted;
}

// Progress calculations
async function syncGoalProgress(goalId: number) {
  const allTasks = await db.select().from(goalTasks).where(eq(goalTasks.goalId, goalId));
  if (allTasks.length === 0) {
    await db.update(goals).set({ progress: 0, completed: false, updatedAt: new Date() }).where(eq(goals.id, goalId));
    return;
  }

  const completedCount = allTasks.filter((t) => t.completed).length;
  const progressPercentage = Math.round((completedCount / allTasks.length) * 100);
  const isCompleted = progressPercentage === 100;

  await db
    .update(goals)
    .set({
      progress: progressPercentage,
      completed: isCompleted,
      updatedAt: new Date(),
    })
    .where(eq(goals.id, goalId));
}

async function getGoalWithCalculatedProgress(goalId: number) {
  const [goal] = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1);
  const tasks = await db.select().from(goalTasks).where(eq(goalTasks.goalId, goalId)).orderBy(asc(goalTasks.id));
  return {
    ...goal,
    tasks,
  };
}

// ==========================================
// 3. EXAMS SERVICE
// ==========================================

export async function getExams(userId: string) {
  return await db
    .select({
      id: exams.id,
      userId: exams.userId,
      subjectId: exams.subjectId,
      title: exams.title,
      description: exams.description,
      examDate: exams.examDate,
      location: exams.location,
      createdAt: exams.createdAt,
      updatedAt: exams.updatedAt,
      subjectTitle: subjects.title,
      subjectColor: subjects.color,
    })
    .from(exams)
    .leftJoin(subjects, eq(exams.subjectId, subjects.id))
    .where(eq(exams.userId, userId))
    .orderBy(asc(exams.examDate));
}

export async function createExam(
  userId: string,
  data: {
    title: string;
    description?: string;
    examDate: string;
    location?: string;
    subjectId: number;
  }
) {
  const [newExam] = await db
    .insert(exams)
    .values({
      userId,
      subjectId: data.subjectId,
      title: data.title,
      description: data.description || null,
      examDate: new Date(data.examDate),
      location: data.location || null,
    })
    .returning();

  return newExam;
}

export async function updateExam(
  userId: string,
  id: number,
  data: {
    title?: string;
    description?: string;
    examDate?: string;
    location?: string;
    subjectId?: number;
  }
) {
  const updates: any = {
    updatedAt: new Date(),
  };

  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.examDate !== undefined) updates.examDate = data.examDate ? new Date(data.examDate) : null;
  if (data.location !== undefined) updates.location = data.location;
  if (data.subjectId !== undefined) updates.subjectId = data.subjectId;

  const [updated] = await db
    .update(exams)
    .set(updates)
    .where(and(eq(exams.userId, userId), eq(exams.id, id)))
    .returning();

  return updated;
}

export async function deleteExam(userId: string, id: number) {
  return await db
    .delete(exams)
    .where(and(eq(exams.userId, userId), eq(exams.id, id)))
    .returning();
}

// ==========================================
// 4. SMART REMINDERS SERVICE
// ==========================================

export async function getReminders(userId: string) {
  return await db
    .select()
    .from(reminders)
    .where(eq(reminders.userId, userId))
    .orderBy(asc(reminders.triggerTime));
}

export async function createReminder(
  userId: string,
  data: {
    title: string;
    description?: string;
    triggerTime: string;
    targetType: 'assignment' | 'planner_task' | 'goal' | 'exam';
    targetId: number;
    reminderType: '1_day_before' | '1_hour_before' | 'custom';
  }
) {
  // Check if reminder already exists to prevent duplicates
  const [existing] = await db
    .select()
    .from(reminders)
    .where(
      and(
        eq(reminders.userId, userId),
        eq(reminders.targetType, data.targetType),
        eq(reminders.targetId, data.targetId),
        eq(reminders.reminderType, data.reminderType)
      )
    )
    .limit(1);

  if (existing) {
    // If it exists, update it instead of duplicate insert
    const [updated] = await db
      .update(reminders)
      .set({
        title: data.title,
        description: data.description || null,
        triggerTime: new Date(data.triggerTime),
        notified: false,
        updatedAt: new Date(),
      })
      .where(eq(reminders.id, existing.id))
      .returning();
    return updated;
  }

  const [newReminder] = await db
    .insert(reminders)
    .values({
      userId,
      title: data.title,
      description: data.description || null,
      triggerTime: new Date(data.triggerTime),
      targetType: data.targetType,
      targetId: data.targetId,
      reminderType: data.reminderType,
      notified: false,
    })
    .returning();

  return newReminder;
}

export async function deleteRemindersForTarget(
  userId: string,
  targetType: 'assignment' | 'planner_task' | 'goal' | 'exam',
  targetId: number
) {
  return await db
    .delete(reminders)
    .where(
      and(
        eq(reminders.userId, userId),
        eq(reminders.targetType, targetType),
        eq(reminders.targetId, targetId)
      )
    );
}

// Triggers pending reminders dynamically on dashboard or page load
export async function triggerPendingReminders(userId: string) {
  const now = new Date();

  // Find all reminders due but not notified yet
  const dueReminders = await db
    .select()
    .from(reminders)
    .where(
      and(
        eq(reminders.userId, userId),
        eq(reminders.notified, false),
        lte(reminders.triggerTime, now)
      )
    );

  const notificationsGenerated = [];

  for (const rem of dueReminders) {
    // Update notified = true first to prevent race condition/duplicate triggering
    await db
      .update(reminders)
      .set({ notified: true, updatedAt: new Date() })
      .where(eq(reminders.id, rem.id));

    // Double-check if parent is completed to avoid stale notifications
    let parentIsCompleted = false;

    if (rem.targetType === "assignment") {
      const [parent] = await db.select().from(assignments).where(eq(assignments.id, rem.targetId)).limit(1);
      if (parent && parent.status === "completed") parentIsCompleted = true;
    } else if (rem.targetType === "planner_task") {
      const [parent] = await db.select().from(studyTasks).where(eq(studyTasks.id, rem.targetId)).limit(1);
      if (parent && parent.status === "completed") parentIsCompleted = true;
    } else if (rem.targetType === "goal") {
      const [parent] = await db.select().from(goals).where(eq(goals.id, rem.targetId)).limit(1);
      if (parent && parent.completed) parentIsCompleted = true;
    }

    if (parentIsCompleted) {
      continue; // Skip alerting for already finished items
    }

    // Generate System Notification
    const [newNotif] = await db
      .insert(notifications)
      .values({
        userId,
        title: rem.title,
        message: rem.description || `Upcoming ${rem.targetType} notification!`,
        type: "reminder",
        read: false,
      })
      .returning();

    if (newNotif) {
      notificationsGenerated.push(newNotif);
    }
  }

  return notificationsGenerated;
}
