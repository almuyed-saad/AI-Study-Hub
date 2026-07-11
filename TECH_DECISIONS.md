# AI Study Hub — Technical Decisions & Architecture Documentation

This document logs critical high-level technical decisions, architectural patterns, and database considerations established during the engineering of the **Sprint 6 — Smart Notes System**.

---

## 🛡️ 1. Architecture Decisions

### Full-Stack Database & API Separation
- **Direct Database Service Isolation**: We created `/src/features/notes/services/note-service.ts` to cleanly decouple database querying/mutation (using Drizzle ORM) from Express routing. This follows a mature repository pattern.
- **RESTful State Transfer**: API routes (`/api/notes/*`) were mounted in `server.ts` protected by full-token authorization. Direct database querying from client components is strictly forbidden to preserve security and enforce credential boundaries.
- **Authorized Ownership Scoping**: Every database select, update, delete, and restore query is guarded with `eq(notes.userId, uid)`. This ensures user data multi-tenancy isolation—no student can ever read or mutate other users' notes.

---

## 📝 2. Editor Choice & Reasoning

### Custom Markdown-Based Interactive WYSIWYG Editor
For Sprint 6, we designed and built a highly robust, custom dual-pane markdown editing workspace rather than installing bloated, legacy Rich Text libraries (like Slate, Draft.js, or Quill).

**Why this decision was made:**
1. **React 19 Compatibility**: React 19 introduces strict typing boundaries. Bloated legacy editor packages depend on older React typing definitions, which often trigger severe compilation blocks, peer-dependency conflicts, or HMR rendering faults. A custom markdown editor compiled seamlessly.
2. **Standardized Text Portability**: Markdown provides a highly portable, platform-agnostic format. It is easy to search, index for future full-text indexing, store in PostgreSQL, or export as `.md` or `.pdf` files.
3. **Dual-Pane Split Preview Layout**: Tech students, researchers, and engineers love the side-by-side editing experience. The Split-Pane layout provides distraction-free real-time visualization of headings, lists, tables, code blocks, and math equations.
4. **Resilient Formatting Toolbar**: The toolbar automatically formats selections or inserts elements (Headers, Bullets, Code Blocks, Quotes, Tables, Formulas) directly at the textarea cursor position, maintaining maximum responsiveness and cross-device accessibility.

---

## 🗄️ 3. Database Changes & Optimization

