
import { calculateComparisonData } from './lib/utils/comparison-utils';

const mockReports: any[] = [
    {
        created_at: '2026-03-01T10:00:00Z',
        category: 'Irregularity',
        area: 'Terminal Area',
        branch: 'CGK',
        airline: 'Garuda'
    },
    {
        created_at: '2026-02-01T10:00:00Z',
        category: 'Complaint',
        area: 'Apron Area',
        branch: 'CGK',
        airline: 'Garuda'
    }
];

try {
    const result = calculateComparisonData(mockReports);
    console.log('Result successful');
    console.log('Overall Metrics:', result.overallMetrics.length);
} catch (error) {
    console.error('Result failed:', error);
}

const emptyReports: any[] = [];
try {
    const result = calculateComparisonData(emptyReports);
    console.log('Empty reports result successful');
    console.log('Overall Metrics:', result.overallMetrics.length);
} catch (error) {
    console.error('Empty reports result failed:', error);
}

const invalidDateReports: any[] = [
    {
        created_at: 'invalid-date',
        category: 'Irregularity',
        area: 'Terminal Area',
        branch: 'CGK',
        airline: 'Garuda'
    }
];
try {
    const result = calculateComparisonData(invalidDateReports);
    console.log('Invalid date reports result successful');
    console.log('Overall Metrics:', result.overallMetrics.length);
} catch (error) {
    console.error('Invalid date reports result failed:', error);
}
