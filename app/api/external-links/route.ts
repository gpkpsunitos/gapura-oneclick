import { NextResponse } from 'next/server';
import { getExternalLinks } from '@/lib/external-links';

/**
 * GET /api/external-links
 * Public endpoint — returns all external links (DB values merged with defaults).
 */
export async function GET() {
  try {
    const links = await getExternalLinks();
    return NextResponse.json({ links });
  } catch {
    const { DEFAULT_EXTERNAL_LINKS } = await import('@/lib/external-links');
    return NextResponse.json({ links: DEFAULT_EXTERNAL_LINKS });
  }
}
