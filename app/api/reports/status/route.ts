import { NextResponse } from 'next/server';
import { reportsService } from '@/lib/services/reports-service';

export async function GET() {
  try {
    const lastUpdated = reportsService.getLastUpdated();
    
    return NextResponse.json({
      lastUpdated,
      timestamp: Date.now()
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('Status API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
