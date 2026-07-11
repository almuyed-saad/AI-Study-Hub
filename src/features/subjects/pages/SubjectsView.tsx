import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../auth/hooks/use-auth.tsx";
import { useToast } from "../../../components/ui/Toast.tsx";
import { Button } from "../../../components/ui/Button.tsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../../components/ui/Card.tsx";
import { Input } from "../../../components/ui/Input.tsx";
import { Dialog } from "../../../components/ui/Dialog.tsx";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Code,
  Calculator,
  Atom,
  Brain,
  Dna,
  Globe,
  Music,
  Palette,
  Lightbulb,
  Layers,
  Compass,
  GraduationCap,
  Folder,
  Search,
  Plus,
  Edit2,
  Trash2,
  Archive,
  RotateCcw,
  Calendar,
  User,
  Award,
  Filter,
  ArrowUpDown,
  X,
  AlertTriangle,
  Loader2,
  Check
} from "lucide-react";
import { cn } from "../../../utils/cn.ts";

// Mapping of available Lucide icons for subjects
const ICON_MAP = {
  BookOpen,
  Code,
  Calculator,
  Atom,
  Brain,
  Dna,
  Globe,
  Music,
  Palette,
  Lightbulb,
  Layers,
  Compass,
  GraduationCap,
  Folder,
};

