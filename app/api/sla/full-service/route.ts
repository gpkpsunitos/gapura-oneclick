import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheets } from '@/lib/google-sheets';

type NonComplianceRow = {
  Kategori: string;
  Area: string;
  Perfomance: string;
  Airline: string;
  Cab: string;
  Reasons: string;
};

type AvsecRow = {
  SecurityServicePerformance: string;
  Airline: string;
  Cab: string;
  Reasons: string;
};

type BagHandlingRow = {
  BagHandlingPerformance: string;
  Airline: string;
  Cab: string;
  Reasons: string;
};

type DebriefRow = {
  Finishing: string | null;
  Airline: string;
  Cab: string;
  Reasons: string;
};

function normalizeString(v: unknown): string {
  return (v ?? '').toString().trim();
}

function parseTable(headers: string[], rows: string[][]) {
  const h = headers.map((x) => normalizeString(x).toLowerCase());
  const idx = (name: string) => h.findIndex((x) => x === name.toLowerCase());
  return { h, idx };
}

function filterByQuery<T extends Record<string, any>>(arr: T[], q: URLSearchParams, map: Record<string, keyof T>) {
  const filters: [keyof T, string][] = [];
  Object.entries(map).forEach(([param, key]) => {
    const val = q.get(param);
    if (val && val !== 'All') filters.push([key, val]);
  });
  if (filters.length === 0) return arr;
  return arr.filter((row) => filters.every(([k, v]) => normalizeString(row[k]) === v));
}

function countBy(values: string[]) {
  const c: Record<string, number> = {};
  values.forEach((v) => {
    if (!v) return;
    c[v] = (c[v] || 0) + 1;
  });
  return Object.entries(c)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export async function GET(request: NextRequest) {
  try {
    const SHEET_ID = process.env.SLA_FULL_SERVICE_SHEET_ID;
    if (!SHEET_ID) {
      return NextResponse.json({ error: 'SLA_FULL_SERVICE_SHEET_ID not configured' }, { status: 500 });
    }

    const sheets = await getGoogleSheets();
    const batch = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SHEET_ID,
      ranges: ['Sheet1!A1:Z', 'AVSEC!A1:Z', 'Bag Handling!A1:Z', 'DEBRIEFING AFTER SERVICE!A1:Z'],
    });

    const getRange = (i: number) => (batch.data.valueRanges?.[i]?.values ?? []);

    const sheet1Values = getRange(0);
    const avsecValues = getRange(1);
    const bagValues = getRange(2);
    const debriefValues = getRange(3);

    const s1Headers = sheet1Values[0]?.map((x) => normalizeString(x)) ?? [];
    const s1Rows = (sheet1Values.slice(1) as string[][]).filter((r) => r.some((c) => normalizeString(c)));
    const { idx: s1idx } = parseTable(s1Headers, s1Rows);

    const ncRows: NonComplianceRow[] = s1Rows.map((r) => ({
      Kategori: normalizeString(r[s1idx('Kategori')]),
      Area: normalizeString(r[s1idx('Area')]),
      Perfomance: normalizeString(r[s1idx('Perfomance')]),
      Airline: normalizeString(r[s1idx('Airline')]),
      Cab: normalizeString(r[s1idx('Cab')]),
      Reasons: normalizeString(r[s1idx('Reasons')]),
    }));

    const avHeaders = avsecValues[0]?.map((x) => normalizeString(x)) ?? [];
    const avRows = (avsecValues.slice(1) as string[][]).filter((r) => r.some((c) => normalizeString(c)));
    const { idx: avidx } = parseTable(avHeaders, avRows);

    const avsec: AvsecRow[] = avRows.map((r) => ({
      SecurityServicePerformance: normalizeString(r[avidx('Security Service Performance')]),
      Airline: normalizeString(r[avidx('Airline')]),
      Cab: normalizeString(r[avidx('Cab')]),
      Reasons: normalizeString(r[avidx('Reasons')]),
    }));

    const bhHeaders = bagValues[0]?.map((x) => normalizeString(x)) ?? [];
    const bhRows = (bagValues.slice(1) as string[][]).filter((r) => r.some((c) => normalizeString(c)));
    const { idx: bhidx } = parseTable(bhHeaders, bhRows);

    const bagHandling: BagHandlingRow[] = bhRows.map((r) => ({
      BagHandlingPerformance: normalizeString(r[bhidx('Bag Handling Performance (Make up & Break down)')]),
      Airline: normalizeString(r[bhidx('Airline')]),
      Cab: normalizeString(r[bhidx('Cab')]),
      Reasons: normalizeString(r[bhidx('Reasons')]),
    }));

    const dbHeaders = debriefValues[0]?.map((x) => normalizeString(x)) ?? [];
    const dbRows = (debriefValues.slice(1) as string[][]).filter((r) => r.some((c) => normalizeString(c)));
    const { idx: dbidx } = parseTable(dbHeaders, dbRows);

    const debrief: DebriefRow[] = dbRows.map((r) => ({
      Finishing: normalizeString(r[dbidx('Finishing')]) || null,
      Airline: normalizeString(r[dbidx('Airline')]),
      Cab: normalizeString(r[dbidx('Cab')]),
      Reasons: normalizeString(r[dbidx('Reasons')]),
    }));

    const { searchParams } = new URL(request.url);
    const filteredNc = filterByQuery(ncRows, searchParams, {
      category: 'Kategori',
      area: 'Area',
      airline: 'Airline',
      branch: 'Cab',
    });
    const filteredAvsec = filterByQuery(avsec, searchParams, {
      airline: 'Airline',
      branch: 'Cab',
    });
    const filteredBag = filterByQuery(bagHandling, searchParams, {
      airline: 'Airline',
      branch: 'Cab',
    });
    const filteredDebrief = filterByQuery(debrief, searchParams, {
      airline: 'Airline',
      branch: 'Cab',
    });

    const stats = {
      categoryDistribution: countBy(filteredNc.map((r) => r.Kategori).filter(Boolean)),
      areaDistribution: countBy(filteredNc.map((r) => r.Area).filter(Boolean)),
      bagHandlingPerformance: countBy(filteredBag.map((r) => r.BagHandlingPerformance).filter(Boolean)),
    };

    const filters = {
      categories: Array.from(new Set(ncRows.map((r) => r.Kategori).filter(Boolean))).sort(),
      areas: Array.from(new Set(ncRows.map((r) => r.Area).filter(Boolean))).sort(),
      airlines: Array.from(new Set([...ncRows.map((r) => r.Airline), ...avsec.map((r) => r.Airline), ...bagHandling.map((r) => r.Airline), ...debrief.map((r) => r.Airline)].filter(Boolean))).sort(),
      branches: Array.from(new Set([...ncRows.map((r) => r.Cab), ...avsec.map((r) => r.Cab), ...bagHandling.map((r) => r.Cab), ...debrief.map((r) => r.Cab)].filter(Boolean))).sort(),
    };

    return NextResponse.json(
      {
        filters,
        stats,
        nonCompliance: filteredNc,
        avsec: filteredAvsec,
        bagHandling: filteredBag,
        debrief: filteredDebrief,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

