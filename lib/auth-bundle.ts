export interface AuthBundle {
    active_uid: string;
    origin_uid: string;
    sessions: Record<string, string>;
}

export const DIVISION_ROLE_CANDIDATES: Record<string, string[]> = {
    OP: ['DIVISI_OP', 'PARTNER_OP'],
    OS: ['DIVISI_OS', 'PARTNER_OS'],
    OT: ['DIVISI_OT', 'PARTNER_OT'],
    UQ: ['DIVISI_UQ', 'PARTNER_UQ'],
    HC: ['DIVISI_HC', 'PARTNER_HC'],
    HT: ['DIVISI_HT', 'PARTNER_HT'],
};

export function normalizeDivisionCode(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.trim().toUpperCase();
    return DIVISION_ROLE_CANDIDATES[normalized] ? normalized : null;
}

export function parseAuthBundle(raw: string | null | undefined): AuthBundle | null {
    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as Partial<AuthBundle> | null;
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }

        const sessions = parsed.sessions && typeof parsed.sessions === 'object'
            ? Object.fromEntries(
                Object.entries(parsed.sessions).filter(
                    ([key, value]) => typeof key === 'string' && key && typeof value === 'string' && value
                )
            )
            : {};

        const activeUid = typeof parsed.active_uid === 'string' ? parsed.active_uid : '';
        const originUidRaw = typeof parsed.origin_uid === 'string' ? parsed.origin_uid : '';
        const originUid = originUidRaw || activeUid;

        if (!activeUid || !originUid || !sessions[activeUid] || !sessions[originUid]) {
            return null;
        }

        return {
            active_uid: activeUid,
            origin_uid: originUid,
            sessions,
        };
    } catch {
        return null;
    }
}

export function serializeAuthBundle(bundle: AuthBundle): string {
    return JSON.stringify({
        active_uid: bundle.active_uid,
        origin_uid: bundle.origin_uid,
        sessions: bundle.sessions,
    });
}