const PRESET_COLORS = [
  { name: "Indigo", value: "#6366f1", bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/20" },
  { name: "Violet", value: "#8b5cf6", bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", border: "border-violet-500/20" },
  { name: "Rose", value: "#f43f5e", bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/20" },
  { name: "Pink", value: "#ec4899", bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400", border: "border-pink-500/20" },
  { name: "Blue", value: "#3b82f6", bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  { name: "Emerald", value: "#10b981", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  { name: "Amber", value: "#f59e0b", bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
  { name: "Orange", value: "#f97316", bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/20" },
  { name: "Cyan", value: "#06b6d4", bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/20" },
  { name: "Red", value: "#ef4444", bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", border: "border-red-500/20" },
];

export interface Subject {
  id: number;
  title: string;
  description: string | null;
  color: string;
  icon: string;
  semester: string | null;
  instructor: string | null;
  credits: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export function SubjectsView() {
  const { token } = useAuth();
  const toast = useToast();

  // Primary data states
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search/Filter/Sort query states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<"title" | "createdAt" | "credits">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Dialog & Modal state triggers
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  // Form Field States
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSemester, setFormSemester] = useState("");
  const [formInstructor, setFormInstructor] = useState("");
  const [formCredits, setFormCredits] = useState(3);
  const [formColor, setFormColor] = useState("#6366f1");
  const [formIcon, setFormIcon] = useState("BookOpen");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Dynamic Semesters list derived from subject data
  const [semestersList, setSemestersList] = useState<string[]>([]);

  // API Call: Fetch Subjects
  const fetchSubjects = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        search: searchQuery,
        semester: selectedSemester,
        sortBy,
        sortOrder,
        includeDeleted: showArchived ? "true" : "false",
      });

      const response = await fetch(`/api/subjects?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Unable to load subjects from the database.");
      }

      const data = await response.json();
      if (data.success) {
        setSubjects(data.subjects);

        // Capture semesters list once if we are querying active and unfiltered
        if (selectedSemester === "all" && !searchQuery) {
          const uniqueSemesters = Array.from(
            new Set(
              (data.subjects as Subject[])
                .map((s) => s.semester)
                .filter((sem): sem is string => !!sem && sem.trim() !== "")
            )
          );
          setSemestersList(uniqueSemesters);
        }
      } else {
        throw new Error(data.error || "Failed to load subjects.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while fetching subjects.");
      toast.error(err.message || "Unable to retrieve academic subjects.");
    } finally {
      setLoading(false);
    }
  }, [token, searchQuery, selectedSemester, showArchived, sortBy, sortOrder, toast]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  // Open Form Modal (Reset or Populate fields)
  const handleOpenForm = (subject?: Subject) => {
    setFormErrors({});
    if (subject) {
      setEditingSubject(subject);
      setFormTitle(subject.title);
      setFormDescription(subject.description || "");
      setFormSemester(subject.semester || "");
      setFormInstructor(subject.instructor || "");
      setFormCredits(subject.credits);
      setFormColor(subject.color);
      setFormIcon(subject.icon);
    } else {
      setEditingSubject(null);
      setFormTitle("");
      setFormDescription("");
      setFormSemester("");
      setFormInstructor("");
      setFormCredits(3);
      setFormColor("#6366f1");
      setFormIcon("BookOpen");
    }
    setIsFormOpen(true);
  };

  // Form Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formTitle.trim()) {
      errors.title = "Subject title is required";
    } else if (formTitle.length > 100) {
      errors.title = "Title cannot exceed 100 characters";
    }

    if (formDescription && formDescription.length > 1000) {
      errors.description = "Description cannot exceed 1000 characters";
    }

    if (formSemester && formSemester.length > 50) {
      errors.semester = "Semester text is too long";
    }

    if (formInstructor && formInstructor.length > 100) {
      errors.instructor = "Instructor name is too long";
    }

    if (formCredits < 0 || formCredits > 30) {
      errors.credits = "Credits must be between 0 and 30";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // API Call: Create or Update Subject
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !token) return;

    setFormSubmitting(true);
    const payload = {
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      semester: formSemester.trim() || null,
      instructor: formInstructor.trim() || null,
      credits: formCredits,
      color: formColor,
      icon: formIcon,
    };

    try {
      const url = editingSubject ? `/api/subjects/${editingSubject.id}` : "/api/subjects";
      const method = editingSubject ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(
          editingSubject
            ? `Subject "${payload.title}" updated successfully.`
            : `Subject "${payload.title}" created successfully.`
        );
        setIsFormOpen(false);
        fetchSubjects();
      } else {
        throw new Error(data.error || "Failed to submit subject details.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred. Please try again.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // API Call: Soft Delete / Archive Subject
  const handleDeleteConfirm = async () => {
    if (!subjectToDelete || !token) return;

    try {
      const response = await fetch(`/api/subjects/${subjectToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(`Subject "${subjectToDelete.title}" archived successfully.`);
        setIsDeleteOpen(false);
        setSubjectToDelete(null);
        fetchSubjects();
      } else {
        throw new Error(data.error || "Failed to archive subject.");
      }
    } catch (err: any) {
      toast.error(err.message || "Could not delete this subject.");
    }
  };

  // API Call: Restore Subject
  const handleRestore = async (subject: Subject) => {
    if (!token) return;

    try {
      const response = await fetch(`/api/subjects/${subject.id}/restore`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(`Subject "${subject.title}" restored successfully!`);
        fetchSubjects();
      } else {
        throw new Error(data.error || "Failed to restore subject.");
      }
    } catch (err: any) {
      toast.error(err.message || "Could not restore this subject.");
    }
  };

  // Open Delete Confirmation Dialog
  const handleOpenDelete = (subject: Subject) => {
    setSubjectToDelete(subject);
    setIsDeleteOpen(true);
  };

  // Toggle Sorting helper
  const handleSortChange = (newSortBy: "title" | "createdAt" | "credits") => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortOrder("desc");
    }
  };

  // Preset configuration utilities
  const getColorDetails = (hex: string) => {
    return PRESET_COLORS.find((c) => c.value.toLowerCase() === hex.toLowerCase()) || PRESET_COLORS[0];
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 px-2 md:px-0">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/50 dark:border-slate-800/50 pb-5">
        <div className="space-y-1">
          <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-violet-600 dark:text-violet-400" />
            Subject Management
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            Organize your academic semesters, tracking credits, instructors, and custom subjects.
          </p>
        </div>

        <Button
          onClick={() => handleOpenForm()}
          className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm font-semibold text-xs h-10 px-4 self-start sm:self-center cursor-pointer transition-all shrink-0"
          icon={<Plus className="h-4 w-4" />}
        >
          Add Subject
        </Button>
      </div>

      {/* SEARCH AND FILTERS TOOLBAR */}
      <div className="grid gap-4 md:grid-cols-12 bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-4 shadow-sm">
        
        {/* Search */}
        <div className="md:col-span-4 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subjects, instructors..."
            className="w-full h-9 pl-9 pr-4 text-xs bg-slate-50 border border-slate-200/60 dark:bg-slate-900 dark:border-slate-800 rounded-lg outline-none text-slate-800 dark:text-slate-100 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all placeholder-slate-400 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Semester */}
        <div className="md:col-span-3 flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200/60 dark:bg-slate-900 dark:border-slate-800 rounded-lg outline-none text-slate-700 dark:text-slate-300 focus:border-violet-500 transition-all cursor-pointer font-medium"
          >
            <option value="all">All Semesters</option>
            {semestersList.map((sem) => (
              <option key={sem} value={sem}>
                {sem}
              </option>
            ))}
          </select>
        </div>

        {/* Sorting controls */}
        <div className="md:col-span-3 flex gap-2">
          <button
            onClick={() => handleSortChange("title")}
            className={cn(
              "flex-1 h-9 flex items-center justify-center gap-1.5 px-2.5 border rounded-lg text-xs font-semibold cursor-pointer transition-all",
              sortBy === "title"
                ? "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/20 dark:border-violet-900/60 dark:text-violet-400"
                : "bg-slate-50/50 border-slate-200/60 text-slate-500 dark:bg-slate-900 dark:border-slate-800 hover:text-slate-700"
            )}
          >
            <span>Title</span>
            {sortBy === "title" && (
              <ArrowUpDown className={cn("h-3 w-3 transition-transform", sortOrder === "asc" ? "rotate-180" : "")} />
            )}
          </button>

          <button
            onClick={() => handleSortChange("credits")}
            className={cn(
              "flex-1 h-9 flex items-center justify-center gap-1.5 px-2.5 border rounded-lg text-xs font-semibold cursor-pointer transition-all",
              sortBy === "credits"
                ? "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/20 dark:border-violet-900/60 dark:text-violet-400"
                : "bg-slate-50/50 border-slate-200/60 text-slate-500 dark:bg-slate-900 dark:border-slate-800 hover:text-slate-700"
            )}
          >
            <span>Credits</span>
            {sortBy === "credits" && (
              <ArrowUpDown className={cn("h-3 w-3 transition-transform", sortOrder === "asc" ? "rotate-180" : "")} />
            )}
          </button>
        </div>

        {/* Archive toggle */}
        <div className="md:col-span-2 flex items-center justify-end md:justify-center border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-3 md:pt-0 pl-0 md:pl-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
            />
            <span className="flex items-center gap-1">
              <Archive className="h-3.5 w-3.5 text-slate-400" />
              Show Archived
            </span>
          </label>
        </div>
      </div>

      {/* ERROR CONTAINER */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-950/40 dark:bg-rose-950/10 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
          <div>
            <p className="font-bold">Database Fetch Fault</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* MAIN CARDS CONTENT CONTAINER */}
      {loading ? (
        // LOADING SKELETON
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="h-52 border border-slate-200/60 bg-white dark:border-slate-800/60 dark:bg-slate-900 rounded-xl p-5 space-y-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                <div className="h-5 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-5 w-3/4 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 flex gap-4">
                <div className="h-4 w-1/3 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-4 w-1/3 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : subjects.length > 0 ? (
        // THE CARDS GRID
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.05,
              },
            },
          }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {subjects.map((subject) => {
            const isSubjectArchived = !!subject.deletedAt;
            const colorPreset = getColorDetails(subject.color);
            const LucideIcon = ICON_MAP[subject.icon as keyof typeof ICON_MAP] || BookOpen;

            return (
              <motion.div
                key={subject.id}
                variants={{
                  hidden: { opacity: 0, y: 15 },
                  show: { opacity: 1, y: 0 },
                }}
                className="group relative"
              >
                {/* Decorative Accent Border Colored */}
                <div
                  className="absolute inset-x-0 -top-px h-1 rounded-t-xl transition-all group-hover:h-1.5"
                  style={{ backgroundColor: subject.color }}
                />

                <Card className="h-full border-slate-200/60 dark:border-slate-800/60 dark:bg-slate-900 flex flex-col justify-between group-hover:shadow-md group-hover:border-slate-300 dark:group-hover:border-slate-700 transition-all duration-200">
                  <CardHeader className="pb-3.5">
                    <div className="flex items-start justify-between">
                      {/* Icon with colored bg */}
                      <div className={cn("p-2 rounded-xl flex items-center justify-center", colorPreset.bg, colorPreset.text)}>
                        <LucideIcon className="h-5 w-5" />
                      </div>

                      {/* Credits badge */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full bg-slate-100 text-slate-600 border border-slate-200/40 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/60">
                        <Award className="h-3 w-3" />
                        {subject.credits} {subject.credits === 1 ? "Credit" : "Credits"}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-4">
                      <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors truncate">
                        {subject.title}
                      </CardTitle>
                      {subject.description && (
                        <CardDescription className="text-xs line-clamp-2 leading-relaxed min-h-[2.5rem]">
                          {subject.description}
                        </CardDescription>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="pb-4 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {/* Semester */}
                      <div className="flex items-center gap-1.5 truncate">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold truncate">{subject.semester || "No Semester"}</span>
                      </div>
                      {/* Instructor */}
                      <div className="flex items-center gap-1.5 truncate">
                        <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold truncate">{subject.instructor || "No Instructor"}</span>
                      </div>
                    </div>

                    {isSubjectArchived && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200/30">
                        <Archive className="h-3 w-3" />
                        Archived
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="pt-3.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Created {new Date(subject.createdAt).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-1">
                      {isSubjectArchived ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRestore(subject)}
                          className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 cursor-pointer"
                          title="Restore Subject"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenForm(subject)}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer"
                            title="Edit Subject"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDelete(subject)}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                            title="Archive Subject"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        // EMPTY STATE
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center text-center p-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/40"
        >
          <div className="h-16 w-16 bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-2xl flex items-center justify-center mb-5 animate-bounce">
            <BookOpen className="h-8 w-8" />
          </div>
          <h3 className="font-display text-lg font-extrabold text-slate-900 dark:text-slate-100">
            No subjects found
          </h3>
          <p className="mt-2 text-xs md:text-sm text-slate-400 dark:text-slate-500 max-w-sm leading-relaxed">
            {searchQuery || selectedSemester !== "all"
              ? "We couldn't find any subjects matching your filters. Try clearing search keywords."
              : "Welcome! Get started by adding your first academic course subject to begin organizing studies."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {searchQuery || selectedSemester !== "all" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedSemester("all");
                }}
              >
                Clear Filters
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={() => handleOpenForm()}>
                Add Subject
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* CREATE & EDIT DIALOG */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingSubject ? "Modify Course Subject" : "Create New Subject"}
      >
        <form onSubmit={handleFormSubmit} className="space-y-5 w-full">
          
          {/* Subject Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Subject Name <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Molecular Biochemistry"
              className={cn({ "border-rose-500": formErrors.title })}
            />
            {formErrors.title && <p className="text-[10px] text-rose-500 font-bold">{formErrors.title}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Description</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Provide a syllabus summary, prerequisites, or class details..."
              rows={3}
              className={cn(
                "w-full text-xs bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-lg p-3 text-slate-800 dark:text-slate-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 placeholder-slate-400 font-medium transition-all",
                { "border-rose-500": formErrors.description }
              )}
            />
            {formErrors.description && (
              <p className="text-[10px] text-rose-500 font-bold">{formErrors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Semester */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Semester</label>
              <Input
                type="text"
                value={formSemester}
                onChange={(e) => setFormSemester(e.target.value)}
                placeholder="e.g. Fall 2026"
                className={cn({ "border-rose-500": formErrors.semester })}
              />
              {formErrors.semester && (
                <p className="text-[10px] text-rose-500 font-bold">{formErrors.semester}</p>
              )}
            </div>

            {/* Instructor */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Instructor Name</label>
              <Input
                type="text"
                value={formInstructor}
                onChange={(e) => setFormInstructor(e.target.value)}
                placeholder="e.g. Prof. Feynman"
                className={cn({ "border-rose-500": formErrors.instructor })}
              />
              {formErrors.instructor && (
                <p className="text-[10px] text-rose-500 font-bold">{formErrors.instructor}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Credits */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Course Credits</label>
              <Input
                type="number"
                min="0"
                max="30"
                value={formCredits}
                onChange={(e) => setFormCredits(parseInt(e.target.value, 10) || 0)}
                className={cn({ "border-rose-500": formErrors.credits })}
              />
              {formErrors.credits && (
                <p className="text-[10px] text-rose-500 font-bold">{formErrors.credits}</p>
              )}
            </div>

            {/* Selected Icon Picker dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Subject Icon</label>
              <select
                value={formIcon}
                onChange={(e) => setFormIcon(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-lg outline-none text-slate-700 dark:text-slate-300 focus:border-violet-500 transition-all font-semibold"
              >
                <option value="BookOpen">📖 Textbook</option>
                <option value="Code">💻 Programming / Code</option>
                <option value="Calculator">📐 Mathematics / Calculator</option>
                <option value="Atom">⚛️ Physics / Atom</option>
                <option value="Brain">🧠 Neurology / Brain</option>
                <option value="Dna">🧬 Biology / DNA</option>
                <option value="Globe">🌐 Geography / Globe</option>
                <option value="Music">🎵 Music / Audio</option>
                <option value="Palette">🎨 Fine Arts / Palette</option>
                <option value="Lightbulb">💡 Humanities / Idea</option>
                <option value="Layers">🥞 Chemistry / Layers</option>
                <option value="Compass">🧭 Navigation / Compass</option>
                <option value="GraduationCap">🎓 Graduation</option>
                <option value="Folder">📂 Folder</option>
              </select>
            </div>
          </div>

          {/* Preset Color Selection Palette */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Theme Color</label>
            <div className="flex flex-wrap gap-2.5">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => setFormColor(preset.value)}
                  className="relative h-7 w-7 rounded-lg border border-slate-200/40 cursor-pointer shadow-sm transition-all hover:scale-110 flex items-center justify-center shrink-0"
                  style={{ backgroundColor: preset.value }}
                  title={preset.name}
                >
                  {formColor.toLowerCase() === preset.value.toLowerCase() && (
                    <Check className="h-3.5 w-3.5 text-white stroke-[3.5]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Form Actions footer */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFormOpen(false)}
              className="h-9 px-4 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={formSubmitting}
              className="bg-violet-600 hover:bg-violet-700 text-white h-9 px-4 text-xs font-semibold"
            >
              {editingSubject ? "Update Subject" : "Create Subject"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* CONFIRM ARCHIVE DELETE DIALOG */}
      <Dialog isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Archive Subject">
        <div className="space-y-4 w-full">
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3.5 dark:border-amber-950/40 dark:bg-amber-950/10 text-amber-800 dark:text-amber-300 text-xs">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Are you sure you want to archive this subject?</p>
              <p className="mt-1 leading-relaxed">
                Archiving <strong>"{subjectToDelete?.title}"</strong> will soft-delete the course. You can restore it later from your archived collection.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteOpen(false)} className="h-9">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDeleteConfirm}
              className="bg-amber-600 hover:bg-amber-700 text-white h-9"
            >
              Archive Subject
            </Button>
          </div>
        </div>
      </Dialog>

    </div>
  );
}
