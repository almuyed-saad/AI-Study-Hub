import { db } from "../../../db/index.ts";
import { conversations, messages, conversationDocuments, conversationNotes, documents, notes } from "../../../db/schema.ts";
import { eq, and, like, isNull, desc, asc } from "drizzle-orm";

export async function getConversations(userId: string, search?: string) {
  try {
    const conditions = [
      eq(conversations.userId, userId),
      isNull(conversations.deletedAt),
    ];

    if (search) {
      conditions.push(like(conversations.title, `%${search}%`));
    }

    return await db
      .select()
      .from(conversations)
      .where(and(...conditions))
      .orderBy(desc(conversations.updatedAt));
  } catch (error) {
    console.error("Error fetching conversations:", error);
    throw new Error("Failed to load conversations");
  }
}

export async function getConversationById(userId: string, id: number) {
  try {
    const result = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, id),
          eq(conversations.userId, userId),
          isNull(conversations.deletedAt)
        )
      )
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error(`Error fetching conversation ${id}:`, error);
    throw new Error("Failed to load conversation");
  }
}

export async function getConversationMessages(userId: string, conversationId: number) {
  try {
    // Confirm ownership first
    const conversation = await getConversationById(userId, conversationId);
    if (!conversation) {
      throw new Error("Conversation not found or access denied");
    }

    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));
  } catch (error) {
    console.error(`Error fetching messages for conversation ${conversationId}:`, error);
    throw error;
  }
}

export async function createConversation(userId: string, title = "New Chat") {
  try {
    const result = await db
      .insert(conversations)
      .values({
        userId,
        title,
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error("Error creating conversation:", error);
    throw new Error("Failed to start new conversation");
  }
}

export async function renameConversation(userId: string, id: number, title: string) {
  try {
    const result = await db
      .update(conversations)
      .set({
        title,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(conversations.id, id),
          eq(conversations.userId, userId),
          isNull(conversations.deletedAt)
        )
      )
      .returning();
    return result[0] || null;
  } catch (error) {
    console.error(`Error renaming conversation ${id}:`, error);
    throw new Error("Failed to rename conversation");
  }
}

export async function softDeleteConversation(userId: string, id: number) {
  try {
    const result = await db
      .update(conversations)
      .set({
        deletedAt: new Date(),
      })
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .returning();
    return result[0] || null;
  } catch (error) {
    console.error(`Error deleting conversation ${id}:`, error);
    throw new Error("Failed to delete conversation");
  }
}

export async function addMessage(
  userId: string,
  conversationId: number,
  role: "user" | "model",
  content: string,
  sources?: string
) {
  try {
    // Confirm ownership & check deleted status
    const conversation = await getConversationById(userId, conversationId);
    if (!conversation) {
      throw new Error("Conversation not found or access denied");
    }

    // Insert message
    const result = await db
      .insert(messages)
      .values({
        userId,
        conversationId,
        role,
        content,
        sources: sources || null,
      })
      .returning();

    // Touch conversation updated_at
    await db
      .update(conversations)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId));

    return result[0];
  } catch (error) {
    console.error("Error adding message:", error);
    throw new Error("Failed to post message");
  }
}

export async function deleteLastMessage(userId: string, conversationId: number) {
  try {
    // Confirm ownership first
    const conversation = await getConversationById(userId, conversationId);
    if (!conversation) {
      throw new Error("Conversation not found or access denied");
    }

    const list = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(1);

    if (list.length === 0) {
      return null;
    }

    const lastMsg = list[0];
    await db.delete(messages).where(eq(messages.id, lastMsg.id));
    return lastMsg;
  } catch (error) {
    console.error("Error deleting last message:", error);
    throw error;
  }
}

export async function getConversationContext(userId: string, conversationId: number) {
  // Confirm ownership
  const conversation = await getConversationById(userId, conversationId);
  if (!conversation) {
    throw new Error("Conversation not found or access denied");
  }

  const attachedDocs = await db
    .select({
      id: documents.id,
      originalName: documents.originalName,
      extension: documents.extension,
      size: documents.size,
      status: documents.status,
    })
    .from(conversationDocuments)
    .innerJoin(documents, eq(conversationDocuments.documentId, documents.id))
    .where(eq(conversationDocuments.conversationId, conversationId));

  const attachedNotes = await db
    .select({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      color: notes.color,
    })
    .from(conversationNotes)
    .innerJoin(notes, eq(conversationNotes.noteId, notes.id))
    .where(eq(conversationNotes.conversationId, conversationId));

  return {
    documents: attachedDocs,
    notes: attachedNotes,
  };
}

export async function attachDocumentToConversation(userId: string, conversationId: number, documentId: number) {
  // 1. Confirm conversation ownership
  const conversation = await getConversationById(userId, conversationId);
  if (!conversation) {
    throw new Error("Conversation not found or access denied");
  }

  // 2. Confirm document ownership
  const docList = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId), isNull(documents.deletedAt)))
    .limit(1);

  if (docList.length === 0) {
    throw new Error("Document not found or access denied");
  }

  // 3. Check if already attached
  const existing = await db
    .select()
    .from(conversationDocuments)
    .where(
      and(
        eq(conversationDocuments.conversationId, conversationId),
        eq(conversationDocuments.documentId, documentId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // 4. Attach
  const result = await db
    .insert(conversationDocuments)
    .values({
      conversationId,
      documentId,
    })
    .returning();

  return result[0];
}

export async function removeDocumentFromConversation(userId: string, conversationId: number, documentId: number) {
  // 1. Confirm conversation ownership
  const conversation = await getConversationById(userId, conversationId);
  if (!conversation) {
    throw new Error("Conversation not found or access denied");
  }

  // 2. Remove
  await db
    .delete(conversationDocuments)
    .where(
      and(
        eq(conversationDocuments.conversationId, conversationId),
        eq(conversationDocuments.documentId, documentId)
      )
    );

  return { success: true };
}

export async function attachNoteToConversation(userId: string, conversationId: number, noteId: number) {
  // 1. Confirm conversation ownership
  const conversation = await getConversationById(userId, conversationId);
  if (!conversation) {
    throw new Error("Conversation not found or access denied");
  }

  // 2. Confirm note ownership
  const noteList = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId), isNull(notes.deletedAt)))
    .limit(1);

  if (noteList.length === 0) {
    throw new Error("Note not found or access denied");
  }

  // 3. Check if already attached
  const existing = await db
    .select()
    .from(conversationNotes)
    .where(
      and(
        eq(conversationNotes.conversationId, conversationId),
        eq(conversationNotes.noteId, noteId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // 4. Attach
  const result = await db
    .insert(conversationNotes)
    .values({
      conversationId,
      noteId,
    })
    .returning();

  return result[0];
}

export async function removeNoteFromConversation(userId: string, conversationId: number, noteId: number) {
  // 1. Confirm conversation ownership
  const conversation = await getConversationById(userId, conversationId);
  if (!conversation) {
    throw new Error("Conversation not found or access denied");
  }

  // 2. Remove
  await db
    .delete(conversationNotes)
    .where(
      and(
        eq(conversationNotes.conversationId, conversationId),
        eq(conversationNotes.noteId, noteId)
      )
    );

  return { success: true };
}

