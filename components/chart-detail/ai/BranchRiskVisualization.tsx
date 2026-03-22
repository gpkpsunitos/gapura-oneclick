'use client';

import { 
  AlertTriangle, 
  Shield, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Brain,
  Zap,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { BranchRiskAnalysis } from '@/lib/services/gapura-ai';

interface BranchRiskAnalysisProps {
  data: Record<string, BranchRiskAnalysis>;
  selectedBranch: string;
}

export function BranchRiskAnalysisVisualization({ data, selectedBranch }: BranchRiskAnalysisProps) {
  const isAllBranches = selectedBranch === 'all' || !selectedBranch;
  
  // If specific branch selected, show detailed view
  if (!isAllBranches) {
    const branchData = data[selectedBranch];
    
    if (!branchData) {
      return (
        <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm text-center">
          <p className="text-gray-500">No risk analysis data available for {selectedBranch}</p>
        </div>
      );
    }

    const getRiskColor = (level: string) => {
      const l = level?.toLowerCase() || '';
      if (l === 'critical') return 'text-red-600 bg-red-50 border-red-200';
      if (l === 'high') return 'text-orange-600 bg-orange-50 border-orange-200';
      if (l === 'medium') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      return 'text-green-600 bg-green-50 border-green-200';
    };

    const getScoreColor = (score: number) => {
      if (score >= 80) return 'text-red-600';
      if (score >= 60) return 'text-orange-600';
      if (score >= 40) return 'text-yellow-600';
      return 'text-green-600';
    };

    return (
      <div className="space-y-6">
        {/* Main Risk Score Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-blue-500 p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Risk Score</p>
                <h3 className={`text-3xl font-bold mt-2 ${getScoreColor(branchData.risk_score)}`}>
                  {branchData.risk_score.toFixed(1)}
                </h3>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getRiskColor(branchData.risk_level)}`}>
                {branchData.risk_level}
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Data Quality</span>
                <span className="font-medium">{(branchData.data_quality_score * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full" 
                  style={{ width: `${branchData.data_quality_score * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-purple-500 p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Issue Volume</p>
                <h3 className="text-3xl font-bold mt-2 text-gray-900">
                  {branchData.total_issues}
                </h3>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              {Object.entries(branchData.severity_distribution).map(([severity, count]) => (
                <div key={severity} className="flex-1 text-center bg-gray-50 rounded py-1">
                  <div className="text-xs text-gray-500">{severity}</div>
                  <div className="text-sm font-semibold text-gray-700">{count}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-emerald-500 p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Risk Categories</p>
                <h3 className="text-3xl font-bold mt-2 text-gray-900">
                  {branchData.category_count}
                </h3>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Brain className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1">
              {branchData.issue_categories.slice(0, 3).map((cat, i) => (
                <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                  {cat}
                </span>
              ))}
              {branchData.issue_categories.length > 3 && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                  +{branchData.issue_categories.length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Risk Composition
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-600">Frequency Score</span>
                  <span className="text-sm font-bold">{branchData.frequency_score.toFixed(2)}</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500 rounded-full" 
                    style={{ width: `${Math.min(branchData.frequency_score * 10, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Based on issue occurrence rate</p>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-600">Severity Score</span>
                  <span className="text-sm font-bold">{branchData.severity_score.toFixed(2)}</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 rounded-full" 
                    style={{ width: `${Math.min(branchData.severity_score * 20, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Weighted impact of issues</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Top Issue Categories
            </h3>
            <div className="space-y-2">
              {branchData.issue_categories.map((category, index) => (
                <div key={index} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-xs font-bold text-gray-600">
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{category}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Aggregate view for all branches
  const sortedBranches = Object.entries(data)
    .sort(([, a], [, b]) => b.risk_score - a.risk_score)
    .slice(0, 12); // Top 12 risky branches

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Branch Risk Overview
        </h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Top 12 by Risk Score</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedBranches.map(([branchName, branchData]) => (
          <div 
            key={branchName} 
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{branchName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium 
                    ${branchData.risk_level === 'Critical' ? 'bg-red-100 text-red-700' : 
                      branchData.risk_level === 'High' ? 'bg-orange-100 text-orange-700' :
                      branchData.risk_level === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'}`}>
                    {branchData.risk_level}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{branchData.risk_score.toFixed(0)}</div>
                <div className="text-xs text-gray-500">Risk Score</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Issues</span>
                <span className="font-medium">{branchData.total_issues}</span>
              </div>
              <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-gray-100">
                {branchData.severity_distribution.Critical && (
                  <div style={{ width: `${(branchData.severity_distribution.Critical / branchData.total_issues) * 100}%` }} className="bg-red-500" title={`Critical: ${branchData.severity_distribution.Critical}`} />
                )}
                {branchData.severity_distribution.High && (
                  <div style={{ width: `${(branchData.severity_distribution.High / branchData.total_issues) * 100}%` }} className="bg-orange-500" title={`High: ${branchData.severity_distribution.High}`} />
                )}
                {branchData.severity_distribution.Medium && (
                  <div style={{ width: `${(branchData.severity_distribution.Medium / branchData.total_issues) * 100}%` }} className="bg-yellow-500" title={`Medium: ${branchData.severity_distribution.Medium}`} />
                )}
                {branchData.severity_distribution.Low && (
                  <div style={{ width: `${(branchData.severity_distribution.Low / branchData.total_issues) * 100}%` }} className="bg-green-500" title={`Low: ${branchData.severity_distribution.Low}`} />
                )}
              </div>
              <div className="text-xs text-gray-400 truncate">
                {branchData.issue_categories.join(', ')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
