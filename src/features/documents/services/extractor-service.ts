import fs from "fs";
import path from "path";
import { createRequire } from "module";

// Safely obtain require for both ESM and CommonJS
const requireFn = (() => {
  if (typeof require !== "undefined") {
    return require;
  }
  try {
    return createRequire(import.meta.url);
  } catch (e) {
    return createRequire(`file://${process.cwd()}/index.js`);
  }
})();

const pdf = requireFn("pdf-parse");
const mammoth = requireFn("mammoth");
import { db } from "../../../db/index.ts";
import { documentContents, documents } from "../../../db/schema.ts";
import { eq } from "drizzle-orm";

/**
 * Extracts raw readable text from a stored document (PDF, DOCX, TXT, MD).
 * Implements strict security ownership checks, caching, and database status updates.
 */
export async function extractTextFromDocument(userId: string, documentId: number): Promise<string> {
  // 1. Fetch document and verify user authorization
  const docList = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (docList.length === 0) {
    throw new Error("Document not found");
  }

  const doc = docList[0];
  if (doc.userId !== userId) {
    throw new Error("Unauthorized document access");
  }

  // 2. Return cached content if available to avoid redundant reprocessing
  const cachedList = await db
    .select()
    .from(documentContents)
    .where(eq(documentContents.documentId, documentId))
    .limit(1);

  if (cachedList.length > 0 && doc.status === "processed") {
    return cachedList[0].extractedText;
  }

  // 3. Read raw file buffer from uploads path
  const uploadDir = path.join(process.cwd(), "uploads");
  const fullPath = path.join(uploadDir, doc.storagePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Physical document file not found: ${doc.originalName}`);
  }

  // Update document status to processing
  await db
    .update(documents)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(documents.id, documentId));

  const buffer = await fs.promises.readFile(fullPath);
  let extractedText = "";

  const ext = doc.extension.toLowerCase();

  try {
    if (ext === ".pdf") {
      const { PDFParse } = requireFn("pdf-parse");
      const uint8 = new Uint8Array(buffer);
      const parser = new PDFParse(uint8);
      const parsedPdf = await parser.getText();
      extractedText = parsedPdf.text || "";
    } else if (ext === ".docx") {
      const parsedDoc = await mammoth.extractRawText({ buffer });
      extractedText = parsedDoc.value || "";
    } else if (ext === ".txt" || ext === ".md") {
      extractedText = buffer.toString("utf-8");
    } else {
      throw new Error(`Unsupported document extension for text extraction: ${ext}`);
    }
  } catch (err: any) {
    console.error(`[Extractor] Text extraction failed for document ${documentId}:`, err);
    await db
      .update(documents)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(documents.id, documentId));
    throw new Error(`Failed to extract text from document: ${err.message || err}`);
  }

  // Clean trailing spaces and normalise carriage returns
  extractedText = extractedText.replace(/\r\n/g, "\n").trim();

  // 4. Persist extracted text in database cache
  const wordCount = extractedText.split(/\s+/).filter(Boolean).length;

  const existingCache = await db
    .select()
    .from(documentContents)
    .where(eq(documentContents.documentId, documentId))
    .limit(1);

  if (existingCache.length > 0) {
    await db
      .update(documentContents)
      .set({
        extractedText,
        wordCount,
        updatedAt: new Date(),
      })
      .where(eq(documentContents.documentId, documentId));
  } else {
    await db
      .insert(documentContents)
      .values({
        documentId,
        extractedText,
        wordCount,
      });
  }

  // Finalize processing status
  await db
    .update(documents)
    .set({ status: "processed", updatedAt: new Date() })
    .where(eq(documents.id, documentId));

  return extractedText;
}
