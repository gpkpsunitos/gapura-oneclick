import './embed.css';

export const metadata = {
  title: 'Gapura IRRS - Dashboard Detail',
  description: 'Interactive report detail view'
};

export default function EmbedLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
      
      <div className="embed-body">
        <div className="noise-overlay" />
        <div className="aurora-glow" />
        <main className="embed-container">
          {children}
        </main>
      </div>
    </>
  );
}
