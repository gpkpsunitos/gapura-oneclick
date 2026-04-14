/**
 * Server-only external links utilities.
 * This file imports supabaseAdmin and must NOT be imported from client components.
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import { DEFAULT_EXTERNAL_LINKS, type ExternalLinksMap, type ExternalLinkEntry } from '@/lib/external-links';

/**
 * Server-side: fetch external links from DB and merge with defaults.
 * Returns the merged map. Falls back to defaults on any error.
 */
export async function getExternalLinks(): Promise<ExternalLinksMap> {
  try {
    const { data, error } = await supabaseAdmin
      .from('external_links')
      .select('*')
      .order('category, sort_order');

    if (error || !data || data.length === 0) {
      return { ...DEFAULT_EXTERNAL_LINKS };
    }

    const merged: ExternalLinksMap = { ...DEFAULT_EXTERNAL_LINKS };
    for (const row of data) {
      merged[row.id] = {
        id: row.id,
        label: row.label,
        url: row.url,
        category: row.category,
        description: row.description || '',
      };
    }
    return merged;
  } catch {
    return { ...DEFAULT_EXTERNAL_LINKS };
  }
}

/**
 * Get all default entries as an array (for seeding via admin API).
 */
export function getDefaultLinksArray(): ExternalLinkEntry[] {
  return Object.values(DEFAULT_EXTERNAL_LINKS);
}
