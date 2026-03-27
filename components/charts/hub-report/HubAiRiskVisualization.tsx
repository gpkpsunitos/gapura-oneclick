'use client';

import { HubRiskSummaryResponse } from '@/lib/services/gapura-ai';
import { Brain, AlertTriangle, CheckCircle, AlertOctagon, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function RiskBadge({ level }: { level: string }) {
  const colors = {
    Critical: 'bg-red-100 text-red-700 border-red-200',
    High: 'bg-orange-100 text-orange-700 border-orange-200',
    Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Low: 'bg-green-100 text-green-700 border-green-200',
  };
  
  const colorClass = colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${colorClass}`}>
      {level}
    </span>
  );
}

export function HubAiRiskVisualization({ data, isLoading, error }: { 
  data: HubRiskSummaryResponse | null; 
  isLoading: boolean;
  error?: string | null;
}) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
        <div className="h-6 w-48 bg-gray-200 rounded mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-gray-100 rounded-lg"></div>
          <div className="h-32 bg-gray-100 rounded-lg"></div>
          <div className="h-32 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl border border-red-200 p-6 text-center">
        <div className="flex items-center justify-center gap-2 text-red-700 font-medium mb-2">
          <AlertTriangle size={20} />
          <span>Failed to load AI Risk Analysis</span>
        </div>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!data) {
    return null; // Hide if no data (and no error)
  }

  const sortedHubs = Object.entries(data).sort(([, a], [, b]) => b.risk_score - a.risk_score);
  const criticalHubs = sortedHubs.filter(([, d]) => d.risk_level === 'Critical' || d.risk_level === 'High');

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-indigo-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Brain className="text-violet-600" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">AI Risk Assessment</h3>
            <p className="text-xs text-gray-500">Automated risk profiling based on issue severity and frequency</p>
          </div>
        </div>
        {criticalHubs.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg border border-red-100 text-xs font-semibold">
            <AlertOctagon size={14} />
            {criticalHubs.length} Critical/High Risk Hubs
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedHubs.map(([hubName, details]) => (
            <div 
              key={hubName}
              className={`relative p-4 rounded-xl border transition-all hover:shadow-md ${
                details.risk_level === 'Critical' ? 'bg-red-50/50 border-red-100' :
                details.risk_level === 'High' ? 'bg-orange-50/50 border-orange-100' :
                details.risk_level === 'Medium' ? 'bg-yellow-50/50 border-yellow-100' :
                'bg-white border-gray-100'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-gray-900">{hubName}</h4>
                  <div className="text-xs text-gray-500 mt-0.5">{details.total_issues} issues</div>
                </div>
                <RiskBadge level={details.risk_level} />
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Risk Score</span>
                    <span className="font-mono font-bold">{details.risk_score.toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        details.risk_score > 75 ? 'bg-red-500' :
                        details.risk_score > 50 ? 'bg-orange-500' :
                        details.risk_score > 25 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(details.risk_score, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100/50">
                   <p className="text-xs font-semibold text-gray-600 mb-2">Top Issues:</p>
                   <div className="flex flex-wrap gap-1">
                     {details.issue_categories.slice(0, 3).map((cat, i) => (
                       <span key={i} className="text-[10px] px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-600">
                         {cat}
                       </span>
                     ))}
                     {details.issue_categories.length > 3 && (
                       <span className="text-[10px] px-1.5 py-0.5 bg-gray-50 text-gray-400 rounded">
                         +{details.issue_categories.length - 3}
                       </span>
                     )}
                   </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-[10px] text-gray-400">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1 cursor-help">
                                <Info size={12} />
                                <span>Distribution</span>
                            </TooltipTrigger>
                            <TooltipContent className="p-2 text-xs">
                                <div className="space-y-1">
                                    <div className="flex justify-between gap-4"><span className="text-red-500">Critical:</span> <span>{details.severity_distribution.Critical || 0}</span></div>
                                    <div className="flex justify-between gap-4"><span className="text-orange-500">High:</span> <span>{details.severity_distribution.High || 0}</span></div>
                                    <div className="flex justify-between gap-4"><span className="text-yellow-500">Medium:</span> <span>{details.severity_distribution.Medium || 0}</span></div>
                                    <div className="flex justify-between gap-4"><span className="text-green-500">Low:</span> <span>{details.severity_distribution.Low || 0}</span></div>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <span>DQ: {details.data_quality_score.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
