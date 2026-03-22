import { NextResponse } from 'next/server';
import { reportsService } from '@/lib/services/reports-service';

export async function GET() {
    reportsService.invalidateCache();
    return NextResponse.json({ success: true, message: 'Cache invalidated' });
}
