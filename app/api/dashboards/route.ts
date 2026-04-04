/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi API route untuk mengelola dashboard custom
 * Mendukung list, create, update, delete dashboard dengan dukungan public access
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getPublicDashboardPageData } from '@/lib/public-dashboard-data';
import type { DashboardScopeFilters } from '@/lib/dashboard-query-scope';

/**
 * Konfigurasi dashboard
 * @interface DashboardConfig
 */
interface DashboardConfig {
  /** Rentang tanggal default */
  dateRange?: string;
  /** Auto refresh flag */
  autoRefresh?: boolean;
  /** Tema dashboard */
  theme?: 'dark' | 'light';
  /** Tanggal mulai */
  dateFrom?: string;
  /** Tanggal akhir */
  dateTo?: string;
  /** Subtitle dashboard */
  subtitle?: string;
  /** Filter yang tersedia */
  filters?: string[];
  /** Nama halaman yang terurut */
  pages?: string[];
}

/**
 * Konfigurasi chart dalam dashboard
 * @interface ChartConfig
 */
interface ChartConfig {
  /** Judul chart */
  title: string;
  /** Tipe chart */
  chartType: string;
  /** Field data sumber */
  dataField: string;
  /** Lebar chart */
  width: 'full' | 'half' | 'third';
  /** Posisi chart */
  position: number;
  /** Konfigurasi query */
  query_config?: Record<string, unknown>;
  /** Konfigurasi visualisasi */
  visualization_config?: Record<string, unknown>;
  /** Layout chart */
  layout?: Record<string, unknown>;
  /** Nama halaman */
  page_name?: string;
}

