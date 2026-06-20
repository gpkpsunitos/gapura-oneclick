import { NextResponse } from 'next/server';
import { getExternalLinks } from '@/lib/external-links-server';
import { DEFAULT_EXTERNAL_LINKS } from '@/lib/external-links';

/**
 * GET /api/external-links
 * Public endpoint — returns all external links (DB values merged with defaults).
 */
export async function GET() {
  try {
    const links = await getExternalLinks();
    return NextResponse.json({ links });
  } catch {
    return NextResponse.json({ links: DEFAULT_EXTERNAL_LINKS });
  }
}
