'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  fetchSeasonalityForecast,
  SeasonalityForecastResponse,
  SeasonalityCategoryForecast
} from '@/lib/services/gapura-ai';
import {
  Line
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { 
  Activity, 
  Brain, 
  Plane, 
  Package, 
  AlertCircle 
} from 'lucide-react';
import type { ComponentType } from 'react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Fallback data
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
          Tidak ada data
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
          Tidak ada data
        </div>
      </div>
    );
  }

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Upper Bound',
        data: upper,
        borderColor: 'transparent',
        backgroundColor: 'rgba(0,0,0,0)',
        pointRadius: 0,
        fill: '+1', // Fill to next dataset (Lower Bound) - actually tricky in Chart.js without specific plugin sometimes, but let's try standard stacking or just fill to 'origin' if simple. 
        // Better approach for confidence interval:
        // Dataset 1: Upper Bound (transparent line, fill to next)
        // Dataset 2: Lower Bound (transparent line)
        // Dataset 3: Predicted (visible line)
      },
      {
        label: 'Confidence Interval',
        data: lower, // We will use this to fill 'from' upper
        borderColor: 'transparent',
        backgroundColor: colorClass === 'blue' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
        fill: '-1', // Fill to previous dataset
        pointRadius: 0,
      },
      {
        label: 'Predicted',
        data: predicted,
        borderColor: colorClass === 'blue' ? '#3b82f6' : '#10b981',
        backgroundColor: colorClass === 'blue' ? '#3b82f6' : '#10b981',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (context: any) => {
            if (context.dataset.label === 'Confidence Interval' || context.dataset.label === 'Upper Bound') return '';
            return `Predicted: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { grid: { color: 'rgba(0,0,0,0.05)' }, beginAtZero: true, ticks: { font: { size: 10 } } }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

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
          <Line data={chartData} options={options} />
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
          console.warn('Using fallback data for seasonality forecast');
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
