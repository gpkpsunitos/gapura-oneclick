
import type { QueryDefinition } from '@/types/builder';
import type { Report } from '@/types';

interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
}

// Helper to safely get values
const getVal = (row: any, field: string) => {
  // Handle known category aliases
  if (field === 'category' || field === 'main_category') {
    return row.category || row.main_category || row[field];
  }

  // Handle airline aliases
  if (field === 'airline' || field === 'airlines') {
    return row.airline || row.airlines || row[field];
  }

  // Handle branch aliases
  if (field === 'branch' || field === 'station_code') {
    return row.branch || row.station_code || row.reporting_branch || row[field];
  }

  // Handle maskapai aliases
  if (field === 'maskapai' || field === 'jenis_maskapai') {
    return row.maskapai || row.jenis_maskapai || row[field];
  }
  
  // Handle virtual date fields
  if (['year', 'month', 'day', 'quarter'].includes(field)) {
    const dateVal = row.date_of_event || row.event_date || row.created_at;
    if (dateVal) {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        if (field === 'year') return d.getFullYear();
        if (field === 'month') return d.toLocaleString('en-US', { month: 'long' });
        if (field === 'day') return d.getDate();
        if (field === 'quarter') return `Q${Math.ceil((d.getMonth() + 1) / 3)}`;
      }
    }
  }

  // Handle nested properties or exact matches
  return row[field];
};

