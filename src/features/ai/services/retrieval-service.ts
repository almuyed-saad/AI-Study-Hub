import { db } from "../../../db/index.ts";
import { documents, notes } from "../../../db/schema.ts";
import { eq, and, inArray, isNull } from "drizzle-orm";
import { extractTextFromDocument } from "../../documents/services/extractor-service.ts";

export interface KnowledgeSource {
  id: number;
  type: "document" | "note";
  title: string;
}

export interface RetrievalChunk {
  source: KnowledgeSource;
  content: string;
  score: number; // Relevance score (higher is more relevant)
}

export interface RetrievalOptions {
  maxWordsBudget?: number; // Total word budget for retrieved context
  chunkSizeWords?: number; // Word count per chunk for document splitting
}

/**
 * Base retriever interface defining the contract for content retrieval.
 * Allows future semantic search or vector databases to be integrated cleanly.
 */
export interface IRetriever {
  retrieve(
    userId: string,
    query: string,
    context: { documentIds: number[]; noteIds: number[] },
    options?: RetrievalOptions
  ): Promise<RetrievalChunk[]>;
}

export class AcademicRetriever implements IRetriever {
  /**
   * Retrieves relevant context chunks from the selected documents and notes.
   */
  async retrieve(
    userId: string,
    query: string,
    context: { documentIds: number[]; noteIds: number[] },
    options: RetrievalOptions = {}
  ): Promise<RetrievalChunk[]> {
    const { documentIds = [], noteIds = [] } = context;
    const maxWordsBudget = options.maxWordsBudget || 4000;
    const chunkSizeWords = options.chunkSizeWords || 350;

    const allChunks: RetrievalChunk[] = [];

    // --- 1. PROCESS AND RETRIEVE NOTES ---
    if (noteIds.length > 0) {
      try {
        const fetchedNotes = await db
          .select()
          .from(notes)
          .where(
            and(
              eq(notes.userId, userId),
              inArray(notes.id, noteIds),
              isNull(notes.deletedAt)
            )
          );

        for (const note of fetchedNotes) {
          if (!note.content || !note.content.trim()) continue;

          const source: KnowledgeSource = {
            id: note.id,
            type: "note",
            title: note.title,
          };

          // Notes are typically smaller, but if they exceed a threshold, we chunk them too.
          const noteWords = note.content.split(/\s+/);
          if (noteWords.length <= chunkSizeWords * 1.5) {
            allChunks.push({
              source,
              content: note.content.trim(),
              score: this.calculateRelevanceScore(note.content, query),
            });
          } else {
            // Chunk long note
            const noteChunks = this.splitTextIntoChunks(note.content, chunkSizeWords);
            for (const textChunk of noteChunks) {
              allChunks.push({
                source,
                content: textChunk,
                score: this.calculateRelevanceScore(textChunk, query),
              });
            }
          }
        }
      } catch (err) {
        console.error("[Retriever] Error retrieving notes:", err);
      }
    }

    // --- 2. PROCESS AND RETRIEVE DOCUMENTS ---
    if (documentIds.length > 0) {
      try {
        const fetchedDocs = await db
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.userId, userId),
              inArray(documents.id, documentIds),
              isNull(documents.deletedAt)
            )
          );

        for (const doc of fetchedDocs) {
          let text = "";
          try {
            // Lazy load extraction on the fly if needed
            text = await extractTextFromDocument(userId, doc.id);
          } catch (extractorErr) {
            console.error(`[Retriever] Extraction failed for document ${doc.id}:`, extractorErr);
            continue;
          }

          if (!text || !text.trim()) continue;

          const source: KnowledgeSource = {
            id: doc.id,
            type: "document",
            title: doc.originalName,
          };

          // Split document text into overlapping chunks
          const docChunks = this.splitTextIntoChunks(text, chunkSizeWords);
          for (const textChunk of docChunks) {
            allChunks.push({
              source,
              content: textChunk,
              score: this.calculateRelevanceScore(textChunk, query),
            });
          }
        }
      } catch (err) {
        console.error("[Retriever] Error retrieving documents:", err);
      }
    }

    // --- 3. RELEVANCE RANKING AND BUDGET FILTERING ---
    // Sort descending by relevance score. If scores are equal, preserve order.
    const sortedChunks = allChunks.sort((a, b) => b.score - a.score);

    const budgetChunks: RetrievalChunk[] = [];
    let currentWords = 0;

    for (const chunk of sortedChunks) {
      const chunkWords = chunk.content.split(/\s+/).length;
      // Always include at least the single highest scored chunk if any exist, even if it exceeds budget
      if (budgetChunks.length === 0 || currentWords + chunkWords <= maxWordsBudget) {
        budgetChunks.push(chunk);
        currentWords += chunkWords;
      } else {
        // If we have some content and are about to exceed budget, stop
        break;
      }
    }

    return budgetChunks;
  }

  /**
   * Splits a block of text into chunks of roughly N words, with a small overlap to preserve context across boundaries.
   */
  private splitTextIntoChunks(text: string, chunkSize: number): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const chunks: string[] = [];
    const overlap = Math.floor(chunkSize * 0.15); // 15% overlap

    let i = 0;
    while (i < words.length) {
      const chunkWords = words.slice(i, i + chunkSize);
      if (chunkWords.length > 0) {
        chunks.push(chunkWords.join(" "));
      }
      i += chunkSize - overlap;
      if (i >= words.length || chunkWords.length < chunkSize) {
        break;
      }
    }

    return chunks;
  }

  /**
   * Simple TF-IDF inspired score that checks frequency and matches of query terms.
   * Gives higher weight to exact phrase matches and multi-term matches.
   */
  private calculateRelevanceScore(text: string, query: string): number {
    if (!query || !query.trim()) return 1.0; // Flat score for empty query

    const cleanText = text.toLowerCase();
    const cleanQuery = query.toLowerCase().trim();

    let score = 0;

    // Exact phrase match gives a massive boost
    if (cleanText.includes(cleanQuery)) {
      score += 100;
    }

    // Individual keyword matches
    const keywords = cleanQuery.split(/\s+/).filter((kw) => kw.length > 2);
    let matchedKeywords = 0;

    for (const kw of keywords) {
      const occurrences = cleanText.split(kw).length - 1;
      if (occurrences > 0) {
        score += occurrences * 5; // frequency weight
        matchedKeywords++;
      }
    }

    // Boost chunks that match multiple search terms
    if (keywords.length > 1 && matchedKeywords > 0) {
      score += (matchedKeywords / keywords.length) * 50;
    }

    return score;
  }
}

export const activeRetriever: IRetriever = new AcademicRetriever();
