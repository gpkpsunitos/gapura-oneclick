/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi definisi tipe data untuk fitur keamanan, mencakup event keamanan,
 * alert keamanan, statistik keamanan, dan entitas terkait.
 */

/**
 * Tingkat keparahan keamanan
 */
export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Event keamanan
 */
export interface SecurityEvent {
    /** ID event keamanan */
    id: string;
    /** Sumber event */
    source: string;
    /** Tipe event */
    event_type: 'login' | 'traffic' | 'access' | 'anomaly';
    /** Tingkat keparahan */
    severity: SecuritySeverity;
    /** Payload event */
    payload: Record<string, unknown>;
    /** Alamat IP */
    ip_address?: string;
    /** ID aktor */
    actor_id?: string;
    /** Tanggal pembuatan */
    created_at: string;
}

/**
 * Alert keamanan
 */
export interface SecurityAlert {
    /** ID alert */
    id: string;
    /** Judul alert */
    title: string;
    /** Deskripsi alert */
    description: string;
    /** Tingkat keparahan */
    severity: SecuritySeverity;
    /** Status alert */
    status: 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED';
    /** Event sumber */
    source_events?: string[];
    /** Metadata tambahan */
    metadata?: Record<string, unknown>;
    /** Ditugaskan ke */
    assigned_to?: string;
    /** Tanggal pembuatan */
    created_at: string;
    /** Tanggal pembaruan */
    updated_at: string;
}

/**
 * Statistik keamanan
 */
export interface SecurityStats {
    /** Total yang diblokir */
    totalBlocked: number;
    /** Malware terdeteksi */
    malwareDetected: number;
    /** Upaya intrusi */
    intrusionAttempts: number;
    /** Skor kerentanan */
    vulnerabilityScore: number;
    /** Jumlah status patch */
    patchStatusCount: number;
    /** Total sistem */
    totalSystems: number;
}

/**
 * Metrik autentikasi
 */
export interface AuthMetrics {
    /** Upaya gagal */
    failedAttempts: number;
    /** Login berhasil */
    successfulLogins: number;
    /** Aktivitas mencurigakan */
    suspiciousActivities: number;
    /** Asal serangan terakhir */
    lastAttackOrigin: string;
}

/**
 * Status jaringan
 */
export interface NetworkStatus {
    /** Trafik masuk */
    trafficIn: number;
    /** Trafik keluar */
    trafficOut: number;
    /** Koneksi aktif */
    activeConnections: number;
    /** Port scan terdeteksi */
    portScansDetected: number;
}

/**
 * Aktor ancaman
 */
export interface ThreatActor {
    /** Alamat IP */
    ip: string;
    /** Jumlah event */
    eventCount: number;
    /** Terakhir terlihat */
    lastSeen: string;
    /** Skor risiko */
    riskScore: number;
    /** Status */
    status: 'ACTIVE' | 'BLOCKED';
    /** Lokasi */
    location?: string;
}