// Helper for date granularity
const getDateKey = (dateStr: string, granularity?: string) => {
  if (!dateStr) return 'Unknown';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    
    if (granularity === 'month') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${d.getFullYear()} ${months[d.getMonth()]}`;
    }
    if (granularity === 'year') return d.getFullYear().toString();
    if (granularity === 'day') return d.toISOString().slice(0, 10);
    if (granularity === 'quarter') {
      const q = Math.ceil((d.getMonth() + 1) / 3);
      return `${d.getFullYear()} Q${q}`;
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
};

/**
 * Executes a query against an in-memory array of data.
 * This function is pure and can run on both client and server.
 */
export function processQuery(query: QueryDefinition, data: any[]): QueryResult {
  const startTime = Date.now();
  let resultRows: any[] = [];

  // 1. Filter
  let filtered = data;
  if (query.filters && query.filters.length > 0) {
    filtered = data.filter(row => {
      return query.filters!.every(f => {
        const val = getVal(row, f.field);
        const compareVal = f.value;
        const op = f.operator as string;
        
        if (op === 'is_null') return val === null || val === undefined || val === '';
        if (op === 'is_not_null') return val !== null && val !== undefined && val !== '';
        
        // Basic operators
        if (op === 'eq') return String(val) == String(compareVal);
        if (op === 'neq') return String(val) != String(compareVal);
        if (op === 'contains') return String(val).toLowerCase().includes(String(compareVal ?? '').toLowerCase());
        if (op === 'like' || op === 'ilike') {
          const pattern = String(compareVal ?? '').replace(/%/g, '');
          return String(val).toLowerCase().includes(pattern.toLowerCase());
        }
        if (op === 'gt' && compareVal != null) return val > compareVal;
        if (op === 'lt' && compareVal != null) return val < compareVal;
        if (op === 'gte' && compareVal != null) return val >= compareVal;
        if (op === 'lte' && compareVal != null) return val <= compareVal;
        if (op === 'in') return Array.isArray(compareVal) && compareVal.map(String).includes(String(val));
        if (op === 'not_in') return Array.isArray(compareVal) && !compareVal.map(String).includes(String(val));
        
        return true;
      });
    });
  }
  
  // 2. Aggregate / Group By
  // CASE A: Dimensions + Measures (Aggregation)
  if (query.dimensions && query.dimensions.length > 0) {
    const groups: Record<string, any> = {};
    
    filtered.forEach(row => {
      // Create composite key
      const dimValues = query.dimensions!.map(d => {
        const rawVal = getVal(row, d.field);
        if (d.dateGranularity) {
          return getDateKey(rawVal, d.dateGranularity);
        }
        return rawVal;
      });
      const key = dimValues.join('::');
      
      if (!groups[key]) {
        groups[key] = { _count: 0 };
        // Set dimension values
        query.dimensions!.forEach((d, idx) => {
          const alias = d.alias || d.field;
          groups[key][alias] = dimValues[idx];
          if (d.dateGranularity) {
            groups[key][`_raw_${alias}`] = getVal(row, d.field);
          }
        });
        
        // Initialize measures
        query.measures?.forEach(m => {
          const alias = m.alias || m.field || 'count';
          if (['COUNT', 'count', 'SUM', 'sum'].includes(m.function)) groups[key][alias] = 0;
          if (m.function === 'COUNT_DISTINCT') groups[key][`_set_${alias}`] = new Set();
        });
      }
      
      // Update measures
      groups[key]._count++;
      
      const updateMetric = (m: any) => {
          const alias = m.alias || m.field || 'count';
          const val = getVal(row, m.field);
          
          if (m.function === 'COUNT') {
              groups[key][alias]++;
          }
          if (m.function === 'SUM') {
              let num = Number(val);
              if (isNaN(num) && typeof val === 'string') {
                  num = Number(val.replace(/[^0-9.-]+/g, ''));
              }
              groups[key][alias] += (isNaN(num) ? 0 : num);
          }
          if (m.function === 'COUNT_DISTINCT') {
              if (val !== undefined && val !== null) {
                  groups[key][`_set_${alias}`].add(val);
              }
          }
      };

      query.measures?.forEach(updateMetric);
    });
    
    // Post-process sets
    resultRows = Object.values(groups).map(g => {
      const newG = { ...g };
      Object.keys(newG).forEach(k => {
        if (k.startsWith('_set_')) {
          const alias = k.replace('_set_', '');
          newG[alias] = newG[k].size;
          delete newG[k];
        }
      });
      return newG;
    });
    
  } 
  // CASE B: Measures only (Single Row Aggregation)
  else if (query.measures && query.measures.length > 0) {
     const result: any = { _count: 0 };
     const measures = query.measures;

     // Init
     measures.forEach(m => {
       const alias = m.alias || m.field || 'count';
       if (['COUNT', 'count', 'SUM', 'sum'].includes(m.function)) result[alias] = 0;
       if (m.function === 'COUNT_DISTINCT') result[`_set_${alias}`] = new Set();
     });
     
     filtered.forEach(row => {
       measures.forEach(m => {
         const alias = m.alias || m.field || 'count';
         const val = getVal(row, m.field);

         if (m.function === 'COUNT') result[alias]++;
         if (m.function === 'SUM') {
            let num = Number(val);
            if (isNaN(num) && typeof val === 'string') {
                num = Number(val.replace(/[^0-9.-]+/g, ''));
            }
            result[alias] += (isNaN(num) ? 0 : num);
         }
         if (m.function === 'COUNT_DISTINCT') {
             if (val !== undefined && val !== null) {
                 result[`_set_${alias}`].add(val);
             }
         }
       });
     });
     
     // Post process
     Object.keys(result).forEach(k => {
        if (k.startsWith('_set_')) {
            const alias = k.replace('_set_', '');
            result[alias] = result[k].size;
            delete result[k];
        }
    });
     
     resultRows = [result];
  } 
  // CASE C: Raw Data (Detail Table)
  else {
      resultRows = filtered;
  }
  
  // 3. Sort
  if (query.sorts && query.sorts.length > 0) {
    resultRows.sort((a, b) => {
      for (const s of query.sorts!) {
        // Try field name first, then alias
        const field = s.alias || s.field;
        // Try raw sort key first if it's a date dimension
        let valA = a[`_raw_${field}`] ?? a[field];
        let valB = b[`_raw_${field}`] ?? b[field];

        // If not found by alias, try to find by raw field name if it exists in row
        if (valA === undefined) valA = a[s.field] || 0;
        if (valB === undefined) valB = b[s.field] || 0;
        
        // Handle date strings in raw values for better comparison
        if (typeof valA === 'string' && !isNaN(Date.parse(valA))) valA = new Date(valA).getTime();
        if (typeof valB === 'string' && !isNaN(Date.parse(valB))) valB = new Date(valB).getTime();
        
        if (valA < valB) return s.direction === 'asc' ? -1 : 1;
        if (valA > valB) return s.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }
  
  // 4. Limit
  if (query.limit && query.limit > 0) {
    resultRows = resultRows.slice(0, query.limit);
  }
  
  const columns = resultRows.length > 0 ? Object.keys(resultRows[0]) : [];
  
  return {
    columns,
    rows: resultRows,
    rowCount: resultRows.length,
    executionTimeMs: Date.now() - startTime
  };
}
