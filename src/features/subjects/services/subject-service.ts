import { db } from "../../../db/index.ts";
import { subjects } from "../../../db/schema.ts";
import { eq, and, like, or, isNull, desc, asc } from "drizzle-orm";
import { z } from "zod";

export const SubjectSchema = z.object({
  title: z.string().min(1, "Subject title is required").max(100, "Title is too long"),
  description: z.string().max(1000, "Description is too long").optional().nullable(),
  color: z.string().min(3).max(20).default("#6366f1"), // support colors, hex or tailwind classes
  icon: z.string().min(1, "Icon is required").default("BookOpen"),
  semester: z.string().max(50, "Semester is too long").optional().nullable(),
  instructor: z.string().max(100, "Instructor is too long").optional().nullable(),
  credits: z.number().int().min(0, "Credits cannot be negative").max(30, "Credits cannot exceed 30").default(0),
});

export type SubjectInput = z.infer<typeof SubjectSchema>;

export async function getSubjects(
  userId: string,
  options: {
    search?: string;
    semester?: string;
    sortBy?: "title" | "createdAt" | "credits";
    sortOrder?: "asc" | "desc";
    includeDeleted?: boolean;
  } = {}
) {
  try {
    const { search, semester, sortBy = "createdAt", sortOrder = "desc", includeDeleted = false } = options;

    // Base conditions
    const conditions = [eq(subjects.userId, userId)];

    // Handle soft deletion filtering
    if (!includeDeleted) {
      conditions.push(isNull(subjects.deletedAt));
    }

    // Handle semester filtering
    if (semester && semester !== "all") {
      conditions.push(eq(subjects.semester, semester));
    }

    // Handle search filtering
    if (search) {
      conditions.push(
        or(
          like(subjects.title, `%${search}%`),
          like(subjects.description, `%${search}%`),
          like(subjects.instructor, `%${search}%`)
        )!
      );
    }

    // Sorting definition
    let orderBySpec;
    if (sortBy === "title") {
      orderBySpec = sortOrder === "asc" ? asc(subjects.title) : desc(subjects.title);
    } else if (sortBy === "credits") {
      orderBySpec = sortOrder === "asc" ? asc(subjects.credits) : desc(subjects.credits);
    } else {
      orderBySpec = sortOrder === "asc" ? asc(subjects.createdAt) : desc(subjects.createdAt);
    }

    const results = await db
      .select()
      .from(subjects)
      .where(and(...conditions))
      .orderBy(orderBySpec);

    return results;
  } catch (error) {
    console.error("Failed to query subjects:", error);
    throw new Error("Unable to retrieve subjects from the database.");
  }
}

export async function getSubjectById(userId: string, subjectId: number) {
  try {
    const results = await db
      .select()
      .from(subjects)
      .where(and(eq(subjects.id, subjectId), eq(subjects.userId, userId)));
    
    return results[0] || null;
  } catch (error) {
    console.error("Failed to retrieve subject by ID:", error);
    throw new Error("Database error when retrieving subject.");
  }
}

export async function createSubject(userId: string, data: SubjectInput) {
  try {
    const validated = SubjectSchema.parse(data);

    const result = await db
      .insert(subjects)
      .values({
        userId,
        title: validated.title,
        description: validated.description || null,
        color: validated.color,
        icon: validated.icon,
        semester: validated.semester || null,
        instructor: validated.instructor || null,
        credits: validated.credits,
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Failed to create subject:", error);
    if (error instanceof z.ZodError) {
      throw error;
    }
    throw new Error("Failed to insert the subject into the database.");
  }
}

export async function updateSubject(userId: string, subjectId: number, data: Partial<SubjectInput>) {
  try {
    // Validate the partial data using Zod
    const partialSchema = SubjectSchema.partial();
    const validated = partialSchema.parse(data);

    const result = await db
      .update(subjects)
      .set({
        ...validated,
        updatedAt: new Date(),
      })
      .where(and(eq(subjects.id, subjectId), eq(subjects.userId, userId)))
      .returning();

    if (result.length === 0) {
      throw new Error("Subject not found or user unauthorized.");
    }

    return result[0];
  } catch (error) {
    console.error("Failed to update subject:", error);
    if (error instanceof z.ZodError) {
      throw error;
    }
    throw new Error("Failed to update the subject in the database.");
  }
}

export async function softDeleteSubject(userId: string, subjectId: number) {
  try {
    const result = await db
      .update(subjects)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(subjects.id, subjectId), eq(subjects.userId, userId)))
      .returning();

    if (result.length === 0) {
      throw new Error("Subject not found or user unauthorized.");
    }

    return result[0];
  } catch (error) {
    console.error("Failed to soft delete subject:", error);
    throw new Error("Failed to delete the subject from the database.");
  }
}

export async function restoreSubject(userId: string, subjectId: number) {
  try {
    const result = await db
      .update(subjects)
      .set({
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(subjects.id, subjectId), eq(subjects.userId, userId)))
      .returning();

    if (result.length === 0) {
      throw new Error("Subject not found or user unauthorized.");
    }

    return result[0];
  } catch (error) {
    console.error("Failed to restore subject:", error);
    throw new Error("Failed to restore the subject in the database.");
  }
}
