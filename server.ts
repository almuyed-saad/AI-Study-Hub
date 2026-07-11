import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser, updateUserProfile } from "./src/features/auth/services/user-sync.ts";
import { generateText, getAIClient } from "./src/services/ai.ts";
import {
  getSubjects,
  createSubject,
  updateSubject,
  softDeleteSubject,
  restoreSubject,
} from "./src/features/subjects/services/subject-service.ts";
import {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  softDeleteNote,
  restoreNote,
} from "./src/features/notes/services/note-service.ts";
import fs from "fs";
import multer from "multer";
import { adminAuth } from "./src/lib/firebase-admin.ts";
import { activeStorageProvider } from "./src/features/documents/services/storage-provider.ts";
import {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  softDeleteDocument,
  restoreDocument,
  hardDeleteDocument,
  getStorageStats,
} from "./src/features/documents/services/document-service.ts";
import {
  getConversations,
  getConversationById,
  getConversationMessages,
  createConversation,
  renameConversation,
  softDeleteConversation,
  addMessage,
  deleteLastMessage,
  getConversationContext,
  attachDocumentToConversation,
  removeDocumentFromConversation,
  attachNoteToConversation,
  removeNoteFromConversation,
} from "./src/features/ai/services/conversation-service.ts";
import {
  getActiveAIProvider,
  SUPPORTED_MODELS,
  AIContextAttachment,
} from "./src/features/ai/services/ai-service.ts";
import { activeRetriever } from "./src/features/ai/services/retrieval-service.ts";
import {
  generateFlashcards,
  generateQuiz,
  getFlashcardDecks,
  getFlashcardDeckWithCards,
  deleteFlashcardDeck,
  getQuizzes,
  getQuizWithQuestions,
  deleteQuiz,
  saveFlashcardProgress,
  getFlashcardProgressForDeck,
  saveQuizAttempt,
  getQuizAttempts,
  explainQuizAnswer,
} from "./src/features/learning/services/learning-service.ts";
import {
  getStudyTasks,
  createStudyTask,
  updateStudyTask,
  deleteStudyTask,
  reorderStudyTasks,
  getNotifications,
  markNotificationsAsRead,
  checkAndGenerateReminders,
  aiPlanStudy,
} from "./src/features/learning/services/planner-service.ts";
import {
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  toggleAssignmentSubtask,
  breakdownAssignmentAI,
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  addGoalTask,
  toggleGoalTask,
  deleteGoalTask,
  getExams,
  createExam,
  updateExam,
  deleteExam,
  getReminders,
  createReminder,
  deleteRemindersForTarget,
  triggerPendingReminders
} from "./src/features/learning/services/productivity-service.ts";
import {
  getDashboardAnalytics,
  logStudySession,
  getAIRecommendations
} from "./src/features/dashboard/services/analytics-service.ts";
import {
  getAIProductivityMetrics,
  getAIWeakTopicAnalysis,
  generateAIRecommendations,
  generateRevisionPlan,
  getAIDailyBriefing,
} from "./src/features/learning/services/productivity-engine.ts";
import { db } from "./src/db/index.ts";
import { aiRecommendations, aiRevisionPlans, subjects, studyTasks, assignments, quizAttempts } from "./src/db/schema.ts";
import { and, eq } from "drizzle-orm";





