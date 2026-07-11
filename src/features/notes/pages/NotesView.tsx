import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../auth/hooks/use-auth.tsx";
import { useToast } from "../../../components/ui/Toast.tsx";
import { Button } from "../../../components/ui/Button.tsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/Card.tsx";
import { Dialog } from "../../../components/ui/Dialog.tsx";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Search,
  Plus,
  Pin,
  Star,
  Archive,
  Trash2,
  BookOpen,
  Edit2,
  Folder,
  Tag,
  Grid,
  List,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  Eye,
  FileEdit,
  Sparkles,
  Bold,
  Italic,
  Underline,
  List as ListIcon,
  ListOrdered,
  Heading1,
  Heading2,
  Quote,
  Code,
  Table,
  Link,
  HelpCircle,
  HelpCircle as MathIcon,
  ChevronDown,
  X,
  RotateCcw
} from "lucide-react";

interface Note {
  id: number;
  subjectId: number | null;
  title: string;
  content: string;
  summary: string | null;
  favorite: boolean;
  pinned: boolean;
  archived: boolean;
  color: string;
  tags: string;
  createdAt: string;
  updatedAt: string;
}

interface Subject {
  id: number;
  title: string;
  color: string;
}

export function NotesView() {
  const { token } = useAuth();
  const toast = useToast();

  // Core Data States
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search/Filters/Layout States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");
  const [activeTabFilter, setActiveTabFilter] = useState<"all" | "favorites" | "pinned" | "archived">("all");
  const [sortBy, setSortBy] = useState<"updatedAt" | "createdAt" | "title">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Active Editor Workspace
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [editorTitle, setEditorTitle] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [editorSubjectId, setEditorSubjectId] = useState<number | null>(null);
  const [editorColor, setEditorColor] = useState("#6366f1");
  const [editorTags, setEditorTags] = useState("");
  const [editorMode, setEditorMode] = useState<"edit" | "preview" | "split">("split");

  // Auto-Save Mechanics
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "modified" | "failed">("saved");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeNoteRef = useRef<Note | null>(null);

  // AI Summary Dialog state
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  // Dialog deletion confirm states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  // Track if current save was a network fail
  const [isOffline, setIsOffline] = useState(false);

  // Sync activeNoteRef for auto-save callbacks
  useEffect(() => {
    activeNoteRef.current = activeNote;
  }, [activeNote]);

  // Fetch subjects to populate dropdown filters & linking
  const fetchSubjects = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch("/api/subjects?includeDeleted=false", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSubjects(data.subjects || []);
      }
    } catch (err) {
      console.error("Failed to load subjects inside notes", err);
    }
  }, [token]);

  // Fetch all notes based on active filters/tabs
  const fetchNotes = useCallback(async (isSilent = false) => {
    if (!token) return;
    if (!isSilent) setLoading(true);
    try {
      const params = new URLSearchParams({
        search: searchQuery,
        sortBy,
        sortOrder,
      });

      if (selectedSubjectFilter !== "all" && selectedSubjectFilter !== "unassigned") {
        params.append("subjectId", selectedSubjectFilter);
      } else if (selectedSubjectFilter === "unassigned") {
        params.append("subjectId", "null"); // handled via fallback or custom check
      }

      if (activeTabFilter === "archived") {
        params.append("archived", "true");
      } else {
        params.append("archived", "false");
        if (activeTabFilter === "favorites") {
          params.append("favorite", "true");
        } else if (activeTabFilter === "pinned") {
          params.append("pinned", "true");
        }
      }

      const response = await fetch(`/api/notes?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        // Additional filter for unassigned subject if backend doesn't support null query explicitly
        let notesList = data.notes || [];
        if (selectedSubjectFilter === "unassigned") {
          notesList = notesList.filter((n: Note) => n.subjectId === null);
        }
        setNotes(notesList);
        setError(null);
      } else {
        setError(data.error || "Could not retrieve academic notes workspace.");
      }
    } catch (err: any) {
      setError("Network error when connecting to notes workspace database.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [token, searchQuery, selectedSubjectFilter, activeTabFilter, sortBy, sortOrder]);

  // Initial loading trigger
  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    const activeId = localStorage.getItem("active-note-id");
    if (activeId && notes.length > 0) {
      const parsed = parseInt(activeId, 10);
      const noteToOpen = notes.find((n) => n.id === parsed);
      if (noteToOpen) {
        localStorage.removeItem("active-note-id");
        handleOpenEditor(noteToOpen);
      }
    }
  }, [notes]);

  // Create Note instantly and load it into the active editor
  const handleCreateNote = async () => {
    if (!token) return;
    try {
      const payload = {
        title: "Untitled Note",
        content: "Start writing your class summary here...",
        favorite: false,
        pinned: false,
        archived: false,
        color: "#6366f1",
        tags: "",
        subjectId: selectedSubjectFilter !== "all" && selectedSubjectFilter !== "unassigned" ? parseInt(selectedSubjectFilter, 10) : null,
      };

      const response = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Created new notebook page!");
        fetchNotes(true); // silent fetch to keep list in sync
        handleOpenEditor(data.note);
      } else {
        toast.error(data.error || "Failed to create academic note.");
      }
    } catch (err: any) {
      toast.error("Could not reach notes server.");
    }
  };

  useEffect(() => {
    if (localStorage.getItem("trigger-new-note") === "true") {
      localStorage.removeItem("trigger-new-note");
      handleCreateNote();
    }
  }, [token]);

  // Perform backend PUT save operation
  const saveNoteToServer = useCallback(async (noteId: number, fields: Partial<Note>) => {
    if (!token) return;
    setSaveStatus("saving");
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(fields),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSaveStatus("saved");
        setIsOffline(false);
        // Silently update the note in local listing
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? { ...n, ...fields, updatedAt: new Date().toISOString() } : n))
        );
      } else {
        throw new Error(data.error || "Save error response");
      }
    } catch (err) {
      console.error("Auto save failed", err);
      setSaveStatus("failed");
      setIsOffline(true);
    }
  }, [token]);

  // Debounced Auto-Save trigger on editor field changes
  useEffect(() => {
    if (!activeNote) return;

    // Check if fields actually changed from the loaded state
    const hasChanges =
      editorTitle !== activeNote.title ||
      editorContent !== activeNote.content ||
      editorSubjectId !== activeNote.subjectId ||
      editorColor !== activeNote.color ||
      editorTags !== activeNote.tags;

    if (!hasChanges) return;

    setSaveStatus("modified");

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      saveNoteToServer(activeNote.id, {
        title: editorTitle,
        content: editorContent,
        subjectId: editorSubjectId,
        color: editorColor,
        tags: editorTags,
      });
    }, 1200); // Debounce duration: 1.2s

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [editorTitle, editorContent, editorSubjectId, editorColor, editorTags, activeNote, saveNoteToServer]);

  // Force Instant Manual Save
  const handleManualSave = async () => {
    if (!activeNote) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    await saveNoteToServer(activeNote.id, {
      title: editorTitle,
      content: editorContent,
      subjectId: editorSubjectId,
      color: editorColor,
      tags: editorTags,
    });
    toast.success("All note changes saved securely!");
  };

  // Open note details in editor
  const handleOpenEditor = (note: Note) => {
    setActiveNote(note);
    setEditorTitle(note.title);
    setEditorContent(note.content);
    setEditorSubjectId(note.subjectId);
    setEditorColor(note.color);
    setEditorTags(note.tags);
    setSaveStatus("saved");
  };

  // Close note details and return to dashboard
  const handleCloseEditor = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    // If modified, execute instant manual sync before exiting
    if (saveStatus === "modified" && activeNote) {
      saveNoteToServer(activeNote.id, {
        title: editorTitle,
        content: editorContent,
        subjectId: editorSubjectId,
        color: editorColor,
        tags: editorTags,
      });
    }
    setActiveNote(null);
    fetchNotes(true);
  };

  // Toggle Pinned status
  const handleTogglePinned = async (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    if (!token) return;
    const nextPinned = !note.pinned;
    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pinned: nextPinned }),
      });
      if (response.ok) {
        setNotes((prev) =>
          prev.map((n) => (n.id === note.id ? { ...n, pinned: nextPinned } : n))
        );
        toast.success(nextPinned ? "Note pinned to dashboard!" : "Note unpinned.");
        // Sync active editor if same note is active
        if (activeNote && activeNote.id === note.id) {
          setActiveNote((prev) => prev ? { ...prev, pinned: nextPinned } : null);
        }
      }
    } catch (err) {
      toast.error("Failed to pin note.");
    }
  };

  // Toggle Favorite status
  const handleToggleFavorite = async (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    if (!token) return;
    const nextFav = !note.favorite;
    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ favorite: nextFav }),
      });
      if (response.ok) {
        setNotes((prev) =>
          prev.map((n) => (n.id === note.id ? { ...n, favorite: nextFav } : n))
        );
        toast.success(nextFav ? "Added to study favorites! ⭐" : "Removed from favorites.");
        if (activeNote && activeNote.id === note.id) {
          setActiveNote((prev) => prev ? { ...prev, favorite: nextFav } : null);
        }
      }
    } catch (err) {
      toast.error("Failed to favorite note.");
    }
  };

  // Archive / Restore note status
  const handleToggleArchive = async (e: React.MouseEvent | null, note: Note) => {
    if (e) e.stopPropagation();
    if (!token) return;
    const nextArchived = !note.archived;
    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ archived: nextArchived }),
      });
      if (response.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== note.id));
        toast.success(nextArchived ? "Note moved to Archive workspace." : "Note restored to active listing!");
        if (activeNote && activeNote.id === note.id) {
          handleCloseEditor();
        }
      }
    } catch (err) {
      toast.error("Failed to update note status.");
    }
  };

  // Trigger Delete Dialog Modal open
  const handleOpenDeleteConfirm = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    setNoteToDelete(note);
    setIsDeleteOpen(true);
  };

  // Execute actual database Soft Delete
  const handleDeleteNote = async () => {
    if (!noteToDelete || !token) return;
    try {
      const response = await fetch(`/api/notes/${noteToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteToDelete.id));
        toast.success(`Note "${noteToDelete.title}" deleted successfully.`);
        if (activeNote && activeNote.id === noteToDelete.id) {
          setActiveNote(null);
        }
      } else {
        toast.error("Could not delete note.");
      }
    } catch (err) {
      toast.error("Database deletion error.");
    } finally {
      setIsDeleteOpen(false);
      setNoteToDelete(null);
    }
  };

  // Insert Rich Text Formatted Syntax at Textarea Cursor Pos
  const handleFormatText = (type: string) => {
    const textarea = document.getElementById("note-editor-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let formattedText = "";
    let cursorOffset = 0;

    switch (type) {
      case "bold":
        formattedText = `**${selectedText || "bold text"}**`;
        cursorOffset = selectedText ? formattedText.length : 2;
        break;
      case "italic":
        formattedText = `*${selectedText || "italic text"}*`;
        cursorOffset = selectedText ? formattedText.length : 1;
        break;
      case "underline":
        formattedText = `<u>${selectedText || "underlined text"}</u>`;
        cursorOffset = selectedText ? formattedText.length : 3;
        break;
      case "heading1":
        formattedText = `\n# ${selectedText || "Heading 1"}\n`;
        cursorOffset = formattedText.length;
        break;
      case "heading2":
        formattedText = `\n## ${selectedText || "Heading 2"}\n`;
        cursorOffset = formattedText.length;
        break;
      case "quote":
        formattedText = `\n> ${selectedText || "Blockquote"}\n`;
        cursorOffset = formattedText.length;
        break;
      case "code":
        formattedText = `\`\`\`javascript\n${selectedText || "console.log('code block');"}\n\`\`\``;
        cursorOffset = formattedText.length;
        break;
      case "list":
        formattedText = `\n- ${selectedText || "List item 1"}\n- List item 2`;
        cursorOffset = formattedText.length;
        break;
      case "checklist":
        formattedText = `\n- [ ] ${selectedText || "Incomplete checklist task"}\n- [x] Completed task`;
        cursorOffset = formattedText.length;
        break;
      case "table":
        formattedText = `\n| Column 1 | Column 2 |\n| -------- | -------- |\n| Item 1   | Item 2   |\n`;
        cursorOffset = formattedText.length;
        break;
      case "link":
        formattedText = `[${selectedText || "Google"}](https://google.com)`;
        cursorOffset = formattedText.length;
        break;
      case "math":
        formattedText = `\n$$ f(x) = \\int_{-\\infty}^{\\infty} \\hat{f}(\\xi)e^{2\\pi i \\xi x} d\\xi $$\n`;
        cursorOffset = formattedText.length;
        break;
      default:
        return;
    }

    const nextContent = text.substring(0, start) + formattedText + text.substring(end);
    setEditorContent(nextContent);

    // Reset cursor focus
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    }, 50);
  };

  // Robust Custom Custom Markdown Parser that outputs beautiful styled HTML structure
  const renderMarkdownHTML = (md: string) => {
    if (!md) return <p className="text-slate-400 italic">No notes written yet. Let's start taking class notes!</p>;

    // Sanitize and simple parse line by line
    const lines = md.split("\n");
    let isCodeBlock = false;
    let codeBlockText = "";
    let isTable = false;
    let tableRows: string[][] = [];

    const elements: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Code blocks tracker
      if (trimmed.startsWith("```")) {
        if (isCodeBlock) {
          isCodeBlock = false;
          elements.push(
            <pre key={`code-${idx}`} className="bg-slate-100 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800/40 font-mono text-xs overflow-x-auto text-violet-600 dark:text-violet-400 my-3">
              <code>{codeBlockText}</code>
            </pre>
          );
          codeBlockText = "";
        } else {
          isCodeBlock = true;
        }
        return;
      }

      if (isCodeBlock) {
        codeBlockText += line + "\n";
        return;
      }

      // Blockquotes
      if (trimmed.startsWith(">")) {
        elements.push(
          <blockquote key={`quote-${idx}`} className="border-l-4 border-violet-500 pl-4 py-1 italic text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/10 rounded-r-md my-3">
            {trimmed.substring(1).trim()}
          </blockquote>
        );
        return;
      }

      // Headings
      if (trimmed.startsWith("# ")) {
        elements.push(
          <h1 key={`h1-${idx}`} className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mt-6 mb-2">
            {trimmed.substring(2)}
          </h1>
        );
        return;
      }
      if (trimmed.startsWith("## ")) {
        elements.push(
          <h2 key={`h2-${idx}`} className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 mt-5 mb-2">
            {trimmed.substring(3)}
          </h2>
        );
        return;
      }
      if (trimmed.startsWith("### ")) {
        elements.push(
          <h3 key={`h3-${idx}`} className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-200 mt-4 mb-1">
            {trimmed.substring(4)}
          </h3>
        );
        return;
      }

      // Checklists
      if (trimmed.startsWith("- [ ] ") || trimmed.startsWith("- [x] ") || trimmed.startsWith("- [X] ")) {
        const isChecked = trimmed.startsWith("- [x] ") || trimmed.startsWith("- [X] ");
        elements.push(
          <div key={`chk-${idx}`} className="flex items-center gap-2.5 my-1.5">
            <input
              type="checkbox"
              checked={isChecked}
              readOnly
              className="rounded border-slate-300 dark:border-slate-700 text-violet-600 focus:ring-violet-500 h-4 w-4 shrink-0"
            />
            <span className={`text-sm ${isChecked ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-300"}`}>
              {trimmed.substring(6)}
            </span>
          </div>
        );
        return;
      }

      // Bullet lists
      if (trimmed.startsWith("- ")) {
        elements.push(
          <li key={`ul-${idx}`} className="text-sm text-slate-700 dark:text-slate-300 ml-4 list-disc pl-1 my-1">
            {trimmed.substring(2)}
          </li>
        );
        return;
      }

      // Numbered lists
      if (/^\d+\.\s/.test(trimmed)) {
        const spaceIdx = trimmed.indexOf(" ");
        elements.push(
          <li key={`ol-${idx}`} className="text-sm text-slate-700 dark:text-slate-300 ml-4 list-decimal pl-1 my-1">
            {trimmed.substring(spaceIdx + 1)}
          </li>
        );
        return;
      }

      // Tables
      if (trimmed.startsWith("|")) {
        isTable = true;
        const rowCells = trimmed
          .split("|")
          .map((c) => c.trim())
          .filter((_, i, arr) => i > 0 && i < arr.length - 1);
        
        // Skip separator row
        if (!rowCells.every((cell) => cell.startsWith("-"))) {
          tableRows.push(rowCells);
        }
        return;
      } else if (isTable) {
        // End of table marker
        isTable = false;
        elements.push(
          <div key={`tab-${idx}`} className="overflow-x-auto my-4 rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/60 font-semibold text-slate-600 dark:text-slate-400 uppercase">
                <tr>
                  {tableRows[0]?.map((cell, cidx) => (
                    <th key={`th-${cidx}`} className="p-3">
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {tableRows.slice(1).map((row, ridx) => (
                  <tr key={`tr-${ridx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                    {row.map((cell, cidx) => (
                      <td key={`td-${ridx}-${cidx}`} className="p-3 text-slate-700 dark:text-slate-300 font-normal">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
      }

      // Math Equations
      if (trimmed.startsWith("$$") && trimmed.endsWith("$$")) {
        const mathStr = trimmed.replace(/\$\$/g, "").trim();
        elements.push(
          <div key={`math-${idx}`} className="p-4 my-4 bg-slate-50 dark:bg-slate-900/20 border border-violet-500/10 rounded-xl text-center font-mono text-sm text-violet-700 dark:text-violet-400">
            {mathStr}
          </div>
        );
        return;
      }

      // Default paragraph (supports basic formatting replacements inside)
      if (trimmed !== "") {
        // Process simple inline formats (bold, italic, tags)
        let formattedStr: React.ReactNode = trimmed;
        
        // Handle bold (**text**)
        const boldRegex = /\*\*(.*?)\*\*/g;
        // Handle italic (*text*)
        const italicRegex = /\*(.*?)\*/g;

        // Custom parser fallback inside paragraph
        elements.push(
          <p key={`p-${idx}`} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed my-2">
            {trimmed}
          </p>
        );
      }
    });

    return <div className="space-y-1 mt-2">{elements}</div>;
  };

  // Invoke Gemini AI to summarize note content
  const handleGenerateSummary = async () => {
    if (!editorContent.trim()) {
      toast.error("Please add content to generate an AI summary.");
      return;
    }
    setIsAiLoading(true);
    setAiSummary(null);
    setIsSummaryOpen(true);
    try {
      const response = await fetch("/api/ai/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: `Summarize the following study notes in 3 concise bullet points with key takeaways:\n\n${editorContent}`,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setAiSummary(data.text);
      } else {
        setAiSummary("Unable to generate summary right now. Please try again.");
      }
    } catch (err) {
      setAiSummary("Network failed to connect to Gemini AI helper.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Apply AI summary to database Note model
  const handleApplySummary = async () => {
    if (!activeNote || !aiSummary) return;
    try {
      const response = await fetch(`/api/notes/${activeNote.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ summary: aiSummary }),
      });
      if (response.ok) {
        setActiveNote((prev) => prev ? { ...prev, summary: aiSummary } : null);
        toast.success("AI summary loaded into notebook widget metadata!");
        setIsSummaryOpen(false);
      }
    } catch (err) {
      toast.error("Failed to append AI summary.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-7xl mx-auto flex flex-col"
    >
      <AnimatePresence mode="wait">
        {!activeNote ? (
          // NOTES DASHBOARD VIEW
          <div className="space-y-6">
            
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
              <div className="space-y-1.5">
                <h1 className="text-3xl font-bold tracking-tight font-display bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-white dark:to-slate-300">
                  Academic Smart Notes
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                  Author, organize, and synthesize class notebooks with real-time saving and Socratic AI grounding.
                </p>
              </div>

              <div>
                <Button
                  onClick={handleCreateNote}
                  icon={<Plus className="h-4 w-4" />}
                  className="shadow-sm shadow-violet-500/10 h-10 text-sm"
                >
                  Create Note
                </Button>
              </div>
            </div>

            {/* Filter Tabs & Controllers segment */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-4">
              
              {/* Category Segment Selectors */}
              <div className="flex gap-1 bg-slate-100/80 dark:bg-slate-900 p-1 rounded-xl self-start overflow-x-auto max-w-full">
                <button
                  onClick={() => { setActiveTabFilter("all"); fetchNotes(); }}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    activeTabFilter === "all"
                      ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  All Notes
                </button>
                <button
                  onClick={() => { setActiveTabFilter("pinned"); fetchNotes(); }}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTabFilter === "pinned"
                      ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  <Pin className="h-3 w-3" /> Pinned
                </button>
                <button
                  onClick={() => { setActiveTabFilter("favorites"); fetchNotes(); }}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTabFilter === "favorites"
                      ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  <Star className="h-3 w-3" /> Favorites
                </button>
                <button
                  onClick={() => { setActiveTabFilter("archived"); fetchNotes(); }}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTabFilter === "archived"
                      ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  <Archive className="h-3 w-3" /> Archive
                </button>
              </div>

              {/* Utility Dropdowns & Search */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search notes query */}
                <div className="relative min-w-[200px] flex-1 md:flex-initial">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search notes content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200/60 dark:border-slate-800/60 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Filter by academic subject */}
                <select
                  value={selectedSubjectFilter}
                  onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200/60 dark:border-slate-800/60 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-violet-500 text-slate-800 dark:text-slate-100"
                >
                  <option value="all">📚 All Subjects</option>
                  <option value="unassigned">📂 Unassigned</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      📖 {sub.title}
                    </option>
                  ))}
                </select>

                {/* Sort selection */}
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split("-") as [any, any];
                    setSortBy(field);
                    setSortOrder(order);
                  }}
                  className="px-3 py-2 text-xs border border-slate-200/60 dark:border-slate-800/60 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-violet-500 text-slate-800 dark:text-slate-100"
                >
                  <option value="updatedAt-desc">🕒 Last Modified</option>
                  <option value="createdAt-desc">📅 Newest First</option>
                  <option value="createdAt-asc">📅 Oldest First</option>
                  <option value="title-asc">🔤 Alphabetical (A-Z)</option>
                  <option value="title-desc">🔤 Alphabetical (Z-A)</option>
                </select>

                {/* Layout View Toggle */}
                <div className="flex border border-slate-200/60 dark:border-slate-800/60 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 cursor-pointer ${viewMode === "grid" ? "bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400" : "bg-white dark:bg-slate-900 text-slate-400"}`}
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 cursor-pointer ${viewMode === "list" ? "bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400" : "bg-white dark:bg-slate-900 text-slate-400"}`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Note Grid / List items content */}
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                  <Card key={idx} className="border-slate-200/40 dark:border-slate-800/40 animate-pulse">
                    <CardHeader className="space-y-2 pb-2">
                      <div className="h-3 w-1/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                      <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                      <div className="h-3 w-5/6 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : error ? (
              <Card className="border-rose-100 bg-rose-50/10 dark:border-rose-950/20 dark:bg-rose-950/5">
                <CardContent className="flex flex-col items-center py-10 text-center max-w-md mx-auto space-y-4">
                  <AlertCircle className="h-10 w-10 text-rose-500 animate-bounce" />
                  <div className="space-y-1">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">Workspace Error</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{error}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => fetchNotes()} icon={<RotateCcw className="h-3 w-3" />}>
                    Retry Connection
                  </Button>
                </CardContent>
              </Card>
            ) : notes.length === 0 ? (
              <Card className="border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/10 backdrop-blur-sm py-16 px-6">
                <CardContent className="flex flex-col items-center text-center max-w-md mx-auto space-y-5">
                  <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/40 dark:border-slate-800/40 text-slate-600 dark:text-slate-300 flex items-center justify-center shadow-inner">
                    <FileText className="h-8 w-8 text-violet-600 dark:text-violet-400" />
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">
                      No Class Notes Found
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Create your first class notes, formulate study blocks, or link notes to academic subjects for a synchronized workspace!
                    </p>
                  </div>

                  <Button onClick={handleCreateNote} icon={<Plus className="h-3.5 w-3.5" />}>
                    Create Notebook Page
                  </Button>
                </CardContent>
              </Card>
            ) : (
              // Pinned & Notes Segment lists
              <div className="space-y-8">
                {/* 1. Pinned Notes Block (only if they exist and we are in "all" or "pinned" view) */}
                {notes.some((n) => n.pinned) && (activeTabFilter === "all" || activeTabFilter === "pinned") && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold tracking-wider uppercase font-sans">
                      <Pin className="h-3 w-3 text-amber-500" /> Pinned Notebooks
                    </div>
                    <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-3"}>
                      {notes
                        .filter((n) => n.pinned)
                        .map((note) => (
                          <NoteCard
                            key={note.id}
                            note={note}
                            viewMode={viewMode}
                            subjects={subjects}
                            onOpen={() => handleOpenEditor(note)}
                            onTogglePinned={(e) => handleTogglePinned(e, note)}
                            onToggleFavorite={(e) => handleToggleFavorite(e, note)}
                            onToggleArchive={(e) => handleToggleArchive(e, note)}
                            onDelete={(e) => handleOpenDeleteConfirm(e, note)}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* 2. Unpinned / Remaining Notes Block */}
                <div className="space-y-3">
                  {notes.some((n) => n.pinned) && (activeTabFilter === "all" || activeTabFilter === "pinned") && (
                    <div className="text-slate-400 text-xs font-semibold tracking-wider uppercase font-sans">
                      All Notes
                    </div>
                  )}
                  <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-3"}>
                    {notes
                      .filter((n) => !n.pinned || (activeTabFilter !== "all" && activeTabFilter !== "pinned"))
                      .map((note) => (
                        <NoteCard
                          key={note.id}
                          note={note}
                          viewMode={viewMode}
                          subjects={subjects}
                          onOpen={() => handleOpenEditor(note)}
                          onTogglePinned={(e) => handleTogglePinned(e, note)}
                          onToggleFavorite={(e) => handleToggleFavorite(e, note)}
                          onToggleArchive={(e) => handleToggleArchive(e, note)}
                          onDelete={(e) => handleOpenDeleteConfirm(e, note)}
                        />
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // DEDICATED MARGIN-FREE SPLIT-PANE RICH TEXT EDITOR WORKSPACE
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="w-full flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden min-h-[calc(100vh-140px)] lg:h-[calc(100vh-140px)]"
          >
            {/* 1. TOP EDITOR CONTROL HEADER BAR */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/60 gap-3">
              
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={handleCloseEditor} icon={<ArrowLeft className="h-4 w-4" />} className="h-9 font-sans text-xs shrink-0 bg-white dark:bg-slate-900">
                  Dashboard
                </Button>

                {/* Saving / Sync State Indicator */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 shrink-0 select-none">
                  {saveStatus === "saving" && (
                    <>
                      <Clock className="h-3 w-3 text-amber-500 animate-spin" />
                      <span className="text-[10px] font-medium text-slate-500 font-mono">Saving...</span>
                    </>
                  )}
                  {saveStatus === "saved" && (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      <span className="text-[10px] font-medium text-slate-500 font-mono">Saved</span>
                    </>
                  )}
                  {saveStatus === "modified" && (
                    <>
                      <Edit2 className="h-3 w-3 text-violet-500 animate-pulse" />
                      <span className="text-[10px] font-medium text-slate-500 font-mono">Modifying...</span>
                    </>
                  )}
                  {saveStatus === "failed" && (
                    <>
                      <AlertCircle className="h-3 w-3 text-rose-500" />
                      <span className="text-[10px] font-semibold text-rose-600 font-mono">{isOffline ? "Offline" : "Error"}</span>
                    </>
                  )}
                </div>
              </div>

              {/* View / Edit Mode Toggles + AI Summary Trigger */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateSummary}
                  icon={<Sparkles className="h-3.5 w-3.5 text-violet-500" />}
                  className="h-9 text-xs shrink-0 font-sans bg-white dark:bg-slate-900"
                >
                  AI Socratic Summary
                </Button>

                <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950 shrink-0">
                  <button
                    onClick={() => setEditorMode("edit")}
                    className={`px-3 py-1.5 text-xs font-semibold cursor-pointer flex items-center gap-1 ${editorMode === "edit" ? "bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400 font-bold" : "text-slate-400"}`}
                  >
                    <FileEdit className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => setEditorMode("preview")}
                    className={`px-3 py-1.5 text-xs font-semibold cursor-pointer flex items-center gap-1 ${editorMode === "preview" ? "bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400 font-bold" : "text-slate-400"}`}
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </button>
                  <button
                    onClick={() => setEditorMode("split")}
                    className={`hidden md:flex px-3 py-1.5 text-xs font-semibold cursor-pointer items-center gap-1 ${editorMode === "split" ? "bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400 font-bold" : "text-slate-400"}`}
                  >
                    <Grid className="h-3.5 w-3.5" /> Split Preview
                  </button>
                </div>

                <Button variant="outline" size="sm" onClick={handleManualSave} icon={<Save className="h-3.5 w-3.5" />} className="h-9 text-xs bg-white dark:bg-slate-900" />
              </div>
            </div>

            {/* 2. SUB-HEADER METADATA WORKSPACE WRAPPERS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-slate-50/20">
              {/* Note Title Input */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold tracking-widest text-slate-400 uppercase font-sans mb-1">Note Title</label>
                <input
                  type="text"
                  value={editorTitle}
                  onChange={(e) => setEditorTitle(e.target.value)}
                  placeholder="Note Title..."
                  className="w-full bg-transparent border-b border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:border-violet-500 font-display font-bold text-xl py-1 text-slate-800 dark:text-slate-50 focus:outline-none transition-colors"
                />
              </div>

              {/* Subject linking dropdown */}
              <div>
                <label className="block text-[10px] font-bold tracking-widest text-slate-400 uppercase font-sans mb-1">Subject Hub</label>
                <select
                  value={editorSubjectId || ""}
                  onChange={(e) => setEditorSubjectId(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="w-full text-xs py-1.5 px-2 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value="">📂 Unassigned</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      📖 {sub.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags Input */}
              <div>
                <label className="block text-[10px] font-bold tracking-widest text-slate-400 uppercase font-sans mb-1">Tags (Comma-Separated)</label>
                <div className="relative">
                  <Tag className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={editorTags}
                    onChange={(e) => setEditorTags(e.target.value)}
                    placeholder="lecture, midterms..."
                    className="w-full pl-8 pr-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              </div>
            </div>

            {/* 3. DEDICATED MARKDOWN FORMATTING RICH TOOLBAR */}
            {editorMode !== "preview" && (
              <div className="flex flex-wrap gap-1 items-center px-4 py-2 border-b border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900 overflow-x-auto">
                <ToolbarButton icon={<Heading1 className="h-3.5 w-3.5" />} label="Heading 1" onClick={() => handleFormatText("heading1")} />
                <ToolbarButton icon={<Heading2 className="h-3.5 w-3.5" />} label="Heading 2" onClick={() => handleFormatText("heading2")} />
                <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1" />
                <ToolbarButton icon={<Bold className="h-3.5 w-3.5" />} label="Bold" onClick={() => handleFormatText("bold")} />
                <ToolbarButton icon={<Italic className="h-3.5 w-3.5" />} label="Italic" onClick={() => handleFormatText("italic")} />
                <ToolbarButton icon={<Underline className="h-3.5 w-3.5" />} label="Underline" onClick={() => handleFormatText("underline")} />
                <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1" />
                <ToolbarButton icon={<ListIcon className="h-3.5 w-3.5" />} label="Bullet List" onClick={() => handleFormatText("list")} />
                <ToolbarButton icon={<ListOrdered className="h-3.5 w-3.5" />} label="Checklist" onClick={() => handleFormatText("checklist")} />
                <ToolbarButton icon={<Quote className="h-3.5 w-3.5" />} label="Blockquote" onClick={() => handleFormatText("quote")} />
                <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1" />
                <ToolbarButton icon={<Code className="h-3.5 w-3.5" />} label="Code Block" onClick={() => handleFormatText("code")} />
                <ToolbarButton icon={<Table className="h-3.5 w-3.5" />} label="Table" onClick={() => handleFormatText("table")} />
                <ToolbarButton icon={<Link className="h-3.5 w-3.5" />} label="Link URL" onClick={() => handleFormatText("link")} />
                <ToolbarButton icon={<span className="text-xs font-serif font-semibold font-mono">f(x)</span>} label="Math Formula" onClick={() => handleFormatText("math")} />
              </div>
            )}

            {/* 4. CONTENT WRITING TEXTAREA & MARKDOWN RENDERER */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden h-full">
              {/* Write Textarea pane */}
              {(editorMode === "edit" || editorMode === "split") && (
                <div className={`p-4 h-full ${editorMode === "split" ? "border-r border-slate-200 dark:border-slate-800" : "col-span-2"} flex flex-col`}>
                  <textarea
                    id="note-editor-textarea"
                    value={editorContent}
                    onChange={(e) => setEditorContent(e.target.value)}
                    placeholder="Capture lecture discussions, formula explanations, and code snippets in Markdown..."
                    className="w-full flex-1 h-full min-h-[400px] resize-none border-0 p-0 font-mono text-sm text-slate-800 dark:text-slate-100 bg-transparent focus:outline-none focus:ring-0 leading-relaxed"
                  />
                </div>
              )}

              {/* Rendered Preview HTML pane */}
              {(editorMode === "preview" || editorMode === "split") && (
                <div className={`p-6 overflow-y-auto h-full bg-slate-50/30 dark:bg-slate-950/20 prose max-w-none ${editorMode === "preview" ? "col-span-2" : ""}`}>
                  {renderMarkdownHTML(editorContent)}
                </div>
              )}
            </div>

            {/* Note Summary Metadata Display (Bottom pane overlay helper) */}
            {activeNote.summary && (
              <div className="bg-violet-50/20 dark:bg-violet-950/5 border-t border-violet-100/30 dark:border-violet-950/10 p-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400 uppercase font-sans mb-1">
                  <Sparkles className="h-3.5 w-3.5" /> Saved AI Key Takeaways
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">{activeNote.summary}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* DIALOG 1: CONFIRM DELETE MODAL */}
      <Dialog isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirm Note Deletion">
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Are you sure you want to permanently delete note <span className="font-semibold text-slate-800 dark:text-slate-200">"{noteToDelete?.title}"</span>? This action is irreversible and will remove all corresponding AI study claims.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteNote}>
              Delete Permanently
            </Button>
          </div>
        </div>
      </Dialog>

      {/* DIALOG 2: AI SUMMARY PROMPT PREVIEW */}
      <Dialog isOpen={isSummaryOpen} onClose={() => setIsSummaryOpen(false)} title="Gemini AI Socratic Summary">
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Active recall generator is preparing a Socratic breakdown to summarize key learning objectives from your notes content.
          </p>

          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800/60 min-h-[100px] flex flex-col justify-center">
            {isAiLoading ? (
              <div className="flex flex-col items-center gap-2 text-slate-400 py-6">
                <Sparkles className="h-6 w-6 text-violet-500 animate-spin" />
                <span className="text-xs font-mono">Synthesizing takeaways...</span>
              </div>
            ) : aiSummary ? (
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-line">{aiSummary}</p>
            ) : (
              <p className="text-xs text-slate-400 italic">No summary prepared.</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsSummaryOpen(false)}>
              Discard
            </Button>
            <Button size="sm" onClick={handleApplySummary} disabled={isAiLoading || !aiSummary}>
              Apply to Notebook Key Takeaways
            </Button>
          </div>
        </div>
      </Dialog>
    </motion.div>
  );
}

// FORMATTING TOOLBAR BUTTON COMPONENT
interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}
function ToolbarButton({ icon, label, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
      title={label}
    >
      {icon}
    </button>
  );
}

// INDIVIDUAL INDEPENDENT COMPACT NOTE CARD COMPONENT
interface NoteCardProps {
  key?: React.Key;
  note: Note;
  viewMode: "grid" | "list";
  subjects: Subject[];
  onOpen: () => void;
  onTogglePinned: (e: React.MouseEvent) => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onToggleArchive: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}
function NoteCard({
  note,
  viewMode,
  subjects,
  onOpen,
  onTogglePinned,
  onToggleFavorite,
  onToggleArchive,
  onDelete,
}: NoteCardProps) {
  // Map connected subject details
  const noteSubject = subjects.find((s) => s.id === note.subjectId);

  // Strip Markdown markers for clean readable text snippet
  const getNoteSnippet = (contentStr: string) => {
    if (!contentStr) return "Empty Note";
    const cleaned = contentStr
      .replace(/[#*`_>|\[\]\(\)\-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return cleaned.length > 110 ? cleaned.substring(0, 110) + "..." : cleaned;
  };

  const formattedDate = new Date(note.updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (viewMode === "list") {
    return (
      <div
        onClick={onOpen}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-xl hover:border-violet-500/40 dark:hover:border-violet-500/40 hover:shadow-md transition-all duration-200 cursor-pointer gap-3"
      >
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            <FileText className="h-5 w-5" />
          </div>
          <div className="space-y-0.5 truncate max-w-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{note.title}</span>
              {noteSubject && (
                <span
                  className="px-2 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider shrink-0"
                  style={{
                    backgroundColor: `${noteSubject.color}15`,
                    color: noteSubject.color,
                  }}
                >
                  {noteSubject.title}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate">{getNoteSnippet(note.content)}</p>
          </div>
        </div>

        {/* Action button controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 select-none">
          <span className="text-[10px] text-slate-400 font-mono mr-2">{formattedDate}</span>
          
          <button
            onClick={onTogglePinned}
            className={`p-1.5 rounded-lg border border-slate-200/40 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors ${note.pinned ? "text-amber-500 hover:text-amber-600" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
            title="Pin Note"
          >
            <Pin className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onToggleFavorite}
            className={`p-1.5 rounded-lg border border-slate-200/40 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors ${note.favorite ? "text-amber-500 hover:text-amber-600" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
            title="Favorite Note"
          >
            <Star className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onToggleArchive}
            className={`p-1.5 rounded-lg border border-slate-200/40 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors ${note.archived ? "text-violet-500 hover:text-violet-600" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
            title={note.archived ? "Unarchive Note" : "Archive Note"}
          >
            <Archive className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg border border-slate-200/40 dark:border-slate-800/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
            title="Delete Permanently"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // DEFAULT GRID LAYOUT CARD
  return (
    <div
      onClick={onOpen}
      className="group relative flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl hover:border-violet-500/40 dark:hover:border-violet-500/40 hover:shadow-lg transition-all duration-300 p-5 cursor-pointer h-52 hover:-translate-y-0.5"
    >
      <div className="space-y-2.5 overflow-hidden">
        {/* Top bar with Subject & Pin/Favorite shortcuts */}
        <div className="flex items-center justify-between gap-2">
          {noteSubject ? (
            <span
              className="px-2.5 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider truncate"
              style={{
                backgroundColor: `${noteSubject.color}15`,
                color: noteSubject.color,
              }}
            >
              {noteSubject.title}
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Folder className="h-3 w-3" /> Unassigned
            </span>
          )}

          <div className="flex items-center gap-1 select-none">
            <button
              onClick={onTogglePinned}
              className={`p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${note.pinned ? "text-amber-500" : "text-slate-300 hover:text-slate-500 dark:text-slate-600"}`}
            >
              <Pin className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onToggleFavorite}
              className={`p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${note.favorite ? "text-amber-500" : "text-slate-300 hover:text-slate-500 dark:text-slate-600"}`}
            >
              <Star className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Note title */}
        <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
          {note.title}
        </h3>

        {/* Note snippet text */}
        <p className="text-xs text-slate-400 dark:text-slate-400 leading-relaxed line-clamp-3">
          {getNoteSnippet(note.content)}
        </p>
      </div>

      {/* Bottom status & action buttons */}
      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-3 mt-3 shrink-0 select-none">
        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
          <Clock className="h-3 w-3" /> {formattedDate}
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleArchive}
            className={`p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${note.archived ? "text-violet-500" : "text-slate-400 hover:text-slate-600 dark:text-slate-300"}`}
            title={note.archived ? "Unarchive Note" : "Archive Note"}
          >
            <Archive className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
            title="Delete Permanently"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
