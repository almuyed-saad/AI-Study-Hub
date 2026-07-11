import { db } from "../../../db/index.ts";
import { studyTasks, notifications, subjects, assignments, exams } from "../../../db/schema.ts";
import { eq, and, asc, desc, lte, gte, inArray, sql } from "drizzle-orm";
import { getAIClient } from "../../../services/ai.ts";
import { Type } from "@google/genai";

export interface CreateTaskInput {
  title: string;
  description?: string;
  dueDate?: string; // ISO string
  priority: "high" | "medium" | "low";
  subjectId?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  dueDate?: string | null;
  priority?: "high" | "medium" | "low";
  subjectId?: number | null;
  status?: "pending" | "completed";
}

// Fetch all study tasks for a user
export async function getStudyTasks(userId: string) {
  return await db
    .select({
      id: studyTasks.id,
      userId: studyTasks.userId,
      subjectId: studyTasks.subjectId,
      title: studyTasks.title,
      description: studyTasks.description,
      dueDate: studyTasks.dueDate,
      priority: studyTasks.priority,
      status: studyTasks.status,
      order: studyTasks.order,
      createdAt: studyTasks.createdAt,
      updatedAt: studyTasks.updatedAt,
      subjectTitle: subjects.title,
      subjectColor: subjects.color,
    })
    .from(studyTasks)
    .leftJoin(subjects, eq(studyTasks.subjectId, subjects.id))
    .where(eq(studyTasks.userId, userId))
    .orderBy(asc(studyTasks.order), asc(studyTasks.dueDate));
}

// Create a study task
export async function createStudyTask(userId: string, data: CreateTaskInput) {
  // Find max order
  const lastTasks = await db
    .select({ order: studyTasks.order })
    .from(studyTasks)
    .where(eq(studyTasks.userId, userId))
    .orderBy(desc(studyTasks.order))
    .limit(1);

  const nextOrder = lastTasks.length > 0 ? lastTasks[0].order + 1 : 1;

  const parsedDueDate = data.dueDate ? new Date(data.dueDate) : null;

  const [newTask] = await db
    .insert(studyTasks)
    .values({
      userId,
      subjectId: data.subjectId || null,
      title: data.title,
      description: data.description || null,
      dueDate: parsedDueDate,
      priority: data.priority,
      status: "pending",
      order: nextOrder,
    })
    .returning();

  return newTask;
}

// Update a study task
export async function updateStudyTask(userId: string, taskId: number, data: UpdateTaskInput) {
  const updates: any = {
    updatedAt: new Date(),
  };

  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.dueDate !== undefined) updates.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.priority !== undefined) updates.priority = data.priority;
  if (data.subjectId !== undefined) updates.subjectId = data.subjectId;
  if (data.status !== undefined) updates.status = data.status;

  const [updatedTask] = await db
    .update(studyTasks)
    .set(updates)
    .where(and(eq(studyTasks.userId, userId), eq(studyTasks.id, taskId)))
    .returning();

  if (updatedTask && data.status === "completed") {
    // Generate completion notification if not exists
    const [existingCompletionNotif] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.taskId, taskId),
          eq(notifications.type, "completion")
        )
      )
      .limit(1);

    if (!existingCompletionNotif) {
      await db.insert(notifications).values({
        userId,
        taskId,
        type: "completion",
        title: "Task Completed 🎉",
        message: `Great job! You completed: "${updatedTask.title}".`,
        read: false,
      });
    }
  }

  return updatedTask;
}

// Delete a study task
export async function deleteStudyTask(userId: string, taskId: number) {
  return await db
    .delete(studyTasks)
    .where(and(eq(studyTasks.userId, userId), eq(studyTasks.id, taskId)))
    .returning();
}

// Reorder study tasks
export async function reorderStudyTasks(userId: string, taskIds: number[]) {
  const results = [];
  for (let i = 0; i < taskIds.length; i++) {
    const [updated] = await db
      .update(studyTasks)
      .set({ order: i + 1, updatedAt: new Date() })
      .where(and(eq(studyTasks.userId, userId), eq(studyTasks.id, taskIds[i])))
      .returning();
    if (updated) results.push(updated);
  }
  return results;
}

// Fetch all notifications for a user
export async function getNotifications(userId: string) {
  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));
}

