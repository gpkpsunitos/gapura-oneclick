'use client';

import { useState, useEffect } from 'react';
import type { ExternalLinksMap } from '@/lib/external-links';
import { DEFAULT_EXTERNAL_LINKS } from '@/lib/external-links';

/**
 * Client hook to fetch external links from the public API.
 * Returns null while loading; consumers should fall back to DEFAULT_EXTERNAL_LINKS.
 */
export function useExternalLinks(): ExternalLinksMap | null {
  const [links, setLinks] = useState<ExternalLinksMap | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/external-links')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.links) {
          setLinks(data.links);
        } else {
          setLinks({ ...DEFAULT_EXTERNAL_LINKS });
        }
      })
      .catch(() => {
        if (!cancelled) setLinks({ ...DEFAULT_EXTERNAL_LINKS });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return links;
}
