'use client';

import { Sparkles, ArrowRight, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface InsightPanelProps {
  insights: any[];
  isLoading?: boolean;
}

export function InsightPanel({ insights, isLoading }: InsightPanelProps) {
  if (isLoading) {
    return (
      <div className="w-full bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100/50 animate-pulse">
        <div className="h-4 bg-indigo-100 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-3 bg-indigo-100 rounded w-3/4"></div>
          <div className="h-3 bg-indigo-100 rounded w-5/6"></div>
          <div className="h-3 bg-indigo-100 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!insights || insights.length === 0) return null;

  // Process insights to detect sentiment/type if possible, or just list them
  // For now, we assume raw strings. We can enhance this to parse "Positive:", "Warning:", etc.

  return (
    <div className="w-full bg-gradient-to-br from-indigo-50 to-white rounded-2xl p-6 border border-indigo-100 shadow-[0_2px_10px_-4px_rgba(99,102,241,0.1)] relative overflow-hidden group">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-200/50 transition-colors duration-700"></div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600">
            <Sparkles size={16} />
          </div>
          <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wide">
            AI Analysis
          </h3>
        </div>

        <div className="space-y-4">
          {insights.map((insight, idx) => {
            const isObject = typeof insight === 'object' && insight !== null;
            
            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group/item"
              >
                {!isObject ? (
                  <div className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
                    <ArrowRight size={14} className="mt-1 text-indigo-400 flex-shrink-0 group-hover/item:translate-x-1 transition-transform" />
                    <span>{String(insight)}</span>
                  </div>
                ) : (
                  <div className="bg-white/50 rounded-xl p-3 border border-indigo-100/50 hover:border-indigo-200 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                        <span className="font-bold text-indigo-900 text-sm">{insight.diagnosa}</span>
                      </div>
                      {insight.impactScore && (
                        <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                          <AlertTriangle size={10} className="text-amber-600" />
                          <span className="text-[10px] font-bold text-amber-700 uppercase">Score {insight.impactScore}</span>
                        </div>
                      )}
                    </div>
                    
                    {insight.data && (
                      <div className="grid grid-cols-1 gap-1.5 mt-2">
                        {Object.entries(insight.data).map(([key, val]) => (
                          <div key={key} className="flex items-center justify-between text-xs py-1 border-b border-indigo-50/50 last:border-0">
                            <span className="text-gray-500">{key}</span>
                            <span className="font-medium text-gray-900">{String(val)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