// Mark notifications as read
export async function markNotificationsAsRead(userId: string, notificationIds?: number[]) {
  const updates = { read: true };
  if (notificationIds && notificationIds.length > 0) {
    return await db
      .update(notifications)
      .set(updates)
      .where(and(eq(notifications.userId, userId), inArray(notifications.id, notificationIds)))
      .returning();
  } else {
    return await db
      .update(notifications)
      .set(updates)
      .where(eq(notifications.userId, userId))
      .returning();
  }
}

// Check and generate upcoming/overdue reminders
export async function checkAndGenerateReminders(userId: string) {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Fetch all pending study tasks with a due date
  const pendingTasks = await db
    .select()
    .from(studyTasks)
    .where(and(eq(studyTasks.userId, userId), eq(studyTasks.status, "pending")));

  for (const task of pendingTasks) {
    if (!task.dueDate) continue;

    const dueDate = new Date(task.dueDate);

    // 1. Check for Overdue Task
    if (dueDate < now) {
      const [existingOverdue] = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.taskId, task.id),
            eq(notifications.type, "overdue")
          )
        )
        .limit(1);

      if (!existingOverdue) {
        await db.insert(notifications).values({
          userId,
          taskId: task.id,
          type: "overdue",
          title: "Overdue Study Task ⚠️",
          message: `The study task: "${task.title}" was due on ${dueDate.toLocaleString()}.`,
          read: false,
        });
      }
    }
    // 2. Check for Upcoming Task (due in next 24 hours)
    else if (dueDate <= tomorrow) {
      const [existingReminder] = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.taskId, task.id),
            eq(notifications.type, "reminder")
          )
        )
        .limit(1);

      if (!existingReminder) {
        await db.insert(notifications).values({
          userId,
          taskId: task.id,
          type: "reminder",
          title: "Upcoming Study Reminder ⏱️",
          message: `Your task: "${task.title}" is due soon (at ${dueDate.toLocaleTimeString()}).`,
          read: false,
        });
      }
    }
  }

  // Fetch and check pending assignments
  try {
    const pendingAssignments = await db
      .select()
      .from(assignments)
      .where(
        and(
          eq(assignments.userId, userId),
          sql`${assignments.status} != 'completed'`
        )
      );

    for (const assignment of pendingAssignments) {
      if (!assignment.dueDate) continue;

      const dueDate = new Date(assignment.dueDate);

      // 1. Check for Overdue Assignment
      if (dueDate < now) {
        const [existingOverdue] = await db
          .select()
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, userId),
              eq(notifications.title, `Overdue Assignment: ${assignment.title}`),
              eq(notifications.type, "overdue")
            )
          )
          .limit(1);

        if (!existingOverdue) {
          await db.insert(notifications).values({
            userId,
            type: "overdue",
            title: `Overdue Assignment: ${assignment.title}`,
            message: `The assignment "${assignment.title}" is overdue (was due on ${dueDate.toLocaleString()}).`,
            read: false,
          });
        }
      }
      // 2. Check for Upcoming Assignment (due in next 24 hours)
      else if (dueDate <= tomorrow) {
        const [existingReminder] = await db
          .select()
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, userId),
              eq(notifications.title, `Upcoming Assignment: ${assignment.title}`),
              eq(notifications.type, "reminder")
            )
          )
          .limit(1);

        if (!existingReminder) {
          await db.insert(notifications).values({
            userId,
            type: "reminder",
            title: `Upcoming Assignment: ${assignment.title}`,
            message: `The assignment "${assignment.title}" is due soon (on ${dueDate.toLocaleString()}).`,
            read: false,
          });
        }
      }
    }
  } catch (err) {
    console.error("Failed to generate assignment reminders:", err);
  }

  // Fetch and check upcoming exams
  try {
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    const userExams = await db
      .select()
      .from(exams)
      .where(eq(exams.userId, userId));

    for (const exam of userExams) {
      const examDate = new Date(exam.examDate);

      // If the exam is in the future
      if (examDate > now) {
        // 1. Check if exam is within 24 hours (Urgent reminder)
        if (examDate <= oneDayFromNow) {
          const [existingUrgent] = await db
            .select()
            .from(notifications)
            .where(
              and(
                eq(notifications.userId, userId),
                eq(notifications.title, `URGENT EXAM TOMORROW: ${exam.title} 🚨`),
                eq(notifications.type, "reminder")
              )
            )
            .limit(1);

          if (!existingUrgent) {
            await db.insert(notifications).values({
              userId,
              type: "reminder",
              title: `URGENT EXAM TOMORROW: ${exam.title} 🚨`,
              message: `Your exam "${exam.title}" is scheduled for tomorrow at ${examDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}! Review your notes and clear any doubts now!`,
              read: false,
            });
          }
        }
        // 2. Check if exam is within 3 days (General reminder)
        else if (examDate <= threeDaysFromNow) {
          const [existingGeneral] = await db
            .select()
            .from(notifications)
            .where(
              and(
                eq(notifications.userId, userId),
                eq(notifications.title, `Upcoming Exam Alert: ${exam.title} 📚`),
                eq(notifications.type, "reminder")
              )
            )
            .limit(1);

          if (!existingGeneral) {
            await db.insert(notifications).values({
              userId,
              type: "reminder",
              title: `Upcoming Exam Alert: ${exam.title} 📚`,
              message: `You have an exam: "${exam.title}" coming up on ${examDate.toLocaleDateString()} at ${examDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Make sure you set a study goal!`,
              read: false,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("Failed to generate exam reminders:", err);
  }

  // Return the complete list of notifications
  return await getNotifications(userId);
}

// AI Study Plan Generator using Gemini
export async function aiPlanStudy(
  userId: string,
  params: {
    examDate: string;
    availableHours: number;
    subjects: string[];
    additionalInfo?: string;
  }
) {
  const ai = getAIClient();

  // Retrieve user's actual subjects in database to match them
  const userSubjects = await db.select().from(subjects).where(eq(subjects.userId, userId));

  // Build the context prompt
  const subjectsListText = params.subjects.join(", ");
  const userSubjectsInfo = userSubjects.map((s) => `- ${s.title} (ID: ${s.id})`).join("\n");

  const prompt = `
Generate a structured study plan for a student preparing for exams.
Exam Date: ${params.examDate}
Total Available Study Hours per week: ${params.availableHours}
Subjects to cover: ${subjectsListText}
Additional details/goals: ${params.additionalInfo || "None"}

Please create 5 to 10 practical study tasks leading up to the exam date. 
Each task should have a clear title, practical step-by-step description, priority (high/medium/low), and a strategic due date spread between now and the exam date.
Assign each task to the most appropriate subject name from: [${subjectsListText}].

Your response MUST be a single structured JSON object.
`;

  const systemInstruction = `
You are an expert academic coach and study planner AI.
Your response MUST be formatted strictly according to the requested JSON schema.
For 'subjectName', you must use one of the subjects listed: [${subjectsListText}].
Ensure 'dueDate' is in "YYYY-MM-DD" format.
Ensure 'priority' is exactly "high", "medium", or "low".
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
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  dueDate: { type: Type.STRING, description: "YYYY-MM-DD formatted date" },
                  priority: { type: Type.STRING, description: "Must be 'high', 'medium', or 'low'" },
                  subjectName: { type: Type.STRING, description: "Matching one of the input subjects" },
                },
                required: ["title", "description", "dueDate", "priority", "subjectName"],
              },
            },
          },
          required: ["tasks"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("AI returned empty content.");
    }

    const data = JSON.parse(text);
    const tasksToInsert = data.tasks || [];

    const insertedTasks = [];

    // Max order
    const lastTasks = await db
      .select({ order: studyTasks.order })
      .from(studyTasks)
      .where(eq(studyTasks.userId, userId))
      .orderBy(desc(studyTasks.order))
      .limit(1);

    let currentOrder = lastTasks.length > 0 ? lastTasks[0].order : 0;

    for (const item of tasksToInsert) {
      currentOrder++;

      // Try to find a matching subjectId from the user's subjects list
      const matchedSubject = userSubjects.find(
        (s) => s.title.toLowerCase() === item.subjectName.toLowerCase()
      );
      const subjectId = matchedSubject ? matchedSubject.id : null;

      const [newTask] = await db
        .insert(studyTasks)
        .values({
          userId,
          subjectId,
          title: item.title,
          description: item.description,
          dueDate: new Date(item.dueDate),
          priority: item.priority === "high" || item.priority === "medium" || item.priority === "low" ? item.priority : "medium",
          status: "pending",
          order: currentOrder,
        })
        .returning();

      if (newTask) {
        insertedTasks.push(newTask);
      }
    }

    // Generate notification for plan generation
    await db.insert(notifications).values({
      userId,
      type: "reminder",
      title: "AI Study Plan Generated 🚀",
      message: `Gemini has successfully populated your planner with ${insertedTasks.length} targeted study tasks!`,
      read: false,
    });

    return insertedTasks;
  } catch (error) {
    console.error("Error in aiPlanStudy:", error);
    throw error;
  }
}
