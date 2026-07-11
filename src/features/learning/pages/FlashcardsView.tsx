import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../auth/hooks/use-auth.tsx";
import { useToast } from "../../../components/ui/Toast.tsx";
import { Button } from "../../../components/ui/Button.tsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/Card.tsx";
import { Dialog } from "../../../components/ui/Dialog.tsx";
import {
  Layers,
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
  HelpCircle,
  Clock,
  RefreshCw,
  Award,
  BookMarked,
  Maximize2,
  Minimize2,
  Shuffle
} from "lucide-react";

interface Flashcard {
  id: number;
  question: string;
  answer: string;
}

interface FlashcardDeck {
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

export function FlashcardsView() {
  const { token } = useAuth();
  const toast = useToast();

  // Core list states
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active study session states
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);
  const [activeCards, setActiveCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);

  // Epic 5 study states
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isShuffleMode, setIsShuffleMode] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>([]);
  const [cardRatings, setCardRatings] = useState<Record<number, "easy" | "medium" | "hard">>({});
  const [savingProgress, setSavingProgress] = useState<Record<number, boolean>>({});
  
  // Study progress tracking
  const [knownCardIds, setKnownCardIds] = useState<Set<number>>(new Set());
  const [reviewedCardIds, setReviewedCardIds] = useState<Set<number>>(new Set());

  // Generation Modal States
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [genSubjectId, setGenSubjectId] = useState<string>("");
  const [genNoteIds, setGenNoteIds] = useState<number[]>([]);
  const [genDocIds, setGenDocIds] = useState<number[]>([]);
  const [genConvId, setGenConvId] = useState<string>("");
  
  // Generation Progress states
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0); // 0 = Idle, 1 = Reading sources, 2 = Structuring flashcards, 3 = Finalizing
  const [genError, setGenError] = useState<string | null>(null);

  // Load Initial Lists
  const fetchDecks = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/learning/flashcards", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDecks(data.decks || []);
      }
    } catch (err) {
      console.error("Error fetching decks:", err);
      setError("Failed to load study decks.");
    }
  }, [token]);

  const fetchSourceMaterials = useCallback(async () => {
    if (!token) return;
    try {
      // Parallel fetch note, subjects, and documents lists
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

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await Promise.all([fetchDecks(), fetchSourceMaterials()]);
      setLoading(false);
    }
    loadData();
  }, [token, fetchDecks, fetchSourceMaterials]);

  useEffect(() => {
    if (localStorage.getItem("trigger-generate-flashcards") === "true") {
      localStorage.removeItem("trigger-generate-flashcards");
      setIsGenerateOpen(true);
    }
  }, []);

  useEffect(() => {
    const activeId = localStorage.getItem("active-deck-id");
    if (activeId && decks.length > 0) {
      const parsed = parseInt(activeId, 10);
      const deckToOpen = decks.find((d) => d.id === parsed);
      if (deckToOpen) {
        localStorage.removeItem("active-deck-id");
        handleOpenDeck(deckToOpen);
      }
    }
  }, [decks]);

  // Open deck to start study session
  const handleOpenDeck = async (deck: FlashcardDeck) => {
    if (!token) return;
    setLoadingCards(true);
    setActiveDeck(deck);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setKnownCardIds(new Set());
    setReviewedCardIds(new Set());
    
    // Reset study controls
    setIsShuffleMode(false);
    setIsFullScreen(false);
    setShuffledCards([]);
    setCardRatings({});

    try {
      // 1. Fetch Flashcards
      const res = await fetch(`/api/learning/flashcards/${deck.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveCards(data.flashcards || []);
      } else {
        toast.error("Failed to load flashcards.");
      }

      // 2. Fetch Card Difficulty Progress Ratings
      const progressRes = await fetch(`/api/learning/flashcards/decks/${deck.id}/progress`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const progressData = await progressRes.json();
      if (progressRes.ok && progressData.success) {
        const ratingsMap: Record<number, "easy" | "medium" | "hard"> = {};
        progressData.progress.forEach((p: any) => {
          ratingsMap[p.cardId] = p.rating;
        });
        setCardRatings(ratingsMap);
      }
    } catch (err) {
      console.error("Error fetching deck cards or progress:", err);
      toast.error("Network error loading cards.");
    } finally {
      setLoadingCards(false);
    }
  };

  // Soft Delete Deck
  const handleDeleteDeck = async (deckId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    if (!confirm("Are you sure you want to delete this study deck?")) return;

    try {
      const res = await fetch(`/api/learning/flashcards/${deckId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Study deck deleted.");
        setDecks((prev) => prev.filter((d) => d.id !== deckId));
        if (activeDeck?.id === deckId) {
          setActiveDeck(null);
          setActiveCards([]);
        }
      } else {
        toast.error("Failed to delete study deck.");
      }
    } catch (err) {
      console.error("Delete deck failed:", err);
      toast.error("Failed to delete deck due to connection error.");
    }
  };

  // Submit Generation Request
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (genNoteIds.length === 0 && genDocIds.length === 0 && !genConvId) {
      setGenError("Please select at least one note, document, or conversation to generate flashcards.");
      return;
    }

    setGenerating(true);
    setGenError(null);
    setGenStep(1);

    // Dynamic fake step timer progress for visual flair
    const interval = setInterval(() => {
      setGenStep((s) => {
        if (s === 1) return 2;
        if (s === 2) return 3;
        return s;
      });
    }, 2800);

    try {
      const res = await fetch("/api/learning/flashcards/generate", {
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
        }),
      });

      const data = await res.json();
      clearInterval(interval);

      if (res.ok && data.success) {
        setGenStep(3);
        toast.success("Flashcards generated successfully!");
        await fetchDecks();
        
        // Reset selections
        setGenNoteIds([]);
        setGenDocIds([]);
        setGenConvId("");
        setGenSubjectId("");
        
        // Auto open the new deck
        setTimeout(() => {
          setIsGenerateOpen(false);
          setGenerating(false);
          setGenStep(0);
          handleOpenDeck(data.deck);
        }, 1200);
      } else {
        setGenError(data.error || "Failed to generate study cards. Please check your text context or try again.");
        setGenerating(false);
      }
    } catch (err) {
      clearInterval(interval);
      console.error("Generation error:", err);
      setGenError("A network error occurred while generating flashcards.");
      setGenerating(false);
    }
  };

  // Toggle Source selections
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

  // Active recall responses during a deck study session
  const handleMarkCardResponse = (known: boolean) => {
    const cards = isShuffleMode ? shuffledCards : activeCards;
    const card = cards[currentCardIndex];
    if (!card) return;

    const newKnown = new Set(knownCardIds);
    if (known) {
      newKnown.add(card.id);
    } else {
      newKnown.delete(card.id);
    }
    setKnownCardIds(newKnown);

    const newReviewed = new Set(reviewedCardIds);
    newReviewed.add(card.id);
    setReviewedCardIds(newReviewed);

    // Save as hard if they struggled, easy if they knew it
    handleRateCard(card.id, known ? "easy" : "hard", true);
  };

  const handleToggleShuffle = () => {
    if (isShuffleMode) {
      setIsShuffleMode(false);
      setShuffledCards([]);
    } else {
      setIsShuffleMode(true);
      const shuffled = [...activeCards].sort(() => Math.random() - 0.5);
      setShuffledCards(shuffled);
    }
    setCurrentCardIndex(0);
    setIsFlipped(false);
    toast.success(isShuffleMode ? "Ordered mode enabled" : "Cards shuffled!");
  };

  const handleRateCard = async (cardId: number, rating: "easy" | "medium" | "hard", autoAdvance = false) => {
    if (!token) return;
    setSavingProgress((prev) => ({ ...prev, [cardId]: true }));
    try {
      const res = await fetch(`/api/learning/flashcards/cards/${cardId}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCardRatings((prev) => ({ ...prev, [cardId]: rating }));
        
        // Add to reviewed card list
        const newReviewed = new Set(reviewedCardIds);
        newReviewed.add(cardId);
        setReviewedCardIds(newReviewed);

        const newKnown = new Set(knownCardIds);
        if (rating === "easy") {
          newKnown.add(cardId);
        } else {
          newKnown.delete(cardId);
        }
        setKnownCardIds(newKnown);

        if (autoAdvance) {
          setTimeout(() => {
            setIsFlipped(false);
            const total = isShuffleMode ? shuffledCards.length : activeCards.length;
            if (currentCardIndex < total - 1) {
              setCurrentCardIndex((i) => i + 1);
            }
          }, 350);
        }
      }
    } catch (err) {
      console.error("Error rating card:", err);
    } finally {
      setSavingProgress((prev) => ({ ...prev, [cardId]: false }));
    }
  };

  const handleRegenerateActiveDeck = async () => {
    if (!activeDeck || !token) return;
    setLoadingCards(true);
    try {
      const res = await fetch("/api/learning/flashcards/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          noteIds: activeDeck.noteId ? [activeDeck.noteId] : [],
          documentIds: activeDeck.documentId ? [activeDeck.documentId] : [],
          subjectId: activeDeck.subjectId || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Deck regenerated successfully!");
        handleOpenDeck(data.deck);
        fetchDecks();
      } else {
        toast.error("Regeneration failed.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to regenerate.");
    } finally {
      setLoadingCards(false);
    }
  };

  // Render the actual card layout
  const renderCardBody = () => {
    const cards = isShuffleMode ? shuffledCards : activeCards;
    if (cards.length === 0) {
      return (
        <Card className="p-8 text-center border-slate-200 dark:border-slate-800">
          <CardContent className="flex flex-col items-center justify-center space-y-3 pt-6">
            <HelpCircle className="h-10 w-10 text-slate-400" />
            <p className="text-slate-500 text-sm">No flashcards found in this deck.</p>
          </CardContent>
        </Card>
      );
    }

    const card = cards[currentCardIndex];
    const isMastered = knownCardIds.has(card?.id);
    const hasBeenReviewed = reviewedCardIds.has(card?.id);
    const activeRating = cardRatings[card?.id];

    return (
      <div className="flex flex-col items-center space-y-8 w-full max-w-lg mx-auto">
        {/* Progress header & Tools */}
        <div className="w-full flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>CARD {currentCardIndex + 1} OF {cards.length} {isShuffleMode && "(SHUFFLED)"}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleShuffle}
              className={`p-1.5 rounded-lg border transition-all ${
                isShuffleMode
                  ? "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/40 dark:border-violet-900/60 dark:text-violet-400"
                  : "bg-transparent border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900"
              }`}
              title="Shuffle Cards"
            >
              <Shuffle className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all text-slate-600 dark:text-slate-400"
              title="Immersive Mode"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Card stage */}
        <div className="relative w-full h-80 [perspective:1000px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentCardIndex + "-" + (isFlipped ? "back" : "front")}
              initial={{ opacity: 0, rotateY: isFlipped ? -90 : 90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: isFlipped ? 90 : -90 }}
              transition={{ duration: 0.25 }}
              onClick={() => setIsFlipped(!isFlipped)}
              className={`absolute inset-0 w-full h-full cursor-pointer flex flex-col justify-between p-8 rounded-2xl border transition-all duration-300 shadow-lg ${
                isFlipped
                  ? "bg-violet-50/70 border-violet-200 text-violet-950 dark:bg-violet-950/20 dark:border-violet-900/60 dark:text-violet-100"
                  : "bg-white border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono tracking-wider font-semibold uppercase text-violet-600 dark:text-violet-400">
                  {isFlipped ? "Correct Answer" : "Question Prompt"}
                </span>
                
                <div className="flex items-center gap-1.5">
                  {activeRating && (
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold font-mono uppercase border ${
                      activeRating === "easy"
                        ? "bg-emerald-50/50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400"
                        : activeRating === "medium"
                        ? "bg-amber-50/50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-400"
                        : "bg-rose-50/50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-400"
                    }`}>
                      {activeRating}
                    </span>
                  )}
                  {hasBeenReviewed && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      isMastered 
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"
                    }`}>
                      {isMastered ? "Mastered" : "Needs Review"}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center py-4 text-center">
                <p className="text-xl font-medium tracking-tight leading-relaxed max-h-48 overflow-y-auto pr-1">
                  {isFlipped ? card.answer : card.question}
                </p>
              </div>

              <div className="text-center text-[10px] text-slate-400 font-mono select-none">
                CLICK CARD TO FLIP
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Active recall action triggers */}
        <div className="flex flex-col space-y-4 w-full">
          {/* Rating options (Easy / Medium / Hard) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 text-center block">
              Grade Your Recall Confidence
            </span>
            <div className="grid grid-cols-3 gap-3 w-full">
              <button
                disabled={savingProgress[card.id]}
                onClick={() => handleRateCard(card.id, "hard", true)}
                className={`py-2 rounded-xl text-xs font-semibold border transition-all flex flex-col items-center justify-center ${
                  activeRating === "hard"
                    ? "border-rose-500 bg-rose-50/80 text-rose-900 dark:bg-rose-950/35 dark:text-rose-100 shadow-sm"
                    : "border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50/20 text-slate-700 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-300 dark:hover:bg-rose-950/10"
                }`}
              >
                <span>Hard</span>
                <span className="text-[9px] font-normal text-slate-400 mt-0.5">Struggled</span>
              </button>

              <button
                disabled={savingProgress[card.id]}
                onClick={() => handleRateCard(card.id, "medium", true)}
                className={`py-2 rounded-xl text-xs font-semibold border transition-all flex flex-col items-center justify-center ${
                  activeRating === "medium"
                    ? "border-amber-500 bg-amber-50/80 text-amber-900 dark:bg-amber-950/35 dark:text-amber-100 shadow-sm"
                    : "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/20 text-slate-700 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-300 dark:hover:bg-amber-950/10"
                }`}
              >
                <span>Medium</span>
                <span className="text-[9px] font-normal text-slate-400 mt-0.5">Hesitant</span>
              </button>

              <button
                disabled={savingProgress[card.id]}
                onClick={() => handleRateCard(card.id, "easy", true)}
                className={`py-2 rounded-xl text-xs font-semibold border transition-all flex flex-col items-center justify-center ${
                  activeRating === "easy"
                    ? "border-emerald-500 bg-emerald-50/80 text-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-100 shadow-sm"
                    : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/20 text-slate-700 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-300 dark:hover:bg-emerald-950/10"
                }`}
              >
                <span>Easy</span>
                <span className="text-[9px] font-normal text-slate-400 mt-0.5">Instantly</span>
              </button>
            </div>
          </div>

          {/* Nav buttons */}
          <div className="flex justify-between items-center gap-4 w-full">
            <Button
              variant="outline"
              onClick={() => {
                setIsFlipped(false);
                setCurrentCardIndex((i) => Math.max(0, i - 1));
              }}
              disabled={currentCardIndex === 0}
              className="flex-1 h-11 text-xs"
              icon={<ChevronLeft className="h-4 w-4" />}
            >
              Previous
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setIsFlipped(false);
                setCurrentCardIndex((i) => Math.min(cards.length - 1, i + 1));
              }}
              disabled={currentCardIndex === cards.length - 1}
              className="flex-1 h-11 text-xs flex-row-reverse"
              icon={<ChevronRight className="h-4 w-4" />}
            >
              Next
            </Button>
          </div>
        </div>

        {/* Quick controls reset / restart */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-500 pt-2">
          <button
            onClick={() => {
              setCurrentCardIndex(0);
              setIsFlipped(false);
              setKnownCardIds(new Set());
              setReviewedCardIds(new Set());
              toast.success("Study progress reset!");
            }}
            className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> Restart Deck
          </button>
          <span>•</span>
          <button
            onClick={handleRegenerateActiveDeck}
            className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <RefreshCw className="h-3 w-3" /> Regenerate cards
          </button>
        </div>
      </div>
    );
  };

  // Render main sub-tab content
  if (activeDeck) {
    if (isFullScreen) {
      return (
        <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col justify-between p-6 md:p-12 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-mono tracking-wider font-semibold text-violet-400 uppercase">
                Immersive Study Mode
              </span>
              <h2 className="text-xl font-bold tracking-tight text-white">{activeDeck.title}</h2>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullScreen(false)}
              icon={<Minimize2 className="h-4 w-4" />}
              className="border-slate-800 hover:bg-slate-900 hover:text-white text-slate-300 text-xs"
            >
              Exit Immersive Mode
            </Button>
          </div>

          {/* Core Player Stage */}
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="w-full max-w-lg">
              {loadingCards ? (
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="relative h-12 w-12 rounded-full border-4 border-slate-800 border-t-violet-400 animate-spin" />
                  <p className="text-xs text-slate-400 font-mono">Loading cards...</p>
                </div>
              ) : (
                renderCardBody()
              )}
            </div>
          </div>

          {/* Footer Shortcuts */}
          <div className="text-center text-[10px] font-mono text-slate-500 border-t border-slate-900 pt-4 flex flex-wrap gap-4 justify-center">
            <span>💡 DISTRACTION-FREE RECALL SESSION ACTIVE</span>
            <span>•</span>
            <span>SHUFFLE OR EVALUATE COGNITION AT ANY PACE</span>
          </div>
        </div>
      );
    }

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
                setActiveDeck(null);
                setActiveCards([]);
                fetchDecks();
              }}
              className="h-9 px-2"
              icon={<ArrowLeft className="h-4 w-4" />}
            />
            <div>
              <h2 className="text-xl font-bold tracking-tight font-display">{activeDeck.title}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{activeDeck.description}</p>
            </div>
          </div>
        </div>

        {loadingCards ? (
          <div className="h-96 flex flex-col items-center justify-center space-y-4">
            <div className="relative h-12 w-12 rounded-full border-4 border-slate-100 border-t-violet-600 animate-spin" />
            <p className="text-xs text-slate-500 font-mono">Loading dynamic active recall cards...</p>
          </div>
        ) : (
          renderCardBody()
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
            Active Recall Flashcards
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Retain curriculum theories, terminology, and core equations through smart AI flashcards formulated directly from your note-taking or documents.
          </p>
        </div>

        <div>
          <Button
            onClick={() => setIsGenerateOpen(true)}
            icon={<Sparkles className="h-4 w-4" />}
            className="shadow-sm shadow-violet-500/10 h-10 text-sm bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
          >
            Generate Flashcards
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
      ) : decks.length === 0 ? (
        <Card className="border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/10 backdrop-blur-sm py-16 px-6">
          <CardContent className="flex flex-col items-center text-center max-w-md mx-auto space-y-5">
            <div className="h-16 w-16 rounded-2xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/40 dark:border-slate-800/40 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <Layers className="h-8 w-8 text-violet-600 dark:text-violet-400" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">
                No Flashcard Decks Yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Unlock active-recall study capabilities. Provide documents, notes, or chat history and let Gemini synthesize customized Q&A study decks for your exams.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsGenerateOpen(true)}
              className="text-xs h-9"
            >
              Generate First Deck
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => {
            const subject = subjects.find((s) => s.id === deck.subjectId);
            return (
              <motion.div
                key={deck.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleOpenDeck(deck)}
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
                        onClick={(e) => handleDeleteDeck(deck.id, e)}
                        className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-opacity"
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                      />
                    </div>
                    <CardTitle className="text-base font-semibold tracking-tight mt-2 text-slate-900 dark:text-slate-100 line-clamp-1">
                      {deck.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {deck.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4 border-t border-slate-50 dark:border-slate-900/60 mt-auto flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(deck.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1 text-violet-600 dark:text-violet-400 font-semibold uppercase tracking-wider">
                      <BookMarked className="h-3 w-3" /> STUDY DECK
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
        title="Formulate Study Flashcards"
      >
        <form onSubmit={handleGenerate} className="space-y-5">
          {generating ? (
            <div className="py-8 text-center space-y-6">
              <div className="relative h-16 w-16 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100 border-t-violet-600 animate-spin" />
                <Layers className="h-6 w-6 text-violet-600 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-base text-slate-800 dark:text-slate-100">
                  {genStep === 1 && "Synthesizing study texts..."}
                  {genStep === 2 && "Formulating active-recall cues..."}
                  {genStep === 3 && "Persisting flashcard deck..."}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Our study compiler is running key-term extraction and designing premium Q&A pairs for your review.
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
                  Generate Flashcards
                </Button>
              </div>
            </>
          )}
        </form>
      </Dialog>
    </motion.div>
  );
}
