/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi validation schema untuk input laporan irregularitas menggunakan Zod
 * Schema ini digunakan untuk memvalidasi input dari form pembuatan laporan
 */

import { z } from 'zod';

/**
 * Validation schema untuk membuat laporan irregularitas
 * Digunakan di API route untuk validasi input
 * Memvalidasi semua langkah form: Context, Subject, The Case, Evidence
 * 
 * @constant createReportSchema
 * @example
 * ```ts
 * const result = createReportSchema.safeParse(formData);
 * if (result.success) {
 *   // Data valid
 *   createReport(result.data);
 * } else {
 *   // Tampilkan error
 *   console.error(result.error);
 * }
 * ```
 */
export const createReportSchema = z.object({
    // Step 1: Context - Informasi dasar kejadian
    /** Tanggal kejadian dalam format string */
    incident_date: z.string().min(1, 'Tanggal kejadian wajib diisi'),
    /** Waktu kejadian dalam format string */
    incident_time: z.string().min(1, 'Waktu kejadian wajib diisi'),
    /** Area lokasi kejadian */
    area: z.enum(['APRON', 'TERMINAL', 'GENERAL', 'Terminal Area', 'Apron Area']),
    /** Lokasi spesifik (opsional) */
    specific_location: z.string().optional(),
    
    // Step 2: Subject - Informasi penerbangan/GSE
    /** Apakah terkait penerbangan */
    is_flight_related: z.boolean().default(false),
    /** Nomor penerbangan (opsional, required jika is_flight_related=true) */
    flight_number: z.string().optional(),
    /** Registrasi pesawat (opsional) */
    aircraft_reg: z.string().optional(),
    /** Apakah terkait GSE (Ground Support Equipment) */
    is_gse_related: z.boolean().default(false),
    /** Nomor GSE (opsional, required jika is_gse_related=true) */
    gse_number: z.string().optional(),
    
    // Step 3: The Case - Detail kejadian
    /** Kategori utama */
    main_category: z.string().min(1, 'Kategori wajib dipilih'),
    /** Sub-kategori */
    sub_category: z.string().min(1, 'Sub-kategori wajib dipilih'),
    /** Judul singkat (opsional) */
    title: z.string().optional(),
    /** Deskripsi kronologis minimal 20 karakter */
    description: z.string().min(20, 'Kronologis minimal 20 karakter'),
    /** Tindakan segera yang diambil (opsional) */
    immediate_action: z.string().optional(),
    
    // Step 4: Evidence - Bukti pendukung
    /** Array URL bukti (foto/dokumen) */
    evidence_urls: z.array(z.string().url()).optional(),
}).refine(
    (data) => {
        // Jika terkait penerbangan, flight_number wajib diisi
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
        // Jika terkait GSE, gse_number wajib diisi
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

/**
 * Tipe input untuk membuat laporan
 * Digerer dari createReportSchema menggunakan Zod inference
 */
export type CreateReportInput = z.infer<typeof createReportSchema>;

/**
 * Validation schema untuk partial save/draft
 * Menggunakan partial dari createReportSchema untuk memvalidasi
 * form yang belum lengkap atau disimpan sebagai draft
 * 
 * @constant partialReportSchema
 * @example
 * ```ts
 * const result = partialReportSchema.safeParse(partialData);
 * if (result.success) {
 *   // Data partial valid
 *   saveDraft(result.data);
 * }
 * ```
 */
export const partialReportSchema = createReportSchema.partial();
