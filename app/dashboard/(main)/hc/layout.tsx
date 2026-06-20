import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Human Capital — Gapura OneClick',
};

/**
 * HC layout — preloads the division-documents and master-data API endpoints
 * so the browser starts fetching before the client JS finishes parsing.
 */
export default function HCLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preload" href="/api/division-documents?division=HC" as="fetch" crossOrigin="use-credentials" />
      <link rel="preload" href="/api/master-data?type=stations" as="fetch" crossOrigin="use-credentials" />
      {children}
    </>
  );
}
