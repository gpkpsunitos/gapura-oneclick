"use client";

import React from "react";

interface FeedbackKPIProps {
  label: string;
  value: string | number;
  className?: string;
}

/**
 * Dedicated KPI card for Customer Feedback dashboard.
 * Designed for minimalist aesthetics: small label on top, large value below.
 */
export function FeedbackKPI({
  label,
  value,
  className = "",
}: FeedbackKPIProps) {
  // Complexity: Time O(1) | Space O(1)
  return (
    <div className={`text-center py-4 px-2 ${className}`}>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-3xl font-black text-gray-800 tracking-tight">
        {typeof value === "number" ? value.toLocaleString("id-ID") : value}
      </p>
    </div>
  );
}
