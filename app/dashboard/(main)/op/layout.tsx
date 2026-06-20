import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Operational Dashboard — Gapura OneClick',
};

/**
 * OP layout — preloads the analytics API so the browser starts fetching
 * before the client-side SWR hook kicks in.
 */
export default function OPLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preload" href="/api/admin/analytics" as="fetch" crossOrigin="use-credentials" />
      {children}
    </>
  );
}