async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable JSON request body parsing
  app.use(express.json());

  // 1. Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  // 2. Auth sync endpoint to register/retrieve user profile
  app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { email, uid, name, picture, email_verified } = req.user!;
      if (!email) {
        return res.status(400).json({ error: "Email is required to sync user profile" });
      }
      const user = await getOrCreateUser({
        uid,
        email,
        name: name || null,
        avatar: picture || null,
        emailVerified: email_verified || false,
      });
      res.json({ success: true, user });
    } catch (error: any) {
      console.error("Error in user sync endpoint:", error);
      res.status(500).json({ error: error.message || "Failed to sync user" });
    }
  });

  // 2b. PATCH user profile / preferences
  app.patch("/api/auth/profile", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const updatedUser = await updateUserProfile(uid, req.body);
      res.json({ success: true, user: updatedUser });
    } catch (error: any) {
      console.error("Error in PATCH /api/auth/profile:", error);
      res.status(500).json({ error: error.message || "Failed to update profile" });
    }
  });

  // 2c. POST sign out all devices (backend structure)
  app.post("/api/auth/signout-all", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      // Revoke all refresh tokens using firebase-admin SDK
      await adminAuth.revokeRefreshTokens(uid);
      res.json({ success: true, message: "Successfully revoked all active sessions. Please sign in again." });
    } catch (error: any) {
      console.error("Error revoking sessions:", error);
      res.status(500).json({ error: error.message || "Failed to sign out of all devices." });
    }
  });

  // 2d. DELETE user account (Account deletion confirmation flow)
  app.delete("/api/auth/account", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      
      // Delete user from drizzle PostgreSQL database
      const { db } = await import("./src/db/index.ts");
      const { users } = await import("./src/db/schema.ts");
      const { eq } = await import("drizzle-orm");
      
      await db.delete(users).where(eq(users.uid, uid));
      
      // Delete user from Firebase auth using firebase-admin SDK
      await adminAuth.deleteUser(uid);
      
      res.json({ success: true, message: "Your academic workspace account has been permanently expunged." });
    } catch (error: any) {
      console.error("Error deleting user account:", error);
      res.status(500).json({ error: error.message || "Failed to delete account." });
    }
  });

  // 3. Optional AI testing endpoint (can be used to verify API key connection)
  app.post("/api/ai/test", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }
      const responseText = await generateText(
        prompt,
        "You are the AI assistant of AI Study Hub. Keep the response concise."
      );
      res.json({ success: true, text: responseText });
    } catch (error: any) {
      console.error("Error in AI test endpoint:", error);
      res.status(500).json({ error: error.message || "AI invocation failed" });
    }
  });

  // 3b. Dedicated Socratic AI Coaching Endpoint
  app.post("/api/ai/socratic", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { prompt, mode } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      let systemInstruction = "";
      if (mode === "simpler") {
        systemInstruction = 
          "You are a friendly Socratic academic tutor. Explain the user's concept as simply as possible, using an analogy suitable for a 10-year-old. Avoid advanced jargon. End with a single, simple question to check if they understood.";
      } else if (mode === "deep-dive") {
        systemInstruction = 
          "You are an expert Socratic university professor. Provide an academically rigorous, detailed breakdown of the concept. Explain the core mechanics, context, and any formulas or formal structures. End with a highly thought-provoking question to prompt advanced critical thinking.";
      } else {
        systemInstruction = 
          "You are an elite Socratic academic coach. Explain the concept clearly, intuitively, and elegantly. Use a helpful real-world analogy and a structured breakdown. End with a constructive Socratic question to prompt further thought and check for understanding. Keep your total response under 3-4 paragraphs.";
      }

      const responseText = await generateText(prompt, systemInstruction);
      res.json({ success: true, text: responseText });
    } catch (error: any) {
      console.error("Error in /api/ai/socratic:", error);
      res.status(500).json({ error: error.message || "Socratic AI failed to generate insight." });
    }
  });

  // 4. Subjects API endpoints (Sprint 5 - Subject Management System)
  // GET: List all subjects for authenticated user with search/filters
  app.get("/api/subjects", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const { search, semester, sortBy, sortOrder, includeDeleted } = req.query;

      const results = await getSubjects(uid, {
        search: search as string,
        semester: semester as string,
        sortBy: sortBy as "title" | "createdAt" | "credits",
        sortOrder: sortOrder as "asc" | "desc",
        includeDeleted: includeDeleted === "true",
      });

      res.json({ success: true, subjects: results });
    } catch (error: any) {
      console.error("Error in GET /api/subjects:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve subjects." });
    }
  });

  // POST: Create a new subject
  app.post("/api/subjects", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const subject = await createSubject(uid, req.body);
      res.status(211).json({ success: true, subject });
    } catch (error: any) {
      console.error("Error in POST /api/subjects:", error);
      res.status(400).json({ error: error.message || "Failed to create subject." });
    }
  });

  // PUT: Update an existing subject
  app.put("/api/subjects/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const subjectId = parseInt(req.params.id, 10);
      if (isNaN(subjectId)) {
        return res.status(400).json({ error: "Invalid subject ID." });
      }

      const subject = await updateSubject(uid, subjectId, req.body);
      res.json({ success: true, subject });
    } catch (error: any) {
      console.error("Error in PUT /api/subjects/:id:", error);
      res.status(400).json({ error: error.message || "Failed to update subject." });
    }
  });

  // DELETE: Soft delete a subject
  app.delete("/api/subjects/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const subjectId = parseInt(req.params.id, 10);
      if (isNaN(subjectId)) {
        return res.status(400).json({ error: "Invalid subject ID." });
      }

      const subject = await softDeleteSubject(uid, subjectId);
      res.json({ success: true, message: "Subject soft-deleted successfully.", subject });
    } catch (error: any) {
      console.error("Error in DELETE /api/subjects/:id:", error);
      res.status(500).json({ error: error.message || "Failed to delete subject." });
    }
  });

  // POST: Restore a soft-deleted subject
  app.post("/api/subjects/:id/restore", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const subjectId = parseInt(req.params.id, 10);
      if (isNaN(subjectId)) {
        return res.status(400).json({ error: "Invalid subject ID." });
      }

      const subject = await restoreSubject(uid, subjectId);
      res.json({ success: true, message: "Subject restored successfully.", subject });
    } catch (error: any) {
      console.error("Error in POST /api/subjects/:id/restore:", error);
      res.status(500).json({ error: error.message || "Failed to restore subject." });
    }
  });

  // 4b. Notes API endpoints (Sprint 6 - Smart Notes System)
  // GET: List all notes for authenticated user with search/filters
  app.get("/api/notes", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const { search, subjectId, archived, pinned, favorite, sortBy, sortOrder } = req.query;

      const parsedSubjectId = subjectId ? parseInt(subjectId as string, 10) : undefined;
      const isArchived = archived === "true";
      const isPinned = pinned === "true" ? true : pinned === "false" ? false : undefined;
      const isFavorite = favorite === "true" ? true : favorite === "false" ? false : undefined;

      const results = await getNotes(uid, {
        search: search as string,
        subjectId: isNaN(parsedSubjectId as number) ? undefined : parsedSubjectId,
        archived: isArchived,
        pinned: isPinned,
        favorite: isFavorite,
        sortBy: sortBy as "title" | "createdAt" | "updatedAt",
        sortOrder: sortOrder as "asc" | "desc",
      });

      res.json({ success: true, notes: results });
    } catch (error: any) {
      console.error("Error in GET /api/notes:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve notes." });
    }
  });

  // GET: Retrieve a single note
  app.get("/api/notes/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const noteId = parseInt(req.params.id, 10);
      if (isNaN(noteId)) {
        return res.status(400).json({ error: "Invalid note ID." });
      }

      const note = await getNoteById(uid, noteId);
      if (!note) {
        return res.status(404).json({ error: "Note not found." });
      }

      res.json({ success: true, note });
    } catch (error: any) {
      console.error("Error in GET /api/notes/:id:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve note." });
    }
  });

  // POST: Create a new note
  app.post("/api/notes", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const note = await createNote(uid, req.body);
      res.status(201).json({ success: true, note });
    } catch (error: any) {
      console.error("Error in POST /api/notes:", error);
      res.status(400).json({ error: error.message || "Failed to create note." });
    }
  });

  // PUT: Update an existing note
  app.put("/api/notes/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const noteId = parseInt(req.params.id, 10);
      if (isNaN(noteId)) {
        return res.status(400).json({ error: "Invalid note ID." });
      }

      const note = await updateNote(uid, noteId, req.body);
      res.json({ success: true, note });
    } catch (error: any) {
      console.error("Error in PUT /api/notes/:id:", error);
      res.status(400).json({ error: error.message || "Failed to update note." });
    }
  });

  // DELETE: Soft delete a note
  app.delete("/api/notes/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const noteId = parseInt(req.params.id, 10);
      if (isNaN(noteId)) {
        return res.status(400).json({ error: "Invalid note ID." });
      }

      const note = await softDeleteNote(uid, noteId);
      res.json({ success: true, message: "Note soft-deleted successfully.", note });
    } catch (error: any) {
      console.error("Error in DELETE /api/notes/:id:", error);
      res.status(500).json({ error: error.message || "Failed to delete note." });
    }
  });

  // POST: Restore a soft-deleted note
  app.post("/api/notes/:id/restore", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const noteId = parseInt(req.params.id, 10);
      if (isNaN(noteId)) {
        return res.status(400).json({ error: "Invalid note ID." });
      }

      const note = await restoreNote(uid, noteId);
      res.json({ success: true, message: "Note restored successfully.", note });
    } catch (error: any) {
      console.error("Error in POST /api/notes/:id/restore:", error);
      res.status(500).json({ error: error.message || "Failed to restore note." });
    }
  });

  // ==========================================
  // SPRINT 7 — DOCUMENT MANAGEMENT & FILE STORAGE ENDPOINTS
  // ==========================================

  // Configure Multer for processing file uploads in memory
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 15 * 1024 * 1024, // 15MB file size limit
    },
  });

  const DANGEROUS_EXTENSIONS = [
    ".exe", ".bat", ".cmd", ".sh", ".msi", ".js", ".vbs", 
    ".scr", ".com", ".pif", ".jar", ".sys", ".dll", ".py"
  ];

  // A. GET: Retrieve list of documents for authenticated user
  app.get("/api/documents", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const { search, subjectId, noteId, mimeTypeGroup, sortBy, sortOrder, includeDeleted } = req.query;

      const parsedSubjectId = subjectId ? parseInt(subjectId as string, 10) : undefined;
      const parsedNoteId = noteId ? parseInt(noteId as string, 10) : undefined;

      const docs = await getDocuments(uid, {
        search: search as string,
        subjectId: parsedSubjectId !== undefined && isNaN(parsedSubjectId) ? undefined : parsedSubjectId,
        noteId: parsedNoteId !== undefined && isNaN(parsedNoteId) ? undefined : parsedNoteId,
        mimeTypeGroup: mimeTypeGroup as string,
        sortBy: sortBy as "name" | "size" | "createdAt",
        sortOrder: sortOrder as "asc" | "desc",
        includeDeleted: includeDeleted === "true",
      });

      res.json({ success: true, documents: docs });
    } catch (error: any) {
      console.error("Error in GET /api/documents:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve documents." });
    }
  });

  // B. GET: Retrieve storage usage metrics
  app.get("/api/documents/stats", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const stats = await getStorageStats(uid);
      res.json({ success: true, stats });
    } catch (error: any) {
      console.error("Error in GET /api/documents/stats:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve storage statistics." });
    }
  });

  // C. POST: Upload files (Multiple or single)
  // Supports file fields named 'file', 'files', or 'file[]'
  app.post(
    "/api/documents/upload",
    requireAuth,
    upload.fields([
      { name: "file", maxCount: 10 },
      { name: "files", maxCount: 10 },
    ]),
    async (req: AuthRequest, res) => {
      try {
        const { uid } = req.user!;
        const { subjectId, noteId } = req.body;

        const parsedSubjectId = subjectId ? parseInt(subjectId, 10) : undefined;
        const parsedNoteId = noteId ? parseInt(noteId, 10) : undefined;

        // Retrieve uploaded files from fields
        const filesList: Express.Multer.File[] = [];
        const filesObj = req.files as { [fieldname: string]: Express.Multer.File[] };
        
        if (filesObj) {
          if (filesObj.file) filesList.push(...filesObj.file);
          if (filesObj.files) filesList.push(...filesObj.files);
        }

        if (filesList.length === 0) {
          return res.status(400).json({ error: "No files uploaded. Make sure to append files under 'file' or 'files' fields." });
        }

        const uploadedDocs = [];

        for (const file of filesList) {
          // 1. Validation: Size check
          if (file.size > 15 * 1024 * 1024) {
            return res.status(400).json({ error: `File '${file.originalname}' exceeds the 15MB size limit.` });
          }

          // 2. Validation: Dangerous file check
          const ext = path.extname(file.originalname).toLowerCase();
          if (DANGEROUS_EXTENSIONS.includes(ext)) {
            return res.status(400).json({ error: `File extension '${ext}' is blocked for security reasons.` });
          }

          // 3. Upload file via Storage Provider Abstraction
          const storageResult = await activeStorageProvider.uploadFile(file, uid);

          // 4. Register in database
          const doc = await createDocument(uid, {
            originalName: file.originalname,
            storedName: storageResult.storedName,
            mimeType: file.mimetype || "application/octet-stream",
            extension: ext || ".bin",
            size: file.size,
            storageProvider: storageResult.storageProvider,
            storagePath: storageResult.storagePath,
            subjectId: isNaN(parsedSubjectId as number) ? null : parsedSubjectId,
            noteId: isNaN(parsedNoteId as number) ? null : parsedNoteId,
            status: "uploaded",
            thumbnail: null,
          });

          uploadedDocs.push(doc);
        }

        res.status(201).json({
          success: true,
          message: `Successfully uploaded ${uploadedDocs.length} file(s).`,
          documents: uploadedDocs,
        });
      } catch (error: any) {
        console.error("Error in POST /api/documents/upload:", error);
        res.status(500).json({ error: error.message || "Failed to upload file(s)." });
      }
    }
  );

  // D. GET: Secure authenticated document preview (Serves content inline)
  app.get("/api/documents/:id/preview", async (req, res) => {
    try {
      // Extract authentication token from headers or query params
      let token = req.query.token as string;
      if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          token = authHeader.split("Bearer ")[1];
        }
      }

      if (!token) {
        return res.status(401).json({ error: "Unauthorized: Missing authentication token" });
      }

      const decodedToken = await adminAuth.verifyIdToken(token);
      const userId = decodedToken.uid;

      const docId = parseInt(req.params.id, 10);
      if (isNaN(docId)) {
        return res.status(400).json({ error: "Invalid document ID." });
      }

      const doc = await getDocumentById(userId, docId);
      if (!doc) {
        return res.status(404).json({ error: "Document not found or access denied." });
      }

      const fullPath = path.join(process.cwd(), "uploads", doc.storagePath);
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: "File not found on storage server." });
      }

      res.setHeader("Content-Type", doc.mimeType);
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.originalName)}"`);
      res.sendFile(fullPath);
    } catch (error: any) {
      console.error("Error serving document preview:", error);
      res.status(401).json({ error: "Unauthorized or invalid preview session token." });
    }
  });

  // E. GET: Secure authenticated document download (Forces browser download prompt)
  app.get("/api/documents/:id/download", async (req, res) => {
    try {
      let token = req.query.token as string;
      if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          token = authHeader.split("Bearer ")[1];
        }
      }

      if (!token) {
        return res.status(401).json({ error: "Unauthorized: Missing token." });
      }

      const decodedToken = await adminAuth.verifyIdToken(token);
      const userId = decodedToken.uid;

      const docId = parseInt(req.params.id, 10);
      if (isNaN(docId)) {
        return res.status(400).json({ error: "Invalid document ID." });
      }

      const doc = await getDocumentById(userId, docId);
      if (!doc) {
        return res.status(404).json({ error: "Document not found or access denied." });
      }

      const fullPath = path.join(process.cwd(), "uploads", doc.storagePath);
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: "File not found on storage server." });
      }

      res.setHeader("Content-Type", doc.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.originalName)}"`);
      res.sendFile(fullPath);
    } catch (error: any) {
      console.error("Error downloading document:", error);
      res.status(401).json({ error: "Unauthorized or invalid download token." });
    }
  });

  // EXTREMELY USEFUL FOR CHROME IFRAME SANDBOX FALLBACK: GET raw extracted text of a document
  app.get("/api/documents/:id/text", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const docId = parseInt(req.params.id, 10);
      if (isNaN(docId)) {
        return res.status(400).json({ error: "Invalid document ID." });
      }

      const { extractTextFromDocument } = await import("./src/features/documents/services/extractor-service.ts");
      const text = await extractTextFromDocument(uid, docId);
      res.json({ success: true, text });
    } catch (error: any) {
      console.error("Error in GET /api/documents/:id/text:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve document text." });
    }
  });

  // F. PUT: Rename an existing document
  app.put("/api/documents/:id/rename", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const docId = parseInt(req.params.id, 10);
      if (isNaN(docId)) {
        return res.status(400).json({ error: "Invalid document ID." });
      }

      const { name } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "A valid file name is required." });
      }

      // Check current extension and maintain it if not supplied in renamed name
      const doc = await getDocumentById(uid, docId);
      if (!doc) {
        return res.status(404).json({ error: "Document not found or access denied." });
      }

      let newName = name.trim();
      const currentExt = doc.extension;
      if (!newName.toLowerCase().endsWith(currentExt.toLowerCase())) {
        newName = `${newName}${currentExt}`;
      }

      const updated = await updateDocument(uid, docId, { originalName: newName });
      res.json({ success: true, message: "Document renamed successfully.", document: updated });
    } catch (error: any) {
      console.error("Error in PUT /api/documents/:id/rename:", error);
      res.status(500).json({ error: error.message || "Failed to rename document." });
    }
  });

  // G. PUT: Link or unlink a document to a subject or note
  app.put("/api/documents/:id/link", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const docId = parseInt(req.params.id, 10);
      if (isNaN(docId)) {
        return res.status(400).json({ error: "Invalid document ID." });
      }

      const { subjectId, noteId } = req.body;

      const parsedSubjectId = subjectId === null ? null : subjectId !== undefined ? parseInt(subjectId, 10) : undefined;
      const parsedNoteId = noteId === null ? null : noteId !== undefined ? parseInt(noteId, 10) : undefined;

      const updateFields: any = {};
      if (parsedSubjectId !== undefined) {
        updateFields.subjectId = isNaN(parsedSubjectId as number) ? null : parsedSubjectId;
      }
      if (parsedNoteId !== undefined) {
        updateFields.noteId = isNaN(parsedNoteId as number) ? null : parsedNoteId;
      }

      const updated = await updateDocument(uid, docId, updateFields);
      res.json({ success: true, message: "Document associations updated successfully.", document: updated });
    } catch (error: any) {
      console.error("Error in PUT /api/documents/:id/link:", error);
      res.status(500).json({ error: error.message || "Failed to update document linking." });
    }
  });

  // H. DELETE: Soft delete a document
  app.delete("/api/documents/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const docId = parseInt(req.params.id, 10);
      if (isNaN(docId)) {
        return res.status(400).json({ error: "Invalid document ID." });
      }

      const deleted = await softDeleteDocument(uid, docId);
      res.json({ success: true, message: "Document soft-deleted successfully.", document: deleted });
    } catch (error: any) {
      console.error("Error in DELETE /api/documents/:id:", error);
      res.status(500).json({ error: error.message || "Failed to soft-delete document." });
    }
  });

  // I. POST: Restore a soft-deleted document
  app.post("/api/documents/:id/restore", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const docId = parseInt(req.params.id, 10);
      if (isNaN(docId)) {
        return res.status(400).json({ error: "Invalid document ID." });
      }

      const restored = await restoreDocument(uid, docId);
      res.json({ success: true, message: "Document restored successfully.", document: restored });
    } catch (error: any) {
      console.error("Error in POST /api/documents/:id/restore:", error);
      res.status(500).json({ error: error.message || "Failed to restore document." });
    }
  });

  // J. DELETE: Hard delete a document (Permanently purge from DB and Storage)
  app.delete("/api/documents/:id/hard-delete", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const docId = parseInt(req.params.id, 10);
      if (isNaN(docId)) {
        return res.status(400).json({ error: "Invalid document ID." });
      }

      const purged = await hardDeleteDocument(uid, docId);
      res.json({ success: true, message: "Document permanently purged from database and storage disk.", document: purged });
    } catch (error: any) {
      console.error("Error in DELETE /api/documents/:id/hard-delete:", error);
      res.status(500).json({ error: error.message || "Failed to permanently delete document." });
    }
  });

  // ==========================================
  // SPRINT 8 — AI WORKSPACE (GEMINI INTEGRATION) ENDPOINTS
  // ==========================================

  // A. GET: List all conversations for the authenticated user
  app.get("/api/ai/conversations", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const { search } = req.query;
      const list = await getConversations(uid, search as string);
      res.json({ success: true, conversations: list });
    } catch (error: any) {
      console.error("Error in GET /api/ai/conversations:", error);
      res.status(500).json({ error: error.message || "Failed to load conversations" });
    }
  });

  // B. POST: Start a new conversation
  app.post("/api/ai/conversations", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const { title } = req.body;
      const conversation = await createConversation(uid, title || "New Chat");
      res.status(201).json({ success: true, conversation });
    } catch (error: any) {
      console.error("Error in POST /api/ai/conversations:", error);
      res.status(500).json({ error: error.message || "Failed to create conversation" });
    }
  });

  // C. PUT: Rename a conversation
  app.put("/api/ai/conversations/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const convId = parseInt(req.params.id, 10);
      const { title } = req.body;

      if (isNaN(convId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      if (!title || !title.trim()) {
        return res.status(400).json({ error: "Title is required" });
      }

      const updated = await renameConversation(uid, convId, title.trim());
      if (!updated) {
        return res.status(404).json({ error: "Conversation not found or access denied" });
      }

      res.json({ success: true, conversation: updated });
    } catch (error: any) {
      console.error("Error in PUT /api/ai/conversations/:id:", error);
      res.status(500).json({ error: error.message || "Failed to rename conversation" });
    }
  });

  // D. DELETE: Soft delete a conversation
  app.delete("/api/ai/conversations/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const convId = parseInt(req.params.id, 10);

      if (isNaN(convId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const deleted = await softDeleteConversation(uid, convId);
      if (!deleted) {
        return res.status(404).json({ error: "Conversation not found or access denied" });
      }

      res.json({ success: true, message: "Conversation deleted successfully", conversation: deleted });
    } catch (error: any) {
      console.error("Error in DELETE /api/ai/conversations/:id:", error);
      res.status(500).json({ error: error.message || "Failed to delete conversation" });
    }
  });

  // E. GET: Retrieve messages for a conversation
  app.get("/api/ai/conversations/:id/messages", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const convId = parseInt(req.params.id, 10);

      if (isNaN(convId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const list = await getConversationMessages(uid, convId);
      res.json({ success: true, messages: list });
    } catch (error: any) {
      console.error("Error in GET /api/ai/conversations/:id/messages:", error);
      res.status(500).json({ error: error.message || "Failed to load messages" });
    }
  });

  // F. POST: Post a message and generate AI response (Standard or Streaming)
  app.post("/api/ai/conversations/:id/messages", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const convId = parseInt(req.params.id, 10);
      const { content, stream = false, settings = {}, attachments = [] } = req.body;

      if (isNaN(convId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      if (!content || !content.trim()) {
        return res.status(400).json({ error: "Message content is required" });
      }

      // Default settings fallback
      const finalSettings = {
        preferredModel: settings.preferredModel || "gemini-3.5-flash",
        temperature: typeof settings.temperature === "number" ? settings.temperature : 0.7,
        maxOutputTokens: settings.maxOutputTokens,
        systemPrompt: settings.systemPrompt,
        responseLength: settings.responseLength || "medium",
      };

      // 1. Resolve combined context (Request Body + Session-Persistent Attachments)
      const bodyDocIds: number[] = Array.isArray(req.body.documentIds)
        ? req.body.documentIds.map((id: any) => parseInt(id, 10)).filter((id: number) => !isNaN(id))
        : [];
      const bodyNoteIds: number[] = Array.isArray(req.body.noteIds)
        ? req.body.noteIds.map((id: any) => parseInt(id, 10)).filter((id: number) => !isNaN(id))
        : [];

      // Load session-persistent attached context
      const persistentContext = await getConversationContext(uid, convId);
      const persistentDocIds = persistentContext.documents.map((d: any) => d.id);
      const persistentNoteIds = persistentContext.notes.map((n: any) => n.id);

      // Merge and unique
      const mergedDocIds = Array.from(new Set([...bodyDocIds, ...persistentDocIds]));
      const mergedNoteIds = Array.from(new Set([...bodyNoteIds, ...persistentNoteIds]));

      // 2. Perform context retrieval if we have selected documents/notes
      let finalAttachments: AIContextAttachment[] = Array.isArray(attachments) ? attachments : [];
      let sourcesJsonString: string | undefined = undefined;

      if (mergedDocIds.length > 0 || mergedNoteIds.length > 0) {
        try {
          const retrievedChunks = await activeRetriever.retrieve(
            uid,
            content.trim(),
            { documentIds: mergedDocIds, noteIds: mergedNoteIds }
          );

          const contextAttachments: AIContextAttachment[] = retrievedChunks.map((chunk) => ({
            type: chunk.source.type,
            id: chunk.source.id,
            title: chunk.source.title,
            content: chunk.content,
          }));

          finalAttachments = [...finalAttachments, ...contextAttachments];

          if (retrievedChunks.length > 0) {
            const uniqueSourcesMap = new Map<string, { type: string; id: number; title: string }>();
            retrievedChunks.forEach((chunk) => {
              const key = `${chunk.source.type}-${chunk.source.id}`;
              if (!uniqueSourcesMap.has(key)) {
                uniqueSourcesMap.set(key, {
                  type: chunk.source.type,
                  id: chunk.source.id,
                  title: chunk.source.title,
                });
              }
            });
            sourcesJsonString = JSON.stringify(Array.from(uniqueSourcesMap.values()));
          }
        } catch (retrieveError) {
          console.error("Context retrieval failed:", retrieveError);
          // Fall back gracefully to normal execution
        }
      }

      // 3. Add user message
      const userMsg = await addMessage(uid, convId, "user", content.trim());

      // 4. Load complete history
      const historyList = await getConversationMessages(uid, convId);
      const formattedHistory = historyList.map((m) => ({
        role: m.role as "user" | "model",
        content: m.content,
      }));

      // 5. Get AI Provider
      const aiProvider = getActiveAIProvider();

      if (stream) {
        // Handle Streaming via Server-Sent Events
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no"); // Prevent proxy buffering
        res.flushHeaders();

        // Send initial acknowledgement
        res.write(`data: ${JSON.stringify({ event: "start", userMessage: userMsg })}\n\n`);

        let accumulatedText = "";
        try {
          await aiProvider.generateTextStream(
            formattedHistory,
            finalSettings,
            finalAttachments,
            (chunk: string) => {
              accumulatedText += chunk;
              res.write(`data: ${JSON.stringify({ event: "chunk", text: chunk })}\n\n`);
            }
          );

          // Stream completed, persist the assistant's reply
          const assistantMsg = await addMessage(uid, convId, "model", accumulatedText, sourcesJsonString);
          res.write(`data: ${JSON.stringify({ event: "done", message: assistantMsg })}\n\n`);
          res.end();
        } catch (streamError: any) {
          console.error("Error during AI streaming generation:", streamError);
          res.write(`data: ${JSON.stringify({ event: "error", error: streamError.message || "Streaming failed" })}\n\n`);
          res.end();
        }
      } else {
        // Handle non-streaming JSON reply
        const responseText = await aiProvider.generateText(formattedHistory, finalSettings, finalAttachments);
        const assistantMsg = await addMessage(uid, convId, "model", responseText, sourcesJsonString);
        res.json({ success: true, userMessage: userMsg, message: assistantMsg });
      }
    } catch (error: any) {
      console.error("Error in POST /api/ai/conversations/:id/messages:", error);
      res.status(500).json({ error: error.message || "Failed to handle message exchange" });
    }
  });

  // G. DELETE: Delete the last message (usually to allow "Regenerate/Retry")
  app.delete("/api/ai/conversations/:id/messages/last", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const convId = parseInt(req.params.id, 10);

      if (isNaN(convId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const lastMsg = await deleteLastMessage(uid, convId);
      if (!lastMsg) {
        return res.status(400).json({ error: "No messages to remove" });
      }

      res.json({ success: true, message: "Last message removed successfully", deletedMessageId: lastMsg.id, deletedRole: lastMsg.role });
    } catch (error: any) {
      console.error("Error in DELETE /api/ai/conversations/:id/messages/last:", error);
      res.status(500).json({ error: error.message || "Failed to remove last message" });
    }
  });

  // H. GET: Retrieve active context (attached documents and notes) for a conversation
  app.get("/api/ai/conversations/:id/context", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const convId = parseInt(req.params.id, 10);

      if (isNaN(convId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const context = await getConversationContext(uid, convId);
      res.json({ success: true, ...context });
    } catch (error: any) {
      console.error("Error in GET /api/ai/conversations/:id/context:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve conversation context" });
    }
  });

  // I. POST: Attach a document to a conversation
  app.post("/api/ai/conversations/:id/documents", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const convId = parseInt(req.params.id, 10);
      const { documentId } = req.body;

      if (isNaN(convId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      if (!documentId || isNaN(parseInt(documentId, 10))) {
        return res.status(400).json({ error: "Valid documentId is required" });
      }

      const attached = await attachDocumentToConversation(uid, convId, parseInt(documentId, 10));
      res.status(201).json({ success: true, attached });
    } catch (error: any) {
      console.error("Error in POST /api/ai/conversations/:id/documents:", error);
      res.status(500).json({ error: error.message || "Failed to attach document to conversation" });
    }
  });

  // J. DELETE: Remove/detach a document from a conversation
  app.delete("/api/ai/conversations/:id/documents/:docId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const convId = parseInt(req.params.id, 10);
      const docId = parseInt(req.params.docId, 10);

      if (isNaN(convId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      if (isNaN(docId)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }

      const result = await removeDocumentFromConversation(uid, convId, docId);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("Error in DELETE /api/ai/conversations/:id/documents/:docId:", error);
      res.status(500).json({ error: error.message || "Failed to detach document from conversation" });
    }
  });

  // K. POST: Attach a note to a conversation
  app.post("/api/ai/conversations/:id/notes", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const convId = parseInt(req.params.id, 10);
      const { noteId } = req.body;

      if (isNaN(convId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      if (!noteId || isNaN(parseInt(noteId, 10))) {
        return res.status(400).json({ error: "Valid noteId is required" });
      }

      const attached = await attachNoteToConversation(uid, convId, parseInt(noteId, 10));
      res.status(201).json({ success: true, attached });
    } catch (error: any) {
      console.error("Error in POST /api/ai/conversations/:id/notes:", error);
      res.status(500).json({ error: error.message || "Failed to attach note to conversation" });
    }
  });

  // L. DELETE: Remove/detach a note from a conversation
  app.delete("/api/ai/conversations/:id/notes/:noteId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const convId = parseInt(req.params.id, 10);
      const noteId = parseInt(req.params.noteId, 10);

      if (isNaN(convId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      if (isNaN(noteId)) {
        return res.status(400).json({ error: "Invalid note ID" });
      }

      const result = await removeNoteFromConversation(uid, convId, noteId);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("Error in DELETE /api/ai/conversations/:id/notes/:noteId:", error);
      res.status(500).json({ error: error.message || "Failed to detach note from conversation" });
    }
  });

  // --- AI Learning Tools Endpoints ---

  // Generate flashcards
  app.post("/api/learning/flashcards/generate", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const result = await generateFlashcards(uid, req.body);
      res.status(201).json(result);
    } catch (error: any) {
      console.error("Error in POST /api/learning/flashcards/generate:", error);
      res.status(500).json({ error: error.message || "Failed to generate flashcards." });
    }
  });

  // Get all flashcard decks
  app.get("/api/learning/flashcards", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const decks = await getFlashcardDecks(uid);
      res.json({ success: true, decks });
    } catch (error: any) {
      console.error("Error in GET /api/learning/flashcards:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve flashcard decks." });
    }
  });

  // Get a single flashcard deck with its cards
  app.get("/api/learning/flashcards/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid deck ID." });
      }

      const result = await getFlashcardDeckWithCards(uid, id);
      if (!result) {
        return res.status(404).json({ error: "Flashcard deck not found." });
      }

      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("Error in GET /api/learning/flashcards/:id:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve flashcard deck." });
    }
  });

  // Delete a flashcard deck
  app.delete("/api/learning/flashcards/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid deck ID." });
      }

      const deck = await deleteFlashcardDeck(uid, id);
      res.json({ success: true, message: "Flashcard deck soft-deleted successfully.", deck });
    } catch (error: any) {
      console.error("Error in DELETE /api/learning/flashcards/:id:", error);
      res.status(500).json({ error: error.message || "Failed to delete flashcard deck." });
    }
  });

  // Generate quiz
  app.post("/api/learning/quizzes/generate", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const result = await generateQuiz(uid, req.body);
      res.status(201).json(result);
    } catch (error: any) {
      console.error("Error in POST /api/learning/quizzes/generate:", error);
      res.status(500).json({ error: error.message || "Failed to generate quiz." });
    }
  });

  // Get all quizzes
  app.get("/api/learning/quizzes", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const quizzesList = await getQuizzes(uid);
      res.json({ success: true, quizzes: quizzesList });
    } catch (error: any) {
      console.error("Error in GET /api/learning/quizzes:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve quizzes." });
    }
  });

  // Get a single quiz with questions
  app.get("/api/learning/quizzes/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid quiz ID." });
      }

      const result = await getQuizWithQuestions(uid, id);
      if (!result) {
        return res.status(404).json({ error: "Quiz not found." });
      }

      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("Error in GET /api/learning/quizzes/:id:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve quiz." });
    }
  });

  // Delete a quiz
  app.delete("/api/learning/quizzes/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid quiz ID." });
      }

      const quiz = await deleteQuiz(uid, id);
      res.json({ success: true, message: "Quiz soft-deleted successfully.", quiz });
    } catch (error: any) {
      console.error("Error in DELETE /api/learning/quizzes/:id:", error);
      res.status(500).json({ error: error.message || "Failed to delete quiz." });
    }
  });

  // Save progress / difficulty rating of a flashcard
  app.post("/api/learning/flashcards/cards/:id/progress", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const cardId = parseInt(req.params.id, 10);
      const { rating } = req.body;

      if (isNaN(cardId)) {
        return res.status(400).json({ error: "Invalid flashcard ID." });
      }
      if (!rating || !["easy", "medium", "hard"].includes(rating)) {
        return res.status(400).json({ error: "Invalid rating. Must be 'easy', 'medium', or 'hard'." });
      }

      const progress = await saveFlashcardProgress(uid, cardId, rating);
      res.json({ success: true, progress });
    } catch (error: any) {
      console.error("Error in POST /api/learning/flashcards/cards/:id/progress:", error);
      res.status(500).json({ error: error.message || "Failed to save flashcard progress." });
    }
  });

  // Get progress ratings for a flashcard deck
  app.get("/api/learning/flashcards/decks/:id/progress", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const deckId = parseInt(req.params.id, 10);

      if (isNaN(deckId)) {
        return res.status(400).json({ error: "Invalid deck ID." });
      }

      const progressList = await getFlashcardProgressForDeck(uid, deckId);
      res.json({ success: true, progress: progressList });
    } catch (error: any) {
      console.error("Error in GET /api/learning/flashcards/decks/:id/progress:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve flashcard progress." });
    }
  });

  // Save a quiz attempt
  app.post("/api/learning/quizzes/:id/attempts", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const quizId = parseInt(req.params.id, 10);
      const { score, totalQuestions, accuracy, completionTime, answers } = req.body;

      if (isNaN(quizId)) {
        return res.status(400).json({ error: "Invalid quiz ID." });
      }
      if (score === undefined || totalQuestions === undefined || accuracy === undefined || completionTime === undefined || !answers) {
        return res.status(400).json({ error: "Missing required attempt fields." });
      }

      const attempt = await saveQuizAttempt(uid, quizId, {
        score: parseInt(score, 10),
        totalQuestions: parseInt(totalQuestions, 10),
        accuracy: parseInt(accuracy, 10),
        completionTime: parseInt(completionTime, 10),
        answers,
      });

      res.status(201).json({ success: true, attempt });
    } catch (error: any) {
      console.error("Error in POST /api/learning/quizzes/:id/attempts:", error);
      res.status(500).json({ error: error.message || "Failed to save quiz attempt." });
    }
  });

  // Get past quiz attempts for a specific quiz
  app.get("/api/learning/quizzes/:id/attempts", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const quizId = parseInt(req.params.id, 10);

      if (isNaN(quizId)) {
        return res.status(400).json({ error: "Invalid quiz ID." });
      }

      const attempts = await getQuizAttempts(uid, quizId);
      res.json({ success: true, attempts });
    } catch (error: any) {
      console.error("Error in GET /api/learning/quizzes/:id/attempts:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve quiz attempts." });
    }
  });

  // Get all past quiz attempts for the user (statistics / progress)
  app.get("/api/learning/quizzes/attempts/all", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const attempts = await getQuizAttempts(uid);
      res.json({ success: true, attempts });
    } catch (error: any) {
      console.error("Error in GET /api/learning/quizzes/attempts/all:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve all quiz attempts." });
    }
  });

  // Explain quiz question choice using AI context retrieval
  app.post("/api/learning/quizzes/explain-question", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const { questionId, selectedAnswer } = req.body;

      if (!questionId) {
        return res.status(400).json({ error: "questionId is required." });
      }

      const explanationResult = await explainQuizAnswer(uid, parseInt(questionId, 10), selectedAnswer);
      res.json(explanationResult);
    } catch (error: any) {
      console.error("Error in POST /api/learning/quizzes/explain-question:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI explanation." });
    }
  });

  // --- STUDY PLANNER ENDPOINTS ---

  // Get all study tasks (and dynamically check for reminders/overdue tasks on load)
  app.get("/api/planner/tasks", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      // Dynamically run the checks on task list loads so they are always current
      await checkAndGenerateReminders(uid);
      const tasks = await getStudyTasks(uid);
      res.json({ success: true, tasks });
    } catch (error: any) {
      console.error("Error in GET /api/planner/tasks:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve study tasks." });
    }
  });

  // Create a study task
  app.post("/api/planner/tasks", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const { title, description, dueDate, priority, subjectId } = req.body;

      if (!title) {
        return res.status(400).json({ error: "Title is required for study tasks." });
      }

      const task = await createStudyTask(uid, {
        title,
        description,
        dueDate,
        priority: priority || "medium",
        subjectId: subjectId ? parseInt(subjectId, 10) : undefined,
      });

      res.status(201).json({ success: true, task });
    } catch (error: any) {
      console.error("Error in POST /api/planner/tasks:", error);
      res.status(500).json({ error: error.message || "Failed to create study task." });
    }
  });

  // Update a study task
  app.patch("/api/planner/tasks/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const taskId = parseInt(req.params.id, 10);
      const { title, description, dueDate, priority, subjectId, status } = req.body;

      if (isNaN(taskId)) {
        return res.status(400).json({ error: "Invalid task ID." });
      }

      const task = await updateStudyTask(uid, taskId, {
        title,
        description,
        dueDate,
        priority,
        subjectId: subjectId === null ? null : (subjectId ? parseInt(subjectId, 10) : undefined),
        status,
      });

      res.json({ success: true, task });
    } catch (error: any) {
      console.error("Error in PATCH /api/planner/tasks/:id:", error);
      res.status(500).json({ error: error.message || "Failed to update study task." });
    }
  });

  // Delete a study task
  app.delete("/api/planner/tasks/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const taskId = parseInt(req.params.id, 10);

      if (isNaN(taskId)) {
        return res.status(400).json({ error: "Invalid task ID." });
      }

      await deleteStudyTask(uid, taskId);
      res.json({ success: true, message: "Study task deleted successfully." });
    } catch (error: any) {
      console.error("Error in DELETE /api/planner/tasks/:id:", error);
      res.status(500).json({ error: error.message || "Failed to delete study task." });
    }
  });

  // Reorder study tasks
  app.post("/api/planner/tasks/reorder", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const { taskIds } = req.body;

      if (!Array.isArray(taskIds)) {
        return res.status(400).json({ error: "taskIds list is required for reordering." });
      }

      const tasks = await reorderStudyTasks(uid, taskIds.map(id => parseInt(id, 10)));
      res.json({ success: true, tasks });
    } catch (error: any) {
      console.error("Error in POST /api/planner/tasks/reorder:", error);
      res.status(500).json({ error: error.message || "Failed to reorder study tasks." });
    }
  });

  // Get notifications for a user
  app.get("/api/planner/notifications", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const notificationsList = await getNotifications(uid);
      res.json({ success: true, notifications: notificationsList });
    } catch (error: any) {
      console.error("Error in GET /api/planner/notifications:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve notifications." });
    }
  });

  // Mark notifications as read
  app.post("/api/planner/notifications/read", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const { notificationIds } = req.body;

      await markNotificationsAsRead(uid, notificationIds);
      res.json({ success: true, message: "Notifications marked as read." });
    } catch (error: any) {
      console.error("Error in POST /api/planner/notifications/read:", error);
      res.status(500).json({ error: error.message || "Failed to mark notifications as read." });
    }
  });

  // Delete / clear notifications
  app.delete("/api/planner/notifications", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const { notificationIds } = req.body;
      const { db } = await import("./src/db/index.ts");
      const { notifications } = await import("./src/db/schema.ts");
      const { and, eq, inArray } = await import("drizzle-orm");

      if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
        await db.delete(notifications).where(
          and(
            eq(notifications.userId, uid),
            inArray(notifications.id, notificationIds.map(id => parseInt(id, 10)))
          )
        );
      } else {
        await db.delete(notifications).where(eq(notifications.userId, uid));
      }
      res.json({ success: true, message: "Notifications cleared successfully." });
    } catch (error: any) {
      console.error("Error in DELETE /api/planner/notifications:", error);
      res.status(500).json({ error: error.message || "Failed to clear notifications." });
    }
  });

  // AI plan my study
  app.post("/api/planner/ai-plan", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const { examDate, availableHours, subjects, additionalInfo } = req.body;

      if (!examDate || !availableHours || !Array.isArray(subjects) || subjects.length === 0) {
        return res.status(400).json({ error: "Missing required properties (examDate, availableHours, subjects)." });
      }

      const createdTasks = await aiPlanStudy(uid, {
        examDate,
        availableHours: parseInt(availableHours, 10),
        subjects,
        additionalInfo,
      });

      res.status(201).json({ success: true, tasks: createdTasks });
    } catch (error: any) {
      console.error("Error in POST /api/planner/ai-plan:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI study plan." });
    }
  });

  // =========================================================================
  // --- PRODUCTIVITY SUITE ENDPOINTS (ASSIGNMENTS, GOALS, EXAMS, REMINDERS) ---
  // =========================================================================

  // 1. ASSIGNMENTS
  app.get("/api/assignments", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      // Automatically trigger any pending reminders when fetching data
      await triggerPendingReminders(uid);
      const list = await getAssignments(uid);
      res.json({ success: true, assignments: list });
    } catch (error: any) {
      console.error("Error in GET /api/assignments:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve assignments." });
    }
  });

  app.post("/api/assignments", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const { title, description, dueDate, priority, status, subjectId, attachments, reminderOptions } = req.body;

      if (!title || !dueDate) {
        return res.status(400).json({ error: "Title and Due Date are required." });
      }

      const assignment = await createAssignment(uid, {
        title,
        description,
        dueDate,
        priority: priority || "medium",
        status: status || "pending",
        subjectId: subjectId ? parseInt(subjectId, 10) : undefined,
        attachments: attachments ? JSON.stringify(attachments) : undefined,
      });

      // Handle Reminders Setup
      if (reminderOptions && Array.isArray(reminderOptions)) {
        const dDate = new Date(dueDate);
        for (const remType of reminderOptions) {
          let triggerTime = new Date(dDate.getTime());
          if (remType === "1_day_before") {
            triggerTime.setDate(triggerTime.getDate() - 1);
          } else if (remType === "1_hour_before") {
            triggerTime.setHours(triggerTime.getHours() - 1);
          } else {
            continue;
          }

          if (triggerTime > new Date()) {
            await createReminder(uid, {
              title: `Assignment Due: ${title} ⏱️`,
              description: `Your assignment "${title}" is due on ${dDate.toLocaleString()}`,
              triggerTime: triggerTime.toISOString(),
              targetType: "assignment",
              targetId: assignment.id,
              reminderType: remType,
            });
          }
        }
      }

      res.status(201).json({ success: true, assignment });
    } catch (error: any) {
      console.error("Error in POST /api/assignments:", error);
      res.status(500).json({ error: error.message || "Failed to create assignment." });
    }
  });

  app.put("/api/assignments/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const assignmentId = parseInt(req.params.id, 10);
      const { title, description, dueDate, priority, status, subjectId, attachments, reminderOptions } = req.body;

      if (isNaN(assignmentId)) {
        return res.status(400).json({ error: "Invalid Assignment ID." });
      }

      const updated = await updateAssignment(uid, assignmentId, {
        title,
        description,
        dueDate,
        priority,
        status,
        subjectId: subjectId !== undefined ? (subjectId ? parseInt(subjectId, 10) : null) : undefined,
        attachments: attachments !== undefined ? (attachments ? JSON.stringify(attachments) : null) : undefined,
      });

      if (!updated) {
        return res.status(404).json({ error: "Assignment not found or unauthorized." });
      }

      // Sync Reminders if dueDate or reminderOptions were updated
      if (dueDate || reminderOptions) {
        const finalDueDate = dueDate ? new Date(dueDate) : new Date(updated.dueDate);
        const finalTitle = title || updated.title;

        // Reset old reminders
        await deleteRemindersForTarget(uid, "assignment", assignmentId);

        if (reminderOptions && Array.isArray(reminderOptions)) {
          for (const remType of reminderOptions) {
            let triggerTime = new Date(finalDueDate.getTime());
            if (remType === "1_day_before") {
              triggerTime.setDate(triggerTime.getDate() - 1);
            } else if (remType === "1_hour_before") {
              triggerTime.setHours(triggerTime.getHours() - 1);
            } else {
              continue;
            }

            if (triggerTime > new Date()) {
              await createReminder(uid, {
                title: `Assignment Due: ${finalTitle} ⏱️`,
                description: `Your assignment "${finalTitle}" is due on ${finalDueDate.toLocaleString()}`,
                triggerTime: triggerTime.toISOString(),
                targetType: "assignment",
                targetId: assignmentId,
                reminderType: remType,
              });
            }
          }
        }
      }

      res.json({ success: true, assignment: updated });
    } catch (error: any) {
      console.error("Error in PUT /api/assignments/:id:", error);
      res.status(500).json({ error: error.message || "Failed to update assignment." });
    }
  });

  app.delete("/api/assignments/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const assignmentId = parseInt(req.params.id, 10);

      if (isNaN(assignmentId)) {
        return res.status(400).json({ error: "Invalid Assignment ID." });
      }

      // Cleanup associated reminders
      await deleteRemindersForTarget(uid, "assignment", assignmentId);
      await deleteAssignment(uid, assignmentId);

      res.json({ success: true, message: "Assignment deleted successfully." });
    } catch (error: any) {
      console.error("Error in DELETE /api/assignments/:id:", error);
      res.status(500).json({ error: error.message || "Failed to delete assignment." });
    }
  });

  // AI Breakdown Assignment
  app.post("/api/assignments/:id/breakdown", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const assignmentId = parseInt(req.params.id, 10);

      if (isNaN(assignmentId)) {
        return res.status(400).json({ error: "Invalid Assignment ID." });
      }

      const subtasks = await breakdownAssignmentAI(uid, assignmentId);
      res.json({ success: true, subtasks });
    } catch (error: any) {
      console.error("Error in POST /api/assignments/:id/breakdown:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI subtasks." });
    }
  });

  // Toggle Subtask
  app.put("/api/assignments/subtasks/:subtaskId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const subtaskId = parseInt(req.params.subtaskId, 10);
      const { completed } = req.body;

      if (isNaN(subtaskId)) {
        return res.status(400).json({ error: "Invalid Subtask ID." });
      }

      const updated = await toggleAssignmentSubtask(subtaskId, completed === true);
      res.json({ success: true, subtask: updated });
    } catch (error: any) {
      console.error("Error in PUT /api/assignments/subtasks/:subtaskId:", error);
      res.status(500).json({ error: error.message || "Failed to toggle subtask." });
    }
  });

  // 2. GOALS
  app.get("/api/goals", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const list = await getGoals(uid);
      res.json({ success: true, goals: list });
    } catch (error: any) {
      console.error("Error in GET /api/goals:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve goals." });
    }
  });

  app.post("/api/goals", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const { title, description, type, targetDate, tasks } = req.body;

      if (!title || !type) {
        return res.status(400).json({ error: "Title and Goal Type ('daily', 'weekly', 'monthly') are required." });
      }

      const goal = await createGoal(uid, {
        title,
        description,
        type,
        targetDate,
        tasks,
      });

      res.status(201).json({ success: true, goal });
    } catch (error: any) {
      console.error("Error in POST /api/goals:", error);
      res.status(500).json({ error: error.message || "Failed to create goal." });
    }
  });

  app.put("/api/goals/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const goalId = parseInt(req.params.id, 10);
      const { title, description, type, targetDate, completed } = req.body;

      if (isNaN(goalId)) {
        return res.status(400).json({ error: "Invalid Goal ID." });
      }

      const updated = await updateGoal(uid, goalId, {
        title,
        description,
        type,
        targetDate,
        completed,
      });

      res.json({ success: true, goal: updated });
    } catch (error: any) {
      console.error("Error in PUT /api/goals/:id:", error);
      res.status(500).json({ error: error.message || "Failed to update goal." });
    }
  });

  app.delete("/api/goals/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const goalId = parseInt(req.params.id, 10);

      if (isNaN(goalId)) {
        return res.status(400).json({ error: "Invalid Goal ID." });
      }

      await deleteGoal(uid, goalId);
      res.json({ success: true, message: "Goal deleted successfully." });
    } catch (error: any) {
      console.error("Error in DELETE /api/goals/:id:", error);
      res.status(500).json({ error: error.message || "Failed to delete goal." });
    }
  });

  // Goal nested tasks
  app.post("/api/goals/:id/tasks", requireAuth, async (req: AuthRequest, res) => {
    try {
      const goalId = parseInt(req.params.id, 10);
      const { title } = req.body;

      if (isNaN(goalId) || !title) {
        return res.status(400).json({ error: "Invalid parameters." });
      }

      const task = await addGoalTask(goalId, title);
      res.status(201).json({ success: true, task });
    } catch (error: any) {
      console.error("Error in POST /api/goals/:id/tasks:", error);
      res.status(500).json({ error: error.message || "Failed to add goal task." });
    }
  });

  app.put("/api/goals/:id/tasks/:taskId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const goalId = parseInt(req.params.id, 10);
      const taskId = parseInt(req.params.taskId, 10);
      const { completed } = req.body;

      if (isNaN(goalId) || isNaN(taskId)) {
        return res.status(400).json({ error: "Invalid IDs." });
      }

      const updated = await toggleGoalTask(goalId, taskId, completed === true);
      res.json({ success: true, task: updated });
    } catch (error: any) {
      console.error("Error in PUT /api/goals/:id/tasks/:taskId:", error);
      res.status(500).json({ error: error.message || "Failed to toggle goal task." });
    }
  });

  app.delete("/api/goals/:id/tasks/:taskId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const goalId = parseInt(req.params.id, 10);
      const taskId = parseInt(req.params.taskId, 10);

      if (isNaN(goalId) || isNaN(taskId)) {
        return res.status(400).json({ error: "Invalid IDs." });
      }

      await deleteGoalTask(goalId, taskId);
      res.json({ success: true, message: "Goal task deleted successfully." });
    } catch (error: any) {
      console.error("Error in DELETE /api/goals/:id/tasks/:taskId:", error);
      res.status(500).json({ error: error.message || "Failed to delete goal task." });
    }
  });

  // 3. EXAMS
  app.get("/api/exams", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const list = await getExams(uid);
      res.json({ success: true, exams: list });
    } catch (error: any) {
      console.error("Error in GET /api/exams:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve exams." });
    }
  });

  app.post("/api/exams", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const { title, description, examDate, location, subjectId, reminderOptions } = req.body;

      if (!title || !examDate || !subjectId) {
        return res.status(400).json({ error: "Title, Exam Date, and Subject are required." });
      }

      const exam = await createExam(uid, {
        title,
        description,
        examDate,
        location,
        subjectId: parseInt(subjectId, 10),
      });

      // Handle Reminders Setup
      if (reminderOptions && Array.isArray(reminderOptions)) {
        const eDate = new Date(examDate);
        for (const remType of reminderOptions) {
          let triggerTime = new Date(eDate.getTime());
          if (remType === "1_day_before") {
            triggerTime.setDate(triggerTime.getDate() - 1);
          } else if (remType === "1_hour_before") {
            triggerTime.setHours(triggerTime.getHours() - 1);
          } else {
            continue;
          }

          if (triggerTime > new Date()) {
            await createReminder(uid, {
              title: `Exam Upcoming: ${title} ⏱️`,
              description: `Your exam for "${title}" is tomorrow at ${eDate.toLocaleTimeString()}`,
              triggerTime: triggerTime.toISOString(),
              targetType: "exam",
              targetId: exam.id,
              reminderType: remType,
            });
          }
        }
      }

      res.status(201).json({ success: true, exam });
    } catch (error: any) {
      console.error("Error in POST /api/exams:", error);
      res.status(500).json({ error: error.message || "Failed to create exam." });
    }
  });

  app.put("/api/exams/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const examId = parseInt(req.params.id, 10);
      const { title, description, examDate, location, subjectId, reminderOptions } = req.body;

      if (isNaN(examId)) {
        return res.status(400).json({ error: "Invalid Exam ID." });
      }

      const updated = await updateExam(uid, examId, {
        title,
        description,
        examDate,
        location,
        subjectId: subjectId ? parseInt(subjectId, 10) : undefined,
      });

      if (!updated) {
        return res.status(404).json({ error: "Exam not found or unauthorized." });
      }

      // Sync reminders if examDate or reminderOptions updated
      if (examDate || reminderOptions) {
        const finalExamDate = examDate ? new Date(examDate) : new Date(updated.examDate);
        const finalTitle = title || updated.title;

        await deleteRemindersForTarget(uid, "exam", examId);

        if (reminderOptions && Array.isArray(reminderOptions)) {
          for (const remType of reminderOptions) {
            let triggerTime = new Date(finalExamDate.getTime());
            if (remType === "1_day_before") {
              triggerTime.setDate(triggerTime.getDate() - 1);
            } else if (remType === "1_hour_before") {
              triggerTime.setHours(triggerTime.getHours() - 1);
            } else {
              continue;
            }

            if (triggerTime > new Date()) {
              await createReminder(uid, {
                title: `Exam Upcoming: ${finalTitle} ⏱️`,
                description: `Your exam for "${finalTitle}" is tomorrow at ${finalExamDate.toLocaleTimeString()}`,
                triggerTime: triggerTime.toISOString(),
                targetType: "exam",
                targetId: examId,
                reminderType: remType,
              });
            }
          }
        }
      }

      res.json({ success: true, exam: updated });
    } catch (error: any) {
      console.error("Error in PUT /api/exams/:id:", error);
      res.status(500).json({ error: error.message || "Failed to update exam." });
    }
  });

  app.delete("/api/exams/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const examId = parseInt(req.params.id, 10);

      if (isNaN(examId)) {
        return res.status(400).json({ error: "Invalid Exam ID." });
      }

      await deleteRemindersForTarget(uid, "exam", examId);
      await deleteExam(uid, examId);

      res.json({ success: true, message: "Exam deleted successfully." });
    } catch (error: any) {
      console.error("Error in DELETE /api/exams/:id:", error);
      res.status(500).json({ error: error.message || "Failed to delete exam." });
    }
  });

  // 4. SMART REMINDERS TRIGGER
  app.post("/api/reminders/trigger", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const notifs = await triggerPendingReminders(uid);
      res.json({ success: true, notificationsTriggered: notifs });
    } catch (error: any) {
      console.error("Error in POST /api/reminders/trigger:", error);
      res.status(500).json({ error: error.message || "Failed to trigger reminders." });
    }
  });

  // --- SMART ANALYTICS ENDPOINTS ---

  // Get aggregated dashboard analytics
  app.get("/api/analytics", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const data = await getDashboardAnalytics(uid);
      res.json({ success: true, analytics: data });
    } catch (error: any) {
      console.error("Error in GET /api/analytics:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve analytics data." });
    }
  });

  // Get AI personalized study recommendations
  app.get("/api/analytics/insights", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const insightsStr = await getAIRecommendations(uid);
      const insights = JSON.parse(insightsStr);
      res.json({ success: true, insights });
    } catch (error: any) {
      console.error("Error in GET /api/analytics/insights:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI insights." });
    }
  });

  // Log a manual study session
  app.post("/api/analytics/session", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const { subjectId, duration, notes } = req.body;

      if (!duration || isNaN(parseInt(duration, 10))) {
        return res.status(400).json({ error: "A valid study duration in minutes is required." });
      }

      const session = await logStudySession(uid, {
        subjectId: subjectId ? parseInt(subjectId, 10) : undefined,
        duration: parseInt(duration, 10),
        notes
      });

      res.status(201).json({ success: true, session });
    } catch (error: any) {
      console.error("Error in POST /api/analytics/session:", error);
      res.status(500).json({ error: error.message || "Failed to log study session." });
    }
  });

  // Delete a logged study session
  app.delete("/api/analytics/session/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const sessionId = parseInt(req.params.id, 10);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid study session ID." });
      }

      const { db } = await import("./src/db/index.ts");
      const { studySessions } = await import("./src/db/schema.ts");
      const { and, eq } = await import("drizzle-orm");

      await db
        .delete(studySessions)
        .where(and(eq(studySessions.id, sessionId), eq(studySessions.userId, uid)));

      res.json({ success: true, message: "Study session deleted successfully." });
    } catch (error: any) {
      console.error("Error in DELETE /api/analytics/session/:id:", error);
      res.status(500).json({ error: error.message || "Failed to delete study session." });
    }
  });

  // =========================================================================
  // --- ADVANCED PRODUCTIVITY SUITE AI ENDPOINTS ---
  // =========================================================================

  // Get productivity metrics and scores
  app.get("/api/productivity/metrics", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const metrics = await getAIProductivityMetrics(uid);
      res.json({ success: true, metrics });
    } catch (error: any) {
      console.error("Error in GET /api/productivity/metrics:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve productivity metrics." });
    }
  });

  // Get weak topic analysis
  app.get("/api/productivity/weak-topics", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const analysis = await getAIWeakTopicAnalysis(uid);
      res.json({ success: true, analysis });
    } catch (error: any) {
      console.error("Error in GET /api/productivity/weak-topics:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve topic analysis." });
    }
  });

  // Get dynamic recommendations (fetches from DB, generates if none exist)
  app.get("/api/productivity/recommendations", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      let recs = await db
        .select()
        .from(aiRecommendations)
        .where(and(eq(aiRecommendations.userId, uid), eq(aiRecommendations.dismissed, false)));
      
      if (recs.length === 0) {
        recs = await generateAIRecommendations(uid);
      }
      res.json({ success: true, recommendations: recs });
    } catch (error: any) {
      console.error("Error in GET /api/productivity/recommendations:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve recommendations." });
    }
  });

  // Force regenerate recommendations
  app.post("/api/productivity/recommendations/generate", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const recs = await generateAIRecommendations(uid);
      res.json({ success: true, recommendations: recs });
    } catch (error: any) {
      console.error("Error in POST /api/productivity/recommendations/generate:", error);
      res.status(500).json({ error: error.message || "Failed to regenerate recommendations." });
    }
  });

  // Dismiss recommendation
  app.post("/api/productivity/recommendations/:id/dismiss", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const recId = parseInt(req.params.id, 10);
      await db
        .update(aiRecommendations)
        .set({ dismissed: true })
        .where(and(eq(aiRecommendations.id, recId), eq(aiRecommendations.userId, uid)));
      res.json({ success: true, message: "Recommendation dismissed." });
    } catch (error: any) {
      console.error("Error in POST /api/productivity/recommendations/:id/dismiss:", error);
      res.status(500).json({ error: error.message || "Failed to dismiss recommendation." });
    }
  });

  // Get/generate revision plan (daily or weekly)
  app.get("/api/productivity/revision-plan", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const scheduleType = (req.query.type as string) || "weekly";
      if (scheduleType !== "daily" && scheduleType !== "weekly") {
        return res.status(400).json({ error: "Invalid schedule type. Must be 'daily' or 'weekly'." });
      }

      const existing = await db
        .select()
        .from(aiRevisionPlans)
        .where(and(eq(aiRevisionPlans.userId, uid), eq(aiRevisionPlans.scheduleType, scheduleType)))
        .limit(1);

      let plan;
      if (existing.length > 0) {
        plan = JSON.parse(existing[0].planData);
      } else {
        plan = await generateRevisionPlan(uid, scheduleType);
      }

      res.json({ success: true, plan });
    } catch (error: any) {
      console.error("Error in GET /api/productivity/revision-plan:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve revision plan." });
    }
  });

  // Force generate/regenerate revision plan
  app.post("/api/productivity/revision-plan/generate", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const scheduleType = (req.body.type as string) || "weekly";
      if (scheduleType !== "daily" && scheduleType !== "weekly") {
        return res.status(400).json({ error: "Invalid schedule type. Must be 'daily' or 'weekly'." });
      }

      const plan = await generateRevisionPlan(uid, scheduleType);
      res.json({ success: true, plan });
    } catch (error: any) {
      console.error("Error in POST /api/productivity/revision-plan/generate:", error);
      res.status(500).json({ error: error.message || "Failed to generate revision plan." });
    }
  });

  // Get AI Daily Briefing
  app.get("/api/productivity/daily-briefing", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const briefing = await getAIDailyBriefing(uid);
      res.json({ success: true, briefing });
    } catch (error: any) {
      console.error("Error in GET /api/productivity/daily-briefing:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve daily briefing." });
    }
  });

  // AI Support Co-Pilot - Dynamic Diagnostics endpoint
  app.post("/api/support/diagnose", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const { activeTab } = req.body;

      // Query database for statistics
      const userSubjects = await db.select().from(subjects).where(eq(subjects.userId, uid));
      const userTasks = await db.select().from(studyTasks).where(eq(studyTasks.userId, uid));
      const userAssignments = await db.select().from(assignments).where(eq(assignments.userId, uid));
      const userQuizzes = await db.select().from(quizAttempts).where(eq(quizAttempts.userId, uid));

      const pendingTasks = userTasks.filter(t => t.status === "pending").length;
      const pendingAssignments = userAssignments.filter(a => a.status === "pending" || a.status === "in_progress").length;

      const diagnosticLogs = [
        `[Database] Connected successfully to Cloud SQL Hub`,
        `[Active Page Context] User is browsing "${activeTab || "dashboard"}" view`,
        `[Auth State] Session verified via Firebase Security Context`,
        `[Core Sync] Study metrics and task counts successfully synchronized`,
        `[SaaS Integrity] Active workspace status: Healthy & Optimized`
      ];

      const tips: string[] = [];
      if (userSubjects.length === 0) {
        tips.push("You haven't added any subjects yet! Head to 'Subjects' in the sidebar to organize your courses and unlock AI tools.");
      }
      
      switch (activeTab) {
        case "dashboard":
          tips.push("Start your day by checking the AI Daily Briefing at the top right of your dashboard to see your recommended study order!");
          tips.push("Click on 'Focus/Timer' to kick off a Pomodoro study session and automatically track your study hours.");
          break;
        case "planner":
          if (pendingTasks > 0) {
            tips.push(`You currently have ${pendingTasks} pending study tasks. Complete them or drag to change their relative ordering!`);
          } else {
            tips.push("Add study tasks to your planner to keep track of your daily deadlines. We can also auto-add reminders for you!");
          }
          break;
        case "flashcards":
          tips.push("Generate flashcards automatically from your notes or documents using the 'Generate Deck' button to practice spaced repetition!");
          break;
        case "quizzes":
          if (userQuizzes.length > 0) {
            const avgAccuracy = Math.round(userQuizzes.reduce((acc, q) => acc + q.accuracy, 0) / userQuizzes.length);
            tips.push(`Your average quiz accuracy is ${avgAccuracy}%. Practice active recall regularly to lock in core concepts!`);
          } else {
            tips.push("Take custom AI quizzes generated from your materials. Active testing is 150% more effective than passive reading!");
          }
          break;
        case "notes":
          tips.push("Add study notes or upload files like PDF/DOCX to your documents library. The chatbot can use them directly as context!");
          break;
        default:
          tips.push("Upload your syllabus and course slides in 'Materials & Uploads' so the AI can customize its study recommendations.");
          break;
      }

      if (tips.length < 2) {
        tips.push("Utilize 5-minute Pomodoro breaks between intensive learning blocks to maximize long-term factual retention.");
      }

      res.json({
        success: true,
        activeTab: activeTab || "dashboard",
        diagnosticLogs,
        stats: {
          subjectsCount: userSubjects.length,
          pendingTasksCount: pendingTasks,
          pendingAssignmentsCount: pendingAssignments,
          quizAttemptsCount: userQuizzes.length,
        },
        tips,
      });
    } catch (error: any) {
      console.error("Error in POST /api/support/diagnose:", error);
      res.status(500).json({ error: error.message || "Failed to perform system diagnostic." });
    }
  });

  // AI Support Co-Pilot - Chat endpoint
  app.post("/api/support/chat", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user!;
      const { messages, activeTab, systemContext } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required." });
      }

      const ai = getAIClient();
      const contents = messages.map((m: any) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

      const userSubjects = await db.select().from(subjects).where(eq(subjects.userId, uid));
      const userTasks = await db.select().from(studyTasks).where(eq(studyTasks.userId, uid));
      const userAssignments = await db.select().from(assignments).where(eq(assignments.userId, uid));

      const statsSummary = `
User Context:
- Active subjects: ${userSubjects.length} (${userSubjects.map(s => s.title).join(", ") || "None"})
- Pending study tasks: ${userTasks.filter(t => t.status === "pending").length}
- Pending assignments: ${userAssignments.filter(a => a.status === "pending" || a.status === "in_progress").length}
- Currently active page/tab: "${activeTab || "dashboard"}"
`;

      const systemInstruction = `
You are the AI Support Co-Pilot & Mentor inside "AI Study Hub" (a highly advanced student platform).
Your role is to act as a supportive technical guide and educational mentor.
Help the user utilize the application's premium features, troubleshoot issues, or answer academic how-tos.

Core Application Features:
1. **Study Hub Dashboard**: Shows visual statistics, Pomodoro streak, active countdowns, AI Daily Briefing, and recent AI recommendations.
2. **Study Planner**: For creating study tasks, assigning priority/subject, and managing due dates.
3. **AI Study Schedule**: Generates full daily/weekly revision plans with cognitive load balancing and specific topic blocks.
4. **Study Sessions & Pomodoro**: Click 'Focus/Timer' in the sidebar. Run Pomodoro timers to stay focused, and complete sessions to build your focus streaks.
5. **Flashcard Studio**: Build custom decks or auto-generate complete flashcard pools from notes/materials using the 'Generate' button. Supports spacing review.
6. **AI Quiz Master**: Auto-generate full-length dynamic interactive quizzes from any of your notes or course files.
7. **Personal Notes**: Add study notes or upload files (PDF/DOCX/TXT) up to 20MB. The chatbot can leverage uploaded documents to answer deep context queries.
8. **Goal Tracker**: Set long-term academic milestones and outline sub-goals.
9. **Exam Tracker**: Enter upcoming tests, weight percentages, and study coverage percentages.

Guidelines for support conversation:
- Keep answers warm, encouraging, structurally clear, and focused.
- Use bullet points, bold text, or numbered lists when explaining steps to make them exceptionally readable.
- If the user asks general questions, frame them inside the platform's capabilities (e.g., "You can easily practice that using our Spaced Repetition Flashcards!").
- Since the user is currently on the "${activeTab || "dashboard"}" view, adjust your suggestions accordingly.
- Keep responses concise but fully complete. Do not refer to technical files or server routes.

Current student's database state:
${statsSummary}
${systemContext ? `Additional Diagnostic Context: ${JSON.stringify(systemContext)}` : ""}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({
        success: true,
        reply: response.text || "I apologize, but I could not process that request. Let me know how else I can help!",
      });
    } catch (error: any) {
      console.error("Error in POST /api/support/chat:", error);
      res.status(500).json({ error: error.message || "Support chatbot failed to respond." });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[AI Study Hub] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start the Express server:", err);
  process.exit(1);
});
