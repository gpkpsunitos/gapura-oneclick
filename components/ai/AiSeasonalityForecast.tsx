'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  fetchSeasonalityForecast,
  SeasonalityForecastResponse,
  SeasonalityCategoryForecast
} from '@/lib/services/gapura-ai';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Activity, 
  Brain, 
  Plane, 
  Package, 
  AlertCircle 
} from 'lucide-react';
import type { ComponentType } from 'react';

const FALLBACK_DATA: SeasonalityForecastResponse = {
  "landside_airside": {
    "category_type": "landside_airside",
    "category_name": "Landside & Airside",
    "granularity": "weekly",
    "baseline": 4.2,
    "trend": "increasing",
    "volatility": 5.2,
    "forecasts": [
      { "period": 1, "predicted": 5, "lower_bound": 0, "upper_bound": 13, "confidence": 0.9 },
      { "period": 2, "predicted": 5, "lower_bound": 0, "upper_bound": 13, "confidence": 0.82 },
      { "period": 3, "predicted": 6, "lower_bound": 0, "upper_bound": 14, "confidence": 0.74 },
      { "period": 4, "predicted": 6, "lower_bound": 0, "upper_bound": 14, "confidence": 0.66 }
    ]
  },
  "cgo": {
    "category_type": "cgo",
    "category_name": "CGO",
    "granularity": "weekly",
    "baseline": 2,
    "trend": "increasing",
    "volatility": 5.6,
    "forecasts": [
      { "period": 1, "predicted": 2, "lower_bound": 0, "upper_bound": 10, "confidence": 0.9 },
      { "period": 2, "predicted": 2, "lower_bound": 0, "upper_bound": 10, "confidence": 0.82 },
      { "period": 3, "predicted": 2, "lower_bound": 0, "upper_bound": 11, "confidence": 0.74 },
      { "period": 4, "predicted": 2, "lower_bound": 0, "upper_bound": 11, "confidence": 0.66 }
    ]
  }
};

function ForecastCard({ data, icon: Icon, colorClass }: { data: SeasonalityCategoryForecast, icon: ComponentType<{ size?: number }>, colorClass: string }) {
  if (!data || !Array.isArray(data.forecasts) || data.forecasts.length === 0) {
    return (
      <div className={`rounded-xl border p-5 ${colorClass === 'blue' ? 'bg-blue-50/50 border-blue-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colorClass === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
              <Icon size={20} />
            </div>
            <div>
              <h4 className="font-bold text-gray-800">{data?.category_name || 'Forecast'}</h4>
              <div className="text-xs text-gray-500">Data forecast tidak tersedia</div>
            </div>
          </div>
        </div>
        <div className="h-[180px] w-full mb-4 flex items-center justify-center text-xs text-gray-500 border border-dashed border-gray-200 rounded-lg">
          No data
        </div>
      </div>
    );
  }
  const forecasts = data.forecasts;
  let labels: string[] = [];
  let predicted: number[] = [];
  let upper: number[] = [];
  let lower: number[] = [];
  try {
    if (!Array.isArray(forecasts)) throw new Error('invalid_forecasts');
    labels = forecasts.map(f => `Week ${f.period}`);
    predicted = forecasts.map(f => f.predicted);
    upper = forecasts.map(f => f.upper_bound);
    lower = forecasts.map(f => f.lower_bound);
  } catch {
    return (
      <div className={`rounded-xl border p-5 ${colorClass === 'blue' ? 'bg-blue-50/50 border-blue-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colorClass === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
              <Icon size={20} />
            </div>
            <div>
              <h4 className="font-bold text-gray-800">{data?.category_name || 'Forecast'}</h4>
              <div className="text-xs text-gray-500">Data forecast tidak tersedia</div>
            </div>
          </div>
        </div>
        <div className="h-[180px] w-full mb-4 flex items-center justify-center text-xs text-gray-500 border border-dashed border-gray-200 rounded-lg">
          No data
        </div>
      </div>
    );
  }

  const rechartsData = labels.map((label, i) => ({
    name: label,
    predicted: predicted[i],
    upper: upper[i],
    lower: lower[i],
  }));

  const strokeColor = colorClass === 'blue' ? '#3b82f6' : '#10b981';

  return (
    <div className={`rounded-xl border p-5 ${colorClass === 'blue' ? 'bg-blue-50/50 border-blue-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClass === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
            <Icon size={20} />
          </div>
          <div>
            <h4 className="font-bold text-gray-800">{data.category_name}</h4>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="capitalize">{data.granularity} Forecast</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                Trend: 
                <span className={`font-medium ${data.trend === 'increasing' ? 'text-red-600' : 'text-emerald-600'}`}>
                  {data.trend}
                </span>
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Baseline</div>
          <div className="text-lg font-bold text-gray-800">{data.baseline}</div>
        </div>
      </div>

      <div className="h-[180px] w-full mb-4">
        {forecasts.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rechartsData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="upper" stroke={strokeColor} strokeOpacity={0.2} strokeWidth={1} strokeDasharray="4 4" dot={false} />
              <Line type="monotone" dataKey="lower" stroke={strokeColor} strokeOpacity={0.2} strokeWidth={1} strokeDasharray="4 4" dot={false} />
              <Line type="monotone" dataKey="predicted" stroke={strokeColor} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs text-gray-500 border border-dashed border-gray-200 rounded-lg">
            Data forecast tidak tersedia
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/60 rounded-lg p-2 border border-gray-100">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Volatility</div>
          <div className="flex items-center gap-1.5">
            <Activity size={14} className="text-amber-500" />
            <span className="font-semibold text-gray-700">{data.volatility}</span>
          </div>
        </div>
        <div className="bg-white/60 rounded-lg p-2 border border-gray-100">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Avg Confidence</div>
          <div className="flex items-center gap-1.5">
            <AlertCircle size={14} className="text-indigo-500" />
            <span className="font-semibold text-gray-700">
              {forecasts.length > 0 ? Math.round(forecasts.reduce((acc, curr) => acc + (curr.confidence || 0), 0) / forecasts.length * 100) : 0}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AiSeasonalityForecast() {
  const [data, setData] = useState<SeasonalityForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const result = await fetchSeasonalityForecast();
        if (result) {
          setData(result);
        } else {
          setData(FALLBACK_DATA);
        }
      } catch (err) {
        console.error(err);
        setData(FALLBACK_DATA);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div className="h-64 animate-pulse bg-gray-100 rounded-xl" />;
  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-sm relative overflow-hidden mt-6"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
          <Brain size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">AI Seasonality Forecast</h3>
          <p className="text-sm text-gray-500">Short-term volume prediction with confidence intervals</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ForecastCard 
          data={(data.landside_airside || FALLBACK_DATA.landside_airside)} 
          icon={Plane} 
          colorClass="blue" 
        />
        <ForecastCard 
          data={(data.cgo || FALLBACK_DATA.cgo)} 
          icon={Package} 
          colorClass="emerald" 
        />
      </div>
    </motion.div>
  );
}