/**
 * Menangani request GET untuk mengambil dashboard atau daftar dashboard
 * Mendukung fetching dashboard spesifik, tile spesifik, atau daftar semua dashboard public
 * @param request - Request object dengan query parameters
 * @returns Response JSON berisi data dashboard atau daftar dashboard
 * @throws {Error} Jika terjadi kesalahan server
 * @example
 * ```http
 * GET /api/dashboards?slug=irrs&includeData=1
 * GET /api/dashboards?tileId=123
 * GET /api/dashboards
 * ```
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const includeData = searchParams.get('includeData') === '1';
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value || null;
    const payload = token ? await verifySession(token) : null;
    const role = String(payload?.role || '').trim().toUpperCase();
    const allowCF = role === 'ANALYST' || role === 'SUPER_ADMIN' || role === 'DIVISI_OS';

    if (slug) {
      if (slug.toLowerCase().includes('customer-feedback') && !allowCF) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (includeData) {
        const filters: DashboardScopeFilters = {
          hub: searchParams.get('hub') || undefined,
          branch: searchParams.get('branch') || undefined,
          maskapai: searchParams.get('maskapai') || undefined,
          airline: searchParams.get('airline') || undefined,
          main_category: searchParams.get('main_category') || undefined,
          area: searchParams.get('area') || undefined,
          target_division: searchParams.get('target_division') || undefined,
          severity: searchParams.get('severity') || undefined,
          status: searchParams.get('status') || undefined,
        };
        const pageIndex = Math.max(parseInt(searchParams.get('pageIndex') || '0', 10), 0);
        const range = searchParams.get('range') || '7d';
        try {
          const payload = await getPublicDashboardPageData({
            slug,
            pageIndex,
            range,
            filters,
            dateFrom: searchParams.get('dateFrom') || undefined,
            dateTo: searchParams.get('dateTo') || undefined,
            allowCustomerFeedback: allowCF,
          });

          return NextResponse.json(payload, {
            headers: {
              'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
              'CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
            },
          });
        } catch (fetchError) {
          if (fetchError instanceof Error && fetchError.message === 'FORBIDDEN_CUSTOMER_FEEDBACK') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          }
          throw fetchError;
        }
      }

      // Fetch specific dashboard with its charts
      const { data: dashboard, error } = await supabase
        .from('custom_dashboards')
        .select(`
          id,
          name,
          description,
          slug,
          config,
          created_at,
          dashboard_charts (
            id,
            title,
            chart_type,
            data_field,
            position,
            width,
            config,
            query_config,
            visualization_config,
            layout,
            page_name
          )
        `)
        .eq('slug', slug)
        .eq('is_public', true)
        .single();

      if (error || !dashboard) {
        return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
      }

      return NextResponse.json(dashboard, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          'CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      });
    }

    const tileId = searchParams.get('tileId');
    if (tileId) {
        if (!allowCF) {
            const { data: ownTile } = await supabaseAdmin
              .from('dashboard_charts')
              .select(`id, custom_dashboards ( slug )`)
              .eq('id', tileId)
              .single();
            const ownSlug = (ownTile as { custom_dashboards?: { slug?: string } } | null)?.custom_dashboards?.slug;
            if (ownSlug && ownSlug.toLowerCase().includes('customer-feedback')) {
              return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }
        // Fetch specific chart/tile using ADMIN client to bypass RLS for public access
        const { data: chart, error } = await supabaseAdmin
            .from('dashboard_charts')
            .select(`
                id,
                title,
                chart_type,
                data_field,
                position,
                width,
                config,
                query_config,
                visualization_config,
                layout,
                page_name,
                custom_dashboards (
                    id,
                    slug,
                    is_public
                )
            `)
            .eq('id', tileId)
            .single();

        if (error || !chart) {
          return NextResponse.json({ error: 'Tile not found' }, { status: 404 });
        }

        // Security check: only show if dashboard is public
        const isPublic = (chart as { custom_dashboards?: { is_public?: boolean } } | null)?.custom_dashboards?.is_public;
        if (!isPublic) {
          return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
        }

        return NextResponse.json(chart, {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          }
        });
    }

    // List all public dashboards
    const { data: dashboards, error } = await supabase
      .from('custom_dashboards')
      .select('id, name, description, slug, folder, created_at')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const filtered = allowCF ? dashboards : (dashboards || []).filter(d => !String(d.slug || '').toLowerCase().includes('customer-feedback'));

    return NextResponse.json({ dashboards: filtered }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Menangani request POST untuk membuat dashboard baru
 * @param request - Request object berisi data dashboard di body JSON
 * @returns Response JSON dengan data dashboard yang dibuat
 * @throws {Error} Jika terjadi kesalahan pembuatan dashboard
 * @example
 * ```json
 * {
 *   "name": "Dashboard Baru",
 *   "description": "Deskripsi dashboard",
 *   "charts": [...],
 *   "config": { "dateRange": "7d" }
 * }
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, charts, config, folder } = body as {
      name: string;
      description?: string;
      charts: ChartConfig[];
      config?: DashboardConfig;
      folder?: string;
    };

    if (!name || !charts || charts.length === 0) {
      return NextResponse.json({ error: 'Name and at least one chart required' }, { status: 400 });
    }

    // Generate unique slug
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    // Create dashboard
    const { data: dashboard, error: dashError } = await supabase
      .from('custom_dashboards')
      .insert({
        name,
        description: description || null,
        slug,
        config: config || { dateRange: '7d', autoRefresh: true, theme: 'dark' },
        is_public: true,
        folder: folder || null
      })
      .select('id, slug')
      .single();

    if (dashError || !dashboard) {
      return NextResponse.json({ error: dashError?.message || 'Failed to create dashboard' }, { status: 500 });
    }

    // Create charts
    const chartInserts = charts.map((c, i) => ({
      dashboard_id: dashboard.id,
      title: c.title,
      chart_type: c.chartType,
      data_field: c.dataField,
      width: c.width || 'half',
      position: c.position ?? i,
      config: {},
      query_config: c.query_config || null,
      visualization_config: c.visualization_config || null,
      layout: c.layout || null,
      page_name: c.page_name || 'Ringkasan Umum',
    }));

    const { error: chartsError } = await supabase
      .from('dashboard_charts')
      .insert(chartInserts);

    if (chartsError) {
      // Rollback: delete dashboard
      await supabase.from('custom_dashboards').delete().eq('id', dashboard.id);
      return NextResponse.json({ error: chartsError.message }, { status: 500 });
    }

    // Generate embed URL
    const embedUrl = `/embed/custom/${dashboard.slug}`;

    return NextResponse.json({
      success: true,
      dashboard: {
        id: dashboard.id,
        slug: dashboard.slug,
        embedUrl,
        fullUrl: `${process.env.NEXT_PUBLIC_BASE_URL || ''}${embedUrl}`
      }
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Menangani request DELETE untuk menghapus dashboard berdasarkan ID
 * @param request - Request object dengan query parameter id
 * @returns Response JSON dengan status sukses
 * @throws {Error} Jika terjadi kesalahan penghapusan
 * @example
 * ```http
 * DELETE /api/dashboards?id=123
 * ```
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Dashboard ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('custom_dashboards')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Menangani request PATCH untuk update dashboard
 * Mendukung rename folder, delete folder, atau move dashboard ke folder lain
 * @param request - Request object berisi data update di body JSON
 * @returns Response JSON dengan status sukses
 * @throws {Error} Jika terjadi kesalahan update
 * @example
 * ```json
 * { "action": "rename", "oldFolder": "Lama", "newFolder": "Baru" }
 * { "action": "delete", "folder": "Hapus" }
 * { "id": "123", "folder": "Folder Baru" }
 * ```
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Bulk rename: { action: 'rename', oldFolder, newFolder }
    if (body.action === 'rename') {
      const { oldFolder: rawOld, newFolder: rawNew } = body as { action: string; oldFolder: string; newFolder: string };
      const oldFolder = typeof rawOld === 'string' ? rawOld.trim() : '';
      const newFolder = typeof rawNew === 'string' ? rawNew.trim() : '';
      if (!oldFolder || !newFolder) {
        return NextResponse.json({ error: 'oldFolder and newFolder required' }, { status: 400 });
      }
      if (oldFolder === newFolder) {
        return NextResponse.json({ success: true });
      }
      const { error } = await supabase
        .from('custom_dashboards')
        .update({ folder: newFolder || null })
        .eq('folder', oldFolder);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    // Dissolve folder (move all dashboards to no-folder): { action: 'delete', folder }
    if (body.action === 'delete') {
      const rawFolder = body.folder;
      const folder = typeof rawFolder === 'string' ? rawFolder.trim() : '';
      if (!folder) {
        return NextResponse.json({ error: 'folder required' }, { status: 400 });
      }
      const { error } = await supabase
        .from('custom_dashboards')
        .update({ folder: null })
        .eq('folder', folder);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    // Reject unknown action values
    if (body.action !== undefined) {
      return NextResponse.json({ error: `Unknown action: ${String(body.action)}` }, { status: 400 });
    }

    // Single dashboard move: { id, folder }
    const { id, folder } = body as { id: string; folder: string | null };
    if (!id) {
      return NextResponse.json({ error: 'Dashboard ID required' }, { status: 400 });
    }
    const { error } = await supabase
      .from('custom_dashboards')
      .update({ folder })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
