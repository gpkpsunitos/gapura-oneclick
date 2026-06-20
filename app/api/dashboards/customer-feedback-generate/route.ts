import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { generateCustomerFeedbackDashboard } from '@/lib/builder/customer-feedback-template';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { reportsService } from '@/lib/services/reports-service';

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifySession(session);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = String(payload.role).trim().toUpperCase();
    if (role !== 'ANALYST' && role !== 'SUPER_ADMIN' && role !== 'DIVISI_OS') {
      return NextResponse.json({ error: 'Forbidden: Akses tidak diizinkan' }, { status: 403 });
    }

    const { dateFrom, dateTo, filters, title, folder } = await request.json();
    
    // Ensure fresh data from Google Sheets before generating dashboard
    // This is crucial because the dashboard generation relies on querying data
    // which now comes from Sheets. 
    // Although the actual queries in 'dashboard_charts' might still hit Supabase 
    // IF the system was designed to query Supabase directly for charts.
    // BUT since we switched the 'reports' source of truth to Google Sheets,
    // any dashboard query logic needs to know about this.
    
    // Current Architecture Observation:
    // The `generateCustomerFeedbackDashboard` likely creates a configuration for charts.
    // The actual data fetching for charts happens when the dashboard is viewed (via /api/dashboards/query or similar).
    // So we need to ensure that /api/dashboards/query fetches from Google Sheets.
    
    // However, to be safe and ensure data consistency, we can trigger a "sync" or "fetch" here if needed.
    // Since `reportsService.getReports()` fetches live from Sheets, we just need to ensure the query endpoint uses it.
    
    // For this specific file, we just proceed with generation.
    // The actual data reading happens when the user views the dashboard.
    
    // If we wanted to "cache" data into Supabase for performance, we would do it here.
    // But per instructions "data must successfully fetched from google sheets first",
    // and "keep supabase only for authentication", we should rely on Sheets.
    
    // Let's verify if we need to do anything here. 
    // The instruction says "make sure when user want to access customer feedback dashboard, the data must successfully fetched from google sheets first"
    // This endpoint GENERATES the dashboard structure. 
    // The VIEWING happens later.
    
    // However, to ensure connectivity is valid before even generating:
    await reportsService.getReports({ refresh: true }); // Force fetch from Google Sheets

    // If no dates provided, generate without date range restrictions
    const effectiveDateFrom = dateFrom || '1900-01-01';
    const effectiveDateTo = dateTo || '2099-12-31';
    const isDefaultRange = !dateFrom && !dateTo && (!filters || (
      (!filters.hubs || filters.hubs.length === 0) &&
      (!filters.branches || filters.branches.length === 0) &&
      (!filters.airlines || filters.airlines.length === 0) &&
      (!filters.categories || filters.categories.length === 0)
    ));

    // No division scoping: generate like analyst for all allowed roles
    const generationOptions = { ...filters };
    const dashboard = generateCustomerFeedbackDashboard(effectiveDateFrom, effectiveDateTo, { filters: generationOptions });

    // Determine if this is a filtered dashboard (has custom filters)
    const isFilteredDashboard = !isDefaultRange || !!title;
    
    // Build config with filter criteria and hideControls for filtered dashboards
    const dashboardConfig = {
      pages: dashboard.pages?.map(p => p.name) || ['Case Category', 'Detail Category', 'Detail Report'],
      hideControls: isFilteredDashboard, // Hide filter UI for filtered dashboards
      dateFrom: effectiveDateFrom,
      dateTo: effectiveDateTo,
      filters: isFilteredDashboard ? {
        hubs: filters?.hubs || [],
        branches: filters?.branches || [],
        airlines: filters?.airlines || [],
        categories: filters?.categories || [],
      } : undefined,
      sourceDashboardId: isFilteredDashboard ? 'customer-feedback-main' : undefined,
    };

    let slug: string;
    let dashboardId: string;

    if (isDefaultRange && !title) { // Only use default slot if no custom title provided
        slug = 'customer-feedback-main';
        
        // Check if default dashboard exists
        const { data: existingDashboard } = await supabaseAdmin
            .from('custom_dashboards')
            .select('id, slug')
            .eq('slug', slug)
            .single();

        if (existingDashboard) {
            dashboardId = existingDashboard.id;
            
            // Update existing dashboard config to ensure it uses latest template
            const { error: updateError } = await supabaseAdmin
                .from('custom_dashboards')
                .update({
                    name: dashboard.name || 'Customer Feedback Dashboard',
                    description: dashboard.description || 'Customer Feedback Analysis Dashboard',
                    folder: folder || null,
                    is_public: true,
                    config: dashboardConfig,
                    updated_at: new Date().toISOString()
                })
                .eq('id', dashboardId);

            if (updateError) {
                console.error('Failed to update dashboard:', updateError);
                return NextResponse.json({ error: 'Gagal memperbarui dashboard' }, { status: 500 });
            }

            // Delete old charts to replace with new ones
            const { error: deleteError } = await supabaseAdmin
                .from('dashboard_charts')
                .delete()
                .eq('dashboard_id', dashboardId);

            if (deleteError) {
                console.error('Failed to delete old charts:', deleteError);
                return NextResponse.json({ error: 'Gagal memperbarui chart' }, { status: 500 });
            }
        } else {
            // Create new default dashboard
            const { data: dbDashboard, error: insertError } = await supabaseAdmin
                .from('custom_dashboards')
                .insert({
                    name: dashboard.name || 'Customer Feedback Dashboard',
                    description: dashboard.description || 'Customer Feedback Analysis Dashboard',
                    folder: folder || null,
                    slug: slug,
                    is_public: true,
                    config: dashboardConfig,
                })
                .select()
                .single();

            if (insertError || !dbDashboard) {
                console.error('Failed to insert dashboard:', insertError);
                return NextResponse.json({ error: 'Gagal menyimpan dashboard' }, { status: 500 });
            }
            dashboardId = dbDashboard.id;
        }
    } else {
        // Generate unique slug for custom date range
        const baseSlug = 'customer-feedback';
        slug = `${baseSlug}-${Date.now().toString(36)}`;

        // Provide custom title if available
        const finalName = title || dashboard.name || 'Customer Feedback Dashboard';
        const finalDesc = title ? `Custom Analysis: ${title}` : (dashboard.description || 'Customer Feedback Analysis Dashboard');

        // Insert new custom dashboard
        const { data: dbDashboard, error: insertError } = await supabaseAdmin
            .from('custom_dashboards')
            .insert({
                name: finalName,
                description: finalDesc,
                folder: folder || null,
                slug: slug,
                is_public: true,
                config: dashboardConfig,
            })
            .select()
            .single();

        if (insertError || !dbDashboard) {
            console.error('Failed to insert dashboard:', insertError);
            return NextResponse.json({ error: 'Gagal menyimpan dashboard' }, { status: 500 });
        }
        dashboardId = dbDashboard.id;
    }

    // Insert all tiles (for both new and updated dashboards)
    const allTiles = (dashboard.pages || []).flatMap((page) => 
      (page.tiles || []).map((tile, tidx) => ({
        dashboard_id: dashboardId,
        title: tile.visualization?.title || 'Untitled Chart',
        chart_type: tile.visualization?.chartType || 'bar',
        data_field: 'customer_feedback',
        query_config: tile.query,
        visualization_config: tile.visualization,
        layout: tile.layout,
        position: tidx,
        page_name: page.name
      }))
    );

    if (allTiles.length > 0) {
      const { error: tileError } = await supabaseAdmin
        .from('dashboard_charts')
        .insert(allTiles);
      
      if (tileError) {
        console.error('Failed to insert tiles:', tileError);
      }
    }

    // Return dashboard with database ID and slug
    return NextResponse.json({ 
      dashboard: {
        ...dashboard,
        id: dashboardId,
        slug: slug
      } 
    });
  } catch (err) {
    console.error('Customer feedback generate error:', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
