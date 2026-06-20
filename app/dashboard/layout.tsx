import './dashboard-theme.css';

/**
 * @file
 * Dashboard outer shell — pure presentational layout.
 *
 * Auth is handled exclusively by `(main)/layout.tsx` to avoid
 * duplicate JWT verifications on every request.
 */

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen min-h-[100dvh] w-full overflow-x-hidden" style={{ background: 'var(--surface-0)' }}>
            {children}
        </div>
    );
}
