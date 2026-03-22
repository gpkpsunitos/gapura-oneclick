import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheets } from '@/lib/google-sheets';

type WSNRow = {
  Bulan: string;
  NomorWSN: string;
  Keterangan: string;
  Unit: string;
  Petugas: string;
  Link: string;
};

function n(v: unknown) {
  return (v ?? '').toString().trim();
}

function mapRows(values: string[][]) {
  if (!values || values.length === 0) return [] as WSNRow[];
  const headers = (values[0] || []).map(n);
  const idx = (key: string) => headers.findIndex((h) => h.toLowerCase() === key.toLowerCase());
  const iBulan = idx('Bulan');
  const iNomor = idx('Nomor WSN');
  const iKet = idx('Keterangan');
  const iUnit = idx('Unit');
  const iPet = idx('Petugas');
  const iLink = idx('Link');
  const rows = values.slice(1).filter((r) => r.some((c) => n(c)));
  return rows.map((r) => ({
    Bulan: n(r[iBulan]),
    NomorWSN: n(r[iNomor]),
    Keterangan: n(r[iKet]),
    Unit: n(r[iUnit]),
    Petugas: n(r[iPet]),
    Link: n(r[iLink]),
  }));
}

function uniqueSorted(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean))).sort();
}

function filterRows(rows: WSNRow[], q: URLSearchParams) {
  const unit = q.get('unit');
  const petugas = q.get('petugas');
  const bulan = q.get('bulan');
  const search = q.get('search');
  return rows.filter((r) => {
    if (unit && unit !== 'All' && r.Unit !== unit) return false;
    if (petugas && petugas !== 'All' && r.Petugas !== petugas) return false;
    if (bulan && bulan !== 'All' && r.Bulan !== bulan) return false;
    if (search) {
      const s = search.toLowerCase();
      const t = `${r.NomorWSN} ${r.Keterangan} ${r.Unit} ${r.Petugas}`.toLowerCase();
      if (!t.includes(s)) return false;
    }
    return true;
  });
}

export async function GET(request: NextRequest) {
  try {
    const SHEET_ID = process.env.WSN_SHEET_ID;
    if (!SHEET_ID) {
      return NextResponse.json({ error: 'WSN_SHEET_ID not configured' }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const sheetParam = (searchParams.get('sheet') || 'All').toLowerCase();
    const sheets = await getGoogleSheets();
    const batch = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SHEET_ID,
      ranges: ['WSN!A1:Z', 'WSN Baru!A1:Z'],
    });
    const getValues = (i: number) => batch.data.valueRanges?.[i]?.values || [];
    const wsnA = mapRows(getValues(0));
    const wsnB = mapRows(getValues(1));
    const all =
      sheetParam === 'wsn'
        ? wsnA
        : sheetParam === 'wsn baru' || sheetParam === 'wsn%20baru'
        ? wsnB
        : [...wsnA, ...wsnB];
    const usable = all.filter((r) => r.Link || r.NomorWSN);

    const filtered = filterRows(usable, searchParams);

    const filters = {
      bulan: uniqueSorted(usable.map((r) => r.Bulan)),
      unit: uniqueSorted(usable.map((r) => r.Unit)),
      petugas: uniqueSorted(usable.map((r) => r.Petugas)),
    };

    return NextResponse.json(
      {
        total: filtered.length,
        filters,
        records: filtered,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        },
      }
    );
  } catch (e) {
    const m = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: m }, { status: 500 });
  }
}
