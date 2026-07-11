import { db } from "../../../db/index.ts";
import { notes } from "../../../db/schema.ts";
import { eq, and, like, or, isNull, desc, asc, isNotNull } from "drizzle-orm";
import { z } from "zod";

export const NoteSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  content: z.string().default(""),
  subjectId: z.number().int().nullable().optional(),
  summary: z.string().nullable().optional(),
  favorite: z.boolean().default(false),
  pinned: z.boolean().default(false),
  archived: z.boolean().default(false),
  color: z.string().default("#6366f1"),
  tags: z.string().default(""),
});

export type NoteInput = z.infer<typeof NoteSchema>;

export async function getNotes(
  userId: string,
  options: {
    search?: string;
    subjectId?: number;
    archived?: boolean;
    pinned?: boolean;
    favorite?: boolean;
    sortBy?: "title" | "createdAt" | "updatedAt";
    sortOrder?: "asc" | "desc";
    includeDeleted?: boolean;
  } = {}
) {
  try {
    const {
      search,
      subjectId,
      archived = false,
      pinned,
      favorite,
      sortBy = "updatedAt",
      sortOrder = "desc",
      includeDeleted = false,
    } = options;

    const conditions = [eq(notes.userId, userId)];

    // Handle soft deletion filtering
    if (!includeDeleted) {
      conditions.push(isNull(notes.deletedAt));
    }

    // Handle archived state filtering
    conditions.push(eq(notes.archived, archived));

    // Handle other filtering flags
    if (pinned !== undefined) {
      conditions.push(eq(notes.pinned, pinned));
    }
    if (favorite !== undefined) {
      conditions.push(eq(notes.favorite, favorite));
    }

    // Handle subject filtering
    if (subjectId !== undefined && subjectId !== null) {
      conditions.push(eq(notes.subjectId, subjectId));
    }

    // Handle search filtering (title, content, tags)
    if (search) {
      conditions.push(
        or(
          like(notes.title, `%${search}%`),
          like(notes.content, `%${search}%`),
          like(notes.tags, `%${search}%`)
        )!
      );
    }

    // Sorting definition
    let orderBySpec;
    if (sortBy === "title") {
      orderBySpec = sortOrder === "asc" ? asc(notes.title) : desc(notes.title);
    } else if (sortBy === "createdAt") {
      orderBySpec = sortOrder === "asc" ? asc(notes.createdAt) : desc(notes.createdAt);
    } else {
      orderBySpec = sortOrder === "asc" ? asc(notes.updatedAt) : desc(notes.updatedAt);
    }

    const results = await db
      .select()
      .from(notes)
      .where(and(...conditions))
      .orderBy(orderBySpec);

    return results;
  } catch (error) {
    console.error("Failed to query notes:", error);
    throw new Error("Unable to retrieve notes from the database.");
  }
}

export async function getNoteById(userId: string, noteId: number) {
  try {
    const results = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
    
    return results[0] || null;
  } catch (error) {
    console.error("Failed to retrieve note by ID:", error);
    throw new Error("Database error when retrieving note.");
  }
}

export async function createNote(userId: string, data: NoteInput) {
  try {
    const validated = NoteSchema.parse(data);

    const result = await db
      .insert(notes)
      .values({
        userId,
        title: validated.title,
        content: validated.content,
        subjectId: validated.subjectId || null,
        summary: validated.summary || null,
        favorite: validated.favorite,
        pinned: validated.pinned,
        archived: validated.archived,
        color: validated.color,
        tags: validated.tags,
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Failed to create note:", error);
    if (error instanceof z.ZodError) {
      throw error;
    }
    throw new Error("Failed to insert the note into the database.");
  }
}

export async function updateNote(userId: string, noteId: number, data: Partial<NoteInput>) {
  try {
    const partialSchema = NoteSchema.partial();
    const validated = partialSchema.parse(data);

    const result = await db
      .update(notes)
      .set({
        ...validated,
        updatedAt: new Date(),
      })
      .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
      .returning();

    if (result.length === 0) {
      throw new Error("Note not found or user unauthorized.");
    }

    return result[0];
  } catch (error) {
    console.error("Failed to update note:", error);
    if (error instanceof z.ZodError) {
      throw error;
    }
    throw new Error("Failed to update the note in the database.");
  }
}

export async function softDeleteNote(userId: string, noteId: number) {
  try {
    const result = await db
      .update(notes)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
      .returning();

    if (result.length === 0) {
      throw new Error("Note not found or user unauthorized.");
    }

    return result[0];
  } catch (error) {
    console.error("Failed to soft delete note:", error);
    throw new Error("Failed to delete the note from the database.");
  }
}

export async function restoreNote(userId: string, noteId: number) {
  try {
    const result = await db
      .update(notes)
      .set({
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
      .returning();

    if (result.length === 0) {
      throw new Error("Note not found or user unauthorized.");
    }

    return result[0];
  } catch (error) {
    console.error("Failed to restore note:", error);
    throw new Error("Failed to restore the note in the database.");
  }
}
