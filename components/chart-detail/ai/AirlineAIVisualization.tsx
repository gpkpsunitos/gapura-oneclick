'use client';

import { useEffect, useState } from 'react';
import { 
  Shield, AlertTriangle, TrendingUp, TrendingDown, 
  Activity, Plane, FileText, RefreshCw, CheckCircle, XCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

const GAPURA_AI_BASE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8000';

interface AirlineRiskData {
  name: string;
  risk_score: number;
  risk_level: string;
  severity_distribution: Record<string, number>;
  issue_categories: string[];
}

interface AirlineVisualizationProps {
  airlineName?: string;
  filters?: Array<{
    field: string;
    value: string;
  }>;
}

export function AirlineAIVisualization({ airlineName, filters = [] }: AirlineVisualizationProps) {
  const [riskData, setRiskData] = useState<AirlineRiskData[] | null>(null);
  const [selectedAirline, setSelectedAirline] = useState<AirlineRiskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAirlineRisk = async () => {
      setLoading(true);
      setError(null);
      try {
        const esklasiRegex = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('esklasi_regex') || '' : '';
        const response = await fetch(`${GAPURA_AI_BASE_URL}/api/ai/risk/airlines?esklasi_regex=${encodeURIComponent(esklasiRegex)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch airline risk data');
        }
        const data = await response.json();
        
        let airlines = data.airlines || data;
        if (!Array.isArray(airlines)) {
          airlines = Object.entries(airlines).map(([name, details]: [string, any]) => ({
            name,
            ...details
          }));
        }
        
        setRiskData(airlines);
        
        if (airlineName && airlines.length > 0) {
          const matched = airlines.find((a: AirlineRiskData) => 
            a.name.toLowerCase() === airlineName.toLowerCase()
          );
          if (matched) setSelectedAirline(matched);
        }
      } catch (err) {
        console.error('Error fetching airline risk:', err);
        setError('Unable to load airline risk data');
      } finally {
        setLoading(false);
      }
    };

    fetchAirlineRisk();
  }, [airlineName]);

  const getRiskColor = (level: string) => {
    const l = level?.toLowerCase() || '';
    if (l.includes('critical') || l.includes('high')) return 'text-red-600 bg-red-50';
    if (l.includes('medium')) return 'text-amber-600 bg-amber-50';
    return 'text-green-600 bg-green-50';
  };

  const getRiskIcon = (level: string) => {
    const l = level?.toLowerCase() || '';
    if (l.includes('critical') || l.includes('high')) return <AlertTriangle className="w-4 h-4" />;
    return <Shield className="w-4 h-4" />;
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

  if (error || !riskData || riskData.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 text-amber-600">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm font-medium">{error || 'No airline risk data available'}</span>
        </div>
      </div>
    );
  }

  const displayData = selectedAirline 
    ? [selectedAirline] 
    : riskData.slice(0, 8);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-indigo-50 to-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Plane className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wide">
            AI Risk Analysis — Maskapai
          </h3>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {selectedAirline 
            ? `Analisis risiko mendalam untuk ${selectedAirline.name}`
            : 'Risk profiling berdasarkan severity dan issue patterns'
          }
        </p>
      </div>

      <div className="p-4 space-y-4">
        {displayData.map((airline, idx) => (
          <motion.div
            key={airline.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              selectedAirline?.name === airline.name 
                ? 'border-indigo-200 bg-indigo-50/50' 
                : 'border-gray-100 hover:border-indigo-100 hover:bg-gray-50'
            }`}
            onClick={() => setSelectedAirline(
              selectedAirline?.name === airline.name ? null : airline
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${getRiskColor(airline.risk_level)}`}>
                  {getRiskIcon(airline.risk_level)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{airline.name}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getRiskColor(airline.risk_level)}`}>
                    {airline.risk_level || 'Unknown'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-gray-900">{airline.risk_score?.toFixed(1) || 'N/A'}</div>
                <div className="text-[10px] text-gray-500 uppercase">Risk Score</div>
              </div>
            </div>

            {selectedAirline?.name === airline.name && airline.severity_distribution && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 pt-3 border-t border-indigo-100"
              >
                <div className="text-xs font-semibold text-gray-600 mb-2">Severity Distribution</div>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(airline.severity_distribution).map(([sev, count]) => (
                    <div 
                      key={sev}
                      className={`text-center p-2 rounded-lg ${
                        sev.toLowerCase() === 'critical' ? 'bg-red-100' :
                        sev.toLowerCase() === 'high' ? 'bg-orange-100' :
                        sev.toLowerCase() === 'medium' ? 'bg-yellow-100' :
                        'bg-green-100'
                      }`}
                    >
                      <div className="text-xs font-bold text-gray-700">{String(count)}</div>
                      <div className="text-[9px] text-gray-500 uppercase">{sev}</div>
                    </div>
                  ))}
                </div>

                {airline.issue_categories && airline.issue_categories.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-600 mb-2">Top Issue Categories</div>
                    <div className="flex flex-wrap gap-1">
                      {airline.issue_categories.slice(0, 5).map((cat, i) => (
                        <span 
                          key={i}
                          className="text-[10px] bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        ))}

        {!selectedAirline && riskData.length > 8 && (
          <div className="text-center pt-2">
            <span className="text-xs text-gray-500">
              +{riskData.length - 8} more airlines
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
