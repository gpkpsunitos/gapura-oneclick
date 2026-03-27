'use client';

import { useState, useCallback } from 'react';
import { Reorder } from 'framer-motion';

interface ChartConfig {
  id: string;
  title: string;
  chartType: 'pie' | 'bar' | 'line' | 'area' | 'kpi';
  dataField: 'airline' | 'category' | 'status' | 'severity' | 'area' | 'station' | 'division';
  width: 'full' | 'half' | 'third';
}

interface DashboardBuilderProps {
  onSave: (name: string, description: string, charts: ChartConfig[]) => Promise<{ embedUrl: string } | null>;
}

const CHART_TYPES = [
  { value: 'pie', label: 'Pie Chart', icon: '◐' },
  { value: 'bar', label: 'Bar Chart', icon: '▭' },
  { value: 'line', label: 'Line Chart', icon: '📈' },
  { value: 'area', label: 'Area Chart', icon: '▲' },
  { value: 'kpi', label: 'KPI Card', icon: '#' }
] as const;

const DATA_FIELDS = [
  { value: 'airline', label: 'Airline' },
  { value: 'category', label: 'Kategori' },
  { value: 'status', label: 'Status' },
  { value: 'severity', label: 'Severity' },
  { value: 'area', label: 'Area' },
  { value: 'station', label: 'Station' },
  { value: 'division', label: 'Division' }
] as const;

const WIDTH_OPTIONS = [
  { value: 'half', label: '50%' },
  { value: 'full', label: '100%' },
  { value: 'third', label: '33%' }
] as const;

