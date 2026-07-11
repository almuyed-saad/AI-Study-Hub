import React, { createContext, useContext, useEffect, useState } from "react";
import { Theme } from "../types/index.ts";

export const ACCENT_COLORS = {
  violet: {
    name: "Violet",
    primary: "#8b5cf6",
    hover: "#7c3aed",
    active: "#6d28d9",
    light: "#ede9fe",
    bg50: "#f5f3ff",
    "50": "#f5f3ff",
    "100": "#ede9fe",
    "200": "#ddd6fe",
    "300": "#c4b5fd",
    "400": "#a78bfa",
    "500": "#8b5cf6",
    "600": "#7c3aed",
    "700": "#6d28d9",
    "800": "#5b21b6",
    "900": "#4c1d95",
    "950": "#2e1065",
  },
  indigo: {
    name: "Indigo",
    primary: "#6366f1",
    hover: "#4f46e5",
    active: "#4338ca",
    light: "#e0e7ff",
    bg50: "#f5f7ff",
    "50": "#f5f7ff",
    "100": "#e0e7ff",
    "200": "#c7d2fe",
    "300": "#a5b4fc",
    "400": "#818cf8",
    "500": "#6366f1",
    "600": "#4f46e5",
    "700": "#4338ca",
    "800": "#3730a3",
    "900": "#312e81",
    "950": "#1e1b4b",
  },
  blue: {
    name: "Blue",
    primary: "#3b82f6",
    hover: "#2563eb",
    active: "#1d4ed8",
    light: "#dbeafe",
    bg50: "#eff6ff",
    "50": "#eff6ff",
    "100": "#dbeafe",
    "200": "#bfdbfe",
    "300": "#93c5fd",
    "400": "#60a5fa",
    "500": "#3b82f6",
    "600": "#2563eb",
    "700": "#1d4ed8",
    "800": "#1e40af",
    "900": "#1e3a8a",
    "950": "#172554",
  },
  emerald: {
    name: "Emerald",
    primary: "#10b981",
    hover: "#059669",
    active: "#047857",
    light: "#d1fae5",
    bg50: "#f0fdf4",
    "50": "#f0fdf4",
    "100": "#d1fae5",
    "200": "#a7f3d0",
    "300": "#6ee7b7",
    "400": "#34d399",
    "500": "#10b981",
    "600": "#059669",
    "700": "#047857",
    "800": "#065f46",
    "900": "#064e3b",
    "950": "#022c22",
  },
  rose: {
    name: "Rose",
    primary: "#f43f5e",
    hover: "#e11d48",
    active: "#be123c",
    light: "#ffe4e6",
    bg50: "#fff5f5",
    "50": "#fff5f5",
    "100": "#ffe4e6",
    "200": "#fecdd3",
    "300": "#fda4af",
    "400": "#fb7185",
    "500": "#f43f5e",
    "600": "#e11d48",
    "700": "#be123c",
    "800": "#9f1239",
    "900": "#881337",
    "950": "#4c0519",
  },
  amber: {
    name: "Amber",
    primary: "#f59e0b",
    hover: "#d97706",
    active: "#b45309",
    light: "#fef3c7",
    bg50: "#fffbeb",
    "50": "#fffbeb",
    "100": "#fef3c7",
    "200": "#fde68a",
    "300": "#fcd34d",
    "400": "#fbbf24",
    "500": "#f59e0b",
    "600": "#d97706",
    "700": "#b45309",
    "800": "#92400e",
    "900": "#78350f",
    "950": "#451a03",
  },
  slate: {
    name: "Slate",
    primary: "#64748b",
    hover: "#475569",
    active: "#334155",
    light: "#f1f5f9",
    bg50: "#f8fafc",
    "50": "#f8fafc",
    "100": "#f1f5f9",
    "200": "#e2e8f0",
    "300": "#cbd5e1",
    "400": "#94a3b8",
    "500": "#64748b",
    "600": "#475569",
    "700": "#334155",
    "800": "#1e293b",
    "900": "#0f172a",
    "950": "#020617",
  },
};

