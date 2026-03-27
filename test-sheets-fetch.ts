
import { reportsService } from './lib/services/reports-service';

async function testFetch() {
    console.log('Fetching Google Sheets reports...');
    try {
        const reports = await reportsService.getReports({ refresh: true, source: 'sheets' });
        console.log('Total reports fetched:', reports.length);
        if (reports.length > 0) {
            console.log('Sample report:', JSON.stringify(reports[0], null, 2));
            const dates = reports.map(r => r.date_of_event || r.created_at).filter(Boolean);
            console.log('Date range:', dates.sort()[0], 'to', dates.sort()[dates.length - 1]);
            
            const categories = new Set(reports.map(r => r.category));
            console.log('Categories found:', Array.from(categories));
        }
    } catch (error) {
        console.error('Fetch failed:', error);
    }
}

testFetch();
