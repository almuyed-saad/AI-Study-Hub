# AI Study Hub

An advanced, production-ready full-stack educational assistant workspace. AI Study Hub combines intelligent document management, real-time Markdown note-taking, socratic AI tools, and course coordination in a high-performance environment.

**🌐 Live Production Application:** [https://ai-study-hub-657315790983.asia-southeast1.run.app/](https://ai-study-hub-657315790983.asia-southeast1.run.app/)

---

## 🏛️ System Architecture

The platform is engineered on a secure, containerized full-stack architecture that isolates sensitive logic on the server while delivering an instant, responsive SPA experience on the client.

```
       [ Client Browser ]
               │
        HTTPS (Port 443)
               │
               ▼
      [ Cloud Run Container ]
  ┌─────────────────────────┐
  │   Nginx Ingress Proxy   │
  └────────────┬────────────┘
               │ (Port 3000)
               ▼
      [ Node.js Server ] (Express.js)
        ├── Multer (Upload Stream Processor)
        ├── Firebase Admin (ID Token Auth Verification)
        └── Google GenAI SDK (Gemini AI Socratic Core)
               │
         Drizzle ORM
               │
               ▼
    [ Cloud SQL PostgreSQL ] (asia-southeast1)
```

### Core Technologies
*   **Frontend**: React 19, Vite 6, Tailwind CSS v4, Lucide React, Framer Motion (touch-optimized physics animations).
*   **Backend**: Node.js custom Express server, compiled to a single, optimized CommonJS file (`dist/server.cjs`) using `esbuild` to ensure fast container boot times and eliminate relative import resolution overhead in production.
*   **Database**: Managed Cloud SQL (PostgreSQL Engine), configured with `pg` connection pools.
*   **ORM**: Drizzle ORM (v0.45) providing strict, type-safe queries and schema migrations.
*   **Authentication**: Firebase Authentication with client-side Google Identity login flows and stateful server-side ID Token verification middleware.
*   **Offline Capability**: Progressive Web App (PWA) architecture with a configured Service Worker (`sw.js`) and localized fallback page (`offline.html`).

---

## 🌟 Key Capabilities & Features

### 1. Context-Aware Socratic AI Assistant (RAG Pipeline)
*   **Multi-Source Context Injection**: Students can attach course documents (PDFs, textbooks, images) and active study notes directly to Socratic AI chat sessions.
*   **Retrieval-Augmented Generation (RAG)**: The custom `AcademicRetriever` uses keyword similarity and TF-IDF heuristics to extract relevant context paragraphs on-demand, injecting them into the system prompts of the Gemini model.
*   **Streamed & Synchronous Responses**: Supports both standard JSON responses and chunk-by-chunk HTTP streaming via server-sent events for responsive conversational feedback.
*   **Socratic Safeguards**: The assistant is system-instructed to guide students through concepts with questions, encouraging deep critical thinking rather than giving direct solutions.

### 2. Document Intelligence & File Storage
*   **Authorized Streaming Proxy**: Fully authenticated backend routes stream files securely from disk storage to client preview components, preventing direct access to physical storage paths.
*   **Bento-Style File Manager**: Supports double-density grid or list directory layouts, dynamic Lucide file-type styling, and responsive sorting.
*   **Multiple File Upload Queue**: Fully functional drag-and-drop drop-zone with file size limit validation (up to 15MB) and dangerous extension blocks. Provides real-time percentage indicators, plus instant cancel/retry operations.
*   **Inline File Previews**: Highly responsive modal overlays support seamless, secure rendering of PDF documents, markdown files, plain text files, and course images without external plugins.

### 3. Smart Academic Notes Workspace
*   **Markdown WYSIWYG Layout**: Split-pane live rendering, edit-only mode, and preview-only modes with custom AST rendering classes styled dynamically via Tailwind CSS.
*   **Stateful Auto-Save Engine**: Features a background auto-save loop triggered by a debounced (`1200ms`) listener on note modifications, complete with precise visual status badges (`Saved`, `Saving...`, `Offline`).
*   **Socratic Summary Takeaways**: Integrates a server-side Gemini prompt that distills long, dense lecture notes into bulleted core takeaways that are saved directly to the note’s schema.

### 4. Course & Subject Coordinator
*   **Academic Ledger**: Track semesters, course credits, and instructors on custom-colored, micro-animated cards.
*   **Soft-Deletion Lifecycles**: Standardizes archiving states via a nullable `deleted_at` timestamp. Archived subjects are hidden by default, but can be fully inspected and restored in a safe rollback layout.
*   **Cross-linking**: Course notes and textbooks can be linked directly to specific subjects to organize materials.

---

## 📂 Project Structure

AI Study Hub employs a modular **feature-first** directory structure, grouping database definitions, API routes, and user interfaces inside cohesive functional domains:

```
/
├── server.ts                       # Express backend server (entry point)
├── package.json                    # Bundler scripts and npm dependencies
├── vite.config.ts                  # Vite compilation and proxy mapping config
├── tsconfig.json                   # Strict TypeScript compiler rules
├── .env.example                    # Template for required environment variables
├── src/
│   ├── main.tsx                    # React application mount script
│   ├── App.tsx                     # Core application shell & navigation router
│   ├── index.css                   # Global styles, Tailwind directives, and custom themes
│   ├── db/                         # Database layer
│   │   ├── index.ts                # PostgreSQL connection pool & Drizzle Client
│   │   ├── schema.ts               # Drizzle schemas defining all SQL tables
│   │   └── drizzle.config.ts       # Database migrations and administrator options
│   ├── features/                   # Self-contained domain modules
│   │   ├── auth/                   # Identity sync, contexts, and Firebase hooks
│   │   ├── dashboard/              # Welcome carousels, quick modals, and charts
│   │   ├── subjects/               # Course cataloging & credit ledgers
│   │   ├── notes/                  # Dual-pane Markdown editors & auto-save routines
│   │   ├── documents/              # File uploads, inline previews, and proxy routes
│   │   └── ai/                     # Socratic chat panels, RAG retrievers, & prompt engines
│   ├── components/                 # Global shared visual blocks
│   │   ├── ui/                     # Isolated design-system elements (Buttons, Dialogs, Toasts)
│   │   └── Boundary/               # Error Boundaries and PWA alerts
│   ├── services/                   # Global third-party helper integrations
│   ├── hooks/                      # Custom React hooks (theme trackers, window sizes)
│   └── utils/                      # Class mergers and string utility formatters
```

---

## 🚀 Getting Started

### 1. Prerequisites
*   Node.js (v18 or higher)
*   A running PostgreSQL instance
*   A Firebase Project with Authentication enabled
*   A Google Gemini API Key

### 2. Environment Variables
Create a local `.env` file at the root of the project using the variables defined in `.env.example`:

```env
# Database Credentials
SQL_HOST=your-postgres-host
SQL_USER=your-database-user
SQL_PASSWORD=your-database-password
SQL_DB_NAME=your-database-name

# Google Gemini Core
GEMINI_API_KEY=your-gemini-api-secret

# Firebase Configuration
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
VITE_FIREBASE_FIRESTORE_DATABASE_ID=your-optional-firestore-db-id
VITE_FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-firebase-sender-id
```

### 3. Local Installation & Development
Install dependencies and spin up the unified full-stack dev server:

```bash
# Install dependencies
npm install

# Run the dev server (Vite + Express concurrently)
npm run dev
```
The server will boot, binding to host `0.0.0.0` on port `3000`. Access the app locally at `http://localhost:3000`.

### 4. Compiling and Bundling for Production
The application compiles frontend assets with Vite and bundles the Node server with `esbuild`:

```bash
# Compile and build both client-side static bundles and server-side CommonJS file
npm run build

# Start the compiled production build
npm run start
```

---

## 🔒 Security & Authorization

1.  **Multi-Tenant Database Scoping**: Every SQL table includes a `user_id` foreign key referencing the Firebase ID UID. All SELECT, UPDATE, and DELETE operations execute with a strict parameter matching the user claim.
2.  **Stateless JWT Verification Middleware**: All request routes nested under `/api/*` pass through a centralized Express authorization middleware that extracts the bearer Authorization ID Token, verifies its signature against public Firebase JWKs, and populates `req.user` with validated student profile metadata.
3.  **Sanitized Stream Pipelines**: File downloads proxy raw storage paths to client requests using standard stream chunks, preventing physical disk paths from being exposed directly to browser inspect networks.
