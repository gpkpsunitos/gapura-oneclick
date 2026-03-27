'use client';

import { useEffect, useState } from 'react';
import { 
  Shield, AlertTriangle, TrendingUp, TrendingDown, 
  Activity, MapPin, Building2, RefreshCw, CheckCircle, XCircle,
  ArrowUp, ArrowDown, Minus, Plane
} from 'lucide-react';
import { motion } from 'framer-motion';

const GAPURA_AI_BASE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8000';

interface BranchSummary {
  category_type: string;
  total_branches: number;
  total_issues: number;
  avg_risk_score: number;
  risk_level_distribution: Record<string, number>;
  trend_distribution: Record<string, number>;
  last_updated: string;
}

interface BranchSummaryResponse {
  landside_airside: BranchSummary;
  cgo: BranchSummary;
  comparison: {
    ls_total_issues: number;
    cgo_total_issues: number;
    ls_avg_risk: number;
    cgo_avg_risk: number;
  };
  last_updated: string;
}

interface BranchVisualizationProps {
  branchName?: string;
  filters?: Array<{
    field: string;
    value: string;
  }>;
}

export function BranchAIVisualization({ branchName, filters = [] }: BranchVisualizationProps) {
  const [summaryData, setSummaryData] = useState<BranchSummaryResponse | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'landside_airside' | 'cgo'>('landside_airside');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const esklasiRegex = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('esklasi_regex') || '' : '';
        const response = await fetch(`${GAPURA_AI_BASE_URL}/api/ai/branch/summary?esklasi_regex=${encodeURIComponent(esklasiRegex)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch branch summary');
        }
        const data = await response.json();
        setSummaryData(data);
      } catch (err) {
        console.error('Error fetching branch summary:', err);
        setError('Unable to load branch summary data');
      } finally {
        setLoading(false);
      }
    };

    fetchBranchSummary();
  }, []);

  const getRiskColor = (level: string) => {
    const l = level?.toLowerCase() || '';
    if (l.includes('critical') || l.includes('high')) return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: <AlertTriangle className="w-4 h-4" /> };
    if (l.includes('medium')) return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', icon: <Activity className="w-4 h-4" /> };
    return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: <Shield className="w-4 h-4" /> };
  };

  const getTrendIcon = (trend: string) => {
    const t = trend?.toLowerCase() || '';
    if (t === 'increasing') return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (t === 'decreasing') return <TrendingDown className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !summaryData) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 text-amber-600">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm font-medium">{error || 'No branch summary data available'}</span>
        </div>
      </div>
    );
  }

  const currentData = selectedCategory === 'landside_airside' ? summaryData.landside_airside : summaryData.cgo;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-emerald-50 to-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wide">
                AI Branch Analytics Summary
              </h3>
              <p className="text-xs text-gray-500">
                Branch risk overview and performance metrics
              </p>
            </div>
          </div>
          
          <div className="flex gap-1 bg-white rounded-lg p-1 border border-gray-200">
            <button
              onClick={() => setSelectedCategory('landside_airside')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                selectedCategory === 'landside_airside' 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Landside/Airside
            </button>
            <button
              onClick={() => setSelectedCategory('cgo')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                selectedCategory === 'cgo' 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Cargo (CGO)
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <div className="text-3xl font-black text-gray-900">{currentData.total_branches}</div>
            <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Total Branches</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <div className="text-3xl font-black text-gray-900">{currentData.total_issues.toLocaleString('id-ID')}</div>
            <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Total Issues</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <div className="text-3xl font-black text-gray-900">{currentData.avg_risk_score?.toFixed(1) || 'N/A'}</div>
            <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Avg Risk Score</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <div className="text-3xl font-black text-emerald-600">
              {currentData.total_branches - (currentData.risk_level_distribution?.High || 0) - (currentData.risk_level_distribution?.Medium || 0)}
            </div>
            <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Low Risk Branches</div>
          </div>
        </div>

        {/* Risk Level Distribution */}
        <div>
          <h4 className="text-xs font-bold text-gray-600 uppercase mb-3">Risk Level Distribution</h4>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(currentData.risk_level_distribution || {}).map(([level, count]) => {
              const colors = getRiskColor(level);
              return (
                <motion.div
                  key={level}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-xl border ${colors.bg} ${colors.border}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {colors.icon}
                    <span className={`text-xs font-bold ${colors.text}`}>{level}</span>
                  </div>
                  <div className="text-2xl font-black text-gray-900">{count}</div>
                  <div className="text-[10px] text-gray-500 uppercase">branches</div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Trend Distribution */}
        <div>
          <h4 className="text-xs font-bold text-gray-600 uppercase mb-3">Trend Distribution</h4>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(currentData.trend_distribution || {}).map(([trend, count]) => (
              <motion.div
                key={trend}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl border border-gray-100 bg-gray-50"
              >
                <div className="flex items-center gap-2 mb-1">
                  {getTrendIcon(trend)}
                  <span className="text-xs font-bold text-gray-700 capitalize">{trend}</span>
                </div>
                <div className="text-2xl font-black text-gray-900">{count}</div>
                <div className="text-[10px] text-gray-500 uppercase">branches</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Comparison Section */}
        {selectedCategory && summaryData.comparison && (
          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-600 uppercase mb-3">Comparison: Landside/Airside vs Cargo</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Plane className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-700 uppercase">Landside/Airside</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-lg font-black text-gray-900">{summaryData.comparison.ls_total_issues}</div>
                    <div className="text-[10px] text-gray-500">issues</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-gray-900">{summaryData.comparison.ls_avg_risk?.toFixed(1)}</div>
                    <div className="text-[10px] text-gray-500">avg risk</div>
                  </div>
                </div>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-700 uppercase">Cargo (CGO)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-lg font-black text-gray-900">{summaryData.comparison.cgo_total_issues}</div>
                    <div className="text-[10px] text-gray-500">issues</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-gray-900">{summaryData.comparison.cgo_avg_risk?.toFixed(1)}</div>
                    <div className="text-[10px] text-gray-500">avg risk</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
