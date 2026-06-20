import React, { useEffect, useState } from "react";
import { ArrowLeft, Filter, Share2, PanelTopClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface EmbedDetailLayoutProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: React.ReactNode;
  className?: string;
  isStatic?: boolean;
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    hub?: string;
    branch?: string;
    airlines?: string;
    area?: string;
  };
}

export function EmbedDetailLayout({
  title,
  subtitle,
  onBack,
  children,
  className,
  isStatic = false,
  filters,
}: EmbedDetailLayoutProps) {
  const [scrolled, setScrolled] = useState(false);
  const hasActiveFilters =
    filters &&
    (filters.hub !== "all" ||
      filters.branch !== "all" ||
      filters.airlines !== "all" ||
      filters.area !== "all");
  const dateRange =
    filters?.dateFrom && filters?.dateTo
      ? `${filters.dateFrom} - ${filters.dateTo}`
      : null;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (isStatic) {
    return (
      <div
        className={cn(
          "min-h-screen bg-[var(--surface-0)] p-0 relative isolate",
          className,
        )}
      >
        {/* Subtle Spatial Mesh Gradient Background */}
        <div className="absolute inset-0 -z-10 bg-aurora-mesh opacity-[0.03] pointer-events-none mix-blend-multiply" />
        <div className="max-w-none mx-auto">{children}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen bg-[var(--surface-1)] text-[var(--text-primary)] relative isolate overflow-x-hidden font-body",
        className,
      )}
    >
      {/* Dynamic Background */}
      <div className="absolute inset-0 -z-10 bg-aurora-mesh opacity-[0.02] pointer-events-none mix-blend-multiply transition-opacity duration-1000" />
      <div
        className="fixed inset-0 pointer-events-none z-[-5]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.02'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Dynamic Spatial Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={cn(
          "sticky top-0 z-50 transition-all duration-500 ease-out border-b",
          scrolled
            ? "bg-[var(--surface-glass)] backdrop-blur-xl border-[oklch(0.9_0.01_90/0.6)] shadow-spatial-md py-2"
            : "bg-[var(--surface-1)] border-transparent py-4",
        )}
      >
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            {onBack && (
              <motion.button
                whileHover={{ scale: 1.05, x: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={onBack}
                className="group flex items-center justify-center w-10 h-10 rounded-full bg-[var(--surface-2)] border border-[oklch(0.92_0.01_250/0.8)] shadow-sm text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] hover:shadow-spatial-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-2"
                aria-label="Go back"
              >
                <ArrowLeft
                  size={18}
                  strokeWidth={2.5}
                  className="group-hover:-translate-x-0.5 transition-transform"
                />
              </motion.button>
            )}

            <motion.div layout className="flex flex-col">
              <div className="flex items-center gap-3">
                <motion.h1
                  layout
                  className="text-xl sm:text-2xl font-display font-bold tracking-tight text-[var(--text-primary)] leading-none"
                >
                  {title}
                </motion.h1>
                <motion.span
                  layout
                  className="px-2.5 py-1 rounded-prism bg-[var(--brand-emerald-50)] text-[0.625rem] font-bold text-[var(--brand-emerald-700)] uppercase tracking-wider border border-[var(--brand-emerald-100)] shadow-inner-rim"
                >
                  Detail View
                </motion.span>
              </div>
              <AnimatePresence>
                {subtitle && !scrolled && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 4 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="text-xs text-[var(--text-muted)] font-medium tracking-wide"
                  >
                    {subtitle}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          <div className="flex items-center gap-4">
            {/* Dynamic Island Filter Summary */}
            <AnimatePresence>
              {(hasActiveFilters || dateRange) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                  className="hidden md:flex items-center gap-2.5 px-4 py-2 bg-[var(--surface-2)] border border-[oklch(0.9_0.01_90/0.8)] rounded-full shadow-inner-rim"
                >
                  <Filter size={14} className="text-[var(--accent-amber)]" />
                  <span className="text-xs font-semibold text-[var(--text-secondary)] tracking-wide">
                    {dateRange ? dateRange : "Active Filters"}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex items-center gap-2 pl-4 border-l border-[oklch(0.9_0.01_90/0.8)]">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] rounded-prism transition-colors"
                title="Share View"
              >
                <Share2 size={18} strokeWidth={2} />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            delay: 0.1,
          }}
          className="max-w-[1800px] mx-auto space-y-8"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
