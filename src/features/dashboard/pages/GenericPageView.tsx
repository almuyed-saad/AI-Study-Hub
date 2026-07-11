import React, { useState } from "react";
import { motion } from "motion/react";
import { useToast } from "../../../components/ui/Toast.tsx";
import { Button } from "../../../components/ui/Button.tsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/Card.tsx";
import * as Icons from "lucide-react";

interface GenericPageViewProps {
  key?: React.Key;
  pageId: string;
  title: string;
  description: string;
}

export function GenericPageView({ pageId, title, description }: GenericPageViewProps) {
  const toast = useToast();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Dynamically select an icon for the empty state
  const getIcon = () => {
    switch (pageId) {
      case "subjects":
        return "BookOpen";
      case "notes":
        return "FileText";
      case "ai-assistant":
        return "Sparkles";
      case "flashcards":
        return "Layers";
      case "quizzes":
        return "HelpCircle";
      case "assignments":
        return "CheckSquare";
      case "planner":
        return "Calendar";
      case "analytics":
        return "BarChart3";
      case "resources":
        return "FolderOpen";
      default:
        return "Folder";
    }
  };

  const getActionLabel = () => {
    switch (pageId) {
      case "subjects":
        return "Add Subject";
      case "notes":
        return "Create Note";
      case "ai-assistant":
        return "Start AI Session";
      case "flashcards":
        return "Build Deck";
      case "quizzes":
        return "Generate Quiz";
      case "assignments":
        return "Add Assignment";
      case "planner":
        return "Add Event";
      case "analytics":
        return "Export Report";
      case "resources":
        return "Upload Resource";
      default:
        return "New Action";
    }
  };

  const IconComponent = (Icons as any)[getIcon()] || Icons.Folder;

  const handleActionClick = () => {
    setLoadingAction(pageId);
    setTimeout(() => {
      setLoadingAction(null);
      toast.success(`${getActionLabel()} action triggered! (SaaS UI Shell Concept)`);
    }, 700);
  };

  // Unique layout cards/features depending on the page for visual high-fidelity
  const renderMockSection = () => {
    switch (pageId) {
      case "ai-assistant":
        return (
          <div className="grid gap-4 md:grid-cols-3 mt-6">
            <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-1">
                  <Icons.MessageSquare className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-semibold">Explanations</CardTitle>
                <CardDescription className="text-xs">Deconstruct complicated topics into clear analogies.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1">
                  <Icons.BrainCircuit className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-semibold">Active Recall</CardTitle>
                <CardDescription className="text-xs">Create custom Socratic study queries on your notes.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1">
                  <Icons.Code className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-semibold">Code Helper</CardTitle>
                <CardDescription className="text-xs">Synthesize database statements, server setups & styles.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        );
      case "analytics":
        return (
          <div className="grid gap-4 md:grid-cols-2 mt-6">
            <Card className="border-slate-200/50 dark:border-slate-800/50">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Subject Breakdown (Concepts Mastered)</CardTitle>
              </CardHeader>
              <CardContent className="h-48 flex items-center justify-center bg-slate-100/40 dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                <div className="text-center space-y-1">
                  <Icons.BarChart2 className="h-8 w-8 mx-auto text-slate-400" />
                  <p className="text-xs text-slate-500">Mastery chart visualizer will render upon sync.</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200/50 dark:border-slate-800/50">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Study Duration logs (Weekly)</CardTitle>
              </CardHeader>
              <CardContent className="h-48 flex items-center justify-center bg-slate-100/40 dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                <div className="text-center space-y-1">
                  <Icons.LineChart className="h-8 w-8 mx-auto text-slate-400" />
                  <p className="text-xs text-slate-500">Daily productivity logs will synchronize here.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-6 w-full max-w-5xl"
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight font-display bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-white dark:to-slate-300">
            {title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            {description}
          </p>
        </div>

        <div>
          <Button
            onClick={handleActionClick}
            loading={loadingAction === pageId}
            icon={<Icons.Plus className="h-4 w-4" />}
            className="shadow-sm shadow-violet-500/10 h-10 text-sm"
          >
            {getActionLabel()}
          </Button>
        </div>
      </div>

      {/* Main Empty State Content */}
      <Card className="border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/10 backdrop-blur-sm py-16 px-6">
        <CardContent className="flex flex-col items-center text-center max-w-md mx-auto space-y-5">
          <div className="h-16 w-16 rounded-2xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/40 dark:border-slate-800/40 text-slate-600 dark:text-slate-300 flex items-center justify-center shadow-inner animate-pulse">
            <IconComponent className="h-8 w-8 text-violet-600 dark:text-violet-400" />
          </div>

          <div className="space-y-1.5">
            <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">
              No {title.toLowerCase()} configured yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Unlock productivity modules by adding content! Create records, import study guides, or let our AI Study Assistant model formulate mock curriculum frameworks for you.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleActionClick}
            className="text-xs h-9"
          >
            {getActionLabel()} Concept
          </Button>
        </CardContent>
      </Card>

      {/* Supplemental Custom Visualizations */}
      {renderMockSection()}
    </motion.div>
  );
}
