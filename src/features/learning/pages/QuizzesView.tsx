import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../auth/hooks/use-auth.tsx";
import { useToast } from "../../../components/ui/Toast.tsx";
import { Button } from "../../../components/ui/Button.tsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/Card.tsx";
import { Dialog } from "../../../components/ui/Dialog.tsx";
import {
  HelpCircle,
  Sparkles,
  BookOpen,
  FileText,
  MessageSquare,
  Plus,
  Trash2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  BookMarked,
  FileQuestion,
  HelpCircle as QuestionIcon,
  Search,
  Filter,
  Check,
  X,
  AlertTriangle,
  Trophy,
  Flame,
  Play,
  Eye,
  GraduationCap,
  Lightbulb,
  Sparkle
} from "lucide-react";

interface QuizQuestion {
  id: number;
  type: "mcq" | "true_false" | "short_answer";
  question: string;
  options: string[] | null;
  correctAnswer: string;
  explanation: string;
}

interface Quiz {
  id: number;
  title: string;
  description: string;
  subjectId: number | null;
  noteId: number | null;
  documentId: number | null;
  createdAt: string;
}

interface Subject {
  id: number;
  title: string;
  color: string;
}

interface Note {
  id: number;
  title: string;
}

interface Document {
  id: number;
  originalName: string;
}

interface Conversation {
  id: number;
  title: string;
}

