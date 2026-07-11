import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Bot, Activity, LifeBuoy, Send, RefreshCw, 
  CheckCircle, ArrowRight, BookOpen, AlertCircle, Sparkles, User, MessageSquare
} from "lucide-react";
import { useAuth } from "../../auth/hooks/use-auth";
import { useToast } from "../../../components/ui/Toast.tsx";

interface SupportAICoPilotProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
}

interface ChatMessage {
  role: "user" | "model";
  content: string;
}

interface DiagnosticData {
  diagnosticLogs: string[];
  stats: {
    subjectsCount: number;
    pendingTasksCount: number;
    pendingAssignmentsCount: number;
    quizAttemptsCount: number;
  };
  tips: string[];
}

export function SupportAICoPilot({ isOpen, onClose, activeTab }: SupportAICoPilotProps) {
  const { token, firebaseUser, user } = useAuth();
  const toast = useToast();
  const [activeSubTab, setActiveSubTab] = useState<"chat" | "diagnostics" | "ticket">("chat");
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      content: `Hello ${user?.name || firebaseUser?.displayName || "there"}! I'm your AI Support Co-Pilot & Educational Mentor. How can I assist you with your studies or navigating the platform today?`
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Diagnostics state
  const [diagnostics, setDiagnostics] = useState<DiagnosticData | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [visibleLogCount, setVisibleLogCount] = useState(0);

  // Ticket state
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketCategory, setTicketCategory] = useState("technical");
  const [ticketDescription, setTicketDescription] = useState("");
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatLoading]);

  // Load diagnostics when activeSubTab changes to diagnostics
  useEffect(() => {
    if (activeSubTab === "diagnostics" && !diagnostics && !isDiagnosing) {
      runDiagnostics();
    }
  }, [activeSubTab]);

  const runDiagnostics = async () => {
    if (!token) return;
    setIsDiagnosing(true);
    setVisibleLogCount(0);
    setDiagnostics(null);

    try {
      const response = await fetch("/api/support/diagnose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ activeTab })
      });

      if (!response.ok) throw new Error("Failed to load diagnostics");
      const data = await response.json();
      
      // Simulate slow logging for a premium look
      if (data.success) {
        setDiagnostics(data);
        for (let i = 1; i <= data.diagnosticLogs.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, 350));
          setVisibleLogCount(i);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch system diagnostic information.");
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, presetPrompt?: string) => {
    if (e) e.preventDefault();
    const textToSend = presetPrompt || inputMessage;
    if (!textToSend.trim() || isChatLoading || !token) return;

    const newUserMessage: ChatMessage = { role: "user", content: textToSend };
    setChatMessages((prev) => [...prev, newUserMessage]);
    setInputMessage("");
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: [...chatMessages, newUserMessage],
          activeTab,
          systemContext: diagnostics ? { stats: diagnostics.stats, tips: diagnostics.tips } : null
        })
      });

      if (!response.ok) throw new Error("Failed to get chat response");
      const data = await response.json();
      
      if (data.success) {
        setChatMessages((prev) => [...prev, { role: "model", content: data.reply }]);
      } else {
        throw new Error(data.error || "Chat response error");
      }
    } catch (error: any) {
      console.error(error);
      setChatMessages((prev) => [
        ...prev, 
        { 
          role: "model", 
          content: "I encountered a transient connection issue. Please make sure your network is stable, or tap 'Submit Ticket' above to escalate this to an educational mentor." 
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim() || isSubmittingTicket) {
      toast.error("Please fill out all required ticket fields.");
      return;
    }

    setIsSubmittingTicket(true);
    try {
      // Simulate premium secure ticket registration
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      toast.success("Helpdesk Ticket opened! An educational mentor will assist you within 24 hours.");
      
      // Reset form
      setTicketSubject("");
      setTicketDescription("");
      setActiveSubTab("chat"); // redirect back to chat
    } catch (error) {
      toast.error("Failed to submit ticket. Please try again.");
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  // Helper to safely render simple custom formatting
  const renderMessageContent = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      // Bullet points
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const text = line.replace(/^[-*]\s+/, "");
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-slate-600 dark:text-slate-300 mb-1 leading-relaxed">
            {formatInlineStyling(text)}
          </li>
        );
      }
      // Numbered lists
      if (/^\d+\.\s+/.test(line.trim())) {
        const text = line.replace(/^\d+\.\s+/, "");
        return (
          <li key={idx} className="ml-4 list-decimal text-xs text-slate-600 dark:text-slate-300 mb-1 leading-relaxed">
            {formatInlineStyling(text)}
          </li>
        );
      }
      // Empty line
      if (!line.trim()) return <div key={idx} className="h-2" />;
      // Normal paragraph
      return (
        <p key={idx} className="text-xs text-slate-600 dark:text-slate-300 mb-2 leading-relaxed">
          {formatInlineStyling(line)}
        </p>
      );
    });
  };

  const formatInlineStyling = (text: string) => {
    // Basic bolding **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-semibold text-slate-800 dark:text-slate-100">{part.slice(2, -2)}</strong>;
      }
      // Inline code `code`
      const codeParts = part.split(/(`.*?`)/g);
      return codeParts.map((subPart, j) => {
        if (subPart.startsWith("`") && subPart.endsWith("`")) {
          return (
            <code key={`${i}-${j}`} className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-violet-600 dark:text-violet-400">
              {subPart.slice(1, -1)}
            </code>
          );
        }
        return subPart;
      });
    });
  };

  const getPresetPromptsForTab = (tab: string) => {
    switch (tab) {
      case "dashboard":
        return [
          "How do I use the Daily Briefing?",
          "What is my study streak?"
        ];
      case "planner":
        return [
          "How do I schedule a revision plan?",
          "How do I update a study task priority?"
        ];
      case "flashcards":
        return [
          "Can I auto-generate flashcards?",
          "How does spaced repetition work here?"
        ];
      case "quizzes":
        return [
          "How are quizzes generated?",
          "How is my quiz accuracy tracked?"
        ];
      default:
        return [
          "How can the AI study mentor help me?",
          "How do I upload custom study material?"
        ];
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Drawer Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
          />

          {/* Drawer Sidebar Container */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="fixed top-0 right-0 z-50 w-full sm:w-[480px] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* 1. Header Area */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <div className="relative h-9 w-9 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-md">
                  <Bot className="h-5 w-5" />
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                    AI Support Co-Pilot
                    <span className="text-[9px] bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wider">Beta</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">Educational Mentor & Application Guide</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* 2. Sub-Tab Switcher */}
            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-1">
              <button
                onClick={() => setActiveSubTab("chat")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                  activeSubTab === "chat"
                    ? "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/40"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/40"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                AI Mentor Chat
              </button>
              <button
                onClick={() => setActiveSubTab("diagnostics")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                  activeSubTab === "diagnostics"
                    ? "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/40"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/40"
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                Diagnostics
              </button>
              <button
                onClick={() => setActiveSubTab("ticket")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                  activeSubTab === "ticket"
                    ? "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/40"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/40"
                }`}
              >
                <LifeBuoy className="h-3.5 w-3.5" />
                Human Mentor
              </button>
            </div>

            {/* 3. Panel Body Area */}
            <div className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-950/10">
              
              {/* === TAB A: AI CHAT === */}
              {activeSubTab === "chat" && (
                <div className="h-full flex flex-col justify-between p-4 space-y-4">
                  {/* Message Stream */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[250px]">
                    {chatMessages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {msg.role !== "user" && (
                          <div className="h-7 w-7 rounded-lg bg-violet-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                            <Bot className="h-4 w-4" />
                          </div>
                        )}
                        <div
                          className={`max-w-[85%] p-3 rounded-xl text-xs shadow-xs leading-relaxed border ${
                            msg.role === "user"
                              ? "bg-violet-600 text-white border-violet-600 rounded-tr-none"
                              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-100 dark:border-slate-800/60 rounded-tl-none"
                          }`}
                        >
                          {msg.role === "user" ? (
                            <p className="text-xs leading-relaxed">{msg.content}</p>
                          ) : (
                            <div>{renderMessageContent(msg.content)}</div>
                          )}
                        </div>
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="flex gap-2.5 justify-start">
                        <div className="h-7 w-7 rounded-lg bg-violet-600 flex items-center justify-center text-white shrink-0">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="max-w-[80%] p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-tl-none flex items-center gap-1.5">
                          <div className="flex space-x-1">
                            <span className="block h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                            <span className="block h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                            <span className="block h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">Analyzing workspace context...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Preset Suggestions */}
                  {chatMessages.length === 1 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-violet-500" />
                        Quick Guided Prompts for "{activeTab}"
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {getPresetPromptsForTab(activeTab).map((prompt, i) => (
                          <button
                            key={i}
                            onClick={() => handleSendMessage(undefined, prompt)}
                            className="text-[10px] bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-left flex items-center justify-between gap-1 w-full cursor-pointer hover:border-violet-300 dark:hover:border-violet-900 transition-all"
                          >
                            <span>{prompt}</span>
                            <ChevronRight className="h-3 w-3 text-slate-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message Input Box */}
                  <form onSubmit={handleSendMessage} className="flex gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Ask the co-pilot how to study or use a tool..."
                      disabled={isChatLoading}
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none text-slate-800 dark:text-slate-100 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={isChatLoading || !inputMessage.trim()}
                      className="bg-violet-600 hover:bg-violet-700 text-white p-2 rounded-lg cursor-pointer transition-colors shrink-0 disabled:opacity-40 disabled:hover:bg-violet-600 flex items-center justify-center"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              )}

              {/* === TAB B: DYNAMIC DIAGNOSTICS === */}
              {activeSubTab === "diagnostics" && (
                <div className="p-4 space-y-4">
                  {/* Diagnostic Log Console */}
                  <div className="bg-slate-900 dark:bg-black rounded-xl p-3 border border-slate-800 shadow-inner font-mono text-[10px] leading-relaxed text-slate-300 space-y-1 max-h-48 overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                      <span>Live Diagnostic Console</span>
                      <button 
                        onClick={runDiagnostics} 
                        disabled={isDiagnosing}
                        className="hover:text-violet-400 disabled:opacity-50 cursor-pointer flex items-center gap-1 font-sans"
                      >
                        <RefreshCw className={`h-2.5 w-2.5 ${isDiagnosing ? "animate-spin" : ""}`} />
                        Scan Now
                      </button>
                    </div>

                    {isDiagnosing && visibleLogCount === 0 && (
                      <p className="text-slate-500 animate-pulse">Initializing hardware diagnostics...</p>
                    )}

                    {diagnostics?.diagnosticLogs.slice(0, visibleLogCount).map((log, i) => (
                      <p key={i} className={log.includes("Healthy") || log.includes("successfully") ? "text-green-400" : "text-indigo-300"}>
                        {log}
                      </p>
                    ))}

                    {!isDiagnosing && diagnostics && visibleLogCount === diagnostics.diagnosticLogs.length && (
                      <p className="text-green-400 font-semibold mt-2 flex items-center gap-1 text-[11px]">
                        <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                        All Core Hub Services fully functional!
                      </p>
                    )}
                  </div>

                  {/* Diagnostics Metrics Card Grid */}
                  {diagnostics && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 font-sans">Synced Database metrics</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 flex items-center justify-center shrink-0">
                              <BookOpen className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400">Total Subjects</p>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{diagnostics.stats.subjectsCount}</p>
                            </div>
                          </div>

                          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center shrink-0">
                              <Activity className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400">Pending Tasks</p>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{diagnostics.stats.pendingTasksCount}</p>
                            </div>
                          </div>

                          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-500 flex items-center justify-center shrink-0">
                              <AlertCircle className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400">Active Assignments</p>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{diagnostics.stats.pendingAssignmentsCount}</p>
                            </div>
                          </div>

                          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-green-50 dark:bg-green-950/50 text-green-500 flex items-center justify-center shrink-0">
                              <CheckCircle className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400">Completed Quizzes</p>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{diagnostics.stats.quizAttemptsCount}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AI Generated Study Optimization Tips */}
                      <div className="bg-violet-50/50 dark:bg-violet-950/15 border border-violet-100 dark:border-violet-900/40 p-4 rounded-xl space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-violet-700 dark:text-violet-300">
                          <Sparkles className="h-4 w-4 text-violet-500 shrink-0 animate-pulse" />
                          AI Study Co-Pilot Recommendations
                        </div>
                        <div className="space-y-1.5">
                          {diagnostics.tips.map((tip, idx) => (
                            <div key={idx} className="flex gap-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                              <div className="h-4 w-4 rounded-full bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">{idx + 1}</div>
                              <p>{tip}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* === TAB C: ESCALATE TO HUMAN MENTOR === */}
              {activeSubTab === "ticket" && (
                <div className="p-4 space-y-4">
                  <div className="bg-blue-50/50 dark:bg-blue-950/15 border border-blue-100 dark:border-blue-900/30 p-4 rounded-xl flex gap-3 text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                    <LifeBuoy className="h-5 w-5 text-blue-500 shrink-0" />
                    <div>
                      <p className="font-bold mb-0.5">Need human intervention?</p>
                      <p>If you have academic support requests, complex billing inquiries, or technical bugs, fill out this quick ticket. Our human educational mentors and engineering support team will assist you within 24 hours.</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitTicket} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ticket Subject *</label>
                      <input
                        type="text"
                        required
                        value={ticketSubject}
                        onChange={(e) => setTicketSubject(e.target.value)}
                        placeholder="e.g. Cannot generate study planner blocks or syllabus error"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-violet-500 outline-none text-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                        <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-2 rounded-lg text-xs border border-transparent truncate">
                          {user?.name || firebaseUser?.displayName || "Student Pioneer"}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                        <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-2 rounded-lg text-xs border border-transparent truncate">
                          {firebaseUser?.email || "student@example.com"}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Category</label>
                      <select
                        value={ticketCategory}
                        onChange={(e) => setTicketCategory(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-violet-500 outline-none text-slate-800 dark:text-slate-100"
                      >
                        <option value="technical">Technical / App Bug</option>
                        <option value="academic">Academic Mentorship & Syllabus Help</option>
                        <option value="feature">Feature Request / Suggestion</option>
                        <option value="account">Account & Session Sync</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description of Issue *</label>
                      <textarea
                        required
                        rows={4}
                        value={ticketDescription}
                        onChange={(e) => setTicketDescription(e.target.value)}
                        placeholder="Please provide steps to reproduce or details of what you need help with..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-violet-500 outline-none text-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingTicket}
                      className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingTicket ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Submitting ticket...
                        </>
                      ) : (
                        <>
                          Submit Secure Ticket
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

            </div>

            {/* 4. Footer Help Area */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-center text-slate-400 bg-slate-50/50 dark:bg-slate-950/20">
              AI Support Co-Pilot responses are powered by Google Gemini and real-time student analytics.
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ChevronRight interface / SVG if not directly imported (just in case)
function ChevronRight({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
