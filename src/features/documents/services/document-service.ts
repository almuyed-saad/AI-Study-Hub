import { db } from "../../../db/index.ts";
import { documents, subjects, notes } from "../../../db/schema.ts";
import { eq, and, like, or, isNull, isNotNull, desc, asc, sql } from "drizzle-orm";
import { activeStorageProvider } from "./storage-provider.ts";
import { z } from "zod";

export const DocumentSchema = z.object({
  originalName: z.string().min(1, "Original name is required"),
  storedName: z.string().min(1, "Stored name is required"),
  mimeType: z.string(),
  extension: z.string(),
  size: z.number().int().nonnegative(),
  storageProvider: z.string().default("local"),
  storagePath: z.string(),
  subjectId: z.number().int().optional().nullable(),
  noteId: z.number().int().optional().nullable(),
  status: z.string().default("uploaded"),
  thumbnail: z.string().optional().nullable(),
});

export type DocumentInput = z.infer<typeof DocumentSchema>;

export async function getDocuments(
  userId: string,
  options: {
    search?: string;
    subjectId?: number;
    noteId?: number;
    mimeTypeGroup?: string; // 'pdf' | 'image' | 'text' | 'word' | 'other'
    sortBy?: "name" | "size" | "createdAt";
    sortOrder?: "asc" | "desc";
    includeDeleted?: boolean;
  } = {}
) {
  try {
    const {
      search,
      subjectId,
      noteId,
      mimeTypeGroup,
      sortBy = "createdAt",
      sortOrder = "desc",
      includeDeleted = false,
    } = options;

    const conditions = [eq(documents.userId, userId)];

    if (!includeDeleted) {
      conditions.push(isNull(documents.deletedAt));
    } else {
      conditions.push(isNotNull(documents.deletedAt));
    }

    if (subjectId !== undefined) {
      if (subjectId === 0) {
        // Unassigned / Unlinked
        conditions.push(isNull(documents.subjectId));
      } else {
        conditions.push(eq(documents.subjectId, subjectId));
      }
    }

    if (noteId !== undefined) {
      if (noteId === 0) {
        conditions.push(isNull(documents.noteId));
      } else {
        conditions.push(eq(documents.noteId, noteId));
      }
    }

    if (search) {
      conditions.push(like(documents.originalName, `%${search}%`));
    }

    // Process file groups
    if (mimeTypeGroup && mimeTypeGroup !== "all") {
      if (mimeTypeGroup === "pdf") {
        conditions.push(eq(documents.extension, ".pdf"));
      } else if (mimeTypeGroup === "image") {
        conditions.push(
          or(
            eq(documents.extension, ".png"),
            eq(documents.extension, ".jpeg"),
            eq(documents.extension, ".jpg"),
            eq(documents.extension, ".webp"),
            like(documents.mimeType, "image/%")
          )!
        );
      } else if (mimeTypeGroup === "text") {
        conditions.push(
          or(
            eq(documents.extension, ".txt"),
            eq(documents.extension, ".md"),
            like(documents.mimeType, "text/%")
          )!
        );
      } else if (mimeTypeGroup === "word") {
        conditions.push(
          or(
            eq(documents.extension, ".docx"),
            eq(documents.extension, ".doc"),
            eq(documents.mimeType, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
          )!
        );
      } else {
        // other (e.g. pptx, xlsx, audio, video)
        conditions.push(
          and(
            // Not any of the above
            sql`${documents.extension} NOT IN ('.pdf', '.png', '.jpeg', '.jpg', '.webp', '.txt', '.md', '.docx', '.doc')`
          )!
        );
      }
    }

    let orderBySpec;
    if (sortBy === "name") {
      orderBySpec = sortOrder === "asc" ? asc(documents.originalName) : desc(documents.originalName);
    } else if (sortBy === "size") {
      orderBySpec = sortOrder === "asc" ? asc(documents.size) : desc(documents.size);
    } else {
      orderBySpec = sortOrder === "asc" ? asc(documents.createdAt) : desc(documents.createdAt);
    }

    return await db
      .select()
      .from(documents)
      .where(and(...conditions))
      .orderBy(orderBySpec);
  } catch (error) {
    console.error("[DocumentService] Error getting documents:", error);
    throw error;
  }
}

export async function getDocumentById(userId: string, documentId: number) {
  try {
    const results = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
      .limit(1);
    return results[0] || null;
  } catch (error) {
    console.error("[DocumentService] Error getting document by id:", error);
    throw error;
  }
}

export async function createDocument(userId: string, data: DocumentInput) {
  try {
    const parsed = DocumentSchema.parse(data);
    const results = await db
      .insert(documents)
      .values({
        userId,
        originalName: parsed.originalName,
        storedName: parsed.storedName,
        mimeType: parsed.mimeType,
        extension: parsed.extension,
        size: parsed.size,
        storageProvider: parsed.storageProvider,
        storagePath: parsed.storagePath,
        subjectId: parsed.subjectId,
        noteId: parsed.noteId,
        status: parsed.status,
        thumbnail: parsed.thumbnail,
      })
      .returning();
    return results[0];
  } catch (error) {
    console.error("[DocumentService] Error creating document:", error);
    throw error;
  }
}

export async function updateDocument(
  userId: string,
  documentId: number,
  data: Partial<DocumentInput>
) {
  try {
    const results = await db
      .update(documents)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
      .returning();
    return results[0] || null;
  } catch (error) {
    console.error("[DocumentService] Error updating document:", error);
    throw error;
  }
}

export async function softDeleteDocument(userId: string, documentId: number) {
  try {
    const results = await db
      .update(documents)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
      .returning();
    return results[0] || null;
  } catch (error) {
    console.error("[DocumentService] Error soft deleting document:", error);
    throw error;
  }
}

export async function restoreDocument(userId: string, documentId: number) {
  try {
    const results = await db
      .update(documents)
      .set({
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
      .returning();
    return results[0] || null;
  } catch (error) {
    console.error("[DocumentService] Error restoring document:", error);
    throw error;
  }
}

export async function hardDeleteDocument(userId: string, documentId: number) {
  try {
    // 1. Get document details first
    const doc = await getDocumentById(userId, documentId);
    if (!doc) {
      throw new Error("Document not found or access denied.");
    }

    // 2. Delete from database
    await db
      .delete(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)));

    // 3. Delete from active storage provider
    await activeStorageProvider.deleteFile(doc.storagePath);

    return doc;
  } catch (error) {
    console.error("[DocumentService] Error hard deleting document:", error);
    throw error;
  }
}

export async function getStorageStats(userId: string) {
  try {
    // Select all active documents for the user to compute exact sizing metrics
    const docs = await db
      .select({
        id: documents.id,
        size: documents.size,
        extension: documents.extension,
      })
      .from(documents)
      .where(and(eq(documents.userId, userId), isNull(documents.deletedAt)));

    const totalBytes = docs.reduce((acc, doc) => acc + doc.size, 0);
    const totalCount = docs.length;

    // Categorized sizes
    const categories = {
      pdf: 0,
      image: 0,
      text: 0,
      word: 0,
      other: 0,
    };

    docs.forEach((doc) => {
      const ext = doc.extension.toLowerCase();
      if (ext === ".pdf") {
        categories.pdf += doc.size;
      } else if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
        categories.image += doc.size;
      } else if ([".txt", ".md"].includes(ext)) {
        categories.text += doc.size;
      } else if ([".docx", ".doc"].includes(ext)) {
        categories.word += doc.size;
      } else {
        categories.other += doc.size;
      }
    });

    return {
      totalBytes,
      totalCount,
      categories,
      maxQuotaBytes: 10 * 1024 * 1024 * 1024, // 10GB premium storage quota limit
    };
  } catch (error) {
    console.error("[DocumentService] Error getting storage stats:", error);
    throw error;
  }
}
