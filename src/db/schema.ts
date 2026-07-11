import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

// Expanded users schema to store SaaS metadata synchronized with Firebase Auth
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(), // Firebase Auth UID (string UUID)
  email: text("email").notNull().unique(),
  name: text("name"),
  username: text("username").unique(),
  avatar: text("avatar"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  role: text("role").default("user").notNull(), // 'user' | 'admin'
  accountStatus: text("account_status").default("active").notNull(), // 'active' | 'suspended'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),

  // Custom Profile fields
  bio: text("bio"),
  university: text("university"),
  department: text("department"),
  semester: text("semester"),
  timezone: text("timezone"),

  // Appearance settings
  theme: text("theme").default("system").notNull(),
  accentColor: text("accent_color").default("violet").notNull(),
  fontSize: text("font_size").default("medium").notNull(),
  layoutDensity: text("layout_density").default("comfortable").notNull(),

  // Notification settings
  notifyStudyReminders: boolean("notify_study_reminders").default(true).notNull(),
  notifyPlannerReminders: boolean("notify_planner_reminders").default(true).notNull(),
  notifyAssignmentReminders: boolean("notify_assignment_reminders").default(true).notNull(),
  notifyAiNotifications: boolean("notify_ai_notifications").default(true).notNull(),
  notifyEmailNotifications: boolean("notify_email_notifications").default(true).notNull(),

  // AI settings
  aiDefaultModel: text("ai_default_model").default("gemini-3.5-flash").notNull(),
  aiResponseLength: text("ai_response_length").default("medium").notNull(),
  aiStreaming: boolean("ai_streaming").default(true).notNull(),
  aiExplanationStyle: text("ai_explanation_style").default("balanced").notNull(),
  aiAutoSaveConversations: boolean("ai_auto_save_conversations").default(true).notNull(),

  // Productivity settings
  keyboardShortcutsEnabled: boolean("keyboard_shortcuts_enabled").default(true).notNull(),
  autoSavePreferences: boolean("auto_save_preferences").default(true).notNull(),
  defaultLandingPage: text("default_landing_page").default("dashboard").notNull(),
  languagePreference: text("language_preference").default("en").notNull(),
});

// Subjects table for Sprint 5 - Subject Management System
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.uid, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  color: text("color").default("#6366f1").notNull(), // hex color or tailwind color class
  icon: text("icon").default("BookOpen").notNull(), // lucide icon name
  semester: text("semester"),
  instructor: text("instructor"),
  credits: integer("credits").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"), // Null means active, timestamp means soft deleted
});

// Notes table for Epic 3 - Core Learning Workspace - Sprint 6 (Smart Notes)
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.uid, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "set null" }), // notes can be optionally attached to subjects
  title: text("title").notNull(),
  content: text("content").default("").notNull(),
  summary: text("summary"), // nullable AI summary
  favorite: boolean("favorite").default(false).notNull(),
  pinned: boolean("pinned").default(false).notNull(),
  archived: boolean("archived").default(false).notNull(),
  color: text("color").default("#6366f1").notNull(), // default color
  tags: text("tags").default("").notNull(), // comma-separated tags
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"), // Null means active, timestamp means soft deleted
});

// Documents table for Sprint 7 - Document Management & File Storage
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.uid, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "set null" }), // documents can be optionally attached to subjects
  noteId: integer("note_id").references(() => notes.id, { onDelete: "set null" }), // documents can be optionally attached to notes
  originalName: text("original_name").notNull(),
  storedName: text("stored_name").notNull(),
  mimeType: text("mime_type").notNull(),
  extension: text("extension").notNull(),
  size: integer("size").notNull(),
  storageProvider: text("storage_provider").default("local").notNull(), // 'local' | 'cloud'
  storagePath: text("storage_path").notNull(),
  thumbnail: text("thumbnail"), // nullable preview thumbnail or type icon representation
  status: text("status").default("uploaded").notNull(), // 'uploading' | 'uploaded' | 'failed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"), // Null means active, timestamp means soft deleted
});

// Conversations table for Sprint 8 - AI Workspace (Gemini integration)
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.uid, { onDelete: "cascade" }),
  title: text("title").default("New Conversation").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"), // Soft delete support
});

