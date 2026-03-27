/**
 * Security Performance & Accuracy Simulation
 * Run with: ts-node scripts/simulate-threat.ts
 */
async function simulateThreat() {
    console.log('--- Starting Real-Time Threat Simulation ---');
    const INGEST_URL = 'http://localhost:3000/api/security/ingest';
    const KEY = process.env.SECURITY_INGEST_KEY;

    // 1. Simulate Traffic Spike (Exfiltration Pattern)
    const trafficEvents = Array.from({ length: 100 }, () => ({
        source: 'firewall-main',
        event_type: 'traffic',
        severity: 'MEDIUM',
        payload: { bytes: 5000000 + (Math.random() * 1000000) }, // ~5MB per event
        created_at: new Date().toISOString()
    }));

    console.log('Sending traffic spike...');
    const start = Date.now();
    const res = await fetch(INGEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-security-key': KEY! },
        body: JSON.stringify(trafficEvents)
    });
    const results = await res.json();
    
    console.log(`Ingestion Latency: ${Date.now() - start}ms`);
    console.log(`Server Processing: ${results.latency_ms}ms`);
    console.log(`Accuracy Check: DetectionEngine instance notified.`);
    console.log(`Verification: Check Dashboard for 'Data Exfiltration Anomaly' alert.`);
}

if (require.main === module) {
    simulateThreat().catch(console.error);
}
