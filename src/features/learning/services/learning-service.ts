import { db } from "../../../db/index.ts";
import {
  flashcardDecks,
  flashcards,
  quizzes,
  quizQuestions,
  notes,
  documents,
  messages,
  quizAttempts,
  flashcardProgress,
} from "../../../db/schema.ts";
import { eq, and, inArray, isNull, desc } from "drizzle-orm";
import { getAIClient } from "../../../services/ai.ts";
import { extractTextFromDocument } from "../../documents/services/extractor-service.ts";
import { Type } from "@google/genai";

export interface GenerateFlashcardsOptions {
  noteIds?: number[];
  documentIds?: number[];
  conversationId?: number[];
  subjectId?: number;
  messageId?: number;
}

export interface GenerateQuizOptions {
  noteIds?: number[];
  documentIds?: number[];
  conversationId?: number[];
  subjectId?: number;
  numQuestions: number;
}

/**
 * Gathers content from selected notes, documents, and conversation messages
 */
async function gatherContextContent(
  userId: string,
  params: {
    noteIds?: number[];
    documentIds?: number[];
    conversationId?: number;
    messageId?: number;
  }
): Promise<{ content: string; firstNoteId: number | null; firstDocId: number | null }> {
  let combinedText = "";
  let firstNoteId: number | null = null;
  let firstDocId: number | null = null;

  // 1. Process selected notes
  if (params.noteIds && params.noteIds.length > 0) {
    const fetchedNotes = await db
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.userId, userId),
          inArray(notes.id, params.noteIds),
          isNull(notes.deletedAt)
        )
      );

    for (const note of fetchedNotes) {
      if (!firstNoteId) firstNoteId = note.id;
      if (note.content && note.content.trim()) {
        combinedText += `\n\n--- STUDY NOTE: ${note.title} ---\n${note.content}`;
      }
    }
  }

  // 2. Process selected documents
  if (params.documentIds && params.documentIds.length > 0) {
    const fetchedDocs = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.userId, userId),
          inArray(documents.id, params.documentIds),
          isNull(documents.deletedAt)
        )
      );

    for (const doc of fetchedDocs) {
      if (!firstDocId) firstDocId = doc.id;
      try {
        const text = await extractTextFromDocument(userId, doc.id);
        if (text && text.trim()) {
          combinedText += `\n\n--- DOCUMENT: ${doc.originalName} ---\n${text}`;
        }
      } catch (err) {
        console.error(`[LearningService] Failed to extract document ${doc.id} content:`, err);
      }
    }
  }

  // 3. Process selected conversation context
  if (params.conversationId) {
    const fetchedMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, params.conversationId))
      .orderBy(messages.createdAt);

    if (fetchedMessages.length > 0) {
      combinedText += `\n\n--- CONVERSATION CHAT CONTEXT ---`;
      for (const msg of fetchedMessages) {
        combinedText += `\n${msg.role === "user" ? "Student" : "AI Assistant"}: ${msg.content}`;
      }
    }
  }

  // 4. Process specific message content (Export to Flashcards feature)
  if (params.messageId) {
    const [fetchedMsg] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, params.messageId));
    if (fetchedMsg) {
      combinedText += `\n\n--- AI CHAT MESSAGE ---\n${fetchedMsg.content}`;
    }
  }

  return {
    content: combinedText.trim(),
    firstNoteId,
    firstDocId,
  };
}

/**
 * Generates flashcards using Gemini structured JSON generation and saves to DB.
 */
export async function generateFlashcards(
  userId: string,
  options: GenerateFlashcardsOptions
) {
  const { noteIds = [], documentIds = [], conversationId, subjectId, messageId } = options;

  const { content, firstNoteId, firstDocId } = await gatherContextContent(userId, {
    noteIds,
    documentIds,
    conversationId: conversationId ? conversationId[0] : undefined,
    messageId,
  });

  if (!content) {
    throw new Error("No study materials or text content could be extracted from your selection.");
  }

  // Set up the structured response schema
  const flashcardResponseSchema = {
    type: Type.OBJECT,
    properties: {
      deckTitle: { type: Type.STRING },
      deckDescription: { type: Type.STRING },
      flashcards: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            answer: { type: Type.STRING },
          },
          required: ["question", "answer"],
        },
      },
    },
    required: ["deckTitle", "deckDescription", "flashcards"],
  };

  const prompt = `You are an expert tutor creating study materials. Analyze the following provided context content and generate a comprehensive set of flashcards (Question/Answer pairs).
The study cards should focus on key terminology, definitions, concepts, and relationships mentioned in the text.
The deck title and description should be engaging and accurately summarize the material.

CONTEXT:
${content}

Provide the response in the specified JSON format. Ensure all questions and answers are clear and highly educational.`;

  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: flashcardResponseSchema,
    },
  });

  if (!response.text) {
    throw new Error("Gemini did not return any generated content.");
  }

  const parsed = JSON.parse(response.text);

  // Use a transaction or sequential query to persist the results
  const [deck] = await db
    .insert(flashcardDecks)
    .values({
      userId,
      subjectId: subjectId || null,
      noteId: firstNoteId,
      documentId: firstDocId,
      title: parsed.deckTitle || "AI Generated Study Cards",
      description: parsed.deckDescription || "Generated from study resources.",
    })
    .returning();

  const cardsToInsert = parsed.flashcards.map((card: any) => ({
    deckId: deck.id,
    question: card.question,
    answer: card.answer,
  }));

  if (cardsToInsert.length > 0) {
    await db.insert(flashcards).values(cardsToInsert);
  }

  return {
    success: true,
    deck,
    flashcardsCount: cardsToInsert.length,
  };
}

