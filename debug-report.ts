import { ReportsService } from './lib/services/reports-service';
import * as dotenv from 'dotenv';
dotenv.config();

async function debugReport() {
    const reportId = 'b1ecf2b8-b610-5edb-bbb6-6d188ef3605a';
    const service = new ReportsService();
    const report = await service.getReportById(reportId);
    
    console.log('--- DEBUG REPORT ---');
    console.log('ID:', report?.id);
    console.log('Original ID:', report?.original_id);
    console.log('Evidence URL (singular):', report?.evidence_url);
    console.log('Evidence URLs (plural):', report?.evidence_urls);
    console.log('Video URLs:', report?.video_urls);
    console.log('Partner Evidence URLs:', report?.partner_evidence_urls);
}

debugReport().catch(console.error);
