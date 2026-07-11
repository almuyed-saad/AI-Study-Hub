import React from "react";
import { motion } from "motion/react";
import * as Icons from "lucide-react";
import { cn } from "../../../utils/cn.ts";

// 1. Reusable SECTION HEADER
interface SectionHeaderProps {
  title: string;
  description?: string;
  badge?: string | number;
  action?: React.ReactNode;
  id?: string;
}

export function SectionHeader({ title, description, badge, action, id }: SectionHeaderProps) {
  return (
    <div id={id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-bold text-sm tracking-tight text-slate-800 dark:text-slate-100">
            {title}
          </h3>
          {badge !== undefined && (
            <span className="px-1.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 font-mono text-[10px] font-bold border border-violet-100/20">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xl leading-normal">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 flex items-center">{action}</div>}
    </div>
  );
}

// 2. Reusable PAGE HEADER
interface PageHeaderProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  id?: string;
}

export function PageHeader({ title, description, action, id }: PageHeaderProps) {
  return (
    <div id={id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-slate-200/60 dark:border-slate-800/60 mb-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-display bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-white dark:to-slate-300">
          {title}
        </h1>
        <p className="text-sm text-slate-400 dark:text-slate-500 max-w-2xl leading-relaxed">
          {description}
        </p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// 3. Reusable RESPONSIVE GRID Layout
interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
  id?: string;
}

export function ResponsiveGrid({ children, cols = 3, className, id }: ResponsiveGridProps) {
  const colClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
    6: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
  };

  return (
    <div id={id} className={cn("grid gap-4", colClasses[cols], className)}>
      {children}
    </div>
  );
}

// 4. Reusable DASHBOARD CARD Wrapper
interface DashboardCardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  headerAction?: React.ReactNode;
  id?: string;
}

export function DashboardCard({ children, title, description, className, headerAction, id }: DashboardCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200",
        className
      )}
      id={id}
    >
      {(title || description || headerAction) && (
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            {title && (
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                {title}
              </h4>
            )}
            {description && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal">
                {description}
              </p>
            )}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

// 5. Reusable STATISTICS CARD
interface StatisticsCardProps {
  key?: React.Key;
  label: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  iconName: string;
  color?: "violet" | "emerald" | "indigo" | "amber" | "rose" | "blue" | "sky" | "slate";
  onClick?: () => void;
  id?: string;
}

export function StatisticsCard({ label, value, change, isPositive = true, iconName, color = "violet", onClick, id }: StatisticsCardProps) {
  // Map strings to Lucide components
  const IconComponent = (Icons as any)[iconName] || Icons.BookOpen;

  const colorStyles = {
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
    sky: "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400",
    slate: "bg-slate-50 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400"
  };

  return (
    <motion.div
      whileHover={{ y: -3 }}
      onClick={onClick}
      className={cn(
        "bg-white/90 dark:bg-slate-900/90 border border-slate-200/50 dark:border-slate-800/60 rounded-xl p-4 flex flex-col justify-between shadow-sm cursor-pointer hover:border-violet-300/40 dark:hover:border-violet-800/40 transition-all",
        onClick ? "cursor-pointer" : ""
      )}
      id={id}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
          {label}
        </span>
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm", colorStyles[color])}>
          <IconComponent className="h-4.5 w-4.5" />
        </div>
      </div>

      <div className="mt-2.5">
        <h4 className="text-xl md:text-2xl font-extrabold font-mono tracking-tight text-slate-800 dark:text-slate-100">
          {value}
        </h4>
        {change && (
          <p className={cn(
            "text-[10px] font-semibold mt-1 flex items-center gap-0.5",
            isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          )}>
            {isPositive ? "↑" : "↓"} {change}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// 6. Reusable QUICK ACTION CARD
interface QuickActionCardProps {
  title: string;
  description: string;
  iconName: string;
  onClick: () => void;
  color?: "violet" | "emerald" | "indigo" | "amber" | "rose" | "blue";
  id?: string;
}

export function QuickActionCard({ title, description, iconName, onClick, color = "violet", id }: QuickActionCardProps) {
  const IconComponent = (Icons as any)[iconName] || Icons.Zap;

  const ringStyles = {
    violet: "hover:border-violet-400/50 hover:bg-violet-50/10 dark:hover:bg-violet-950/10 dark:hover:border-violet-800/30",
    emerald: "hover:border-emerald-400/50 hover:bg-emerald-50/10 dark:hover:bg-emerald-950/10 dark:hover:border-emerald-800/30",
    indigo: "hover:border-indigo-400/50 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 dark:hover:border-indigo-800/30",
    amber: "hover:border-amber-400/50 hover:bg-amber-50/10 dark:hover:bg-amber-950/10 dark:hover:border-amber-800/30",
    rose: "hover:border-rose-400/50 hover:bg-rose-50/10 dark:hover:bg-rose-950/10 dark:hover:border-rose-800/30",
    blue: "hover:border-blue-400/50 hover:bg-blue-50/10 dark:hover:bg-blue-950/10 dark:hover:border-blue-800/30"
  };

  const iconStyles = {
    violet: "bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
    indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
    rose: "bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        "p-4 border border-slate-150 dark:border-slate-800 rounded-xl text-left transition-all duration-150 bg-white/40 dark:bg-slate-900/20 backdrop-blur-sm flex gap-3.5 cursor-pointer",
        ringStyles[color]
      )}
      id={id}
    >
      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm", iconStyles[color])}>
        <IconComponent className="h-5 w-5" />
      </div>
      <div className="space-y-0.5 min-w-0">
        <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </h5>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed truncate">
          {description}
        </p>
      </div>
    </motion.button>
  );
}

// 7. Reusable RECENT ACTIVITY TIMELINE CARD
interface ActivityItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
  timestamp: string;
  category: string;
  color?: string;
}

interface ActivityCardProps {
  activities: ActivityItem[];
  onItemClick?: (item: ActivityItem) => void;
  id?: string;
}

export function ActivityCard({ activities, onItemClick, id }: ActivityCardProps) {
  return (
    <div id={id} className="flow-root">
      <ul className="-mb-8">
        {activities.map((item, idx) => {
          const IconComponent = (Icons as any)[item.iconName] || Icons.Zap;
          return (
            <li key={item.id || `activity-${idx}`} className="relative pb-6 last:pb-2">
              {idx !== activities.length - 1 && (
                <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-slate-100 dark:bg-slate-800/80" aria-hidden="true" />
              )}
              <div className="relative flex items-start gap-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-sm text-slate-500 dark:text-slate-400">
                    <IconComponent className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
                  </div>
                </div>
                <div
                  className={cn(
                    "min-w-0 flex-1 p-2 rounded-lg transition-colors duration-150",
                    onItemClick ? "cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/40" : ""
                  )}
                  onClick={() => onItemClick?.(item)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {item.title}
                    </p>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {item.timestamp}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                  <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[8px] font-mono uppercase tracking-wider text-slate-500">
                    {item.category}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// 8. Reusable STUDY PROGRESS VISUAL CHART
interface ChartDataPoint {
  label: string;
  value: number;
}

interface ChartCardProps {
  weeklyData: ChartDataPoint[];
  monthlyData: ChartDataPoint[];
  id?: string;
}

export function ChartCard({ weeklyData, monthlyData, id }: ChartCardProps) {
  const [activeRange, setActiveRange] = React.useState<"weekly" | "monthly">("weekly");
  const data = activeRange === "weekly" ? weeklyData : monthlyData;
  const maxValue = Math.max(...data.map(d => d.value)) || 1;
  const totalValue = data.reduce((acc, curr) => acc + curr.value, 0);
  const avgValue = totalValue / (data.length || 1);
  const peakValue = Math.max(...data.map(d => d.value));
  const peakItem = data.find(d => d.value === peakValue);

  return (
    <DashboardCard
      id={id}
      title="Study Analytics"
      description={`Visual metrics for accumulated study and AI-assisted session hours.`}
      headerAction={
        <div className="relative flex bg-slate-100/80 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
          <button
            onClick={() => setActiveRange("weekly")}
            className={cn(
              "px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer relative z-10",
              activeRange === "weekly"
                ? "text-violet-600 dark:text-violet-300 font-extrabold"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            )}
          >
            {activeRange === "weekly" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg shadow-xs -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            Weekly
          </button>
          <button
            onClick={() => setActiveRange("monthly")}
            className={cn(
              "px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer relative z-10",
              activeRange === "monthly"
                ? "text-violet-600 dark:text-violet-300 font-extrabold"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            )}
          >
            {activeRange === "monthly" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg shadow-xs -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            Monthly
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Core SVG Bars Chart Container with gridlines */}
        <div className="relative h-48 pt-4 select-none">
          {/* Background Grid Lines & Scale */}
          <div className="absolute inset-x-0 bottom-6 top-4 flex flex-col justify-between pointer-events-none">
            {[100, 75, 50, 25, 0].map((percent) => (
              <div key={percent} className="flex items-center gap-3 w-full">
                <span className="text-[8px] font-mono font-medium text-slate-300 dark:text-slate-600 w-8 text-right">
                  {Math.round((maxValue * percent) / 100)}h
                </span>
                <div className="flex-1 border-t border-dashed border-slate-100 dark:border-slate-800/80" />
              </div>
            ))}
          </div>

          {/* Actual Bars */}
          <div className="absolute inset-x-0 bottom-6 top-4 pl-11 flex items-end justify-between gap-2.5 sm:gap-4.5 h-[calc(100%-24px)]">
            {data.map((dp, idx) => {
              const heightPercent = Math.max(5, Math.round((dp.value / maxValue) * 100));
              return (
                <div key={`${dp.label}-${activeRange}-${idx}`} className="flex-1 flex flex-col items-center group h-full justify-end relative">
                  
                  {/* Premium Hover Card (Tooltip) */}
                  <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 scale-95 group-hover:scale-100 bg-slate-900/95 dark:bg-slate-950/95 text-white rounded-lg px-2.5 py-1 shadow-md border border-slate-800/60 z-30 flex flex-col items-center min-w-[55px]">
                    <span className="text-xs font-bold font-sans text-white whitespace-nowrap">
                      {dp.value.toFixed(1)} hrs
                    </span>
                    <div className="w-1.5 h-1.5 bg-slate-900/95 dark:bg-slate-950/95 border-r border-b border-slate-800/60 rotate-45 absolute -bottom-1" />
                  </div>

                  {/* Elegant Bar Column */}
                  <div className="w-full relative flex justify-center bg-slate-100/40 dark:bg-slate-900/15 rounded-t-lg h-full items-end">
                    <motion.div
                      initial={{ height: 0, scaleY: 0 }}
                      animate={{ height: `${heightPercent}%`, scaleY: 1 }}
                      transition={{ type: "spring", damping: 14, stiffness: 120, delay: idx * 0.03 }}
                      style={{ originY: 1 }}
                      className={cn(
                        "w-full rounded-t-lg relative overflow-hidden bg-gradient-to-t shadow-xs transition-all duration-300 group-hover:scale-x-[1.05]",
                        idx % 2 === 0 
                          ? "from-violet-600 via-violet-500 to-indigo-500 shadow-violet-500/10 dark:shadow-violet-950/20" 
                          : "from-indigo-600 via-indigo-500 to-violet-400 shadow-indigo-500/10 dark:shadow-indigo-950/20"
                      )}
                    >
                      {/* Inner highlight glass overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
                      <div className="absolute top-0 inset-x-0 h-1 bg-white/25" />
                    </motion.div>
                  </div>

                  {/* Bottom Label on bar */}
                  <span className="absolute top-full mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold font-mono tracking-tight shrink-0 transition-colors group-hover:text-violet-500 dark:group-hover:text-violet-400">
                    {dp.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Premium Core Stats Row - Dynamically constructed */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/60">
          <div className="bg-slate-50/50 dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-100/50 dark:border-slate-900/40 space-y-0.5">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold font-mono">
              Total Studies
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-black text-slate-800 dark:text-white font-display">
                {totalValue.toFixed(1)}
              </span>
              <span className="text-[9px] font-medium text-slate-400">hrs</span>
            </div>
          </div>

          <div className="bg-slate-50/50 dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-100/50 dark:border-slate-900/40 space-y-0.5">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold font-mono">
              Average
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-black text-slate-800 dark:text-white font-display">
                {avgValue.toFixed(1)}
              </span>
              <span className="text-[9px] font-medium text-slate-400 font-mono">h/int</span>
            </div>
          </div>

          <div className="bg-slate-50/50 dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-100/50 dark:border-slate-900/40 space-y-0.5">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold font-mono">
              Peak Segment
            </span>
            <div className="flex items-baseline gap-1 truncate">
              <span className="text-sm font-black text-violet-600 dark:text-violet-400 font-display">
                {peakItem ? `${peakItem.value.toFixed(1)}h` : "0h"}
              </span>
              <span className="text-[9px] font-semibold text-slate-400 truncate">
                ({peakItem?.label || "None"})
              </span>
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

// 9. Reusable EMPTY STATE Component
interface EmptyStateProps {
  title: string;
  description: string;
  iconName: string;
  actionLabel?: string;
  onActionClick?: () => void;
  id?: string;
}

export function EmptyState({ title, description, iconName, actionLabel, onActionClick, id }: EmptyStateProps) {
  const IconComponent = (Icons as any)[iconName] || Icons.FolderOpen;

  return (
    <div id={id} className="flex flex-col items-center text-center py-12 px-6 max-w-sm mx-auto space-y-4">
      <div className="h-14 w-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 text-violet-600 dark:text-violet-400 flex items-center justify-center shadow-sm">
        <IconComponent className="h-7 w-7" />
      </div>
      <div className="space-y-1">
        <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
          {title}
        </h4>
        <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
          {description}
        </p>
      </div>
      {actionLabel && onActionClick && (
        <button
          onClick={onActionClick}
          className="h-8 px-3 rounded-lg border text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer text-slate-600 dark:text-slate-300 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// 10. Reusable LOADING SKELETON Component
interface LoadingSkeletonProps {
  type?: "card" | "list" | "table";
  id?: string;
}

export function LoadingSkeleton({ type = "card", id }: LoadingSkeletonProps) {
  if (type === "list") {
    return (
      <div id={id} className="space-y-3.5 w-full">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center justify-between p-3.5 border border-slate-100 dark:border-slate-800/60 rounded-xl bg-white dark:bg-slate-900 animate-pulse">
            <div className="flex items-center gap-3 w-3/4">
              <div className="h-9 w-9 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0" />
              <div className="space-y-1.5 w-full">
                <div className="h-3 w-1/3 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-2.5 w-1/2 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
            </div>
            <div className="h-2.5 w-12 bg-slate-100 dark:bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "table") {
    return (
      <div id={id} className="w-full border border-slate-150 dark:border-slate-800/80 rounded-xl bg-white dark:bg-slate-900 p-4 animate-pulse space-y-4">
        <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
          {[1, 2, 3, 4].map(n => <div key={n} className="h-3 bg-slate-100 dark:bg-slate-800 rounded flex-1" />)}
        </div>
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex gap-4 pt-1">
            {[1, 2, 3, 4].map(cell => <div key={cell} className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded flex-1" />)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div id={id} className="border border-slate-150 dark:border-slate-800/80 rounded-xl bg-white dark:bg-slate-900 p-5 animate-pulse space-y-4 w-full">
      <div className="flex justify-between items-center">
        <div className="h-3 w-1/4 bg-slate-100 dark:bg-slate-800 rounded" />
        <div className="h-8 w-8 bg-slate-100 dark:bg-slate-800 rounded-lg" />
      </div>
      <div className="space-y-2">
        <div className="h-5 w-1/2 bg-slate-100 dark:bg-slate-800 rounded" />
        <div className="h-2.5 w-1/3 bg-slate-100 dark:bg-slate-800 rounded" />
      </div>
    </div>
  );
}