/**
 * Generates quiz questions using Gemini structured JSON generation and saves to DB.
 */
export async function generateQuiz(userId: string, options: GenerateQuizOptions) {
  const { noteIds = [], documentIds = [], conversationId, subjectId, numQuestions } = options;

  const { content, firstNoteId, firstDocId } = await gatherContextContent(userId, {
    noteIds,
    documentIds,
    conversationId: conversationId ? conversationId[0] : undefined,
  });

  if (!content) {
    throw new Error("No study materials or text content could be extracted from your selection.");
  }

  // Set up the structured response schema
  const quizResponseSchema = {
    type: Type.OBJECT,
    properties: {
      quizTitle: { type: Type.STRING },
      quizDescription: { type: Type.STRING },
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, description: "Must be exactly: 'mcq' or 'true_false' or 'short_answer'" },
            question: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of exactly 4 choices (strings) if type is 'mcq', otherwise null or an empty array.",
            },
            correctAnswer: { type: Type.STRING, description: "The correct option text for 'mcq', exactly 'True' or 'False' for 'true_false', or a concise correct guide for 'short_answer'." },
            explanation: { type: Type.STRING, description: "A detailed explanation of why the answer is correct." },
          },
          required: ["type", "question", "correctAnswer", "explanation"],
        },
      },
    },
    required: ["quizTitle", "quizDescription", "questions"],
  };

  const prompt = `You are an expert educator. Create a comprehensive, challenging quiz containing exactly ${numQuestions} questions of various types ('mcq', 'true_false', 'short_answer') based on the following context.
Aim for a balanced mix of these types where possible, unless the content structure favors certain types.

CONTEXT:
${content}

Ensure your response conforms strictly to the schema definition.
- MCQ options must have exactly 4 choices.
- True/False correctAnswer must be exactly 'True' or 'False'.
- Explanation should be pedagogical and clear.`;

  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: quizResponseSchema,
    },
  });

  if (!response.text) {
    throw new Error("Gemini did not return any generated content.");
  }

  const parsed = JSON.parse(response.text);

  // Insert quiz
  const [quiz] = await db
    .insert(quizzes)
    .values({
      userId,
      subjectId: subjectId || null,
      noteId: firstNoteId,
      documentId: firstDocId,
      title: parsed.quizTitle || "AI Generated Quiz",
      description: parsed.quizDescription || "Generated from study resources.",
    })
    .returning();

  // Extract questions list safely
  let questionsList = parsed.questions;
  if (!Array.isArray(questionsList)) {
    if (Array.isArray(parsed.quizQuestions)) {
      questionsList = parsed.quizQuestions;
    } else if (Array.isArray(parsed.quiz)) {
      questionsList = parsed.quiz;
    } else {
      questionsList = [];
    }
  }

  // Insert questions
  const questionsToInsert = questionsList.map((q: any) => {
    let type = "mcq";
    if (q.type === "true_false" || q.type === "True/False" || q.type === "true-false") {
      type = "true_false";
    } else if (q.type === "short_answer" || q.type === "short-answer" || q.type === "Short Answer") {
      type = "short_answer";
    }

    return {
      quizId: quiz.id,
      type,
      question: q.question || "Formative Review Question",
      options: q.options ? JSON.stringify(Array.isArray(q.options) ? q.options : [q.options]) : null,
      correctAnswer: q.correctAnswer !== undefined && q.correctAnswer !== null ? String(q.correctAnswer) : "True",
      explanation: q.explanation || "Review study materials for detailed contexts.",
    };
  });

  if (questionsToInsert.length > 0) {
    await db.insert(quizQuestions).values(questionsToInsert);
  }

  return {
    success: true,
    quiz,
    questionsCount: questionsToInsert.length,
  };
}