// Messages table for Sprint 8 - AI Workspace Messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.uid, { onDelete: "cascade" }),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' | 'model'
  content: text("content").notNull(),
  sources: text("sources"), // JSON stringified array of `{type: 'document'|'note', id: number, title: string}`
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Document contents cache for Sprint 9 - AI Document Intelligence
export const documentContents = pgTable("document_contents", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" })
    .unique(), // One-to-one relationship with documents
  extractedText: text("extracted_text").notNull(),
  wordCount: integer("word_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Join table for active session-persistent conversation documents
export const conversationDocuments = pgTable("conversation_documents", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  documentId: integer("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Join table for active session-persistent conversation notes
export const conversationNotes = pgTable("conversation_notes", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  noteId: integer("note_id")
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI Learning Tools - Flashcards
export const flashcardDecks = pgTable("flashcard_decks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.uid, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  noteId: integer("note_id").references(() => notes.id, { onDelete: "set null" }),
  documentId: integer("document_id").references(() => documents.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const flashcards = pgTable("flashcards", {
  id: serial("id").primaryKey(),
  deckId: integer("deck_id").notNull().references(() => flashcardDecks.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// AI Learning Tools - Quizzes
export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.uid, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  noteId: integer("note_id").references(() => notes.id, { onDelete: "set null" }),
  documentId: integer("document_id").references(() => documents.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'mcq' | 'true_false' | 'short_answer'
  question: text("question").notNull(),
  options: text("options"), // JSON stringified array of options for mcq
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Quiz attempt tracking
export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.uid, { onDelete: "cascade" }),
  quizId: integer("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  accuracy: integer("accuracy").notNull(), // percentage
  completionTime: integer("completion_time").notNull(), // in seconds
  answers: text("answers").notNull(), // JSON string representing array of { questionId, selectedAnswer, isCorrect }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Flashcard ratings / progress
export const flashcardProgress = pgTable("flashcard_progress", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.uid, { onDelete: "cascade" }),
  cardId: integer("card_id").notNull().references(() => flashcards.id, { onDelete: "cascade" }),
  rating: text("rating").notNull(), // 'easy' | 'medium' | 'hard'
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Study Planner - Tasks Table
export const studyTasks = pgTable("study_tasks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.uid, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "cascade" }), // Cascade delete if subject deleted
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"), // Task due date
  priority: text("priority").default("medium").notNull(), // 'high' | 'medium' | 'low'
  status: text("status").default("pending").notNull(), // 'pending' | 'completed'
  order: integer("order").default(0).notNull(), // for drag and drop reordering
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Notifications Table (with task reference to prevent duplicates)
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.uid, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // 'reminder' | 'overdue' | 'completion'
  taskId: integer("task_id").references(() => studyTasks.id, { onDelete: "cascade" }),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Study Sessions for Analytics
export const studySessions = pgTable("study_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.uid, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  duration: integer("duration").notNull(), // in minutes
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Assignments table
export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.uid, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"), // Rich text description
  dueDate: timestamp("due_date").notNull(),
  priority: text("priority").default("medium").notNull(), // 'low' | 'medium' | 'high'
  status: text("status").default("pending").notNull(), // 'pending' | 'in_progress' | 'completed' | 'overdue'
  attachments: text("attachments"), // JSON stringified array of `{name: string, url: string}`
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// Assignment Subtasks table
export const assignmentSubtasks = pgTable("assignment_subtasks", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull().references(() => assignments.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  completed: boolean("completed").default(false).notNull(),
  estimatedTime: integer("estimated_time"), // in minutes
  suggestedSchedule: text("suggested_schedule"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Goals table
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.uid, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'daily' | 'weekly' | 'monthly'
  targetDate: timestamp("target_date"),
  completed: boolean("completed").default(false).notNull(),
  progress: integer("progress").default(0).notNull(), // Progress percentage
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Goal Tasks table
export const goalTasks = pgTable("goal_tasks", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  completed: boolean("completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Exams table
export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.uid, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  examDate: timestamp("exam_date").notNull(),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Reminders table
export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.uid, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  triggerTime: timestamp("trigger_time").notNull(),
  targetType: text("target_type").notNull(), // 'assignment' | 'planner_task' | 'goal' | 'exam'
  targetId: integer("target_id").notNull(),
  reminderType: text("reminder_type").notNull(), // '1_day_before' | '1_hour_before' | 'custom'
  notified: boolean("notified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// AI Generated Study Plans Table
export const aiStudyPlans = pgTable("ai_study_plans", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.uid, { onDelete: "cascade" }),
  examDate: timestamp("exam_date").notNull(),
  availableHours: integer("available_hours").notNull(),
  subjects: text("subjects").notNull(), // Comma-separated or JSON list of subjects
  additionalInfo: text("additional_info"),
  planData: text("plan_data").notNull(), // JSON text representing the generated tasks list
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// AI Recommendations Table
export const aiRecommendations = pgTable("ai_recommendations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.uid, { onDelete: "cascade" }),
  text: text("text").notNull(), // Recommendation text
  type: text("type").notNull(), // 'task' | 'revision' | 'alert' | 'general'
  priority: text("priority").default("medium").notNull(), // 'low' | 'medium' | 'high'
  actionUrl: text("action_url"), // Optional redirect URL
  dismissed: boolean("dismissed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI Revision Plans Table
export const aiRevisionPlans = pgTable("ai_revision_plans", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.uid, { onDelete: "cascade" }),
  scheduleType: text("schedule_type").notNull(), // 'daily' | 'weekly'
  planData: text("plan_data").notNull(), // JSON text containing the schedule (days/hours/topics)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});




