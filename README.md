# AI Study Hub - Project Constitution & Architecture Manual (Sprint 1)

Welcome to the development guide for **AI Study Hub**. This document outlines the project's technical architecture, folder organization, coding standards, and deployment configurations established in Sprint 1.

---

## 🏛️ System Architecture

AI Study Hub is built on a high-performance **full-stack Express + React** architecture configured with **Vite** and strict **TypeScript**. 

1. **Frontend**: React (v19) with Vite (v6), leveraging Tailwind CSS (v4) for style, Lucide React for consistent vector iconography, and Framer Motion for premium, touch-optimized visual feedback.
2. **Backend**: Express-based Node.js custom server (compiled cleanly to CJS CommonJS via `esbuild` inside `dist/`) to proxy requests securely and prevent exposing credentials (such as database credentials or the Google Gemini API key) to the client.
3. **Database**: Managed Google Cloud SQL (PostgreSQL Engine in region `asia-southeast1`). Connections are managed using the safe **Object Method Connection Pool** inside `pg`.
4. **ORM**: **Drizzle ORM** (v0.45) serves as the schema definition, migrations manager, and type-safe query engine. Drizzle Kit handles table structures using the database's administrator account, while the application uses an isolated read/write runtime pool.
5. **Authentication**: **Firebase Authentication** integrates with Google Identity via Popup flows. ID Tokens are verified in the backend middleware statically and synchronized with the PostgreSQL database.

---

## 📁 Scalable Directory Tree

The workspace is organized using a **feature-first** structure. Rather than dumping all files into generic folders, domain modules are self-contained so the app remains clean as it scales.

```bash
/
├── server.ts                       # Express backend application entry point
├── package.json                    # Dependencies, scripts, and build tasks
├── firebase-applet-config.json     # Provisioned Firebase Auth settings (Git Ignored)
├── vite.config.ts                  # Vite engine asset resolver and HMR controller
├── tsconfig.json                   # Strict compiler configuration (strict: true)
├── .env.example                    # Template documenting required environment variables
├── src/
│   ├── main.tsx                    # React client mounting entry point
│   ├── App.tsx                     # Global App layout & interactive foundation console
│   ├── index.css                   # Global styles, Tailwind imports, custom font variables
│   ├── db/                         # Database schema & connection initialization
│   │   ├── index.ts                # Connection pool and Drizzle client
│   │   ├── schema.ts               # Core database tables (baseline 'users')
│   │   └── drizzle.config.ts       # Migration parameters utilizing admin credentials
│   ├── features/                   # Feature-specific modules (Modular Architecture)
│   │   └── auth/                   # Authentication Feature Module
│   │       ├── services/           # DB synchronization helper routines
│   │       └── hooks/              # Auth provider, contexts, and login managers
│   ├── components/                 # Global UI widgets and shared layouts
│   │   ├── ui/                     # Isolated design-system components
│   │   │   ├── Button.tsx          # Dynamic, micro-animated button
│   │   │   ├── Card.tsx            # Bento-ready structural borders
│   │   │   ├── Input.tsx           # Accessible text input with helper tags
│   │   │   ├── Dialog.tsx          # Focus-trapped, animated modal wrapper
│   │   │   └── Toast.tsx           # Float-stacked auto-dismiss alerts
│   │   └── shared/                 # Shell modules, navbar, sidebar (placeholder)
│   ├── services/                   # Global third-party helper integrations
│   │   └── ai.ts                   # Google Gemini API wrapper (Model: gemini-2.5-flash)
│   ├── hooks/                      # Global React custom hooks
│   │   └── use-theme.tsx           # Persistent light/dark/system mode controller
│   ├── utils/                      # Shared utility algorithms
│   │   └── cn.ts                   # Class name merger helper
│   └── types/                      # Common typescript type declarations
│       └── index.ts                # Global type boundaries
```

---

## 🏷️ Coding Standards & Naming Conventions

### File Naming
- **React Components**: PascalCase (e.g., `Button.tsx`, `Dialog.tsx`).
- **Hooks**: kebab-case prefixed with `use-` (e.g., `use-auth.tsx`, `use-theme.tsx`).
- **Services/Utilities/Routes**: kebab-case (e.g., `user-sync.ts`, `ai.ts`).

### TypeScript Requirements
- Always enable `strict` compiler settings. Avoid `any` types; prefer explicit structural interfaces.
- Imports must place imports first, then external modules, and then relative project files.
- Relative ES Module imports within backend database modules must specify full file extensions (e.g., `import { db } from "./src/db/index.ts"`).

### Styling Rules
- Adhere strictly to mobile-first responsive design. Desktop-first (max-width) CSS overrides are not allowed.
- Use Semantic HTML tags (`<header>`, `<main>`, `<footer>`, `<section>`, `<article>`).
- Interactive element touch-targets must be at least `44px` on mobile screens.
- Implement robust focus indicator rings for keyboard-only users using `focus-visible`.

---

## 🔒 Security Guidelines

1. **Authentication Boundary**: All `/api/*` routes that access database resources or AI services must be protected by the `requireAuth` middleware.
2. **Strict Client Isolation**: API secrets (e.g., `GEMINI_API_KEY`, database passwords) must never be imported into files accessed by Vite (files outside the server scope). Vite variables require the prefix `VITE_`.
3. **Lazy SDK Initialization**: SDKs that require keys must be loaded lazily to prevent crashing the dev container on startup when keys are absent.
4. **Input Validation**: Use **Zod** schema parses on all Express route request payloads (`req.body`, `req.query`) before performing active database or AI operations.