export type FontSize = "small" | "medium" | "large";
export type LayoutDensity = "compact" | "comfortable";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
  
  // New appearance properties
  accentColor: string;
  setAccentColor: (color: string) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  layoutDensity: LayoutDensity;
  setLayoutDensity: (density: LayoutDensity) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("ai-study-hub-theme") as Theme) || "system";
    }
    return "system";
  });

  const [accentColor, setAccentColorState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ai-study-hub-accent") || "violet";
    }
    return "violet";
  });

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("ai-study-hub-font-size") as FontSize) || "medium";
    }
    return "medium";
  });

  const [layoutDensity, setLayoutDensityState] = useState<LayoutDensity>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("ai-study-hub-density") as LayoutDensity) || "comfortable";
    }
    return "comfortable";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("ai-study-hub-theme", newTheme);
  };

  const setAccentColor = (newColor: string) => {
    setAccentColorState(newColor);
    localStorage.setItem("ai-study-hub-accent", newColor);
  };

  const setFontSize = (newSize: FontSize) => {
    setFontSizeState(newSize);
    localStorage.setItem("ai-study-hub-font-size", newSize);
  };

  const setLayoutDensity = (newDensity: LayoutDensity) => {
    setLayoutDensityState(newDensity);
    localStorage.setItem("ai-study-hub-density", newDensity);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      let isDark = false;
      if (theme === "system") {
        isDark = mediaQuery.matches;
      } else {
        isDark = theme === "dark";
      }

      // Remove all theme classes first
      root.classList.remove("dark", "theme-light", "theme-dark", "theme-sepia", "theme-forest");
      body.classList.remove("dark", "theme-light", "theme-dark", "theme-sepia", "theme-forest");

      if (isDark) {
        root.classList.add("dark");
        body.classList.add("dark");
        setResolvedTheme("dark");
      } else {
        setResolvedTheme("light");
      }

      // Add the specific theme class
      if (theme === "system") {
        const sysTheme = mediaQuery.matches ? "theme-dark" : "theme-light";
        root.classList.add(sysTheme);
        body.classList.add(sysTheme);
      } else {
        root.classList.add(`theme-${theme}`);
        body.classList.add(`theme-${theme}`);
      }
    };

    handleChange();

    if (theme === "system") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  // Apply Accent Color dynamically
  useEffect(() => {
    const root = window.document.documentElement;
    const config = ACCENT_COLORS[accentColor as keyof typeof ACCENT_COLORS] || ACCENT_COLORS.violet;
    
    // Set legacy properties for safety
    root.style.setProperty("--color-accent-50", config.bg50);
    root.style.setProperty("--color-accent-100", config.light);
    root.style.setProperty("--color-accent-500", config.primary);
    root.style.setProperty("--color-accent-600", config.hover);
    root.style.setProperty("--color-accent-700", config.active);

    // Set full spectrum scale
    const keys = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] as const;
    keys.forEach((key) => {
      if (key in config) {
        const val = config[key as keyof typeof config] as string;
        root.style.setProperty(`--color-accent-${key}`, val);
        root.style.setProperty(`--accent-shade-${key}`, val);
      }
    });
  }, [accentColor]);

  // Apply Font Size dynamically
  useEffect(() => {
    const root = window.document.documentElement;
    if (fontSize === "small") {
      root.style.fontSize = "14px";
    } else if (fontSize === "large") {
      root.style.fontSize = "18px";
    } else {
      root.style.fontSize = "16px";
    }
  }, [fontSize]);

  // Apply Layout Density class dynamically
  useEffect(() => {
    const root = window.document.documentElement;
    if (layoutDensity === "compact") {
      root.classList.add("compact-layout");
    } else {
      root.classList.remove("compact-layout");
    }
  }, [layoutDensity]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        resolvedTheme,
        accentColor,
        setAccentColor,
        fontSize,
        setFontSize,
        layoutDensity,
        setLayoutDensity,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
