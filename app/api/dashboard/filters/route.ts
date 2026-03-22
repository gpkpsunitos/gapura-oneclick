import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const fields = ['hub', 'branch', 'airlines', 'jenis_maskapai', 'category', 'area'];
    
    // We fetch all distinct values in one go using a custom RPC or multiple queries.
    // For simplicity and speed, we'll use Promise.all with small queries since Supabase 
    // doesn't have a native "SELECT DISTINCT FROM multiple columns" easily without custom SQL.
    
    const results = await Promise.all(
      fields.map(async (field) => {
        const { data, error } = await supabase
          .from('reports')
          .select(field)
          .not(field, 'is', null)
          .order(field);
        
        if (error) throw error;
        
        // Manual distinct filter since PostgREST select distinct is tricky with just one col
        const uniqueValues = Array.from(new Set((data as unknown as Record<string, unknown>[]).map((item) => item[field])));
        return { field, values: uniqueValues };
      })
    );

    const filterOptions = results.reduce((acc: Record<string, unknown[]>, curr) => {
      acc[curr.field] = curr.values.map(val => ({
        value: val as string,
        label: val === '#N/A' ? 'N/A' : String(val)
      }));
      return acc;
    }, {});

    return NextResponse.json(filterOptions);
  } catch (error) {
    console.error('Error fetching filters:', error);
    return NextResponse.json({ error: 'Failed to fetch filters' }, { status: 500 });
  }
}