export function DashboardBuilder({ onSave }: DashboardBuilderProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  
  const addChart = useCallback(() => {
    const newChart: ChartConfig = {
      id: `chart-${Date.now()}`,
      title: `Chart ${charts.length + 1}`,
      chartType: 'pie',
      dataField: 'airline',
      width: 'half'
    };
    setCharts(prev => [...prev, newChart]);
  }, [charts.length]);
  
  const updateChart = useCallback((id: string, updates: Partial<ChartConfig>) => {
    setCharts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);
  
  const removeChart = useCallback((id: string) => {
    setCharts(prev => prev.filter(c => c.id !== id));
  }, []);
  
  const handleSave = async () => {
    if (!name.trim() || charts.length === 0) return;
    
    setSaving(true);
    try {
      const result = await onSave(name, description, charts);
      if (result?.embedUrl) {
        setEmbedUrl(result.embedUrl);
      }
    } finally {
      setSaving(false);
    }
  };
  
  const copyUrl = () => {
    if (embedUrl) {
      const fullUrl = `${window.location.origin}${embedUrl}`;
      navigator.clipboard.writeText(fullUrl);
    }
  };
  
  return (
    <div className="dashboard-builder">
      {/* Success State */}
      {embedUrl && (
        <div className="builder-success">
          <h3>✓ Dashboard Berhasil Dibuat!</h3>
          <p>Link untuk PowerPoint:</p>
          <div className="builder-url-box">
            <code>{window.location.origin}{embedUrl}</code>
            <button onClick={copyUrl} className="builder-copy-btn">Copy</button>
          </div>
          <div className="builder-actions" style={{ marginTop: '1rem' }}>
            <a href={embedUrl} target="_blank" rel="noopener noreferrer" className="builder-btn primary">
              Preview Dashboard
            </a>
            <button onClick={() => { setEmbedUrl(null); setCharts([]); setName(''); }} className="builder-btn secondary">
              Buat Baru
            </button>
          </div>
        </div>
      )}
      
      {/* Builder Form */}
      {!embedUrl && (
        <>
          <div className="builder-header">
            <h2>Dashboard Builder</h2>
            <p>Drag & drop untuk mengatur urutan chart</p>
          </div>
          
          {/* Dashboard Info */}
          <div className="builder-section">
            <label className="builder-label">Nama Dashboard</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Weekly Airline Report"
              className="builder-input"
            />
            
            <label className="builder-label" style={{ marginTop: '1rem' }}>Deskripsi (opsional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Laporan mingguan per maskapai"
              className="builder-input"
            />
          </div>
          
          {/* Charts List */}
          <div className="builder-section">
            <div className="builder-section-header">
              <h3>Charts</h3>
              <button onClick={addChart} className="builder-add-btn">+ Tambah Chart</button>
            </div>
            
            {charts.length === 0 ? (
              <div className="builder-empty">
                <p>Belum ada chart. Klik &quot;Tambah Chart&quot; untuk memulai.</p>
              </div>
            ) : (
              <Reorder.Group axis="y" values={charts} onReorder={setCharts} className="builder-charts-list">
                {charts.map((chart) => (
                  <Reorder.Item key={chart.id} value={chart} className="builder-chart-item">
                    <div className="chart-drag-handle">⠿</div>
                    
                    <div className="chart-config-grid">
                      <div className="chart-config-field">
                        <label>Judul</label>
                        <input
                          type="text"
                          value={chart.title}
                          onChange={(e) => updateChart(chart.id, { title: e.target.value })}
                          className="builder-input-sm"
                        />
                      </div>
                      
                      <div className="chart-config-field">
                        <label>Tipe Chart</label>
                        <select
                          value={chart.chartType}
                          onChange={(e) => updateChart(chart.id, { chartType: e.target.value as ChartConfig['chartType'] })}
                          className="builder-select"
                        >
                          {CHART_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="chart-config-field">
                        <label>Data</label>
                        <select
                          value={chart.dataField}
                          onChange={(e) => updateChart(chart.id, { dataField: e.target.value as ChartConfig['dataField'] })}
                          className="builder-select"
                        >
                          {DATA_FIELDS.map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="chart-config-field">
                        <label>Lebar</label>
                        <select
                          value={chart.width}
                          onChange={(e) => updateChart(chart.id, { width: e.target.value as ChartConfig['width'] })}
                          className="builder-select"
                        >
                          {WIDTH_OPTIONS.map(w => (
                            <option key={w.value} value={w.value}>{w.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <button onClick={() => removeChart(chart.id)} className="chart-remove-btn">✕</button>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            )}
          </div>
          
          {/* Save Button */}
          <div className="builder-footer">
            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || charts.length === 0}
              className="builder-btn primary"
            >
              {saving ? 'Menyimpan...' : 'Simpan & Generate Link'}
            </button>
          </div>
        </>
      )}
      
      <style jsx>{`
        .dashboard-builder {
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1rem;
          padding: 1.5rem;
        }
        
        .builder-header h2 {
          margin: 0 0 0.25rem 0;
          color: #f1f5f9;
        }
        
        .builder-header p {
          margin: 0;
          color: #64748b;
          font-size: 0.875rem;
        }
        
        .builder-section {
          margin-top: 1.5rem;
        }
        
        .builder-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        
        .builder-section-header h3 {
          margin: 0;
          color: #f1f5f9;
          font-size: 1rem;
        }
        
        .builder-label {
          display: block;
          color: #94a3b8;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }
        
        .builder-input {
          width: 100%;
          padding: 0.75rem 1rem;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          color: #f1f5f9;
          font-size: 0.875rem;
        }
        
        .builder-input:focus {
          outline: none;
          border-color: #60a5fa;
        }
        
        .builder-input-sm {
          padding: 0.5rem 0.75rem;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.375rem;
          color: #f1f5f9;
          font-size: 0.813rem;
          width: 100%;
        }
        
        .builder-select {
          padding: 0.5rem 0.75rem;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.375rem;
          color: #f1f5f9;
          font-size: 0.813rem;
          width: 100%;
        }
        
        .builder-add-btn {
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border: none;
          border-radius: 0.5rem;
          color: white;
          font-size: 0.875rem;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        
        .builder-add-btn:hover {
          opacity: 0.9;
        }
        
        .builder-empty {
          text-align: center;
          padding: 2rem;
          color: #64748b;
          border: 2px dashed rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
        }
        
        .builder-charts-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .builder-chart-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          cursor: grab;
        }
        
        .builder-chart-item:active {
          cursor: grabbing;
        }
        
        .chart-drag-handle {
          color: #64748b;
          font-size: 1.25rem;
          user-select: none;
        }
        
        .chart-config-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 0.75rem;
          flex: 1;
        }
        
        .chart-config-field label {
          display: block;
          color: #64748b;
          font-size: 0.688rem;
          text-transform: uppercase;
          margin-bottom: 0.25rem;
        }
        
        .chart-remove-btn {
          padding: 0.375rem 0.5rem;
          background: rgba(239, 68, 68, 0.2);
          border: none;
          border-radius: 0.25rem;
          color: #ef4444;
          cursor: pointer;
        }
        
        .chart-remove-btn:hover {
          background: rgba(239, 68, 68, 0.3);
        }
        
        .builder-footer {
          margin-top: 1.5rem;
          display: flex;
          justify-content: flex-end;
        }
        
        .builder-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .builder-btn.primary {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
        }
        
        .builder-btn.primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .builder-btn.secondary {
          background: rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          margin-left: 0.75rem;
        }
        
        .builder-success {
          text-align: center;
          padding: 2rem;
        }
        
        .builder-success h3 {
          color: #22c55e;
          margin: 0 0 1rem 0;
        }
        
        .builder-success p {
          color: #94a3b8;
          margin: 0 0 0.5rem 0;
        }
        
        .builder-url-box {
          display: flex;
          gap: 0.5rem;
          background: rgba(15, 23, 42, 0.6);
          padding: 0.75rem;
          border-radius: 0.5rem;
          margin-top: 0.5rem;
        }
        
        .builder-url-box code {
          flex: 1;
          color: #60a5fa;
          font-size: 0.813rem;
          word-break: break-all;
        }
        
        .builder-copy-btn {
          padding: 0.25rem 0.75rem;
          background: rgba(96, 165, 250, 0.2);
          border: none;
          border-radius: 0.25rem;
          color: #60a5fa;
          cursor: pointer;
          font-size: 0.75rem;
        }
        
        .builder-actions {
          display: flex;
          justify-content: center;
          gap: 0.75rem;
        }
        
        @media (max-width: 768px) {
          .chart-config-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        
        @media (max-width: 480px) {
          .chart-config-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
