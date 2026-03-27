import { z } from 'zod';

/**
 * Validation schema for creating irregularity reports
 * Used in API route for input validation
 */
export const createReportSchema = z.object({
    // Step 1: Context
    incident_date: z.string().min(1, 'Tanggal kejadian wajib diisi'),
    incident_time: z.string().min(1, 'Waktu kejadian wajib diisi'),
    area: z.enum(['APRON', 'TERMINAL', 'GENERAL', 'Terminal Area', 'Apron Area']),
    specific_location: z.string().optional(),

    // Step 2: Subject (conditional - validated separately)
    is_flight_related: z.boolean().default(false),
    flight_number: z.string().optional(),
    aircraft_reg: z.string().optional(),
    is_gse_related: z.boolean().default(false),
    gse_number: z.string().optional(),

    // Step 3: The Case
    main_category: z.string().min(1, 'Kategori wajib dipilih'),
    sub_category: z.string().min(1, 'Sub-kategori wajib dipilih'),
    title: z.string().optional(),
    description: z.string().min(20, 'Kronologis minimal 20 karakter'),
    immediate_action: z.string().optional(),

    // Step 4: Evidence
    evidence_urls: z.array(z.string().url()).optional(),
}).refine(
    (data) => {
        // If flight related, flight_number is required
        if (data.is_flight_related && !data.flight_number) {
            return false;
        }
        return true;
    },
    {
        message: 'Nomor penerbangan wajib diisi jika terkait penerbangan',
        path: ['flight_number'],
    }
).refine(
    (data) => {
        // If GSE related, gse_number is required
        if (data.is_gse_related && !data.gse_number) {
            return false;
        }
        return true;
    },
    {
        message: 'Nomor GSE wajib diisi jika terkait alat',
        path: ['gse_number'],
    }
);

export type CreateReportInput = z.infer<typeof createReportSchema>;

/**
 * Lighter validation for partial saves / drafts
 */
export const partialReportSchema = createReportSchema.partial();
