import React from "react";

export type PageId =
  | "dashboard"
  | "subjects"
  | "notes"
  | "ai-assistant"
  | "flashcards"
  | "quizzes"
  | "assignments"
  | "planner"
  | "analytics"
  | "resources"
  | "settings"
  | "profile";

export interface NavItem {
  id: PageId;
  label: string;
  icon: string; // lucide icon name
  category: "core" | "academic" | "tools" | "personal";
}
