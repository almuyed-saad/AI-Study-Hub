import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../auth/hooks/use-auth.tsx";
import { useToast } from "../../../components/ui/Toast.tsx";
import { motion, AnimatePresence } from "motion/react";
import { PDFCanvasViewer } from "../../../components/PDFCanvasViewer.tsx";
import {
  FolderOpen,
  UploadCloud,
  FileText,
  File,
  Trash2,
  Download,
  Eye,
  Edit2,
  Link2,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Grid,
  List,
  Search,
  ArrowUpDown,
  SlidersHorizontal,
  HardDrive,
  ExternalLink,
  XCircle,
  RotateCcw,
  FileImage,
  Paperclip,
  Check,
  ChevronRight,
  Info
} from "lucide-react";

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

interface StorageStats {
  totalBytes: number;
  totalCount: number;
  categories: {
    pdf: number;
    image: number;
    text: number;
    word: number;
    other: number;
  };
  maxQuotaBytes: number;
}

interface Subject {
  id: number;
  title: string;
  color: string;
}

interface Note {
  id: number;
  title: string;
  color: string;
}

interface ActiveUpload {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "completed" | "failed" | "cancelled";
  xhr?: XMLHttpRequest;
  error?: string;
}

export function DocumentsView() {
  const { token } = useAuth();
  const toast = useToast();

  // Core Data State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<StorageStats>({
    totalBytes: 0,
    totalCount: 0,
    categories: { pdf: 0, image: 0, text: 0, word: 0, other: 0 },
    maxQuotaBytes: 10 * 1024 * 1024 * 1024,
  });
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  // UI Control State
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  
  // Modals & Sliders State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Preview fallback states for Chrome iframe blocks
  const [extractedText, setExtractedText] = useState<string>("");
  const [isLoadingText, setIsLoadingText] = useState<boolean>(false);
  const [textError, setTextError] = useState<string>("");
  const [previewMode, setPreviewMode] = useState<"visual" | "text">("text");

  // Load extracted text whenever a document preview opens
  useEffect(() => {
    if (isPreviewOpen && selectedDoc) {
      const ext = selectedDoc.extension.toLowerCase();
      // Default to text view for PDF because browsers in frames block PDF plugins
      if (ext === ".pdf" || ext === ".docx" || ext === ".txt" || ext === ".md") {
        setPreviewMode(ext === ".pdf" ? "text" : "visual");
        setExtractedText("");
        setIsLoadingText(true);
        setTextError("");

        fetch(`/api/documents/${selectedDoc.id}/text`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then((res) => {
            if (!res.ok) throw new Error("Failed to load text content");
            return res.json();
          })
          .then((data) => {
            if (data.success || data.text !== undefined) {
              setExtractedText(data.text || "");
            } else {
              setTextError(data.error || "Failed to load extracted text.");
            }
          })
          .catch((err) => {
            console.error(err);
            setTextError("Could not fetch extracted text of document.");
          })
          .finally(() => {
            setIsLoadingText(false);
          });
      } else {
        setPreviewMode("visual");
      }
    }
  }, [isPreviewOpen, selectedDoc, token]);

  // Edit forms state
  const [docToRename, setDocToRename] = useState<Document | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [docToLink, setDocToLink] = useState<Document | null>(null);
  const [linkSubjectId, setLinkSubjectId] = useState<string>("");
  const [linkNoteId, setLinkNoteId] = useState<string>("");

  // Search, Sort, Filter state
  const [searchVal, setSearchVal] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mimeTypeGroup, setMimeTypeGroup] = useState<string>("all");
  const [subjectIdFilter, setSubjectIdFilter] = useState<string>("all");
  const [noteIdFilter, setNoteIdFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "size" | "createdAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewTrash, setViewTrash] = useState(false);

  // Upload Management State
  const [activeUploads, setActiveUploads] = useState<ActiveUpload[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lastFetchIdRef = useRef(0);
  const lastStatsFetchIdRef = useRef(0);

  // Debounce search input value to avoid race conditions and spamming the backend
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchQuery(searchVal);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchVal]);

  // Fetch all documents matching current filter sets
  const fetchDocuments = async () => {
    if (!token) return;
    const fetchId = ++lastFetchIdRef.current;
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append("search", searchQuery);
      if (mimeTypeGroup && mimeTypeGroup !== "all") queryParams.append("mimeTypeGroup", mimeTypeGroup);
      
      if (subjectIdFilter === "unassigned") {
        queryParams.append("subjectId", "0");
      } else if (subjectIdFilter !== "all" && subjectIdFilter !== "") {
        queryParams.append("subjectId", subjectIdFilter);
      }

      if (noteIdFilter === "unassigned") {
        queryParams.append("noteId", "0");
      } else if (noteIdFilter !== "all" && noteIdFilter !== "") {
        queryParams.append("noteId", noteIdFilter);
      }

      queryParams.append("sortBy", sortBy);
      queryParams.append("sortOrder", sortOrder);
      if (viewTrash) {
        queryParams.append("includeDeleted", "true");
      }

      const response = await fetch(`/api/documents?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch documents.");
      const data = await response.json();
      if (fetchId === lastFetchIdRef.current) {
        if (data.success) {
          setDocuments(data.documents);
        }
      }
    } catch (err: any) {
      console.error(err);
      if (fetchId === lastFetchIdRef.current) {
        toast.error("Failed to load your study documents.");
      }
    } finally {
      if (fetchId === lastFetchIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Fetch storage stats
  const fetchStats = async () => {
    if (!token) return;
    const fetchId = ++lastStatsFetchIdRef.current;
    setIsStatsLoading(true);
    try {
      const response = await fetch("/api/documents/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch stats.");
      const data = await response.json();
      if (fetchId === lastStatsFetchIdRef.current) {
        if (data.success) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (fetchId === lastStatsFetchIdRef.current) {
        setIsStatsLoading(false);
      }
    }
  };

  // Fetch subjects & notes for dropdown linking
  const fetchSubjectsAndNotes = async () => {
    if (!token) return;
    try {
      const subRes = await fetch("/api/subjects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const noteRes = await fetch("/api/notes", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (subRes.ok) {
        const subData = await subRes.json();
        if (subData.success) setSubjects(subData.subjects);
      }
      if (noteRes.ok) {
        const noteData = await noteRes.json();
        if (noteData.success) setNotes(noteData.notes);
      }
    } catch (err) {
      console.error("Failed to retrieve subjects/notes for referencing:", err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDocuments();
      fetchStats();
      fetchSubjectsAndNotes();
    }
  }, [token, searchQuery, mimeTypeGroup, subjectIdFilter, noteIdFilter, sortBy, sortOrder, viewTrash]);

  useEffect(() => {
    if (localStorage.getItem("trigger-upload-document") === "true") {
      localStorage.removeItem("trigger-upload-document");
      setIsUploadOpen(true);
    }
  }, []);

  useEffect(() => {
    const activeId = localStorage.getItem("active-document-id");
    if (activeId && documents.length > 0) {
      const parsed = parseInt(activeId, 10);
      const docToOpen = documents.find((d) => d.id === parsed);
      if (docToOpen) {
        localStorage.removeItem("active-document-id");
        setSelectedDoc(docToOpen);
        setIsPreviewOpen(true);
      }
    }
  }, [documents]);

  // Handle Drag Events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(e.target.files);
    }
  };

  // File Validation & Initialization
  const handleFilesSelected = (files: FileList) => {
    const list: File[] = Array.from(files);
    const DANGEROUS_EXTENSIONS = [
      ".exe", ".bat", ".cmd", ".sh", ".msi", ".js", ".vbs", 
      ".scr", ".com", ".pif", ".jar", ".sys", ".dll", ".py"
    ];

    const initialUploads: ActiveUpload[] = list.map((file) => {
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      let status: "uploading" | "failed" = "uploading";
      let error = "";

      // Client-side validations
      if (file.size > 15 * 1024 * 1024) {
        status = "failed";
        error = "File size exceeds 15MB limit.";
      } else if (DANGEROUS_EXTENSIONS.includes(ext)) {
        status = "failed";
        error = "Executable/script files are restricted.";
      }

      return {
        id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        progress: status === "failed" ? 0 : 5,
        status,
        error,
      };
    });

    setActiveUploads((prev) => [...initialUploads, ...prev]);
    setIsUploadOpen(true);

    // Trigger upload for valid ones
    initialUploads.forEach((uploadObj) => {
      if (uploadObj.status === "uploading") {
        uploadFileWithXHR(uploadObj);
      }
    });
  };

  // Core XHR Upload Handler with real-time Progress, Abort, and Retry
  const uploadFileWithXHR = (uploadObj: ActiveUpload) => {
    if (!token) return;

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("files", uploadObj.file);

    // Save XHR instance back to object for cancellations
    setActiveUploads((prev) =>
      prev.map((item) => (item.id === uploadObj.id ? { ...item, xhr } : item))
    );

    // Track upload progress
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        // Map 0-100 to standard 5-95 so server confirmation represents final 5%
        const displayProgress = Math.max(5, Math.min(95, percent));
        setActiveUploads((prev) =>
          prev.map((item) => (item.id === uploadObj.id ? { ...item, progress: displayProgress } : item))
        );
      }
    };

    // On Load (Request Done)
    xhr.onload = () => {
      if (xhr.status === 201 || xhr.status === 200) {
        setActiveUploads((prev) =>
          prev.map((item) => (item.id === uploadObj.id ? { ...item, progress: 100, status: "completed" } : item))
        );
        toast.success(`Successfully uploaded '${uploadObj.file.name}'`);
        // Refresh items and quotas
        fetchDocuments();
        fetchStats();

        // Auto-clear row after 2 seconds to keep the active uploads slider/panel clean
        setTimeout(() => {
          setActiveUploads((prev) => prev.filter((item) => item.id !== uploadObj.id));
        }, 2000);
      } else {
        let errorMsg = "Upload failed.";
        try {
          const parsed = JSON.parse(xhr.responseText);
          errorMsg = parsed.error || errorMsg;
        } catch (_) {}

        setActiveUploads((prev) =>
          prev.map((item) => (item.id === uploadObj.id ? { ...item, status: "failed", error: errorMsg } : item))
        );
        toast.error(`Failed to upload '${uploadObj.file.name}': ${errorMsg}`);
      }
    };

    // On Error
    xhr.onerror = () => {
      setActiveUploads((prev) =>
        prev.map((item) => (item.id === uploadObj.id ? { ...item, status: "failed", error: "Network error occurred." } : item))
      );
      toast.error(`Network error uploading '${uploadObj.file.name}'`);
    };

    // On Abort
    xhr.onabort = () => {
      setActiveUploads((prev) =>
        prev.map((item) => (item.id === uploadObj.id ? { ...item, status: "cancelled", progress: 0 } : item))
      );
    };

    // Open & Authorize
    xhr.open("POST", "/api/documents/upload");
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(formData);
  };

  // Cancel single upload
  const handleCancelUpload = (id: string) => {
    const uploadObj = activeUploads.find((item) => item.id === id);
    if (uploadObj && uploadObj.xhr) {
      uploadObj.xhr.abort();
    } else {
      setActiveUploads((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: "cancelled" } : item))
      );
    }
  };

  // Retry failed upload
  const handleRetryUpload = (id: string) => {
    const uploadObj = activeUploads.find((item) => item.id === id);
    if (uploadObj) {
      setActiveUploads((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: "uploading", progress: 5, error: undefined } : item))
      );
      uploadFileWithXHR({ ...uploadObj, status: "uploading", progress: 5, error: undefined });
    }
  };

  // Clear single upload row from state list
  const handleClearUploadRow = (id: string) => {
    setActiveUploads((prev) => prev.filter((item) => item.id !== id));
  };

  // Soft Delete file
  const handleSoftDelete = async (docId: number) => {
    if (!token) return;
    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Deletion failed.");
      const data = await response.json();
      if (data.success) {
        toast.success(`'${data.document.originalName}' soft-deleted.`);
        if (selectedDoc?.id === docId) {
          setIsDetailsOpen(false);
          setSelectedDoc(null);
        }
        fetchDocuments();
        fetchStats();
      }
    } catch (err) {
      toast.error("Failed to delete document.");
    }
  };

  // Restore file from Trash
  const handleRestore = async (docId: number) => {
    if (!token) return;
    try {
      const response = await fetch(`/api/documents/${docId}/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Restoration failed.");
      const data = await response.json();
      if (data.success) {
        toast.success(`'${data.document.originalName}' restored.`);
        fetchDocuments();
        fetchStats();
      }
    } catch (err) {
      toast.error("Failed to restore document.");
    }
  };

  // Hard Delete file from system
  const handleHardDelete = async (docId: number) => {
    if (!token) return;
    if (!window.confirm("Are you absolutely sure you want to permanently delete this document from disk? This cannot be undone.")) return;
    try {
      const response = await fetch(`/api/documents/${docId}/hard-delete`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Purging failed.");
      const data = await response.json();
      if (data.success) {
        toast.success(`'${data.document.originalName}' permanently purged.`);
        if (selectedDoc?.id === docId) {
          setIsDetailsOpen(false);
          setSelectedDoc(null);
        }
        fetchDocuments();
        fetchStats();
      }
    } catch (err) {
      toast.error("Failed to permanently delete document.");
    }
  };

  // Rename action
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !docToRename || !renameValue.trim()) return;

    try {
      const response = await fetch(`/api/documents/${docToRename.id}/rename`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: renameValue.trim() }),
      });

      if (!response.ok) throw new Error("Rename failed.");
      const data = await response.json();
      if (data.success) {
        toast.success(`Renamed successfully to '${data.document.originalName}'`);
        setIsRenameOpen(false);
        setDocToRename(null);
        fetchDocuments();
      }
    } catch (err) {
      toast.error("Failed to rename file.");
    }
  };

  // Subject/Note Associate Link action
  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !docToLink) return;

    try {
      const response = await fetch(`/api/documents/${docToLink.id}/link`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subjectId: linkSubjectId === "unassign" ? null : linkSubjectId ? parseInt(linkSubjectId, 10) : undefined,
          noteId: linkNoteId === "unassign" ? null : linkNoteId ? parseInt(linkNoteId, 10) : undefined,
        }),
      });

      if (!response.ok) throw new Error("Linking failed.");
      const data = await response.json();
      if (data.success) {
        toast.success("Document links updated.");
        setIsLinkOpen(false);
        setDocToLink(null);
        fetchDocuments();
      }
    } catch (err) {
      toast.error("Failed to update link reference.");
    }
  };

  // Helpers
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const getFileIcon = (ext: string, mime: string) => {
    const cleanExt = ext.toLowerCase();
    if (cleanExt === ".pdf") {
      return <FileText className="w-10 h-10 text-rose-500" />;
    } else if ([".png", ".jpg", ".jpeg", ".webp"].includes(cleanExt) || mime.startsWith("image/")) {
      return <FileImage className="w-10 h-10 text-emerald-500" />;
    } else if ([".txt", ".md"].includes(cleanExt)) {
      return <FileText className="w-10 h-10 text-slate-500" />;
    } else if ([".docx", ".doc"].includes(cleanExt)) {
      return <FileText className="w-10 h-10 text-sky-500" />;
    }
    return <File className="w-10 h-10 text-violet-500" />;
  };

  const getFileBadgeColor = (ext: string) => {
    const cleanExt = ext.toLowerCase();
    if (cleanExt === ".pdf") return "bg-rose-500/10 text-rose-500 border-rose-500/20";
    if ([".png", ".jpg", ".jpeg", ".webp"].includes(cleanExt)) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    if ([".txt", ".md"].includes(cleanExt)) return "bg-slate-500/10 text-slate-500 border-slate-500/20";
    if ([".docx", ".doc"].includes(cleanExt)) return "bg-sky-500/10 text-sky-500 border-sky-500/20";
    return "bg-violet-500/10 text-violet-500 border-violet-500/20";
  };

  const getSubjectColorAndTitle = (subId: number | null) => {
    if (!subId) return null;
    const s = subjects.find((sub) => sub.id === subId);
    return s ? { title: s.title, color: s.color } : null;
  };

  const getNoteColorAndTitle = (nId: number | null) => {
    if (!nId) return null;
    const n = notes.find((note) => note.id === nId);
    return n ? { title: n.title, color: n.color } : null;
  };

  const isPreviewable = (doc: Document) => {
    const ext = doc.extension.toLowerCase();
    return [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".txt", ".md"].includes(ext) || doc.mimeType.startsWith("image/");
  };

  // Percent stats
  const storagePercent = Math.min(100, (stats.totalBytes / stats.maxQuotaBytes) * 100);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6" id="documents-view-container">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4" id="documents-header">
        <div>
          <h1 className="text-3xl font-bold font-sans tracking-tight text-[#0f172a] dark:text-[#f1f5f9] flex items-center gap-3">
            <FolderOpen className="w-8 h-8 text-indigo-500" />
            Documents & Materials
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Store course documents, textbooks, lecture slides, and images safely and associate them directly with notes or courses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setViewTrash(!viewTrash);
              setSelectedDoc(null);
              setIsDetailsOpen(false);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition-all cursor-pointer ${
              viewTrash
                ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80"
            }`}
            id="toggle-trash-btn"
          >
            <Trash2 className="w-4 h-4" />
            {viewTrash ? "Show Active Files" : "View Trash / Soft-Deleted"}
          </button>

          <button
            onClick={triggerFileSelect}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            id="upload-trigger-btn"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Materials
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            multiple
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.docx,.doc"
            id="hidden-file-input"
          />
        </div>
      </div>

      {/* 2. Top Metric Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="documents-metrics-row">
        {/* Storage Quota Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3 shadow-xs">
          <div className="flex items-center justify-between text-slate-800 dark:text-slate-200">
            <span className="text-sm font-semibold flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-500" />
              Academic Storage Quota
            </span>
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
              Premium Active
            </span>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-2xl font-bold font-mono text-[#0f172a] dark:text-[#f1f5f9]">
                {formatBytes(stats.totalBytes)}
              </span>
              <span className="text-xs text-slate-400">
                of {formatBytes(stats.maxQuotaBytes)} used
              </span>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  storagePercent > 85 ? "bg-rose-500" : storagePercent > 60 ? "bg-amber-500" : "bg-indigo-500"
                }`}
                style={{ width: `${storagePercent}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            You have uploaded {stats.totalCount} active study documents to the cloud.
          </p>
        </div>

        {/* Categories Sizing Metrics */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 lg:col-span-2 grid grid-cols-2 sm:grid-cols-5 gap-4 shadow-xs">
          <div className="flex flex-col justify-center p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 border border-rose-500/10">
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">PDF Books</span>
            <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-200 mt-1">
              {formatBytes(stats.categories.pdf)}
            </span>
          </div>
          <div className="flex flex-col justify-center p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-500/10">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Images</span>
            <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-200 mt-1">
              {formatBytes(stats.categories.image)}
            </span>
          </div>
          <div className="flex flex-col justify-center p-3 rounded-xl bg-slate-100/50 dark:bg-slate-800/10 border border-slate-500/10">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Plain Text</span>
            <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-200 mt-1">
              {formatBytes(stats.categories.text)}
            </span>
          </div>
          <div className="flex flex-col justify-center p-3 rounded-xl bg-sky-50/50 dark:bg-sky-950/10 border border-sky-500/10">
            <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">Word Docs</span>
            <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-200 mt-1">
              {formatBytes(stats.categories.word)}
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1 flex flex-col justify-center p-3 rounded-xl bg-violet-50/50 dark:bg-violet-950/10 border border-violet-500/10">
            <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">Others</span>
            <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-200 mt-1">
              {formatBytes(stats.categories.other)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Drag & Drop Upload Highlight Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center gap-3 ${
          dragOver
            ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 scale-[1.01]"
            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        }`}
        id="drag-drop-container"
      >
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-full">
          <UploadCloud className="w-8 h-8" />
        </div>
        <div>
          <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Drag and drop study files here, or <span className="text-indigo-600 dark:text-indigo-400 underline cursor-pointer" onClick={triggerFileSelect}>browse</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Supports PDF, DOCX, TXT, Markdown, PNG, JPEG, WEBP (Max size 15MB)
          </p>
        </div>
      </div>

      {/* 4. Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4 shadow-2xs" id="documents-filter-toolbar">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search file name..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/50 text-[#0f172a] dark:text-[#f1f5f9] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              id="search-docs-input"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* File Type Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 p-1 border border-slate-200 dark:border-slate-800 rounded-xl">
              {[
                { label: "All", id: "all" },
                { label: "PDFs", id: "pdf" },
                { label: "Images", id: "image" },
                { label: "Text", id: "text" },
                { label: "Word", id: "word" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setMimeTypeGroup(item.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    mimeTypeGroup === item.id
                      ? "bg-white dark:bg-slate-700 text-[#0f172a] dark:text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Subject Link Filter */}
            <select
              value={subjectIdFilter}
              onChange={(e) => setSubjectIdFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800/50 text-[#0f172a] dark:text-[#f1f5f9] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden cursor-pointer"
              id="filter-by-subject-select"
            >
              <option value="all">Filter: All Subjects</option>
              <option value="unassigned">Unassigned Only</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id.toString()}>
                  {sub.title}
                </option>
              ))}
            </select>

            {/* Sorting Criteria */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800/50 text-[#0f172a] dark:text-[#f1f5f9] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden cursor-pointer"
              id="sort-by-select"
            >
              <option value="createdAt">Sort: Date Uploaded</option>
              <option value="name">Sort: File Name</option>
              <option value="size">Sort: File Size</option>
            </select>

            {/* Sorting Order */}
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="p-2.5 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="Toggle Sort Order"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>

            {/* Grid/List View Toggle */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 p-1 border border-slate-200 dark:border-slate-800 rounded-xl">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "grid" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs" : "text-slate-400"
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "list" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs" : "text-slate-400"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. active Upload Queue Slider/Panel */}
      <AnimatePresence>
        {activeUploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-4"
            id="active-uploads-queue"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {activeUploads.some((u) => u.status === "uploading") && (
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                )}
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {activeUploads.some((u) => u.status === "uploading")
                    ? `Uploading Materials (${activeUploads.filter((u) => u.status === "uploading").length} active)`
                    : "Upload Progress"}
                </span>
              </div>
              <button
                onClick={() => setActiveUploads([])}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Clear Completed Rows
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 flex flex-col pr-1">
              {activeUploads.map((up) => (
                <div key={up.id} className="flex items-center justify-between py-3 gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg shrink-0">
                      <Paperclip className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {up.file.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                        <span>{formatBytes(up.file.size)}</span>
                        <span>•</span>
                        {up.status === "uploading" && (
                          <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                            Uploading ({up.progress}%)
                          </span>
                        )}
                        {up.status === "completed" && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Completed
                          </span>
                        )}
                        {up.status === "failed" && (
                          <span className="text-rose-500 font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {up.error || "Failed"}
                          </span>
                        )}
                        {up.status === "cancelled" && (
                          <span className="text-amber-500 font-semibold">
                            Cancelled
                          </span>
                        )}
                      </div>

                      {/* Progress Line */}
                      {up.status === "uploading" && (
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${up.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upload Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {up.status === "uploading" && (
                      <button
                        onClick={() => handleCancelUpload(up.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                        title="Cancel Upload"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {up.status === "failed" && (
                      <button
                        onClick={() => handleRetryUpload(up.id)}
                        className="p-1.5 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg cursor-pointer"
                        title="Retry Upload"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    {(up.status === "completed" || up.status === "failed" || up.status === "cancelled") && (
                      <button
                        onClick={() => handleClearUploadRow(up.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Main Document Content Zone */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3" id="documents-loading">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading your academic materials...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center p-6" id="documents-empty">
          <FolderOpen className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            {viewTrash ? "No files in the trash" : "No study files found"}
          </h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm">
            {viewTrash
              ? "All soft-deleted elements are clean."
              : "Upload your PDFs, class notes, lectures, or study images to get started."}
          </p>
          {!viewTrash && (
            <button
              onClick={triggerFileSelect}
              className="mt-4 px-5 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm cursor-pointer"
            >
              Upload Your First File
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW LAYOUT */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" id="documents-grid-layout">
          {documents.map((doc) => {
            const sub = getSubjectColorAndTitle(doc.subjectId);
            const n = getNoteColorAndTitle(doc.noteId);
            return (
              <motion.div
                key={doc.id}
                layoutId={`doc-card-${doc.id}`}
                onClick={() => {
                  setSelectedDoc(doc);
                  setIsDetailsOpen(true);
                }}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between gap-4 cursor-pointer hover:shadow-md transition-all group ${
                  selectedDoc?.id === doc.id
                    ? "border-indigo-500 ring-1 ring-indigo-500"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                {/* File Header Details */}
                <div className="flex items-start justify-between gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl group-hover:scale-105 transition-all">
                    {getFileIcon(doc.extension, doc.mimeType)}
                  </div>

                  <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${getFileBadgeColor(doc.extension)}`}>
                    {doc.extension.replace(".", "") || "File"}
                  </span>
                </div>

                {/* Info Metadata */}
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 line-clamp-2 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" title={doc.originalName}>
                    {doc.originalName}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                    <span>{formatBytes(doc.size)}</span>
                    <span>•</span>
                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Linked Elements */}
                {(sub || n) && (
                  <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                    {sub && (
                      <span
                        className="px-2 py-0.5 text-[10px] font-bold rounded-full text-white line-clamp-1 truncate"
                        style={{ backgroundColor: sub.color }}
                      >
                        {sub.title}
                      </span>
                    )}
                    {n && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 line-clamp-1 truncate max-w-[120px]">
                        📌 {n.title}
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW LAYOUT */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs" id="documents-list-layout">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-5">Name</th>
                  <th className="py-3.5 px-5">Type</th>
                  <th className="py-3.5 px-5">Size</th>
                  <th className="py-3.5 px-5">Uploaded On</th>
                  <th className="py-3.5 px-5">Associations</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {documents.map((doc) => {
                  const sub = getSubjectColorAndTitle(doc.subjectId);
                  const n = getNoteColorAndTitle(doc.noteId);
                  return (
                    <tr
                      key={doc.id}
                      onClick={() => {
                        setSelectedDoc(doc);
                        setIsDetailsOpen(true);
                      }}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer text-sm text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <td className="py-3 px-5 font-bold flex items-center gap-3">
                        <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          {React.cloneElement(getFileIcon(doc.extension, doc.mimeType), { className: "w-5 h-5 shrink-0" })}
                        </div>
                        <span className="truncate max-w-xs md:max-w-md" title={doc.originalName}>
                          {doc.originalName}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${getFileBadgeColor(doc.extension)}`}>
                          {doc.extension.replace(".", "") || "File"}
                        </span>
                      </td>
                      <td className="py-3 px-5 font-mono text-xs">{formatBytes(doc.size)}</td>
                      <td className="py-3 px-5 text-xs text-slate-400">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {sub && (
                            <span
                              className="px-2 py-0.5 text-[10px] font-bold rounded-full text-white"
                              style={{ backgroundColor: sub.color }}
                            >
                              {sub.title}
                            </span>
                          )}
                          {n && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500">
                              📌 {n.title}
                            </span>
                          )}
                          {!sub && !n && <span className="text-xs text-slate-400">-</span>}
                        </div>
                      </td>
                      <td className="py-3 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {isPreviewable(doc) && (
                            <button
                              onClick={() => {
                                setSelectedDoc(doc);
                                setIsPreviewOpen(true);
                              }}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-500 transition-colors cursor-pointer"
                              title="Preview inline"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <a
                            href={`/api/documents/${doc.id}/download?token=${token}`}
                            download
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-500 transition-colors cursor-pointer"
                            title="Download file"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          {!viewTrash ? (
                            <button
                              onClick={() => handleSoftDelete(doc.id)}
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                              title="Move to trash"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleRestore(doc.id)}
                                className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg text-emerald-600 transition-colors cursor-pointer"
                                title="Restore file"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleHardDelete(doc.id)}
                                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg text-rose-600 transition-colors cursor-pointer"
                                title="Permanently Purge"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. SECURE PREVIEW MODAL */}
      <AnimatePresence>
        {isPreviewOpen && selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" id="document-preview-modal">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-5xl h-[85vh] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col"
            >
              {/* Preview Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shrink-0 border border-slate-100 dark:border-slate-700">
                    {React.cloneElement(getFileIcon(selectedDoc.extension, selectedDoc.mimeType), { className: "w-5 h-5" })}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate" title={selectedDoc.originalName}>
                      {selectedDoc.originalName}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Type: {selectedDoc.mimeType} • Size: {formatBytes(selectedDoc.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`/api/documents/${selectedDoc.id}/download?token=${token}`}
                    download
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                  <button
                    onClick={() => setIsPreviewOpen(false)}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Optional Preview Mode Toggle for Documents/PDFs */}
              {([".pdf", ".docx", ".txt", ".md"].includes(selectedDoc.extension.toLowerCase())) && (
                <div className="flex items-center justify-between px-6 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreviewMode("text")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        previewMode === "text"
                          ? "bg-indigo-500 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      Text Reader
                    </button>
                    {selectedDoc.extension.toLowerCase() !== ".docx" && (
                      <button
                        onClick={() => setPreviewMode("visual")}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          previewMode === "visual"
                            ? "bg-indigo-500 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        Original Layout
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {previewMode === "text"
                      ? "⚡ Smooth high-contrast reading layout (active)"
                      : "⚠️ Chrome may block native PDF rendering in sandboxed preview frames"}
                  </span>
                </div>
              )}

              {/* Preview Content iframe / Image */}
              <div className="flex-1 bg-slate-100 dark:bg-slate-950 relative overflow-hidden flex flex-col">
                {previewMode === "text" ? (
                  <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                    {isLoadingText ? (
                      <div className="h-full flex flex-col items-center justify-center py-20 text-xs text-slate-400 gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                        <span>Processing and extracting document content...</span>
                      </div>
                    ) : textError ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-3">
                        <AlertCircle className="w-10 h-10 text-red-400" />
                        <h4 className="font-bold text-slate-700 dark:text-slate-300">Extraction Error</h4>
                        <p className="text-sm text-slate-400 max-w-xs">{textError}</p>
                      </div>
                    ) : !extractedText.trim() ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-3">
                        <FileText className="w-10 h-10 text-slate-300" />
                        <h4 className="font-bold text-slate-700 dark:text-slate-300">Empty Document</h4>
                        <p className="text-sm text-slate-400 max-w-xs">No readable text was found in this document.</p>
                      </div>
                    ) : (
                      <div className="max-w-3xl mx-auto">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-6 flex justify-between items-center text-xs text-slate-400">
                          <span>Extracted Plain Text</span>
                          <span>{extractedText.split(/\s+/).filter(Boolean).length} words</span>
                        </div>
                        <div className="font-sans text-sm md:text-base leading-relaxed whitespace-pre-wrap select-text break-words">
                          {extractedText}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 relative">
                    {/* Visual Preview Mode */}
                    {selectedDoc.extension.toLowerCase() === ".pdf" ? (
                      <div className="absolute inset-0">
                        <PDFCanvasViewer documentId={selectedDoc.id} token={token} />
                      </div>
                    ) : [".png", ".jpg", ".jpeg", ".webp"].includes(selectedDoc.extension.toLowerCase()) || selectedDoc.mimeType.startsWith("image/") ? (
                      <div className="absolute inset-0 w-full h-full flex items-center justify-center p-6">
                        <img
                          src={`/api/documents/${selectedDoc.id}/preview?token=${token}`}
                          alt={selectedDoc.originalName}
                          className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : [".txt", ".md"].includes(selectedDoc.extension.toLowerCase()) ? (
                      <iframe
                        src={`/api/documents/${selectedDoc.id}/preview?token=${token}`}
                        className="absolute inset-0 w-full h-full border-none bg-white dark:bg-slate-900"
                        title={selectedDoc.originalName}
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-3">
                        <AlertCircle className="w-12 h-12 text-slate-300" />
                        <h4 className="font-bold text-slate-700 dark:text-slate-300">Preview Not Available</h4>
                        <p className="text-sm text-slate-400 max-w-xs">
                          We do not support inline preview of {selectedDoc.extension.toUpperCase()} documents yet. You can download the file to inspect it on your device.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. FILE DETAILS SLIDEOUT DRAWER */}
      <AnimatePresence>
        {isDetailsOpen && selectedDoc && (
          <div className="fixed inset-0 z-40 overflow-hidden" id="document-details-drawer">
            <div className="absolute inset-0 overflow-hidden">
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-slate-950/20 dark:bg-slate-950/40 transition-opacity"
                onClick={() => setIsDetailsOpen(false)}
              />

              <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                  className="w-screen max-w-md"
                >
                  <div className="h-full flex flex-col bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800">
                    
                    {/* Drawer Header */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Info className="w-5 h-5 text-indigo-500" />
                        Document Details
                      </h3>
                      <button
                        onClick={() => setIsDetailsOpen(false)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Drawer Content */}
                    <div className="flex-1 py-6 px-6 overflow-y-auto flex flex-col gap-6">
                      
                      {/* Big Visual Icon */}
                      <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-center gap-2">
                        {getFileIcon(selectedDoc.extension, selectedDoc.mimeType)}
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 mt-2 break-all max-w-xs">
                          {selectedDoc.originalName}
                        </h4>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${getFileBadgeColor(selectedDoc.extension)}`}>
                          {selectedDoc.extension.replace(".", "") || "File"}
                        </span>
                      </div>

                      {/* Info Table */}
                      <div className="space-y-4">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">File Metrics</h5>
                        <div className="bg-slate-50 dark:bg-slate-800/20 rounded-2xl p-4 divide-y divide-slate-100 dark:divide-slate-800 space-y-3">
                          <div className="flex items-center justify-between text-sm pt-1">
                            <span className="text-slate-400">Total File Size</span>
                            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{formatBytes(selectedDoc.size)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm pt-3">
                            <span className="text-slate-400">Mime Type</span>
                            <span className="font-mono text-xs text-slate-800 dark:text-slate-200 max-w-[180px] truncate" title={selectedDoc.mimeType}>{selectedDoc.mimeType}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm pt-3">
                            <span className="text-slate-400">Stored Key</span>
                            <span className="font-mono text-[10px] text-slate-400 max-w-[180px] truncate" title={selectedDoc.storedName}>{selectedDoc.storedName}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm pt-3">
                            <span className="text-slate-400">Created At</span>
                            <span className="text-slate-800 dark:text-slate-200">{new Date(selectedDoc.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Associated Details */}
                      <div className="space-y-4">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Related Connections</h5>
                        <div className="bg-slate-50 dark:bg-slate-800/20 rounded-2xl p-4 flex flex-col gap-3">
                          {/* Subject Linked */}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Course Subject</span>
                            {selectedDoc.subjectId ? (
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: getSubjectColorAndTitle(selectedDoc.subjectId)?.color }}
                                />
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {getSubjectColorAndTitle(selectedDoc.subjectId)?.title}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">None linked</span>
                            )}
                          </div>

                          {/* Note Linked */}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Linked Note</span>
                            {selectedDoc.noteId ? (
                              <span className="font-semibold text-slate-800 dark:text-slate-200 max-w-[150px] truncate" title={getNoteColorAndTitle(selectedDoc.noteId)?.title}>
                                📌 {getNoteColorAndTitle(selectedDoc.noteId)?.title}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">None linked</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick File Actions */}
                      <div className="flex flex-col gap-2.5 mt-auto">
                        {isPreviewable(selectedDoc) && (
                          <button
                            onClick={() => setIsPreviewOpen(true)}
                            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 transition-all cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                            Preview Document Inline
                          </button>
                        )}
                        <a
                          href={`/api/documents/${selectedDoc.id}/download?token=${token}`}
                          download
                          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs hover:shadow-md transition-all text-center"
                        >
                          <Download className="w-4 h-4" />
                          Download Copy
                        </a>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => {
                              setDocToRename(selectedDoc);
                              setRenameValue(selectedDoc.originalName.replace(selectedDoc.extension, ""));
                              setIsRenameOpen(true);
                            }}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Rename
                          </button>
                          <button
                            onClick={() => {
                              setDocToLink(selectedDoc);
                              setLinkSubjectId(selectedDoc.subjectId?.toString() || "");
                              setLinkNoteId(selectedDoc.noteId?.toString() || "");
                              setIsLinkOpen(true);
                            }}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                            Link Course
                          </button>
                        </div>

                        {!selectedDoc.deletedAt ? (
                          <button
                            onClick={() => handleSoftDelete(selectedDoc.id)}
                            className="flex items-center justify-center gap-2 w-full mt-4 px-4 py-2.5 text-sm font-semibold rounded-xl border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                            Move to Trash
                          </button>
                        ) : (
                          <div className="grid grid-cols-2 gap-3 mt-4">
                            <button
                              onClick={() => handleRestore(selectedDoc.id)}
                              className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Restore
                            </button>
                            <button
                              onClick={() => handleHardDelete(selectedDoc.id)}
                              className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete Forever
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. RENAME DOCUMENT MODAL */}
      <AnimatePresence>
        {isRenameOpen && docToRename && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs" id="rename-doc-modal">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Rename Study Document</h3>
                <button
                  onClick={() => setIsRenameOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRenameSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">New File Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 text-[#0f172a] dark:text-[#f1f5f9] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                      placeholder="Enter new original name"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-600">
                      {docToRename.extension}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRenameOpen(false)}
                    className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 10. COURSE LINK ASSOCIATIONS MODAL */}
      <AnimatePresence>
        {isLinkOpen && docToLink && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs" id="link-doc-modal">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Update Materials Connections</h3>
                <button
                  onClick={() => setIsLinkOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleLinkSubmit} className="flex flex-col gap-4">
                {/* Subject selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Course Subject Connection</label>
                  <select
                    value={linkSubjectId}
                    onChange={(e) => setLinkSubjectId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 text-[#0f172a] dark:text-[#f1f5f9] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Maintain current state --</option>
                    <option value="unassign">Unassign / No connection</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id.toString()}>
                        {sub.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Note selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Linked Student Study Note</label>
                  <select
                    value={linkNoteId}
                    onChange={(e) => setLinkNoteId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 text-[#0f172a] dark:text-[#f1f5f9] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Maintain current state --</option>
                    <option value="unassign">Unassign / No connection</option>
                    {notes.map((note) => (
                      <option key={note.id} value={note.id.toString()}>
                        📌 {note.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsLinkOpen(false)}
                    className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs cursor-pointer"
                  >
                    Save Links
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