export function QuizzesView() {
  const { token } = useAuth();
  const toast = useToast();

  // Core lists
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active quiz session player states
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  
  // User answers map: questionId -> answerText
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Epic 5 Quiz Player states
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [aiExplanations, setAiExplanations] = useState<Record<number, string>>({});
  const [loadingExplanations, setLoadingExplanations] = useState<Record<number, boolean>>({});
  const [pastAttempts, setPastAttempts] = useState<any[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [savingAttempt, setSavingAttempt] = useState(false);

  // Generation Modal States
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [genSubjectId, setGenSubjectId] = useState<string>("");
  const [genNoteIds, setGenNoteIds] = useState<number[]>([]);
  const [genDocIds, setGenDocIds] = useState<number[]>([]);
  const [genConvId, setGenConvId] = useState<string>("");
  const [genNumQuestions, setGenNumQuestions] = useState<number>(5);
  
  // Progress states
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0); // 0 = Idle, 1 = Structuring context, 2 = Generating questions, 3 = Finalizing
  const [genError, setGenError] = useState<string | null>(null);

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubjectId, setFilterSubjectId] = useState<string>("all");

  // Confirmation Modal States
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<number | null>(null);

  // Load Lists
  const fetchQuizzes = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/learning/quizzes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setQuizzes(data.quizzes || []);
      }
    } catch (err) {
      console.error("Error fetching quizzes:", err);
      setError("Failed to load study quizzes.");
    }
  }, [token]);

  const fetchSourceMaterials = useCallback(async () => {
    if (!token) return;
    try {
      const [subsRes, notesRes, docsRes, convsRes] = await Promise.all([
        fetch("/api/subjects?includeDeleted=false", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/notes", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/documents", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/ai/conversations", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const subsData = await subsRes.json();
      const notesData = await notesRes.json();
      const docsData = await docsRes.json();
      const convsData = await convsRes.json();

      if (subsRes.ok && subsData.success) setSubjects(subsData.subjects || []);
      if (notesRes.ok && notesData.success) setNotes(notesData.notes || []);
      if (docsRes.ok && docsData.success) setDocuments(docsData.documents || []);
      if (convsRes.ok && convsData.success) setConversations(convsData.conversations || []);
    } catch (err) {
      console.error("Error fetching source materials:", err);
    }
  }, [token]);

  // Timer effect
  useEffect(() => {
    let interval: any;
    if (timerActive) {
      interval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  const fetchPastAttempts = async (quizId: number) => {
    if (!token) return;
    setLoadingAttempts(true);
    try {
      const res = await fetch(`/api/learning/quizzes/${quizId}/attempts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPastAttempts(data.attempts || []);
      }
    } catch (err) {
      console.error("Error fetching attempts:", err);
    } finally {
      setLoadingAttempts(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await Promise.all([fetchQuizzes(), fetchSourceMaterials()]);
      setLoading(false);
    }
    loadData();
  }, [token, fetchQuizzes, fetchSourceMaterials]);

  useEffect(() => {
    if (localStorage.getItem("trigger-generate-quiz") === "true") {
      localStorage.removeItem("trigger-generate-quiz");
      setIsGenerateOpen(true);
    }
  }, []);

  useEffect(() => {
    const activeId = localStorage.getItem("active-quiz-id");
    if (activeId && quizzes.length > 0) {
      const parsed = parseInt(activeId, 10);
      const quizToOpen = quizzes.find((q) => q.id === parsed);
      if (quizToOpen) {
        localStorage.removeItem("active-quiz-id");
        handleOpenQuiz(quizToOpen);
      }
    }
  }, [quizzes]);

  // Open Quiz Player
  const handleOpenQuiz = async (quiz: Quiz) => {
    if (!token) return;
    setLoadingQuestions(true);
    setActiveQuiz(quiz);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setQuizSubmitted(false);

    // Epic 5 Player Resets
    setTimeElapsed(0);
    setTimerActive(true);
    setAiExplanations({});
    setLoadingExplanations({});
    setPastAttempts([]);

    try {
      const res = await fetch(`/api/learning/quizzes/${quiz.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveQuestions(data.questions || []);
      } else {
        toast.error("Failed to load quiz questions.");
      }

      await fetchPastAttempts(quiz.id);
    } catch (err) {
      console.error("Error loading quiz questions:", err);
      toast.error("Network error loading quiz.");
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Delete Quiz
  const handleDeleteQuiz = async (quizId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    setQuizToDelete(quizId);
    setIsConfirmDeleteOpen(true);
  };

  const executeDeleteQuiz = async () => {
    if (!token || quizToDelete === null) return;

    try {
      const res = await fetch(`/api/learning/quizzes/${quizToDelete}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Study quiz deleted.");
        setQuizzes((prev) => prev.filter((q) => q.id !== quizToDelete));
        if (activeQuiz?.id === quizToDelete) {
          setActiveQuiz(null);
          setActiveQuestions([]);
        }
      } else {
        toast.error("Failed to delete quiz.");
      }
    } catch (err) {
      console.error("Delete quiz failed:", err);
      toast.error("Failed to delete quiz due to network error.");
    } finally {
      setQuizToDelete(null);
    }
  };

  // Submit Generation Request
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (genNoteIds.length === 0 && genDocIds.length === 0 && !genConvId) {
      setGenError("Please select at least one note, document, or conversation to generate quiz questions.");
      return;
    }

    setGenerating(true);
    setGenError(null);
    setGenStep(1);

    const interval = setInterval(() => {
      setGenStep((s) => {
        if (s === 1) return 2;
        if (s === 2) return 3;
        return s;
      });
    }, 3500);

    try {
      const res = await fetch("/api/learning/quizzes/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          noteIds: genNoteIds,
          documentIds: genDocIds,
          conversationId: genConvId ? [parseInt(genConvId, 10)] : undefined,
          subjectId: genSubjectId ? parseInt(genSubjectId, 10) : undefined,
          numQuestions: genNumQuestions,
        }),
      });

      const data = await res.json();
      clearInterval(interval);

      if (res.ok && data.success) {
        setGenStep(3);
        toast.success("Quiz generated successfully!");
        await fetchQuizzes();
        
        // Reset inputs
        setGenNoteIds([]);
        setGenDocIds([]);
        setGenConvId("");
        setGenSubjectId("");
        
        setTimeout(() => {
          setIsGenerateOpen(false);
          setGenerating(false);
          setGenStep(0);
          handleOpenQuiz(data.quiz);
        }, 1200);
      } else {
        setGenError(data.error || "Failed to generate study quiz. Ensure selected items contain sufficient text.");
        setGenerating(false);
      }
    } catch (err) {
      clearInterval(interval);
      console.error("Quiz generation error:", err);
      setGenError("A network error occurred while generating study quiz.");
      setGenerating(false);
    }
  };

  const toggleNoteSelection = (noteId: number) => {
    setGenNoteIds((prev) =>
      prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId]
    );
  };

  const toggleDocSelection = (docId: number) => {
    setGenDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const selectAnswer = (questionId: number, answerText: string) => {
    if (quizSubmitted) return;
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: answerText,
    }));
  };

  const submitQuizAnswers = async () => {
    if (!token || !activeQuiz) return;

    // Verify user answered all questions
    const unansweredCount = activeQuestions.filter((q) => !userAnswers[q.id]).length;
    if (unansweredCount > 0) {
      setIsConfirmSubmitOpen(true);
    } else {
      await executeSubmitQuiz();
    }
  };

  const executeSubmitQuiz = async () => {
    setTimerActive(false);
    setQuizSubmitted(true);
    setSavingAttempt(true);

    // Compute stats
    const { correctCount, percent } = getScoreInfo();

    try {
      const res = await fetch(`/api/learning/quizzes/${activeQuiz.id}/attempts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          score: correctCount,
          totalQuestions: activeQuestions.length,
          accuracy: percent,
          completionTime: timeElapsed,
          answers: userAnswers,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Quiz completed! Let's check your results.");
        // Refresh attempts list
        await fetchPastAttempts(activeQuiz.id);
      } else {
        toast.error("Failed to save quiz attempt.");
      }
    } catch (err) {
      console.error("Error saving attempt:", err);
      toast.error("Connection error saving attempt.");
    } finally {
      setSavingAttempt(false);
      setCurrentQuestionIndex(0); // Reset index to review results
    }
  };

  const handleRequestAiExplanation = async (questionId: number) => {
    if (!token || !activeQuiz) return;
    setLoadingExplanations((prev) => ({ ...prev, [questionId]: true }));
    try {
      const selected = userAnswers[questionId] || "No answer provided";
      const res = await fetch("/api/learning/quizzes/explain-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionId,
          selectedAnswer: selected,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAiExplanations((prev) => ({ ...prev, [questionId]: data.explanation }));
        toast.success("AI explanation fetched!");
      } else {
        toast.error(data.error || "Failed to compile AI explanation.");
      }
    } catch (err) {
      console.error("AI explanation fetch error:", err);
      toast.error("Network error fetching AI explanation.");
    } finally {
      setLoadingExplanations((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  // Smart evaluation helper to verify short answers and weed out low-effort or dodge responses
  const isShortAnswerCorrect = (userAns: string | undefined, correctGuideline: string | undefined): boolean => {
    if (!userAns) return false;
    const ans = userAns.trim().toLowerCase();
    
    // We reject answers that are extremely short
    if (ans.length < 4) return false;

    // Remove punctuation and multiple spaces for absolute comparison robustness
    const cleanedUserAns = ans.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").replace(/\s+/g, " ");

    // Blacklist of generic, negative, or dodge responses (e.g. "I don't know", "skip", "idk")
    const lowEffortPhrases = [
      "dont know", "don't know", "do not know", "idk", "i dont know", "i don't know", "i do not know",
      "no idea", "no clue", "not sure", "not really sure", "im not sure", "i am not sure",
      "pass", "skip", "i skip", "dunno", "nothing", "blank",
      "no answer", "have no idea", "has no idea", "not clear", "dunno",
      "na", "n/a", "none", "no", "yes", "maybe", "depends",
      "i do not recall", "i dont recall", "dont recall", "don't recall",
      "i do not remember", "i dont remember", "dont remember", "don't remember",
      "forget", "forgot", "clueless", "whatever", "who cares", "i forget", "dontknow"
    ];

    const hasDodge = lowEffortPhrases.some(phrase => {
      const cleanPhrase = phrase.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "");
      return cleanedUserAns === cleanPhrase || cleanedUserAns.includes(cleanPhrase);
    });

    if (hasDodge && ans.length < 75) {
      return false;
    }

    if (!correctGuideline) return ans.length >= 8;

    // Smart semantic keyword overlap check to match terms ignoring standard filler/stop words
    const stopWords = new Set([
      "the", "a", "an", "and", "or", "but", "if", "then", "else", "when", 
      "at", "by", "for", "with", "about", "against", "between", "into", 
      "through", "during", "before", "after", "above", "below", "to", 
      "from", "up", "down", "in", "out", "on", "off", "over", "under", 
      "again", "further", "then", "once", "here", "there", "all", "any", 
      "both", "each", "few", "more", "most", "other", "some", "such", 
      "no", "nor", "not", "only", "own", "same", "so", "than", "too", 
      "very", "s", "t", "can", "will", "just", "don", "should", "now",
      "is", "are", "was", "were", "be", "been", "being", "have", "has", 
      "had", "having", "do", "does", "did", "doing", "of", "it", "its",
      "they", "them", "their", "theirs", "themselves", "we", "us", "our",
      "ours", "ourselves", "you", "your", "yours", "yourself", "yourselves",
      "he", "him", "his", "himself", "she", "her", "hers", "herself",
      "i", "me", "my", "myself"
    ]);

    const cleanAndTokenize = (text: string) => {
      return text
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));
    };

    const guidelineWords = cleanAndTokenize(correctGuideline);
    const answerWords = cleanAndTokenize(userAns);

    if (guidelineWords.length === 0) {
      return ans.length >= 8;
    }

    // Match keywords - check if the user's answer contains any keyword directly, 
    // or if words in the student's answer match a guideline keyword
    let matchCount = 0;
    guidelineWords.forEach(kw => {
      if (ans.includes(kw) || answerWords.some(aw => aw.includes(kw) || kw.includes(aw))) {
        matchCount++;
      }
    });

    const matchRatio = matchCount / guidelineWords.length;

    // For extremely short answers, require at least 1 keyword match
    if (ans.length < 15) {
      return matchCount >= 1;
    }

    // Otherwise, we require at least 1 match or 12% keyword overlap to give the student credit for attempting concepts
    return matchCount >= 1 || matchRatio >= 0.12;
  };

  // Score Calculation
  const getScoreInfo = () => {
    let correctCount = 0;
    activeQuestions.forEach((q) => {
      const ans = userAnswers[q.id];
      const corr = q.correctAnswer;
      if (q.type === "short_answer") {
        if (isShortAnswerCorrect(ans, corr)) {
          correctCount++;
        }
      } else {
        const userAnsLower = ans?.trim().toLowerCase();
        const corrLower = corr?.trim().toLowerCase();
        if (userAnsLower && corrLower && userAnsLower === corrLower) {
          correctCount++;
        }
      }
    });

    const percent = Math.round((correctCount / activeQuestions.length) * 100);
    return { correctCount, percent };
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Render question component
  const renderQuestionPlayer = () => {
    if (activeQuestions.length === 0) {
      return (
        <Card className="p-8 text-center border-slate-200 dark:border-slate-800">
          <CardContent className="flex flex-col items-center justify-center space-y-3 pt-6">
            <HelpCircle className="h-10 w-10 text-slate-400" />
            <p className="text-slate-500 text-sm">No quiz questions found.</p>
          </CardContent>
        </Card>
      );
    }

    const { correctCount, percent } = getScoreInfo();
    const choiceLetters = ["A", "B", "C", "D", "E", "F"];

    return (
      <div className="space-y-6 w-full max-w-3xl mx-auto">
        {/* Elegant Stepper / Navigation Dots */}
        <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 font-semibold px-1">
            <span className="flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-violet-500" />
              QUESTION NAVIGATOR
            </span>
            <span>
              {activeQuestions.filter(q => userAnswers[q.id] !== undefined && userAnswers[q.id] !== "").length} OF {activeQuestions.length} ANSWERED
            </span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-2">
            {activeQuestions.map((q, idx) => {
              const isCurrent = idx === currentQuestionIndex;
              const isAnswered = userAnswers[q.id] !== undefined && userAnswers[q.id] !== "";
              
              let badgeStyle = "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 dark:hover:bg-slate-900";
              let statusIcon = null;

              if (isCurrent) {
                badgeStyle = "bg-violet-600 text-white border-violet-600 hover:bg-violet-700 ring-2 ring-violet-500/30 font-bold scale-105";
              } else if (isAnswered) {
                badgeStyle = "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900 hover:bg-violet-100/50";
              }

              if (quizSubmitted) {
                const selectedAnswer = userAnswers[q.id] || "";
                const correctAns = q.correctAnswer || "";
                
                const isCorrect = q.type === "short_answer" 
                  ? isShortAnswerCorrect(selectedAnswer, correctAns)
                  : selectedAnswer.trim().toLowerCase() === correctAns.trim().toLowerCase();
                
                if (isCorrect) {
                  badgeStyle = "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900 hover:bg-emerald-100/30";
                  statusIcon = <CheckCircle2 className="h-3 w-3 inline text-emerald-600 dark:text-emerald-400" />;
                } else {
                  badgeStyle = "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900 hover:bg-rose-100/30";
                  statusIcon = <XCircle className="h-3 w-3 inline text-rose-600 dark:text-rose-400" />;
                }
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${badgeStyle}`}
                >
                  <span>Q{idx + 1}</span>
                  {statusIcon}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scorecard (Rendered if quiz is submitted) */}
        {quizSubmitted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-violet-500/20 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Trophy className="h-32 w-32 rotate-12" />
            </div>
            <div className="space-y-2 text-center md:text-left z-10">
              <span className="text-[10px] uppercase tracking-widest font-mono bg-white/20 px-2.5 py-1 rounded-full font-bold">
                🎓 Active Recall Assessment Complete
              </span>
              <h3 className="text-2xl font-bold tracking-tight">
                You scored {correctCount} of {activeQuestions.length} correct!
              </h3>
              <p className="text-xs text-violet-100 max-w-md leading-relaxed font-medium">
                {percent === 100 && "🏆 Pure Genius! You got a perfect score! You have completely mastered this material."}
                {percent >= 80 && percent < 100 && "🌟 Academic Excellence! Fantastic job, you have a solid grasp of these concepts."}
                {percent >= 60 && percent < 80 && "📚 Great Effort! You're on the right track. Check out the Gemini explanations to master the rest!"}
                {percent < 60 && "✏️ Keep Learning! Every mistake is a step forward. Review the AI-annotated guides and try again."}
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-1">
                <span className="text-[11px] font-mono bg-indigo-900/35 px-2.5 py-1 rounded-md text-violet-200">
                  ⏱️ Duration: {formatTime(timeElapsed)}
                </span>
                <span className="text-[11px] font-mono bg-indigo-900/35 px-2.5 py-1 rounded-md text-violet-200">
                  🔥 Active Streak: +1 Session
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center text-center z-10">
              <div className="h-24 w-24 rounded-full bg-white/10 flex flex-col items-center justify-center font-mono border-4 border-white/25 shadow-inner">
                <span className="text-3xl font-extrabold tracking-tight">{percent}%</span>
                <span className="text-[9px] uppercase font-bold tracking-widest text-violet-200">Grade</span>
              </div>
              <span className="text-[10px] text-violet-200 font-semibold font-mono mt-2 uppercase tracking-wider">
                {percent >= 90 ? "Grade: A" : percent >= 80 ? "Grade: B" : percent >= 70 ? "Grade: C" : percent >= 60 ? "Grade: D" : "Grade: F"}
              </span>
            </div>
          </motion.div>
        )}

        {/* Current question card */}
        <div className="space-y-6">
          <div className="flex justify-between items-center text-xs font-mono text-slate-500 px-1">
            <span>QUESTION {currentQuestionIndex + 1} OF {activeQuestions.length}</span>
            <div className="flex items-center gap-4">
              <span>TYPE: {activeQuestions[currentQuestionIndex].type.toUpperCase().replace("_", " ")}</span>
              <span className="bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-md flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/40 dark:border-slate-800/40">
                <Clock className="h-3 w-3 text-violet-500 animate-pulse" />
                {formatTime(timeElapsed)}
              </span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeQuestions.map((q, idx) => {
              if (idx !== currentQuestionIndex) return null;

              const selectedAnswer = userAnswers[q.id] || "";
              const correctAns = q.correctAnswer || "";
              const isCorrect = selectedAnswer.trim().toLowerCase() === correctAns.trim().toLowerCase();
              const aiExpl = aiExplanations[q.id];
              const isExplLoading = loadingExplanations[q.id];

              return (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 shadow-md rounded-2xl space-y-6">
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono tracking-wider text-violet-600 dark:text-violet-400 font-semibold uppercase">
                        Question Prompt
                      </span>
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                        {q.question}
                      </h4>
                    </div>

                    {/* Input styles based on question type */}
                    {q.type === "mcq" && q.options && (
                      <div className="grid gap-3 pt-2">
                        {Array.isArray(q.options) && q.options.map((option, optIdx) => {
                          const isSelected = selectedAnswer === option;
                          const isOptionCorrect = option.trim().toLowerCase() === correctAns.trim().toLowerCase();

                          let btnStyle = "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40 text-slate-800 dark:text-slate-300";
                          let letterStyle = "bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400";

                          if (isSelected) {
                            btnStyle = "border-violet-500 bg-violet-50/50 text-violet-950 dark:border-violet-700/50 dark:bg-violet-950/20 dark:text-violet-100 ring-1 ring-violet-500/20";
                            letterStyle = "bg-violet-600 text-white";
                          }

                          if (quizSubmitted) {
                            if (isOptionCorrect) {
                              btnStyle = "border-emerald-500 bg-emerald-50/50 text-emerald-950 dark:border-emerald-750/50 dark:bg-emerald-950/25 dark:text-emerald-300 ring-1 ring-emerald-500/20 font-semibold";
                              letterStyle = "bg-emerald-600 text-white";
                            } else if (isSelected && !isCorrect) {
                              btnStyle = "border-red-400 bg-red-50/50 text-red-950 dark:border-red-900/40 dark:bg-red-950/25 dark:text-red-300";
                              letterStyle = "bg-red-600 text-white";
                            } else {
                              btnStyle = "border-slate-200 text-slate-400 dark:border-slate-850 dark:text-slate-600 opacity-60 pointer-events-none";
                              letterStyle = "bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-600";
                            }
                          }

                          return (
                            <button
                              key={optIdx}
                              disabled={quizSubmitted}
                              onClick={() => selectAnswer(q.id, option)}
                              className={`w-full p-4 rounded-xl border text-left text-sm font-medium transition-all flex items-center justify-between shadow-sm cursor-pointer ${btnStyle}`}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-colors ${letterStyle}`}>
                                  {choiceLetters[optIdx] || "?"}
                                </span>
                                <span className="leading-snug">{option}</span>
                              </div>
                              {quizSubmitted && isOptionCorrect && (
                                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0" />
                              )}
                              {quizSubmitted && isSelected && !isCorrect && (
                                <XCircle className="h-4.5 w-4.5 text-red-500 flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {q.type === "true_false" && (
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        {["True", "False"].map((option) => {
                          const isSelected = selectedAnswer === option;
                          const isOptionCorrect = option.trim().toLowerCase() === correctAns.trim().toLowerCase();

                          let btnStyle = "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40 text-slate-800 dark:text-slate-300";
                          let letterStyle = "bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400";

                          if (isSelected) {
                            btnStyle = "border-violet-500 bg-violet-50/50 text-violet-950 dark:border-violet-700/50 dark:bg-violet-950/20 dark:text-violet-100 ring-1 ring-violet-500/20";
                            letterStyle = "bg-violet-600 text-white";
                          }

                          if (quizSubmitted) {
                            if (isOptionCorrect) {
                              btnStyle = "border-emerald-500 bg-emerald-50/50 text-emerald-950 dark:border-emerald-750/50 dark:bg-emerald-950/25 dark:text-emerald-300 ring-1 ring-emerald-500/20 font-semibold";
                              letterStyle = "bg-emerald-600 text-white";
                            } else if (isSelected && !isCorrect) {
                              btnStyle = "border-red-400 bg-red-50/50 text-red-950 dark:border-red-900/40 dark:bg-red-950/25 dark:text-red-300";
                              letterStyle = "bg-red-600 text-white";
                            } else {
                              btnStyle = "border-slate-200 text-slate-400 dark:border-slate-850 dark:text-slate-600 opacity-60 pointer-events-none";
                              letterStyle = "bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-600";
                            }
                          }

                          return (
                            <button
                              key={option}
                              disabled={quizSubmitted}
                              onClick={() => selectAnswer(q.id, option)}
                              className={`p-4 rounded-xl border text-left text-sm font-medium transition-all flex items-center justify-between shadow-sm cursor-pointer ${btnStyle}`}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-colors ${letterStyle}`}>
                                  {option === "True" ? "T" : "F"}
                                </span>
                                <span className="leading-snug">{option}</span>
                              </div>
                              {quizSubmitted && isOptionCorrect && (
                                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0" />
                              )}
                              {quizSubmitted && isSelected && !isCorrect && (
                                <XCircle className="h-4.5 w-4.5 text-red-500 flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {q.type === "short_answer" && (
                      <div className="space-y-4 pt-2">
                        <textarea
                          disabled={quizSubmitted}
                          value={selectedAnswer}
                          onChange={(e) => selectAnswer(q.id, e.target.value)}
                          placeholder="Type your study summary or concise response here to test your recall..."
                          className="w-full h-28 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none leading-relaxed transition-all text-slate-800 dark:text-slate-100"
                        />

                        {quizSubmitted && (
                          <div className="space-y-3">
                            {/* Smart evaluation feedback block */}
                            {isShortAnswerCorrect(selectedAnswer, q.correctAnswer) ? (
                              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/35 text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5 text-xs shadow-sm">
                                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold block">Smart Evaluation: Correct</span>
                                  <p className="text-slate-600 dark:text-slate-400 mt-1">Your answer is excellent and contains the core technical concepts & keywords requested in the academic guide!</p>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/35 text-rose-800 dark:text-rose-300 flex items-start gap-2.5 text-xs shadow-sm">
                                <XCircle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold block">Smart Evaluation: Incorrect / Incomplete</span>
                                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                                    {(!selectedAnswer || selectedAnswer.trim().length < 4) ? (
                                      "This question was left blank or contains an extremely brief response."
                                    ) : (
                                      "Your response is incomplete, represents a dodge phrase (e.g. 'I don't know', 'skip'), or did not contain the core technical terms requested by the study guide."
                                    )}
                                  </p>
                                </div>
                              </div>
                            )}

                            <div className="p-4 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 space-y-2">
                              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                                <GraduationCap className="h-4 w-4" />
                                <span className="font-mono tracking-wider uppercase">
                                  Recommended Rubric / Correct Answer Guide:
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium font-sans">
                                {q.correctAnswer}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Socratic static explanation (upon submission) */}
                    {quizSubmitted && (
                      <div className="pt-4 space-y-4 border-t border-slate-100 dark:border-slate-900">
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-700 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-300 space-y-1.5"
                        >
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                            <Lightbulb className="h-4 w-4 text-amber-500 animate-pulse" />
                            <span className="text-[10px] font-mono tracking-wider font-bold uppercase">
                              Socratic Concept Explanation
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed">
                            {q.explanation}
                          </p>
                        </motion.div>

                        {/* Gemini interactive explanation trigger */}
                        {!aiExpl ? (
                          <Button
                            size="sm"
                            onClick={() => handleRequestAiExplanation(q.id)}
                            disabled={isExplLoading}
                            icon={<Sparkles className="h-3.5 w-3.5 animate-bounce" />}
                            className="w-full h-10 text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold shadow-sm transition-all cursor-pointer"
                          >
                            {isExplLoading ? "Retrieving course sources & grading..." : q.type === "short_answer" ? "Grade & Review with Gemini AI" : "Explain this Answer with Gemini AI"}
                          </Button>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-5 rounded-xl border border-violet-200 bg-violet-50/40 text-violet-950 dark:border-violet-900/40 dark:bg-violet-950/15 dark:text-violet-200 space-y-2"
                          >
                            <div className="flex items-center gap-1.5 text-violet-700 dark:text-violet-400">
                              <Sparkles className="h-4 w-4" />
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                                Gemini AI Academic Assessment & Feedback
                              </span>
                            </div>
                            <p className="text-xs leading-relaxed whitespace-pre-line font-sans">
                              {aiExpl}
                            </p>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Navigation / Actions bar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
            disabled={currentQuestionIndex === 0}
            className="h-10 text-xs"
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Previous Question
          </Button>

          {!quizSubmitted ? (
            <Button
              onClick={submitQuizAnswers}
              disabled={savingAttempt}
              className="bg-violet-600 hover:bg-violet-700 text-white px-6 h-10 text-xs"
            >
              {savingAttempt ? "Saving Answers..." : "Submit Quiz"}
            </Button>
          ) : (
            <span className="text-xs font-mono text-slate-500">
              Grade Recorded
            </span>
          )}

          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex((i) => Math.min(activeQuestions.length - 1, i + 1))}
            disabled={currentQuestionIndex === activeQuestions.length - 1}
            className="h-10 text-xs flex-row-reverse"
            icon={<ChevronRight className="h-4 w-4" />}
          >
            Next Question
          </Button>
        </div>

        {/* Re-take controls and Past Performance Logs */}
        {quizSubmitted && (
          <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-900">
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setCurrentQuestionIndex(0);
                  setUserAnswers({});
                  setQuizSubmitted(false);
                  setTimeElapsed(0);
                  setTimerActive(true);
                  setAiExplanations({});
                  toast.success("Progress reset! Take the quiz again.");
                }}
                className="flex items-center gap-1.5 text-xs font-mono text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <RotateCcw className="h-3 w-3" /> Re-take Quiz
              </button>
            </div>

            {/* Past Attempts Dashboard */}
            {pastAttempts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px] uppercase font-bold tracking-wider">
                  <Award className="h-3.5 w-3.5 text-violet-500" />
                  <span>Your Historical Attempts for this Quiz</span>
                </div>
                
                <div className="border border-slate-200/60 dark:border-slate-850 bg-white/50 dark:bg-slate-900/20 backdrop-blur-sm rounded-xl overflow-hidden">
                  <div className="divide-y divide-slate-100 dark:divide-slate-850">
                    {pastAttempts.map((att: any, attIdx: number) => (
                      <div key={att.id || attIdx} className="p-3 flex items-center justify-between gap-4 text-xs">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            Attempt #{pastAttempts.length - attIdx}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {new Date(att.createdAt).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                              {att.score} / {att.totalQuestions}
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono">Score</div>
                          </div>

                          <div className="text-right">
                            <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {att.accuracy}%
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono">Accuracy</div>
                          </div>

                          <div className="text-right">
                            <div className="font-mono text-slate-600 dark:text-slate-400">
                              {formatTime(att.completionTime)}
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono">Duration</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (activeQuiz) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 w-full max-w-7xl mx-auto"
      >
        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActiveQuiz(null);
                setActiveQuestions([]);
                fetchQuizzes();
              }}
              className="h-9 px-2"
              icon={<ArrowLeft className="h-4 w-4" />}
            />
            <div>
              <h2 className="text-xl font-bold tracking-tight font-display">{activeQuiz.title}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{activeQuiz.description}</p>
            </div>
          </div>
        </div>

        {loadingQuestions ? (
          <div className="h-96 flex flex-col items-center justify-center space-y-4">
            <div className="relative h-12 w-12 rounded-full border-4 border-slate-100 border-t-violet-600 animate-spin" />
            <p className="text-xs text-slate-500 font-mono">Loading customized quiz sheets...</p>
          </div>
        ) : (
          renderQuestionPlayer()
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 w-full max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight font-display bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-white dark:to-slate-300">
            Formative Assessment Quizzes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Test your curriculum boundaries and master subjects with dynamically formulated mock tests, multiple choice questions, and guide rubrics.
          </p>
        </div>

        <div>
          <Button
            onClick={() => setIsGenerateOpen(true)}
            icon={<Sparkles className="h-4 w-4" />}
            className="shadow-sm shadow-violet-500/10 h-10 text-sm bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
          >
            Generate Quiz
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="border-slate-200/60 dark:border-slate-800/60 animate-pulse">
              <CardContent className="h-44" />
            </Card>
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <Card className="border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/10 backdrop-blur-sm py-16 px-6">
          <CardContent className="flex flex-col items-center text-center max-w-md mx-auto space-y-5">
            <div className="h-16 w-16 rounded-2xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/40 dark:border-slate-800/40 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <FileQuestion className="h-8 w-8 text-violet-600 dark:text-violet-400" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">
                No Quizzes Formulated Yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Empower your test preparations. Feed Gemini your active study notes, course syllabus, or slides, and let it draft deep assessments to pinpoint knowledge gaps.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsGenerateOpen(true)}
              className="text-xs h-9"
            >
              Generate First Quiz
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => {
            const subject = subjects.find((s) => s.id === quiz.subjectId);
            return (
              <motion.div
                key={quiz.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleOpenQuiz(quiz)}
                className="cursor-pointer group"
              >
                <Card className="border-slate-200/60 dark:border-slate-800/60 bg-white hover:border-violet-300 dark:bg-slate-950 dark:hover:border-violet-900 shadow-sm transition-all h-full flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-4">
                      {subject ? (
                        <span
                          style={{ backgroundColor: `${subject.color}15`, color: subject.color }}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider border border-current"
                        >
                          {subject.title}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                          General
                        </span>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeleteQuiz(quiz.id, e)}
                        className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-opacity"
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                      />
                    </div>
                    <CardTitle className="text-base font-semibold tracking-tight mt-2 text-slate-900 dark:text-slate-100 line-clamp-1">
                      {quiz.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {quiz.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4 border-t border-slate-50 dark:border-slate-900/60 mt-auto flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(quiz.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1 text-violet-600 dark:text-violet-400 font-semibold uppercase tracking-wider">
                      <BookMarked className="h-3 w-3" /> PRACTICE QUIZ
                    </span>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Generation Dialog */}
      <Dialog
        isOpen={isGenerateOpen}
        onClose={() => !generating && setIsGenerateOpen(false)}
        title="Formulate Study Quizzes"
      >
        <form onSubmit={handleGenerate} className="space-y-5">
          {generating ? (
            <div className="py-8 text-center space-y-6">
              <div className="relative h-16 w-16 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100 border-t-violet-600 animate-spin" />
                <HelpCircle className="h-6 w-6 text-violet-600 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-base text-slate-800 dark:text-slate-100">
                  {genStep === 1 && "Aligning exam rubrics..."}
                  {genStep === 2 && "Compiling formative assessments..."}
                  {genStep === 3 && "Persisting quiz sheets..."}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Our academic engine is building multi-choice sheets, true/false metrics, and short-answer prompts.
                </p>
              </div>

              {/* Progress visual */}
              <div className="w-full max-w-xs mx-auto bg-slate-100 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div
                  style={{ width: `${(genStep / 3) * 100}%` }}
                  className="bg-violet-600 h-full rounded-full transition-all duration-500"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {/* Subject Selector */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
                      Target Subject (Optional)
                    </label>
                    <select
                      value={genSubjectId}
                      onChange={(e) => setGenSubjectId(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:border-violet-500 focus:outline-none"
                    >
                      <option value="">No Subject (General)</option>
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
                      Number of Questions
                    </label>
                    <select
                      value={genNumQuestions}
                      onChange={(e) => setGenNumQuestions(parseInt(e.target.value, 10))}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:border-violet-500 focus:outline-none"
                    >
                      <option value={5}>5 Questions (Fast review)</option>
                      <option value={10}>10 Questions (Standard exam)</option>
                      <option value={20}>20 Questions (Comprehensive audit)</option>
                    </select>
                  </div>
                </div>

                {/* Sources Selection Grid */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Notes selector */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" /> Study Notes
                    </span>
                    <div className="max-h-40 overflow-y-auto pr-1 space-y-2 text-sm">
                      {notes.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4 text-center">No notes available.</p>
                      ) : (
                        notes.map((note) => (
                          <label key={note.id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900/60 rounded">
                            <input
                              type="checkbox"
                              checked={genNoteIds.includes(note.id)}
                              onChange={() => toggleNoteSelection(note.id)}
                              className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 h-4 w-4"
                            />
                            <span className="truncate line-clamp-1 text-slate-700 dark:text-slate-300">{note.title}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Documents selector */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" /> Uploaded Documents
                    </span>
                    <div className="max-h-40 overflow-y-auto pr-1 space-y-2 text-sm">
                      {documents.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4 text-center">No documents uploaded.</p>
                      ) : (
                        documents.map((doc) => (
                          <label key={doc.id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900/60 rounded">
                            <input
                              type="checkbox"
                              checked={genDocIds.includes(doc.id)}
                              onChange={() => toggleDocSelection(doc.id)}
                              className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 h-4 w-4"
                            />
                            <span className="truncate line-clamp-1 text-slate-700 dark:text-slate-300">{doc.originalName}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Chat History Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" /> AI Chat Context (Optional)
                  </label>
                  <select
                    value={genConvId}
                    onChange={(e) => setGenConvId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:border-violet-500 focus:outline-none"
                  >
                    <option value="">Do not include chat transcripts</option>
                    {conversations.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title || `Study Assistant Chat #${c.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {genError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{genError}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" type="button" onClick={() => setIsGenerateOpen(false)} className="h-10">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  icon={<Sparkles className="h-4 w-4" />}
                  className="bg-violet-600 hover:bg-violet-700 text-white h-10"
                >
                  Generate Quiz
                </Button>
              </div>
            </>
          )}
        </form>
      </Dialog>

      {/* Submit Confirmation Dialog */}
      <Dialog
        isOpen={isConfirmSubmitOpen}
        onClose={() => setIsConfirmSubmitOpen(false)}
        title="Submit Quiz?"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/25 text-amber-800 dark:text-amber-200 border border-amber-200/50 dark:border-amber-900/30 rounded-xl text-xs">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
            <div className="space-y-1">
              <span className="font-semibold block">Unanswered Questions Detected</span>
              <p>You have left some questions unanswered. Are you sure you want to submit the quiz and view your graded scorecard?</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsConfirmSubmitOpen(false)} className="h-10">
              Keep Working
            </Button>
            <Button
              onClick={() => {
                setIsConfirmSubmitOpen(false);
                executeSubmitQuiz();
              }}
              className="bg-violet-600 hover:bg-violet-700 text-white h-10"
            >
              Submit Anyway
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        title="Delete Study Quiz?"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/25 text-red-800 dark:text-red-200 border border-red-200/50 dark:border-red-900/30 rounded-xl text-xs">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
            <div className="space-y-1">
              <span className="font-semibold block">Irreversible Action</span>
              <p>Are you sure you want to delete this study quiz? This action cannot be undone, and your historical performance scorecards for this quiz will be permanently lost.</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsConfirmDeleteOpen(false)} className="h-10">
              Cancel
            </Button>
            <Button
              onClick={() => {
                setIsConfirmDeleteOpen(false);
                executeDeleteQuiz();
              }}
              className="bg-red-600 hover:bg-red-700 text-white h-10"
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </Dialog>
    </motion.div>
  );
}
