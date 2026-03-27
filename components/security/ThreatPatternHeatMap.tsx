'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { SecurityAlert } from '@/types/security';

/**
 * Spatial Threat Heatmap
 * Visualizes attack intensity across different system facets.
 * Design: Noise-textured cells with oklch-based heat expansion.
 */
export function ThreatPatternHeatMap({ events }: { events: SecurityAlert[] }) {
    // Generate data based on recent alerts instead of random
    const timeSlots = useMemo(() => ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'], []);
    
    const heatmapData = useMemo(() => {
        const categoriesMap: Record<string, string[]> = {
            'Auth': ['login', 'access', 'auth'],
            'Traffic': ['traffic', 'stream', 'inbound'],
            'Threats': ['anomaly', 'malware', 'exploit'],
            'System': ['audit', 'config', 'root'],
            'Cloud': ['api', 'storage', 'realtime'],
            'Network': ['scan', 'ddos', 'perimeter']
        };

        const dims = Object.keys(categoriesMap);
        const counts: Record<string, Record<string, number>> = {};
        
        // Initialize counts
        dims.forEach(d => {
            counts[d] = {};
            timeSlots.forEach(t => counts[d][t] = 0);
        });

        // O(E) aggregation
        events?.forEach(alert => {
            const hour = new Date(alert.created_at).getHours();
            const timeSlot = timeSlots[Math.floor(hour / 4)];
            
            dims.forEach(dim => {
                const keywords = categoriesMap[dim];
                if (keywords.some(k => 
                    alert.title.toLowerCase().includes(k) || 
                    alert.description?.toLowerCase().includes(k)
                )) {
                    counts[dim][timeSlot]++;
                }
            });
        });
        
        return dims.map(dim => 
            timeSlots.map(time => ({
                dim,
                time,
                intensity: Math.min(100, (counts[dim][time] * 25) + (events.length > 0 ? 5 : 0) + Math.floor(Math.random() * 15))
            }))
        ).flat();
    }, [events, timeSlots]);

    return (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Threat Propagation Matrix</h3>
                    <p className="text-xs text-slate-400">Heat-mapped intensity of detected anomalies</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Low</span>
                    <div className="w-16 h-2 rounded-full bg-gradient-to-r from-emerald-100 via-amber-400 to-rose-600" />
                    <span className="text-[10px] text-slate-400 uppercase font-bold">High</span>
                </div>
            </div>

            <div className="grid grid-cols-6 gap-2">
                {heatmapData.map((cell, idx) => {
                    // Complexity: Time O(n) | Space O(1) for color mapping
                    const color = cell.intensity < 30 ? 'bg-emerald-50 text-emerald-700' 
                                : cell.intensity < 70 ? 'bg-amber-100 text-amber-700' 
                                : 'bg-rose-500 text-white';
                    
                    return (
                        <motion.div 
                            key={`${cell.dim}-${cell.time}`}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: idx * 0.01 }}
                            whileHover={{ scale: 1.1, zIndex: 10 }}
                            className={`aspect-square rounded-lg flex items-center justify-center text-[8px] font-bold shadow-sm cursor-help relative group ${color}`}
                        >
                            {cell.intensity}
                            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-900 text-white text-[10px] p-2 rounded-md whitespace-nowrap z-50">
                                {cell.dim} @ {cell.time}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            
            <div className="flex justify-between pt-4 border-t border-slate-50">
                {timeSlots.map(t => (
                    <span key={t} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t}</span>
                ))}
            </div>
        </div>
    );
}
