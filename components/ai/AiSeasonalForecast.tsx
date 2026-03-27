'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  fetchSeasonalForecast,
  SeasonalForecastResponse
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
import { Sparkles, TrendingUp, Calendar, ArrowUp, ArrowDown, Brain } from 'lucide-react';

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

export function AiSeasonalForecast() {
  const [data, setData] = useState<SeasonalForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const result = await fetchSeasonalForecast();
        if (result) {
          setData(result);
        } else {
          // Fallback data if API fails (for development/demo purposes)
          // This ensures the component shows something if the API is not ready
          console.warn('Using fallback data for seasonal forecast');
          setData({
             "monthly_averages": { 
               "January": 19, 
               "February": 19.5, 
               "March": 21, 
               "April": 47, 
               "May": 230, 
               "June": 229, 
               "July": 76, 
               "August": 90, 
               "September": 75, 
               "October": 64, 
               "November": 32, 
               "December": 65 
             }, 
             "peak_months": [ 
               "May", 
               "June", 
               "August" 
             ], 
             "low_months": [ 
               "March", 
               "February", 
               "January" 
             ] 
           });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div className="h-64 animate-pulse bg-gray-100 rounded-xl" />;
  if (!data) return null;

  const months = Object.keys(data.monthly_averages);
  const values = Object.values(data.monthly_averages);

  const chartData = {
    labels: months,
    datasets: [
      {
        label: 'Forecasted Average',
        data: values,
        borderColor: '#8b5cf6', // Violet
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(139, 92, 246, 0.5)');
          gradient.addColorStop(1, 'rgba(139, 92, 246, 0.0)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#8b5cf6',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#1e293b',
        bodyColor: '#475569',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (context: any) => `Avg: ${context.parsed.y}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 10 } },
        beginAtZero: true,
      },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-sm relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Sparkles className="text-indigo-600 w-24 h-24" />
      </div>

      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
          <Brain size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">AI Seasonal Forecast</h3>
          <p className="text-sm text-gray-500">Predicted monthly averages based on historical patterns</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        <div className="lg:col-span-2 h-[300px]">
          <Line data={chartData} options={options} />
        </div>

        <div className="space-y-6">
          <div className="bg-red-50 rounded-xl p-4 border border-red-100">
            <div className="flex items-center gap-2 mb-3 text-red-700 font-semibold">
              <TrendingUp size={16} />
              <span>Peak Months</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.peak_months.map(month => (
                <span key={month} className="px-3 py-1 bg-white text-red-600 rounded-lg text-sm font-medium shadow-sm border border-red-100">
                  {month}
                </span>
              ))}
            </div>
            <p className="text-xs text-red-600/70 mt-3">
              Expect higher volume during these periods. Resource allocation should be increased.
            </p>
          </div>

          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
            <div className="flex items-center gap-2 mb-3 text-emerald-700 font-semibold">
              <ArrowDown size={16} />
              <span>Low Activity Months</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.low_months.map(month => (
                <span key={month} className="px-3 py-1 bg-white text-emerald-600 rounded-lg text-sm font-medium shadow-sm border border-emerald-100">
                  {month}
                </span>
              ))}
            </div>
            <p className="text-xs text-emerald-600/70 mt-3">
              Optimal periods for maintenance, training, and leave scheduling.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