### Drizzle Schema Refinements
- **`notes` Table**: Added to `/src/db/schema.ts` with explicit foreign key dependencies:
  - `userId` referencing `users.uid` with `onDelete: "cascade"`.
  - `subjectId` referencing `subjects.id` with `onDelete: "set null"` (enabling optional linking; deleting a subject does not destroy the student's study notes).
- **Soft Deletion (`deletedAt`)**: Integrated soft deletion support across notes. When deleting a note, the system updates `deletedAt = timestamp` instead of hard removing rows. This enables rapid recovery and prevents accidental loss of academic efforts.
- **Color Accentuation**: Supports personalized notebook background or indicator colorization.

---

## ⚡ 4. Auto-Save Performance & Resilience

### Double-Triggered Debounce Auto-Save
To ensure frictionless note capture, we engineered a stateful auto-saving model:
1. **Debounced Sync**: Typing in the editor triggers a `1200ms` debounce timer. When the user stops typing, changes are automatically pushed to the Express server using a silent `PUT` request.
2. **Visual States**: The editor showcases high-fidelity indicators:
   - `Saved`: All changes safely synchronized.
   - `Modifying...`: User is actively editing; modifications are cached locally.
   - `Saving...`: Sync request is currently active in the background.
   - `Offline / Error`: Graceful network error handling. Changes remain cached in memory, and the user can re-trigger sync manually.
3. **Duplicate Prevention**: If fields do not mutate, background network request triggers are avoided, minimizing unnecessary database I/O.
4. **Pre-emptive ID Allocation**: Clicking "Create Note" immediately invokes the database `INSERT` operation, returning a fully registered database ID. Subsequent edits are always executed as update mutations on this existing ID, preventing double-insertion race conditions.

---

## 📂 5. Sprint 7 — Document Management & Storage Architecture

We have established a robust, decoupled, and secure file repository that serves as the foundation for all subsequent AI features (textbook analyses, vector searches, flashcards generation, smart quiz setups).

### Storage Provider Abstraction (`StorageProvider`)
- **Loose Coupling**: Designed a generic `StorageProvider` interface (`src/features/documents/services/storage-provider.ts`) defining contract signatures for writing files, reading file paths/streams, checking storage capacity stats, and removing records.
- **LocalStorageProvider**: Handles local node filesystem streams directly in development environments. Writing code against this abstraction allows changing the storage driver to an enterprise cloud provider (like Google Cloud Storage or Amazon S3) by simply editing `.env` and registering a new class implementation, with zero changes to service controllers or endpoints.

### Robust Multi-Tenant Upload Security
- **Strict Size Limitations**: The server rejects file streams larger than 15MB via middleware size limits, safeguarding network resources.
- **Executable Filter Blocks**: Restricts potentially dangerous script extensions (`.exe`, `.sh`, `.js`, etc.) at both the client and server layers.
- **Filename Sanitization**: Sanitizes incoming filenames (removing spaces and special regex characters, prepending unique timestamps, appending standard extensions) before saving to disk, eliminating directory-traversal vulnerabilities.
- **Token-Protected Preview & Download Proxying**: Downloading or previewing a file does not expose direct URLs. Clients call proxy routes (`/api/documents/:id/preview?token=...`) that verify the Firebase authorization token on every single request, validating whether the requesting user owns the document record before streaming bytes.

---

## ⚠️ 6. Known Limitations

- **Transient Local Storage**: Currently, files are stored on the local container instance disk (under `/assets/uploads`). If a Cloud Run container is destroyed/recycled, uploaded file assets are lost. *Mitigation: Future production deployment should register a Google Cloud Storage provider.*
- **Inline Audio & Video Rendering**: We support PDF, Markdown, Plain Text, and main student textbook images (PNG, JPEG, WEBP). Media streaming (MP4, MP3) can be layered natively when required.

---

## 🚀 7. Recommendation for Sprint 8

- **Sprint 8 — AI-Powered Quiz, Chat & Flashcard Generator (Grounding)**:
  - Ground the server-side Gemini 2.5/3.5 models using the uploaded PDFs and text materials from the user's Document vault.
  - Parse text/PDF contents, index them, and let the AI Study Assistant answer precise questions about textbook chapters.
  - Generate full interactive Flashcard decks and personalized Multi-Choice Quizzes directly from linked study notes or course materials.

---

## 🤖 8. Sprint 9 — Document Intelligence & Multi-Source Context Retrieval

We designed and integrated a modular, high-fidelity, and secure semantic retrieval pipeline.

### Architectural Decisions

1. **Session-Persistent Context Attachments**:
   - To align with real-world user workflows, we integrated persistent join tables (`conversation_documents` and `conversation_notes`) in `src/db/schema.ts`.
   - Adding or removing documents/notes dynamically links them to the active conversation. This persists the context selection across page refreshes and session restarts without relying on transient frontend state.

2. **On-Demand Context Extraction & Chunking**:
   - Leveraging `AcademicRetriever` (`src/features/ai/services/retrieval-service.ts`), the backend extracts text on-demand from linked notes or documents.
   - Text is cleaned, tokenized, and chunked with logical overlap to ensure complete contextual semantic units.

3. **TF-IDF & Keyword Relevance Filtering (Dynamic Context Window)**:
   - To fit within model system instructions cleanly without overflowing context length or introducing noise ("lost in the middle"), the retriever analyzes the student's latest query.
   - It ranks chunks using keyword weightings (TF-IDF similarity) and returns only the top most relevant context chunks.

4. **Multi-Tenant Ownership Verification Security**:
   - We enforce ownership verification at every tier: the REST endpoints, the database query layer, and inside the retrieval worker itself.
   - When fetching note contents or reading document files, the system strictly matches the authenticated `userId` against the resource's `user_id` column. Under no circumstances can a user retrieve chunks or attach resources owned by another student.
