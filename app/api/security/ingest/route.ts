import { NextResponse } from 'next/server';
import { DetectionEngine } from '@/lib/security/detection-engine';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SecurityEvent } from '@/types/security';

/**
 * POST /api/security/ingest
 * High-throughput ingestion endpoint for SIEM, Firewalls, and EDR systems.
 * Latency Target: < 100ms processing time.
 */
export async function POST(request: Request) {
    const startTime = Date.now();
    
    // Auth Check: Use a specific internal secret or API key for ingest sources
    const apiKey = request.headers.get('x-security-key');
    if (apiKey !== process.env.SECURITY_INGEST_KEY) {
        return NextResponse.json({ error: 'Unauthorized Source' }, { status: 401 });
    }

    try {
        const events: SecurityEvent[] = await request.json();
        
        if (!Array.isArray(events)) {
            return NextResponse.json({ error: 'Expected array of events' }, { status: 400 });
        }

        // 1. Persistence - Bulk insert for speed
        const { error } = await supabaseAdmin
            .from('security_events')
            .insert(events.map(e => ({
                source: e.source,
                event_type: e.event_type,
                severity: e.severity,
                payload: e.payload,
                ip_address: e.ip_address,
                actor_id: e.actor_id,
                created_at: e.created_at || new Date().toISOString()
            })));

        if (error) throw error;

        // 2. Real-time Analysis (Fire and forget, or wait if low volume)
        // We call the singleton engine
        process.nextTick(() => {
            DetectionEngine.getInstance().analyze(events).catch(err => 
                console.error('Detection engine background failure', err)
            );
        });

        const latency = Date.now() - startTime;
        
        return NextResponse.json({ 
            success: true, 
            ingested: events.length,
            latency_ms: latency 
        });

    } catch (err) {
        console.error('Ingestion pipeline failure', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
