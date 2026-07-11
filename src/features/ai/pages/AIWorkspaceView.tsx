import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../auth/hooks/use-auth.tsx";
import { useToast } from "../../../components/ui/Toast.tsx";
import { Button } from "../../../components/ui/Button.tsx";
import { PDFCanvasViewer } from "../../../components/PDFCanvasViewer.tsx";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/Card.tsx";
import { MarkdownRenderer } from "../../../components/ui/MarkdownRenderer.tsx";
import { Dialog } from "../../../components/ui/Dialog.tsx";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Search,
  Plus,
  Trash2,
  Edit,
  Send,
  MessageSquare,
  Bot,
  User as UserIcon,
  Copy,
  RotateCcw,
  Square,
  SlidersHorizontal,
  Loader2,
  Check,
  ChevronLeft,
  Settings as SettingsIcon,
  BookOpen,
  Brain,
  HelpCircle,
  Paperclip,
  FileImage,
  FileText,
  File,
  X,
  Layers
} from "lucide-react";

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

interface Message {
  id: number;
  role: "user" | "model";
  content: string;
  createdAt: string;
  sources?: string;
}

interface Document {
  id: number;
  userId: string;
  subjectId: number | null;
  noteId: number | null;
  originalName: string;
  storedName: string;
  mimeType: string;
  extension: string;
  size: number;
  storageProvider: string;
  storagePath: string;
  thumbnail: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

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

const ACADEMIC_PROMPTS = [
  {
    title: "Summarize Materials",
    prompt: "I want you to act as an elite neurobiology professor. Summarize the major functions of the prefrontal cortex in decision-making and detail its connections to the amygdala.",
    icon: BookOpen,
    color: "text-violet-500 bg-violet-50 dark:bg-violet-950/40"
  },
  {
    title: "Socratic Study Recall",
    prompt: "Ask me 3 challenging Socratic questions, one-by-one, about the difference between SQL indexes and full-text search strategies. Let me answer after each question.",
    icon: Brain,
    color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
  },
  {
    title: "Draft Study Quiz",
    prompt: "Draft a high-fidelity 5-question multiple choice quiz on mitochondrial respiration and cell division. Provide step-by-step rationales for each correct answer.",
    icon: HelpCircle,
    color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
  }
];

export function AIWorkspaceView() {
  const { token, user } = useAuth();
  const toast = useToast();

  // Sprint 9 AI Document Intelligence Frontend state
  const [attachedDocs, setAttachedDocs] = useState<Document[]>([]);
  const [attachedNotes, setAttachedNotes] = useState<Note[]>([]);
  
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectorTab, setSelectorTab] = useState<"documents" | "notes">("documents");
  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoadingSelectorData, setIsLoadingSelectorData] = useState(false);
  
  // Selector searching/filtering states
  const [selectorSearch, setSelectorSearch] = useState("");

  // Conversations states
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [messagesList, setMessagesList] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // New text box states
  const [inputMessage, setInputMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState("");

  // Editing states
  const [editingConvId, setEditingConvId] = useState<number | null>(null);
  const [renameTitle, setRenameTitle] = useState("");

  // Settings states loaded from local storage
  const [aiSettings, setAiSettings] = useState({
    preferredModel: "gemini-3.5-flash",
    temperature: 0.7,
    responseLength: "medium",
    systemPrompt: "You are a highly helpful and intelligent academic study assistant in AI Study Hub."
  });

  // Mobile navigation helper
  const [showSidebarMobile, setShowSidebarMobile] = useState(true);

  // Source viewer states
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerType, setViewerType] = useState<"document" | "note">("document");
  const [viewerId, setViewerId] = useState<number | null>(null);
  const [viewerTitle, setViewerTitle] = useState("");
  const [viewerContent, setViewerContent] = useState("");
  const [isLoadingViewer, setIsLoadingViewer] = useState(false);
  const [docPreviewMode, setDocPreviewMode] = useState<"text" | "visual">("text");

  const handleOpenSourceViewer = async (type: "document" | "note", id: number, title: string) => {
    setViewerType(type);
    setViewerId(id);
    setViewerTitle(title);
    setViewerContent("");
    setIsViewerOpen(true);

    if (type === "note") {
      setIsLoadingViewer(true);
      try {
        const res = await fetch(`/api/notes/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.note) {
          setViewerContent(data.note.content || "*Empty note*");
        } else {
          setViewerContent("*Error: Note could not be found or has been deleted.*");
        }
      } catch (err) {
        setViewerContent("*Error: Failed to fetch note content.*");
      } finally {
        setIsLoadingViewer(false);
      }
    } else if (type === "document") {
      setDocPreviewMode("text");
      setIsLoadingViewer(true);
      try {
        const res = await fetch(`/api/documents/${id}/text`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success || data.text !== undefined) {
          setViewerContent(data.text || "");
        } else {
          setViewerContent("*Failed to extract readable document text.*");
        }
      } catch (err) {
        setViewerContent("*Error: Failed to fetch document content.*");
      } finally {
        setIsLoadingViewer(false);
      }
    }
  };

  // Streaming cancel controller
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load user settings on initialization
  useEffect(() => {
    const savedModel = localStorage.getItem("ai_preferredModel") || "gemini-3.5-flash";
    const savedTemp = localStorage.getItem("ai_temperature") ? parseFloat(localStorage.getItem("ai_temperature")!) : 0.7;
    const savedLen = localStorage.getItem("ai_responseLength") || "medium";
    const savedPrompt = localStorage.getItem("ai_systemPrompt") || "You are a highly helpful and intelligent academic study assistant in AI Study Hub.";

    setAiSettings({
      preferredModel: savedModel,
      temperature: savedTemp,
      responseLength: savedLen,
      systemPrompt: savedPrompt
    });
  }, []);

  // Fetch subjects & conversations once token is resolved
  useEffect(() => {
    if (token) {
      fetchSubjects();
      loadConversations();
    }
  }, [token]);

  const fetchSubjects = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/subjects", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSubjects(data.subjects || []);
      }
    } catch (err) {
      console.error("Failed to fetch subjects:", err);
    }
  };

  const fetchConversationContext = async (convId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/ai/conversations/${convId}/context`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAttachedDocs(data.documents || []);
        setAttachedNotes(data.notes || []);
      }
    } catch (err) {
      console.error("Failed to load attached conversation context:", err);
    }
  };

  const handleRemoveDocument = async (docId: number) => {
    if (!selectedConvId || !token) return;
    try {
      const res = await fetch(`/api/ai/conversations/${selectedConvId}/documents/${docId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAttachedDocs((prev) => prev.filter((d) => d.id !== docId));
        toast.success("Document detached from active context.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to detach document.");
    }
  };

  const handleRemoveNote = async (noteId: number) => {
    if (!selectedConvId || !token) return;
    try {
      const res = await fetch(`/api/ai/conversations/${selectedConvId}/notes/${noteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAttachedNotes((prev) => prev.filter((n) => n.id !== noteId));
        toast.success("Study note detached from active context.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to detach study note.");
    }
  };

  const handleToggleDocumentSelection = async (doc: Document) => {
    if (!selectedConvId || !token) return;
    const isAttached = attachedDocs.some((d) => d.id === doc.id);
    try {
      if (isAttached) {
        const res = await fetch(`/api/ai/conversations/${selectedConvId}/documents/${doc.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setAttachedDocs((prev) => prev.filter((d) => d.id !== doc.id));
          toast.success(`Removed "${doc.originalName}" from context.`);
        }
      } else {
        const res = await fetch(`/api/ai/conversations/${selectedConvId}/documents`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ documentId: doc.id })
        });
        const data = await res.json();
        if (data.success) {
          setAttachedDocs((prev) => [...prev, doc]);
          toast.success(`Linked "${doc.originalName}" to context.`);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update document link.");
    }
  };

  const handleToggleNoteSelection = async (note: Note) => {
    if (!selectedConvId || !token) return;
    const isAttached = attachedNotes.some((n) => n.id === note.id);
    try {
      if (isAttached) {
        const res = await fetch(`/api/ai/conversations/${selectedConvId}/notes/${note.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setAttachedNotes((prev) => prev.filter((n) => n.id !== note.id));
          toast.success(`Removed note "${note.title}" from context.`);
        }
      } else {
        const res = await fetch(`/api/ai/conversations/${selectedConvId}/notes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ noteId: note.id })
        });
        const data = await res.json();
        if (data.success) {
          setAttachedNotes((prev) => [...prev, note]);
          toast.success(`Linked note "${note.title}" to context.`);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update study note link.");
    }
  };

  const loadSelectorData = async () => {
    if (!token) return;
    setIsLoadingSelectorData(true);
    try {
      const [docRes, noteRes, subRes] = await Promise.all([
        fetch("/api/documents", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/notes", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/subjects", { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (docRes.ok) {
        const docData = await docRes.json();
        if (docData.success) setAllDocs(docData.documents || []);
      }
      if (noteRes.ok) {
        const noteData = await noteRes.json();
        if (noteData.success) setAllNotes(noteData.notes || []);
      }
      if (subRes.ok) {
        const subData = await subRes.json();
        if (subData.success) setSubjects(subData.subjects || []);
      }
    } catch (err) {
      console.error("Failed to load available selector data:", err);
      toast.error("Failed to load documents or notes list.");
    } finally {
      setIsLoadingSelectorData(false);
    }
  };

  const getSubjectBadge = (subjectId: number | null) => {
    if (!subjectId) return null;
    const sub = subjects.find((s) => s.id === subjectId);
    if (!sub) return null;
    return (
      <span
        style={{ backgroundColor: sub.color + "15", color: sub.color, borderColor: sub.color + "30" }}
        className="text-[10px] px-2 py-0.5 rounded-full font-semibold border inline-block leading-none shrink-0"
      >
        {sub.title}
      </span>
    );
  };

  const getDocIcon = (mimeType: string, ext: string) => {
    const lowerMime = mimeType?.toLowerCase() || "";
    const lowerExt = ext?.toLowerCase() || "";
    if (lowerMime.includes("pdf") || lowerExt === ".pdf") {
      return <BookOpen className="h-4 w-4 text-rose-500 shrink-0" />;
    }
    if (lowerMime.includes("image") || [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(lowerExt)) {
      return <FileImage className="h-4 w-4 text-amber-500 shrink-0" />;
    }
    if (lowerMime.includes("word") || [".doc", ".docx"].includes(lowerExt)) {
      return <FileText className="h-4 w-4 text-blue-500 shrink-0" />;
    }
    return <File className="h-4 w-4 text-indigo-500 shrink-0" />;
  };

  // Sync scroll on updates
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesList, streamingText, isGenerating]);

  // Load all user conversations
  const loadConversations = async (searchStr?: string) => {
    if (!token) return;
    setLoadingList(true);
    try {
      const queryParam = searchStr ? `?search=${encodeURIComponent(searchStr)}` : "";
      const res = await fetch(`/api/ai/conversations${queryParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations);
        // If there's an active conversation that is not in the list, fallback or select first
        if (data.conversations.length > 0 && !selectedConvId) {
          handleSelectConversation(data.conversations[0].id);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load study history.");
    } finally {
      setLoadingList(false);
    }
  };

  // Select/load messages for conversation
  const handleSelectConversation = async (id: number) => {
    if (!token) return;
    setSelectedConvId(id);
    setLoadingMessages(true);
    setStreamingText("");
    setIsGenerating(false);

    // Close side pane on mobile screens to view thread
    if (window.innerWidth < 768) {
      setShowSidebarMobile(false);
    }

    try {
      const res = await fetch(`/api/ai/conversations/${id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMessagesList(data.messages);
      }
      // Load context attached to this conversation for Sprint 9
      await fetchConversationContext(id);
    } catch (err) {
      toast.error("Failed to fetch message history.");
    } finally {
      setLoadingMessages(false);
    }
  };

  // Start new conversation
  const handleCreateNewConversation = async (initialTitle?: string): Promise<number | null> => {
    if (!token) return null;
    try {
      const title = initialTitle || "New Study Chat";
      const res = await fetch("/api/ai/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title })
      });
      const data = await res.json();
      if (data.success) {
        setConversations((prev) => [data.conversation, ...prev]);
        setSelectedConvId(data.conversation.id);
        setMessagesList([]);
        setStreamingText("");
        setAttachedDocs([]);
        setAttachedNotes([]);
        toast.success("New study workspace initialized.");
        if (window.innerWidth < 768) {
          setShowSidebarMobile(false);
        }
        return data.conversation.id;
      }
    } catch (err) {
      toast.error("Failed to spin up new workspace.");
    }
    return null;
  };

  useEffect(() => {
    if (token && localStorage.getItem("trigger-new-ai-chat") === "true") {
      localStorage.removeItem("trigger-new-ai-chat");
      handleCreateNewConversation();
    }
  }, [token]);

  useEffect(() => {
    const activeId = localStorage.getItem("active-conversation-id");
    if (activeId && conversations.length > 0) {
      const parsed = parseInt(activeId, 10);
      const convToOpen = conversations.find((c) => c.id === parsed);
      if (convToOpen) {
        localStorage.removeItem("active-conversation-id");
        setSelectedConvId(convToOpen.id);
      }
    }
  }, [conversations]);

  // Rename conversation in db
  const handleRenameSubmit = async (id: number) => {
    if (!token || !renameTitle.trim()) return;
    try {
      const res = await fetch(`/api/ai/conversations/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: renameTitle.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: data.conversation.title } : c))
        );
        setEditingConvId(null);
        toast.success("Workspace renamed successfully.");
      }
    } catch (err) {
      toast.error("Failed to rename conversation.");
    }
  };

  // Delete conversation (Soft Delete)
  const handleDeleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    if (!window.confirm("Are you sure you want to delete this conversation? This action is reversible.")) return;

    try {
      const res = await fetch(`/api/ai/conversations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (selectedConvId === id) {
          setSelectedConvId(null);
          setMessagesList([]);
        }
        toast.success("Conversation cleared from study index.");
      }
    } catch (err) {
      toast.error("Failed to delete conversation.");
    }
  };

  // Stop current active streaming generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      toast.info("AI generation stopped by user.");
    }
  };

  // Post new user message & run streaming AI response
  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend || inputMessage;
    if (!rawText.trim() || isGenerating) return;

    // Set active conversation context if none exists
    let activeId = selectedConvId;
    if (!activeId) {
      // Create a conversation first before sending, and get its ID
      const newId = await handleCreateNewConversation(rawText.trim().slice(0, 30) + "...");
      if (!newId) return;
      activeId = newId;
    }

    if (!token) return;

    setInputMessage("");
    setIsGenerating(true);
    setStreamingText("");

    // Setup streaming connection using fetch with ReadableStream
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // 1. Add message client-side optimistically
      const optimisticUserMsg: Message = {
        id: Date.now(),
        role: "user",
        content: rawText.trim(),
        createdAt: new Date().toISOString()
      };
      setMessagesList((prev) => [...prev, optimisticUserMsg]);

      // 2. Fetch streaming text SSE
      const response = await fetch(`/api/ai/conversations/${activeId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          content: rawText.trim(),
          stream: true,
          settings: {
            preferredModel: aiSettings.preferredModel,
            temperature: aiSettings.temperature,
            responseLength: aiSettings.responseLength,
            systemPrompt: aiSettings.systemPrompt
          },
          documentIds: attachedDocs.map((d) => d.id),
          noteIds: attachedNotes.map((n) => n.id)
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error("Academic engine returned an error response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (!reader) {
        throw new Error("Unable to establish readable data channel");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // keep incomplete last line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.slice(6);
            if (dataStr === "[DONE]") {
              break;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.event === "chunk" && parsed.text) {
                setStreamingText((prev) => prev + parsed.text);
              } else if (parsed.event === "start" && parsed.userMessage) {
                // Overwrite our optimistic user message with the database persisted message
                setMessagesList((prev) =>
                  prev.map((msg, idx) => (idx === prev.length - 1 ? parsed.userMessage : msg))
                );
              } else if (parsed.event === "done" && parsed.message) {
                // Persistent response loaded from server
                const responseMsg: Message = parsed.message;
                setMessagesList((prev) => [...prev, responseMsg]);
                setStreamingText("");
              } else if (parsed.event === "error") {
                throw new Error(parsed.error || "Streaming error occurred");
              }
            } catch (jsonErr) {
              // Fragment parse errors are handled safely
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        // Safe, clean stopping condition
      } else {
        console.error(err);
        toast.error(err.message || "Communication loop with Gemini timed out.");
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // Regenerate Response (Removes last model response, runs stream from last user query)
  const handleRegenerateResponse = async () => {
    if (!selectedConvId || !token || isGenerating) return;

    // Find last user message to feed back into the stream
    const userMessages = messagesList.filter((m) => m.role === "user");
    if (userMessages.length === 0) {
      toast.info("No query prompt is available to regenerate.");
      return;
    }

    const lastUserQuery = userMessages[userMessages.length - 1].content;

    try {
      // Call DELETE on server to pop the last model message (if any)
      const lastMsg = messagesList[messagesList.length - 1];
      if (lastMsg && lastMsg.role === "model") {
        await fetch(`/api/ai/conversations/${selectedConvId}/messages/last`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        // Pop the last message from state
        setMessagesList((prev) => prev.slice(0, -1));
      }

      // Re-fire send sequence
      await handleSendMessage(lastUserQuery);
    } catch (err) {
      toast.error("Failed to pop last response context.");
    }
  };

  // Copy assistant response text to clipboard
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Response copied to clipboard.");
  };

  // Export specific message's content directly to a personalized flashcard study deck
  const [exportingMessageId, setExportingMessageId] = useState<number | null>(null);

  const handleExportMessageToFlashcards = async (messageId: number) => {
    if (!token || exportingMessageId) return;
    setExportingMessageId(messageId);
    toast.info("Analyzing model reply & drafting custom flashcard deck...");
    
    try {
      const res = await fetch("/api/learning/flashcards/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          messageId
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Success! Generated deck: "${data.deck.title}"`);
        // Save the deck ID so the Flashcards view will automatically open it on load
        localStorage.setItem("active-deck-id", data.deck.id.toString());
        setTimeout(() => {
          window.location.hash = "/dashboard/learning/flashcards";
        }, 600);
      } else {
        toast.error(data.error || "Failed to generate card deck from this response.");
      }
    } catch (err) {
      console.error(err);
      toast.error("A connection error occurred while exporting cards.");
    } finally {
      setExportingMessageId(null);
    }
  };

  // Handle Search Input matching
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    loadConversations(val);
  };

  const selectedConversationDetail = conversations.find((c) => c.id === selectedConvId);

  return (
    <div className="w-full max-w-7xl mx-auto h-[calc(100vh-10rem)] flex border border-slate-200/60 dark:border-slate-800/60 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-md">
      
      {/* SIDEBAR LIST */}
      <div
        className={`${
          showSidebarMobile ? "flex" : "hidden"
        } md:flex flex-col w-full md:w-80 border-r border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 h-full`}
      >
        {/* Sidebar Header & Start New Chat */}
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">
              Study Log
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCreateNewConversation()}
              className="gap-1 text-xs cursor-pointer h-8 border-violet-200 hover:border-violet-300 hover:bg-violet-50/30 text-violet-700 dark:border-violet-950 dark:text-violet-400"
            >
              <Plus className="h-3 w-3" />
              New Chat
            </Button>
          </div>

          {/* Chat Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Scrollable List items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingList ? (
            <div className="flex items-center justify-center py-10 text-xs text-slate-400 font-medium">
              <Loader2 className="h-4 w-4 animate-spin mr-1.5 text-violet-600" />
              Loading archives...
            </div>
          ) : conversations.length > 0 ? (
            conversations.map((conv) => {
              const isSelected = conv.id === selectedConvId;
              const isEditing = editingConvId === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => !isEditing && handleSelectConversation(conv.id)}
                  className={`group relative w-full flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-violet-100/60 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border border-violet-200/40 dark:border-violet-900/40"
                      : "text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <MessageSquare className={`h-4 w-4 shrink-0 ${isSelected ? "text-violet-600" : "text-slate-400"}`} />
                    {isEditing ? (
                      <input
                        type="text"
                        value={renameTitle}
                        onChange={(e) => setRenameTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit(conv.id)}
                        onBlur={() => setEditingConvId(null)}
                        className="bg-white dark:bg-slate-950 text-xs px-1.5 py-0.5 rounded border border-violet-500 outline-none w-full"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="truncate pr-4 leading-normal">{conv.title}</span>
                    )}
                  </div>

                  {/* Inline item actions */}
                  {!isEditing && (
                    <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 bg-gradient-to-l from-slate-50 dark:from-slate-900 pl-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingConvId(conv.id);
                          setRenameTitle(conv.title);
                        }}
                        className="p-1 hover:text-violet-600 dark:hover:text-violet-400 text-slate-400"
                        title="Rename conversation"
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        className="p-1 hover:text-rose-600 text-slate-400"
                        title="Delete conversation"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 text-xs text-slate-400 font-medium">
              No archives matched query.
            </div>
          )}
        </div>
      </div>

      {/* CHAT THREAD VIEW */}
      <div
        className={`${
          !showSidebarMobile ? "flex" : "hidden"
        } md:flex flex-col flex-1 h-full min-w-0 bg-white dark:bg-slate-950`}
      >
        {/* Thread Header */}
        <div className="h-14 px-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between shrink-0 bg-white dark:bg-slate-950">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Mobile Sidebar back trigger */}
            <button
              onClick={() => setShowSidebarMobile(true)}
              className="md:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-500 shrink-0"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate">
                {selectedConversationDetail ? selectedConversationDetail.title : "New Academic Discussion"}
              </h1>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5 text-violet-500 animate-pulse" />
                Powered by Gemini • {aiSettings.preferredModel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-semibold bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 px-2 py-0.5 rounded">
              Temp: {aiSettings.temperature}
            </span>
          </div>
        </div>

        {selectedConvId && (
          <div className="border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/10 px-4 py-2 flex flex-col gap-1.5 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center text-violet-600 dark:text-violet-400">
                  <Paperclip className="h-3.5 w-3.5" />
                </div>
                <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  {attachedDocs.length === 0 && attachedNotes.length === 0 ? (
                    <span className="text-slate-400 dark:text-slate-500">
                      No context selected. Running standard chat.
                    </span>
                  ) : (
                    <span>
                      Using <span className="font-bold text-violet-600 dark:text-violet-400">{attachedDocs.length} document{attachedDocs.length !== 1 ? 's' : ''}</span> and <span className="font-bold text-violet-600 dark:text-violet-400">{attachedNotes.length} note{attachedNotes.length !== 1 ? 's' : ''}</span> for intelligent recall
                    </span>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  loadSelectorData();
                  setIsSelectorOpen(true);
                }}
                className="gap-1.5 text-[11px] h-7 px-2.5 border-slate-200 hover:border-violet-300 hover:bg-violet-50/20 text-slate-700 dark:text-slate-300 dark:border-slate-800 dark:hover:border-violet-900"
              >
                <SlidersHorizontal className="h-3 w-3 text-violet-500" />
                Link Sources
              </Button>
            </div>

            {/* Selected items chips */}
            <AnimatePresence>
              {(attachedDocs.length > 0 || attachedNotes.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-1.5 pt-0.5 pb-1 overflow-hidden"
                >
                  {attachedDocs.map((doc) => (
                    <motion.div
                      key={`doc-${doc.id}`}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100/80 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 shadow-sm"
                    >
                      {getDocIcon(doc.mimeType, doc.extension)}
                      <span className="max-w-[120px] truncate font-medium">{doc.originalName}</span>
                      {getSubjectBadge(doc.subjectId)}
                      <button
                        onClick={() => handleRemoveDocument(doc.id)}
                        className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </motion.div>
                  ))}

                  {attachedNotes.map((note) => (
                    <motion.div
                      key={`note-${note.id}`}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100/80 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 shadow-sm"
                    >
                      <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                      <span className="max-w-[120px] truncate font-medium">{note.title}</span>
                      {getSubjectBadge(note.subjectId)}
                      <button
                        onClick={() => handleRemoveNote(note.id)}
                        className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Messaging Board scroll */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-6">
          {loadingMessages ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
              <p className="text-xs font-semibold uppercase tracking-wider font-mono">
                Decompressing history logs...
              </p>
            </div>
          ) : messagesList.length > 0 ? (
            <div className="space-y-6">
              {messagesList.map((msg) => {
                const isModel = msg.role === "model";
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3.5 max-w-full ${
                      isModel ? "justify-start" : "justify-end"
                    }`}
                  >
                    {/* Bot avatar */}
                    {isModel && (
                      <div className="h-8 w-8 rounded-xl bg-violet-100 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0 shadow-sm">
                        <Bot className="h-4.5 w-4.5" />
                      </div>
                    )}

                    {/* Chat Bubble container */}
                    <div
                      className={`relative max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 text-xs leading-relaxed space-y-1 shadow-sm border ${
                        isModel
                          ? "bg-slate-50/70 dark:bg-slate-900/60 border-slate-200/50 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                          : "bg-violet-600 border-violet-500 text-white font-medium"
                      }`}
                    >
                      {/* Message Content */}
                      {isModel ? (
                        <div className="pr-4 pb-1">
                          <MarkdownRenderer content={msg.content} />
                          {msg.sources && (() => {
                            try {
                              const parsedSources = JSON.parse(msg.sources);
                              if (Array.isArray(parsedSources) && parsedSources.length > 0) {
                                return (
                                  <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 space-y-1.5">
                                    <p className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                      <BookOpen className="h-3 w-3 text-violet-500" />
                                      Grounded Sources ({parsedSources.length})
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {parsedSources.map((src: any) => (
                                        <button
                                          key={`${src.type}-${src.id}`}
                                          onClick={() => handleOpenSourceViewer(src.type, src.id, src.title)}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-violet-50/50 dark:bg-violet-950/25 border border-violet-100/60 dark:border-violet-900/40 text-[10px] text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-all font-medium cursor-pointer"
                                        >
                                          {src.type === "note" ? (
                                            <FileText className="h-2.5 w-2.5 text-indigo-500 shrink-0" />
                                          ) : (
                                            <File className="h-2.5 w-2.5 text-violet-500 shrink-0" />
                                          )}
                                          <span className="truncate max-w-[120px]">{src.title}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                );
                              }
                            } catch (e) {
                              return null;
                            }
                            return null;
                          })()}
                        </div>
                      ) : (
                        <p className="whitespace-pre-line tracking-wide">{msg.content}</p>
                      )}

                      {/* Highly polished action bar beneath model replies */}
                      {isModel && (
                        <div className="flex items-center gap-3 pt-2 mt-3 border-t border-slate-200/40 dark:border-slate-850/60 text-[10px] text-slate-400 dark:text-slate-500 font-medium select-none">
                          <button
                            onClick={() => handleCopyText(msg.content)}
                            className="hover:text-violet-600 dark:hover:text-violet-400 flex items-center gap-1.5 cursor-pointer transition-colors"
                            title="Copy reply text"
                          >
                            <Copy className="h-3 w-3" />
                            <span>Copy response</span>
                          </button>

                          <span className="text-slate-300 dark:text-slate-800 font-normal">|</span>

                          <button
                            onClick={() => handleExportMessageToFlashcards(msg.id)}
                            disabled={exportingMessageId === msg.id}
                            className={`hover:text-violet-600 dark:hover:text-violet-400 flex items-center gap-1.5 cursor-pointer transition-colors ${
                              exportingMessageId === msg.id ? "opacity-60 cursor-not-allowed" : ""
                            }`}
                            title="Generate a custom flashcard deck from this AI response"
                          >
                            {exportingMessageId === msg.id ? (
                              <Loader2 className="h-3 w-3 animate-spin text-violet-500 shrink-0" />
                            ) : (
                              <Layers className="h-3 w-3 text-violet-500 shrink-0" />
                            )}
                            <span>{exportingMessageId === msg.id ? "Drafting deck..." : "Export to Flashcards"}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* User avatar */}
                    {!isModel && (
                      <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0 shadow-sm">
                        <UserIcon className="h-4.5 w-4.5" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Real-time Streaming message box */}
              {streamingText && (
                <div className="flex gap-3.5 max-w-full justify-start">
                  <div className="h-8 w-8 rounded-xl bg-violet-100 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0 shadow-sm">
                    <Bot className="h-4.5 w-4.5 animate-pulse" />
                  </div>
                  <div className="max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 text-xs leading-relaxed border bg-slate-50/70 dark:bg-slate-900/60 border-slate-200/50 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-sm">
                    <MarkdownRenderer content={streamingText} />
                  </div>
                </div>
              )}

              {/* Real-time Loading typing indicators */}
              {isGenerating && !streamingText && (
                <div className="flex gap-3.5 max-w-full justify-start">
                  <div className="h-8 w-8 rounded-xl bg-violet-100 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0 shadow-sm">
                    <Bot className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex items-center gap-1.5 px-4 py-3 border rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/40 dark:border-slate-850/50">
                    <div className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}

              <div ref={scrollRef} />
            </div>
          ) : (
            /* Empty State Socratic Suggestions prompts */
            <div className="h-full flex flex-col justify-center items-center py-10 text-center max-w-md mx-auto space-y-6">
              <div className="h-14 w-14 rounded-2xl bg-violet-500/10 dark:bg-violet-400/10 flex items-center justify-center text-violet-600 dark:text-violet-400 shadow-sm">
                <Sparkles className="h-7 w-7 text-violet-600 dark:text-violet-400 animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Welcome to AI Intelligent Study Companion
                </h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal">
                  Fire up high-fidelity academic queries, request complex summaries, draft instant multiple-choice quizzes, or study with adaptive Socratic memory feedback.
                </p>
              </div>

              {/* Grid of prompts */}
              <div className="w-full grid gap-3">
                {ACADEMIC_PROMPTS.map((ap, idx) => {
                  const PromptIcon = ap.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(ap.prompt)}
                      className="w-full flex items-start gap-3 p-3 border border-slate-200/60 dark:border-slate-800 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer text-xs"
                    >
                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${ap.color}`}>
                        <PromptIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[11px] text-slate-700 dark:text-slate-300">
                          {ap.title}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate leading-normal">
                          {ap.prompt}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Input Controller Area */}
        <div className="p-4 border-t border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-950 flex flex-col gap-2 shrink-0">
          
          {/* Thread action utility (Abort, Regenerate) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {isGenerating ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStopGeneration}
                  className="gap-1 text-[10px] h-7 border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-rose-950 text-rose-500 dark:hover:bg-rose-950/25"
                >
                  <Square className="h-2.5 w-2.5 fill-current" />
                  Stop Generation
                </Button>
              ) : (
                messagesList.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerateResponse}
                    className="gap-1 text-[10px] h-7"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    Regenerate response
                  </Button>
                )
              )}
            </div>
            
            {/* Preferred model tag */}
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-1.5 py-0.5 rounded">
              Model: {aiSettings.preferredModel}
            </span>
          </div>

          {/* Form input bar */}
          <div className="flex items-center gap-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isGenerating}
              placeholder={
                selectedConvId
                  ? "Socratic prompt or study query (Enter to send, Shift+Enter for new line)..."
                  : "Type a query and press Enter to spin up a new study discussion..."
              }
              className="flex-1 max-h-24 min-h-[2.5rem] py-2 px-3 text-xs border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl outline-none focus:border-violet-500 text-slate-800 dark:text-slate-100 resize-none disabled:opacity-50 font-sans leading-normal"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isGenerating}
              className="h-10 w-10 shrink-0 rounded-xl bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center shadow-md shadow-violet-500/10 cursor-pointer disabled:opacity-40 disabled:hover:bg-violet-600 transition-all"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>

      </div>

      <Dialog
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        title="Link Study Context"
      >
        <div className="flex flex-col gap-4 max-h-[70vh]">
          {/* Tabs Selector */}
          <div className="flex border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={() => {
                setSelectorTab("documents");
                setSelectorSearch("");
              }}
              className={`flex-1 pb-2.5 text-xs font-semibold text-center border-b-2 transition-all ${
                selectorTab === "documents"
                  ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
                  : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
            >
              Documents ({allDocs.length})
            </button>
            <button
              onClick={() => {
                setSelectorTab("notes");
                setSelectorSearch("");
              }}
              className={`flex-1 pb-2.5 text-xs font-semibold text-center border-b-2 transition-all ${
                selectorTab === "notes"
                  ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
                  : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
            >
              Study Notes ({allNotes.length})
            </button>
          </div>

          {/* Search bar inside dialog */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={selectorSearch}
              onChange={(e) => setSelectorSearch(e.target.value)}
              placeholder={
                selectorTab === "documents"
                  ? "Search documents by name..."
                  : "Search study notes by title..."
              }
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none text-slate-800 dark:text-slate-100 focus:border-violet-500"
            />
          </div>

          {/* List area */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[250px] max-h-[350px]">
            {isLoadingSelectorData ? (
              <div className="flex flex-col items-center justify-center py-12 text-xs text-slate-400 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
                <span>Loading vault assets...</span>
              </div>
            ) : selectorTab === "documents" ? (
              allDocs.filter((doc) =>
                doc.originalName.toLowerCase().includes(selectorSearch.toLowerCase())
              ).length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400">
                  {allDocs.length === 0 ? (
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-500">Your Document Vault is empty</p>
                      <p className="text-[10px] text-slate-400 max-w-xs mx-auto">Upload textbook chapters, reference PDFs, or class materials in the Documents manager to use them here.</p>
                    </div>
                  ) : (
                    "No documents match your query."
                  )}
                </div>
              ) : (
                allDocs
                  .filter((doc) =>
                    doc.originalName.toLowerCase().includes(selectorSearch.toLowerCase())
                  )
                  .map((doc) => {
                    const isAttached = attachedDocs.some((d) => d.id === doc.id);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => handleToggleDocumentSelection(doc)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                          isAttached
                            ? "bg-violet-50/50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-900/50"
                            : "border-slate-100 hover:bg-slate-50 dark:border-slate-800/40 dark:hover:bg-slate-900/40"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {getDocIcon(doc.mimeType, doc.extension)}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                              {doc.originalName}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] font-mono text-slate-400">
                                {(doc.size / 1024 / 1024).toFixed(2)} MB
                              </span>
                              {getSubjectBadge(doc.subjectId)}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                            isAttached
                              ? "bg-violet-600 border-violet-600 text-white shadow-sm"
                              : "border-slate-300 dark:border-slate-700"
                          }`}
                        >
                          {isAttached && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })
              )
            ) : (
              allNotes.filter((note) =>
                note.title.toLowerCase().includes(selectorSearch.toLowerCase())
              ).length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400">
                  {allNotes.length === 0 ? (
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-500">No notes found</p>
                      <p className="text-[10px] text-slate-400 max-w-xs mx-auto">Create beautiful study notes in the Notes area to link and ground your AI dialogues.</p>
                    </div>
                  ) : (
                    "No study notes match your query."
                  )}
                </div>
              ) : (
                allNotes
                  .filter((note) =>
                    note.title.toLowerCase().includes(selectorSearch.toLowerCase())
                  )
                  .map((note) => {
                    const isAttached = attachedNotes.some((n) => n.id === note.id);
                    return (
                      <div
                        key={note.id}
                        onClick={() => handleToggleNoteSelection(note)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                          isAttached
                            ? "bg-violet-50/50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-900/50"
                            : "border-slate-100 hover:bg-slate-50 dark:border-slate-800/40 dark:hover:bg-slate-900/40"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                              {note.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] text-slate-400 font-medium">
                                Note
                              </span>
                              {getSubjectBadge(note.subjectId)}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                            isAttached
                              ? "bg-violet-600 border-violet-600 text-white shadow-sm"
                              : "border-slate-300 dark:border-slate-700"
                          }`}
                        >
                          {isAttached && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })
              )
            )}
          </div>

          {/* Footer stats summary */}
          <div className="text-[10px] text-slate-400 dark:text-slate-500 flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-3">
            <span>Click to toggle linking status. Links persist inside the active discussion.</span>
            <Button
              size="sm"
              onClick={() => setIsSelectorOpen(false)}
              className="bg-violet-600 hover:bg-violet-700 text-white font-semibold"
            >
              Done
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Grounded Source Viewer Modal */}
      <Dialog
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        title={viewerTitle}
      >
        <div className="flex flex-col gap-4 max-h-[80vh] w-full min-h-[300px]">
          {viewerType === "note" ? (
            <div className="flex-1 overflow-y-auto pr-1">
              {isLoadingViewer ? (
                <div className="flex flex-col items-center justify-center py-20 text-xs text-slate-400 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
                  <span>Fetching study note...</span>
                </div>
              ) : (
                <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  {viewerContent || "*Empty note*"}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-[450px]">
              {/* Toggle Switcher */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3 shrink-0">
                <div className="flex gap-2">
                  <button
                    onClick={() => setDocPreviewMode("text")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      docPreviewMode === "text"
                        ? "bg-indigo-500 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    Text Reader
                  </button>
                  <button
                    onClick={() => setDocPreviewMode("visual")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      docPreviewMode === "visual"
                        ? "bg-indigo-500 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    Original PDF / Layout
                  </button>
                </div>
                <span className="text-[10px] text-slate-400">
                  {docPreviewMode === "text"
                    ? "⚡ Clean reading layout (active)"
                    : "⚠️ Native PDF plugins may be blocked inside frames"}
                </span>
              </div>

              {/* View Pane */}
              <div className="flex-1 min-h-[350px] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-950 flex flex-col">
                {docPreviewMode === "text" ? (
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                    {isLoadingViewer ? (
                      <div className="h-full flex flex-col items-center justify-center py-20 text-xs text-slate-400 gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                        <span>Processing and extracting document content...</span>
                      </div>
                    ) : (
                      <div className="text-xs leading-relaxed whitespace-pre-wrap select-text break-words font-sans">
                        {viewerContent || "No readable text content found in document."}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 relative">
                    {viewerTitle.toLowerCase().endsWith(".pdf") && viewerId ? (
                      <div className="absolute inset-0">
                        <PDFCanvasViewer documentId={viewerId} token={token} />
                      </div>
                    ) : (
                      <iframe
                        src={`/api/documents/${viewerId}/preview?token=${token}`}
                        className="absolute inset-0 w-full h-full border-none bg-white dark:bg-slate-900"
                        title={viewerTitle}
                      />
                    )}
                  </div>
                )}
                
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-500 gap-4">
                  <span className="truncate">If the preview doesn't load automatically, download the file below.</span>
                  <a
                    href={`/api/documents/${viewerId}/download?token=${token}`}
                    download
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all cursor-pointer shadow-sm text-[10px] shrink-0"
                  >
                    Download File
                  </a>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end border-t border-slate-100 dark:border-slate-800 pt-3">
            <Button
              size="sm"
              onClick={() => setIsViewerOpen(false)}
              className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