/**
 * Fetch all flashcard decks for a user (not soft deleted)
 */
export async function getFlashcardDecks(userId: string) {
  return await db
    .select()
    .from(flashcardDecks)
    .where(and(eq(flashcardDecks.userId, userId), isNull(flashcardDecks.deletedAt)))
    .orderBy(desc(flashcardDecks.createdAt));
}

/**
 * Fetch deck details along with its individual cards
 */
export async function getFlashcardDeckWithCards(userId: string, deckId: number) {
  const deckList = await db
    .select()
    .from(flashcardDecks)
    .where(and(eq(flashcardDecks.id, deckId), eq(flashcardDecks.userId, userId)))
    .limit(1);

  if (deckList.length === 0) {
    return null;
  }

  const deck = deckList[0];
  const cards = await db
    .select()
    .from(flashcards)
    .where(eq(flashcards.deckId, deckId))
    .orderBy(flashcards.id);

  return {
    deck,
    flashcards: cards,
  };
}

/**
 * Soft delete a flashcard deck
 */
export async function deleteFlashcardDeck(userId: string, deckId: number) {
  const [deck] = await db
    .update(flashcardDecks)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(flashcardDecks.id, deckId), eq(flashcardDecks.userId, userId)))
    .returning();
  return deck;
}

/**
 * Fetch all quizzes for a user (not soft deleted)
 */
export async function getQuizzes(userId: string) {
  return await db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.userId, userId), isNull(quizzes.deletedAt)))
    .orderBy(desc(quizzes.createdAt));
}

/**
 * Fetch quiz details along with its individual questions
 */
export async function getQuizWithQuestions(userId: string, quizId: number) {
  const quizList = await db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.id, quizId), eq(quizzes.userId, userId)))
    .limit(1);

  if (quizList.length === 0) {
    return null;
  }

  const quiz = quizList[0];
  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(quizQuestions.id);

  // Parse options JSON strings back to arrays safely
  const parsedQuestions = questions.map((q) => {
    let parsedOptions: any = null;
    if (q.options) {
      try {
        parsedOptions = typeof q.options === "string" ? JSON.parse(q.options) : q.options;
        if (typeof parsedOptions === "string") {
          parsedOptions = JSON.parse(parsedOptions);
        }
      } catch (e) {
        console.error("Error parsing question options:", e);
        parsedOptions = null;
      }
    }
    return {
      ...q,
      options: Array.isArray(parsedOptions) ? parsedOptions : null,
    };
  });

  return {
    quiz,
    questions: parsedQuestions,
  };
}

/**
 * Soft delete a quiz
 */
export async function deleteQuiz(userId: string, quizId: number) {
  const [quiz] = await db
    .update(quizzes)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(quizzes.id, quizId), eq(quizzes.userId, userId)))
    .returning();
  return quiz;
}

/**
 * Save progress / difficulty rating of a flashcard
 */
export async function saveFlashcardProgress(userId: string, cardId: number, rating: string) {
  // Verify user owns the card's deck
  const cardResult = await db
    .select({ deckId: flashcards.deckId })
    .from(flashcards)
    .where(eq(flashcards.id, cardId))
    .limit(1);

  if (cardResult.length === 0) {
    throw new Error("Flashcard not found.");
  }

  const deckId = cardResult[0].deckId;
  const deckList = await db
    .select()
    .from(flashcardDecks)
    .where(and(eq(flashcardDecks.id, deckId), eq(flashcardDecks.userId, userId)))
    .limit(1);

  if (deckList.length === 0) {
    throw new Error("Access denied to this flashcard.");
  }

  // Check if progress already exists
  const existing = await db
    .select()
    .from(flashcardProgress)
    .where(and(eq(flashcardProgress.userId, userId), eq(flashcardProgress.cardId, cardId)))
    .limit(1);

  if (existing.length > 0) {
    return await db
      .update(flashcardProgress)
      .set({ rating, updatedAt: new Date() })
      .where(eq(flashcardProgress.id, existing[0].id))
      .returning();
  } else {
    return await db
      .insert(flashcardProgress)
      .values({
        userId,
        cardId,
        rating,
      })
      .returning();
  }
}

/**
 * Get progress ratings for all flashcards in a deck
 */
