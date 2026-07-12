import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { DetectionEngine } from '@/lib/security/detection-engine';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SecurityEvent } from '@/types/security';

export async function POST(request: Request) {
    const startTime = Date.now();

    const expectedKey = process.env.SECURITY_INGEST_KEY;
    if (!expectedKey) {
        return NextResponse.json({ error: 'Misconfigured' }, { status: 503 });
    }

    const apiKey = request.headers.get('x-security-key');
    const provided = Buffer.from(apiKey ?? '');
    const expected = Buffer.from(expectedKey);
    const isAuthorized = provided.length === expected.length && timingSafeEqual(provided, expected);
    if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized Source' }, { status: 401 });
    }

    try {
        const events: SecurityEvent[] = await request.json();

        if (!Array.isArray(events)) {
            return NextResponse.json({ error: 'Expected array of events' }, { status: 400 });
        }

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
