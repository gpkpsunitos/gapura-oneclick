/**
 * Irregularity Categories for Ground Handling Operations
 * Used for cascading dropdown and auto-routing to divisions
 * 
 * Routing Logic:
 * - OT (Teknik): Equipment/GSE issues
 * - OP (Operasi): Handling, Manpower, Baggage issues
 * - UQ (Quality): Safety, Accidents, Environment
 * - OS (Services): Customer complaints, Service quality
 */

export type TargetDivision = 'OT' | 'OP' | 'UQ' | 'OS' | 'GENERAL';

export interface IrregularityCategory {
    id: string;
    label: string;
    labelEn: string;
    targetDivision: TargetDivision;
    icon: string;
    color: string;
    bgColor: string;
    description: string;
    problems: string[];
}

export const IRREGULARITY_CATEGORIES: IrregularityCategory[] = [
    {
        id: 'GSE_FACILITY',
        label: 'Fasilitas & Peralatan (GSE)',
        labelEn: 'Equipment & Facilities',
        targetDivision: 'OT',
        icon: 'Wrench',
        color: 'oklch(0.65 0.18 45)',      // Amber
        bgColor: 'oklch(0.65 0.18 45 / 0.1)',
        description: 'Kerusakan alat kerja, GSE, dan fasilitas',
        problems: [
            'GSE Mogok / Rusak Mesin',
            'Ban Kempes / Pecah',
            'Rem Blong / Bermasalah',
            'Overheat / Keluar Asap',
            'Lampu Kendaraan Mati',
            'PBS Hydraulic Bocor',
            'Gerobak (Dollies) Roda Macet',
            'Kunci Gerobak Rusak / Longgar',
            'Tangga Manual Rusak',
            'Chocks Hilang / Rusak',
            'AC Ruangan Mati',
            'Pintu Gate Rusak / Macet',
            'Toilet Mampet / Air Mati',
            'Kebocoran Atap / Plafon',
            'Conveyor Belt Macet',
            'HT (Handy Talkie) Rusak',
            'Komputer DCS Error',
            'Printer Boarding Pass Macet',
            'FIDS (Layar Jadwal) Mati',
            'Lainnya (Fasilitas)',
        ],
    },
    {
        id: 'OPS_HANDLING',
        label: 'Operasional & Handling',
        labelEn: 'Operations & Handling',
        targetDivision: 'OP',
        icon: 'Package',
        color: 'oklch(0.55 0.22 280)',     // Purple
        bgColor: 'oklch(0.55 0.22 280 / 0.1)',
        description: 'Masalah proses handling, keterlambatan, manpower',
        problems: [
            'Bagasi Tertinggal (Left Behind)',
            'Bagasi Rusak (Damaged)',
            'Salah Label / Tagging Error',
            'Keterlambatan Delivery Bagasi',
            'Bagasi Pax No-Show Belum Diturunkan',
            'Packing Kargo Rusak / Basah',
            'Dokumen Kargo Tidak Lengkap',
            'Kargo Hewan (AVI) Bermasalah',
            'Barang Berbahaya (DG) Bocor',
            'Penumpang No-Show saat Gate Closing',
            'Penumpang Sakit / Butuh Wheelchair',
            'Jumlah Pax Tidak Cocok (Discrepancy)',
            'Sistem Boarding Gate Error',
            'Late Arrival Pesawat',
            'Keterlambatan Cleaning Cabin',
            'Keterlambatan Catering',
            'Keterlambatan Loadsheet',
            'Staff Kurang (Shortage)',
            'Staff Terlambat ke Pesawat',
            'Staff Salah Prosedur',
            'Staff Tidak Menggunakan ID Card',
            'Lainnya (Operasional)',
        ],
    },
    {
        id: 'SAFETY_ENV',
        label: 'Safety, Accident & Environment',
        labelEn: 'Safety & Environment',
        targetDivision: 'UQ',
        icon: 'AlertTriangle',
        color: 'oklch(0.55 0.22 25)',      // Red
        bgColor: 'oklch(0.55 0.22 25 / 0.1)',
        description: 'Kecelakaan, cidera, dan bahaya lingkungan',
        problems: [
            'GSE Menabrak Pesawat (CRITICAL)',
            'GSE Menabrak GSE Lain',
            'GSE Menabrak Fasilitas',
            'Petugas Terjatuh dari Pesawat/Tangga',
            'Petugas Terjepit Alat',
            'Petugas Tertabrak Kendaraan',
            'Pingsan / Masalah Kesehatan',
            'Tumpahan Oli / Avtur (Oil Spill)',
            'Sampah Berserakan di Apron',
            'Ditemukan FOD (Benda Asing)',
            'Penumpang Unruly (Mengamuk)',
            'Intruder di Area Terbatas',
            'Pencurian Bagasi / Kargo',
            'Ancaman Bom / Teror',
            'Near Miss (Hampir Tabrakan)',
            'Pelanggaran Jarak Aman Mesin',
            'Lainnya (Safety)',
        ],
    },
    {
        id: 'SERVICE',
        label: 'Layanan & Keluhan',
        labelEn: 'Service & Complaints',
        targetDivision: 'OS',
        icon: 'MessageSquare',
        color: 'oklch(0.55 0.20 240)',     // Blue
        bgColor: 'oklch(0.55 0.20 240 / 0.1)',
        description: 'Keluhan pelanggan dan kualitas layanan',
        problems: [
            'Komplain Antrian Panjang',
            'Komplain Sikap Petugas (Rude Staff)',
            'Komplain Ruang Tunggu Panas / Kotor',
            'Komplain Informasi Delay Tidak Jelas',
            'Kegagalan Penanganan VIP',
            'Mobil Jemputan VIP Terlambat',
            'Lounge VIP Penuh / Kotor',
            'Toilet Bau / Kotor',
            'Kursi Ruang Tunggu Rusak',
            'Area Check-in Berantakan',
            'Lainnya (Layanan)',
        ],
    },
];

/**
 * Auto-route report to appropriate division based on category
 */
export function routeReportToDivision(categoryId: string): TargetDivision {
    const category = IRREGULARITY_CATEGORIES.find(c => c.id === categoryId);
    return category?.targetDivision || 'OS';
}

/**
 * Get category by ID
 */
export function getCategoryById(categoryId: string): IrregularityCategory | undefined {
    return IRREGULARITY_CATEGORIES.find(c => c.id === categoryId);
}

/**
 * Get problems for a category
 */
export function getProblemsForCategory(categoryId: string): string[] {
    return getCategoryById(categoryId)?.problems || [];
}

/**
 * Area types for location selection
 */
export const AREA_TYPES = [
    {
        id: 'APRON',
        label: 'Apron',
        labelEn: 'Apron Area',
        description: 'Sisi Udara, Parking Stand, Taxiway',
        icon: 'Plane',
        image: 'https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?auto=format&fit=crop&q=80&w=600',
    },
    {
        id: 'TERMINAL',
        label: 'Terminal',
        labelEn: 'Terminal Area',
        description: 'Check-in, Boarding Gate, Arrival',
        icon: 'Building2',
        image: 'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?auto=format&fit=crop&q=80&w=600',
    },
    {
        id: 'GENERAL',
        label: 'General',
        labelEn: 'General Area',
        description: 'Gudang Cargo, Kantor, Parkiran',
        icon: 'MapPin',
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=600',
    },
] as const;

export type AreaType = typeof AREA_TYPES[number]['id'];