export async function getFlashcardProgressForDeck(userId: string, deckId: number) {
  // Confirm user has access to the deck
  const deckList = await db
    .select()
    .from(flashcardDecks)
    .where(and(eq(flashcardDecks.id, deckId), eq(flashcardDecks.userId, userId)))
    .limit(1);

  if (deckList.length === 0) {
    throw new Error("Access denied.");
  }

  // Select card progress ratings
  const cards = await db
    .select({ id: flashcards.id })
    .from(flashcards)
    .where(eq(flashcards.deckId, deckId));

  if (cards.length === 0) {
    return [];
  }

  const cardIds = cards.map((c) => c.id);

  return await db
    .select()
    .from(flashcardProgress)
    .where(and(eq(flashcardProgress.userId, userId), inArray(flashcardProgress.cardId, cardIds)));
}

/**
 * Save a complete quiz attempt
 */
export async function saveQuizAttempt(
  userId: string,
  quizId: number,
  attemptData: {
    score: number;
    totalQuestions: number;
    accuracy: number;
    completionTime: number; // in seconds
    answers: any[]; // will be stringified
  }
) {
  // Verify quiz exists and belongs to user
  const quizList = await db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.id, quizId), eq(quizzes.userId, userId)))
    .limit(1);

  if (quizList.length === 0) {
    throw new Error("Quiz not found or access denied.");
  }

  const [attempt] = await db
    .insert(quizAttempts)
    .values({
      userId,
      quizId,
      score: attemptData.score,
      totalQuestions: attemptData.totalQuestions,
      accuracy: attemptData.accuracy,
      completionTime: attemptData.completionTime,
      answers: JSON.stringify(attemptData.answers),
    })
    .returning();

  return attempt;
}

/**
 * Get past quiz attempts for user and/or specific quiz
 */
export async function getQuizAttempts(userId: string, quizId?: number) {
  const conditions = [eq(quizAttempts.userId, userId)];
  if (quizId !== undefined) {
    conditions.push(eq(quizAttempts.quizId, quizId));
  }

  return await db
    .select()
    .from(quizAttempts)
    .where(and(...conditions))
    .orderBy(desc(quizAttempts.createdAt));
}

/**
 * Socratic AI Explanation of a quiz answer utilizing retrieved contextual chunks
 */
export async function explainQuizAnswer(userId: string, questionId: number, selectedAnswer: string) {
  // 1. Fetch the quiz question
  const qList = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.id, questionId))
    .limit(1);

  if (qList.length === 0) {
    throw new Error("Question not found.");
  }

  const question = qList[0];

  // 2. Fetch the quiz and verify ownership
  const qzList = await db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.id, question.quizId), eq(quizzes.userId, userId)))
    .limit(1);

  if (qzList.length === 0) {
    throw new Error("Quiz not found or access denied.");
  }

  const quiz = qzList[0];

  // 3. Assemble and search contexts if they exist
  let contextText = "";
  const noteIds = quiz.noteId ? [quiz.noteId] : [];
  const documentIds = quiz.documentId ? [quiz.documentId] : [];

  if (noteIds.length > 0 || documentIds.length > 0) {
    try {
      const { activeRetriever } = await import("../../ai/services/retrieval-service.ts");
      const chunks = await activeRetriever.retrieve(
        userId,
        question.question,
        { noteIds, documentIds },
        { maxWordsBudget: 1500 }
      );
      if (chunks && chunks.length > 0) {
        contextText = chunks
          .map((c) => `[Source: ${c.source.title} (${c.source.type})]\n${c.content}`)
          .join("\n\n");
      }
    } catch (retrievalError) {
      console.error("[LearningService] Retrieval context lookup failed:", retrievalError);
    }
  }

  // 4. Invoke Gemini with question details, user choice, correct answer, and retrieved contexts
  const prompt = `You are an expert socratic study assistant. Explain why the correct answer is correct and provide feedback on the student's answer.

QUESTION:
"${question.question}"

QUESTION TYPE:
"${question.type}"

OPTIONS (Choices):
${question.options ? question.options : "N/A (Short Answer or True/False)"}

CORRECT ANSWER (OR GUIDELINE):
"${question.correctAnswer}"

STUDENT'S SELECTED ANSWER:
"${selectedAnswer || "(No answer selected)"}"

${contextText ? `--- RELEVANT STUDY SOURCE CONTEXT ---\n${contextText}\n--------------------------------------\n` : ""}

Task:
1. Explain in a clear, pedagogical, encouraging way why the correct answer is indeed correct.
2. Address the student's selected answer. If it's correct, praise and expand slightly on why. If it's incorrect, explain the key misunderstanding without being condescending, and contrast it with the correct path.
3. If study source context is provided above, cite or refer to specific points from the context to back up your explanations.
4. Keep the output clean, formatted with Markdown, and highly engaging.`;

  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
  });

  return {
    success: true,
    explanation: response.text || "AI was unable to formulate an explanation. Review the syllabus guidelines.",
  };
}

