'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
// ExcelJS will be imported dynamically in parseFile
import { Upload, FileUp, AlertCircle, CheckCircle, Loader2, X, Database, Truck, Plane, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Type Definitions ---
type ImportType = 'NON_CARGO' | 'CARGO';

// Define strict mapping based on reports-service.ts
// Key = CSV Header, Value = DB Column
const HEADER_MAPPING: Record<string, string> = {
  // Common
  'Date of Event': 'date_of_event',
  'Date': 'date_of_event',
  'Tanggal': 'date_of_event',
  'Month': 'date_of_event', // Sometimes used for month aggregations, handle with care
  'Incident Date': 'date_of_event',
  
  // Airline Info
  'Jenis Maskapai': 'jenis_maskapai',
  'Airlines': 'airline',
  'Airline': 'airline',
  'Flight Number': 'flight_number',
  'Route': 'route',
  
  // Location
  'Reporting Branch': 'reporting_branch',
  'Branch': 'branch',
  'Station': 'branch',
  'HUB': 'hub',
  'KODE CABANG (VLOOKUP)': 'kode_cabang',
  'KODE HUB (VLOOKUP)': 'kode_hub',

  // Categorization
  'Report Category': 'main_category', // Irregularity, Complaint, Compliment
  'Irregularity/Complain Category': 'irregularity_complain_category', // Sub-category
  'Main Category': 'main_category',
  
  // Details
  'Report': 'description',
  'Description': 'description',
  'Root Caused': 'root_caused',
  'Action Taken': 'action_taken',
  'Gapura KPS Remarks': 'kps_remarks',
  'Gapura KPS Action Taken': 'gapura_kps_action_taken',
  'Preventive Action': 'preventive_action',

  // Remarks Gapura KPS -> maps to sub_category_note (replaces Sub Category Note direction)
  'Remarks Gapura KPS': 'sub_category_note',
  'Sub Category Note': 'sub_category_note',
  
  // Meta
  'Report By': 'reporter_name',
  'Upload Irregularity Photo': 'evidence_url',
  'Status': 'status',
  'Per Week in Month': 'week_in_month',
  
  // Area Specific
  'Area': 'area',
  'Terminal Area Category': 'terminal_area_category',
  'Apron Area Category': 'apron_area_category',
  'General Category': 'general_category',
};

// Convert Excel serial number to JS Date
const excelSerialToDate = (val: string | number): Date | null => {
  if (!val || val === '#N/A' || val === 'N/A') return null;
  if (typeof val === 'number') {
    // Excel base date is Dec 30 1899
    return new Date((val - 25569) * 86400 * 1000);
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

// Returns date-only string (YYYY-MM-DD) for DB
const parseDateOnly = (val: string | number): string | null => {
  // If explicitly string DD/MM/YYYY
  if (typeof val === 'string' && val.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
      const parts = val.split('/');
      // Assume DD/MM/YYYY or MM/DD/YYYY? Standard is usually MDY in US or DMY in ID. 
      // Let's safe guess: if part[0] > 12 it must be day.
      // Ideally we use a robust parser. For now, assume common Excel export format (often MDY or YMD).
      // Actually, let's try date constructor first.
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }

  const d = excelSerialToDate(val);
  if (!d) return null;
  return d.toISOString().split('T')[0];
};

// Map CSV Status to DB constraint
const normalizeStatus = (raw: string | undefined | null): string => {
  if (!raw) return 'OPEN';
  const upper = raw.toUpperCase().trim();
  if (['SELESAI', 'CLOSED', 'DONE', 'RESOLVED', 'CLOSE'].includes(upper)) return 'CLOSED';
  if (['SUDAH_DIVERIFIKASI', 'VERIFIED', 'ON PROGRESS'].includes(upper)) return 'ON PROGRESS';
  return 'OPEN';
};

// Main Helper: Map a single CSV row to a Report object
const mapRowToReport = (row: any, importType: ImportType) => {
  const report: any = {};
  
  // 1. Map known columns
  Object.keys(row).forEach((csvHeader) => {
    // Try exact match
    let dbKey = HEADER_MAPPING[csvHeader.trim()];
    
    // Check fuzzy/normalized if needed (e.g. case insensitive)
    if (!dbKey) {
       const norm = csvHeader.trim().toLowerCase();
       const found = Object.keys(HEADER_MAPPING).find(k => k.toLowerCase() === norm);
       if (found) dbKey = HEADER_MAPPING[found];
    }

    if (dbKey) {
        report[dbKey] = row[csvHeader];
    }
  });

  // 2. Normalize & Defaults
  
  // Date
  if (report.date_of_event) {
      report.date_of_event = parseDateOnly(report.date_of_event);
  }
  if (!report.date_of_event) {
      // Fallback: created_at = now
      report.created_at = new Date().toISOString(); 
      // If we really need a date_of_event, maybe leave null or set to today?
      // Let's leave it null if missing, types usually allow it or defaulted in DB
  } else {
      report.created_at = new Date(report.date_of_event).toISOString();
  }
  
  report.updated_at = new Date().toISOString();

  // Status
  report.status = normalizeStatus(report.status);
  
  // Import Type Specific Logic
  if (importType === 'CARGO') {
      report.area = 'CARGO';
      report.source_sheet = 'CGO'; // Tag source
      // If category is missing but we have general/terminal/apron cols? 
      // Cargo usually uses 'general_category' or specific cargo columns if mapped
  } else if (importType === 'NON_CARGO') {
      report.source_sheet = 'NON CARGO';
      // Ensure area is set if possible
      if (!report.area && report.terminal_area_category) report.area = 'TERMINAL';
      if (!report.area && report.apron_area_category) report.area = 'APRON';
  }

  // Generate a robust reference number if ID exists
  if (row['Id'] || row['ID'] || row['No']) {
      const id = row['Id'] || row['ID'] || row['No'];
      report.reference_number = `IMP-${importType}-${id}`;
      report.csv_id = Number(id) || null;
  } else {
      // Generate random ref
      report.reference_number = `IMP-${Date.now()}-${Math.floor(Math.random()*1000)}`;
  }

  // Title fallback
  if (!report.title) {
      report.title = `${report.main_category || 'Report'} - ${report.airline || 'Unknown'}`;
  }

  return report;
};

export default function ImportDataPage() {
  const [importType, setImportType] = useState<ImportType>('NON_CARGO');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [successCount, setSuccessCount] = useState(0);

  const onDrop = (acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      parseFile(uploadedFile);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false
  });

  const parseFile = async (file: File) => {
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      
      if (file.name.endsWith('.csv')) {
        // ExcelJS CSV reading in browser is slightly different, we use a Buffer/Uint8Array
        await workbook.csv.read(new Response(arrayBuffer).body! as any);
      } else {
        await workbook.xlsx.load(arrayBuffer);
      }

      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new Error("File kosong");

      const jsonData: any[] = [];
      const fileHeaders: string[] = [];

      // Get headers from first row
      const firstRow = worksheet.getRow(1);
      firstRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const val = cell.text || (typeof cell.value === 'string' ? cell.value : '');
        fileHeaders[colNumber - 1] = val.trim();
      });
      setHeaders(fileHeaders.filter(Boolean));

      // Parse data rows
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
         if (rowNumber === 1) return;
         const rowData: any = {};
         row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const header = fileHeaders[colNumber - 1];
            if (header) {
                rowData[header] = cell.value;
            }
         });
         jsonData.push(rowData);
      });

      setPreviewData(jsonData);
      setUploadStatus('idle');
    } catch (err) {
      console.error('Parse Error:', err);
      setErrorMessage("Gagal membaca file. Pastikan format Excel/CSV valid.");
      setUploadStatus('error');
    }
  };

  const handleImport = async () => {
    if (!previewData.length) return;

    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');
    setSuccessCount(0);

    try {
      // 1. Map Data
      const mappedData = previewData.map((row) => mapRowToReport(row, importType));

      // 2. Batch Insert to Sheets API
      const response = await fetch('/api/reports/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reports: mappedData })
      });

      const result = await response.json();
      
      if (!response.ok) {
          throw new Error(result.error || 'Gagal mengimport ke Google Sheets');
      }

      setSuccessCount(result.count || mappedData.length);
      setUploadStatus('success');
    } catch (error) {
      console.error('Import Error:', error);
      setUploadStatus('error');
      const message = error instanceof Error ? error.message : 'Gagal mengimport data.';
      setErrorMessage(message);
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
      setFile(null);
      setPreviewData([]);
      setHeaders([]);
      setUploadStatus('idle');
      setSuccessCount(0);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-32">
      {/* Header */}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Data Laporan</h1>
          <p className="text-gray-500 mt-1">
              Mode Administrator untuk import data massal dari Google Sheets/Excel.
          </p>
        </div>
        
        <a 
            href={`https://docs.google.com/spreadsheets/d/${process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID || '1TFPZOAWAKubPl7iaUk8BXt2BabY1N-AcLgi-_zBQGzk'}/edit`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold hover:bg-emerald-100 transition-colors"
        >
            <FileSpreadsheet size={18} />
            Menuju Excel
        </a>
      </div>

      {/* Configuration Card */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Database size={18} className="text-blue-600" />
                1. Pilih Tipe Data
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
                <button
                    onClick={() => setImportType('NON_CARGO')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                        importType === 'NON_CARGO' ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${importType === 'NON_CARGO' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                            <Plane size={16} />
                        </div>
                        <span className="font-bold text-gray-900">Landside & Airside</span>
                    </div>
                    <p className="text-xs text-gray-500">Laporan reguler (Terminal, Apron, General). Sheet: 'NON CARGO'</p>
                </button>

                <button
                    onClick={() => setImportType('CARGO')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                        importType === 'CARGO' ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                     <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${importType === 'CARGO' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                            <Truck size={16} />
                        </div>
                        <span className="font-bold text-gray-900">Cargo</span>
                    </div>
                    <p className="text-xs text-gray-500">Laporan khusus Cargo. Sheet: 'CGO'</p>
                </button>

            </div>
          </div>
      </div>

      {/* Upload Logic Area */}
      {!file ? (
         <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white
                ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
            `}
         >
            <input {...getInputProps()} />
            <div className="w-16 h-16 bg-blue-100/50 rounded-full flex items-center justify-center mb-4 text-blue-600">
               <Upload size={32} />
            </div>
            <p className="text-lg font-semibold text-gray-700">
                {isDragActive ? 'Lepaskan file di sini...' : 'Drag & drop file di sini'}
            </p>
            <p className="text-sm text-gray-500 mt-2">atau klik untuk memilih file (.csv, .xlsx)</p>
            <p className="text-xs text-blue-600 mt-4 font-medium px-3 py-1 bg-blue-50 rounded-full">
                Target: {importType}
            </p>
         </div>
      ) : (
          <div className="space-y-6">
              {/* File Info Card */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                          <FileUp size={24} />
                      </div>
                      <div>
                          <p className="font-semibold text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB • {previewData.length} Baris Data</p>
                      </div>
                  </div>
                  <button onClick={reset} disabled={isUploading} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors">
                      <X size={20} />
                  </button>
              </div>

              {/* Status Messages */}
              <AnimatePresence>
                {uploadStatus === 'success' && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-green-50 text-green-700 rounded-xl flex items-center gap-3 border border-green-200">
                        <CheckCircle size={20} />
                        <span className="font-medium">Berhasil mengimport {successCount} data laporan!</span>
                    </motion.div>
                )}
                {uploadStatus === 'error' && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-200">
                        <AlertCircle size={20} />
                        <span className="font-medium">Error: {errorMessage}</span>
                    </motion.div>
                )}
              </AnimatePresence>

              {/* Preview Table */}
              {previewData.length > 0 && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                          <h3 className="font-semibold text-gray-700">Preview Mapping (Top 5)</h3>
                          <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600">Total: {previewData.length}</span>
                      </div>
                      <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                              <thead className="bg-gray-50 text-gray-500">
                                  <tr>
                                      <th className="px-6 py-3 font-medium">Original Header</th>
                                      <th className="px-6 py-3 font-medium">Mapped To DB Field</th>
                                      <th className="px-6 py-3 font-medium">Preview Value</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {/* Show mapping preview based on first row headers */}
                                  {headers.slice(0, 10).map((header, i) => {
                                      const dbField = HEADER_MAPPING[header] || HEADER_MAPPING[header.trim()] || '-';
                                      const val = previewData[0][header];
                                      return (
                                          <tr key={i} className="hover:bg-gray-50/50">
                                              <td className="px-6 py-3 text-gray-900 font-medium">{header}</td>
                                              <td className="px-6 py-3 text-blue-600 font-mono text-xs">
                                                  {dbField !== '-' ? dbField : <span className="text-red-400">Not Mapped</span>}
                                              </td>
                                              <td className="px-6 py-3 text-gray-500 max-w-[200px] truncate">
                                                  {String(val || '')}
                                              </td>
                                          </tr>
                                      )
                                  })}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              {/* Action Button */}
              <div className="flex justify-end pt-4">
                  <button
                      onClick={uploadStatus === 'success' ? reset : handleImport}
                      disabled={isUploading}
                      className={`
                          flex items-center gap-2 px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all
                          ${isUploading
                             ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                             : uploadStatus === 'success'
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0'
                          }
                      `}
                  >
                      {isUploading && <Loader2 size={18} className="animate-spin" />}
                      {uploadStatus === 'success' ? 'Selesai' : isUploading ? 'Mengimport...' : 'Import Data Sekarang'}
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}
