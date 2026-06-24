import './dashboard-theme.css';

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
