import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-utils';
import { cookies } from 'next/headers';
import { getHfClient } from '@/lib/hf-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

/**
 * API endpoint untuk analisis AI
 * Mengirim data ke Python AI service dan mengembalikan hasil analisis
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { data, options = {} } = body;

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Data laporan diperlukan' },
        { status: 400 }
      );
    }

    const convertedData = data.map((report: any) => ({
      Date_of_Event: report.Date_of_Event || report.date_of_event || report.created_at,
      Airlines: report.Airlines || report.airlines || report.airline || 'Unknown',
      Flight_Number: report.Flight_Number || report.flight_number || report.flightNumber || 'N/A',
      Branch: report.Branch || report.branch || report.stations?.code || 'Unknown',
      HUB: report.HUB || report.hub || 'Unknown',
      Route: report.Route || report.route || '',
      Report_Category: report.Report_Category || report.report_category || report.category || 'Irregularity',
      Irregularity_Complain_Category: report.Irregularity_Complain_Category || report.main_category || report.category_detail || 'Unknown',
      Report: report.Report || report.description || report.report || report.title || '',
      Root_Caused: report.Root_Caused || report.root_cause || report.root_caused || '',
      Action_Taken: report.Action_Taken || report.action_taken || report.action || '',
      Area: report.Area || report.area || 'Unknown',
      Status: report.Status || report.status || 'Open',
      Upload_Irregularity_Photo: report.Upload_Irregularity_Photo || report.photo_url || '',
    }));

    const analysisOptions = {
      predictResolutionTime: options.predictResolutionTime !== false,
      classifySeverity: options.classifySeverity !== false,
      extractEntities: options.extractEntities !== false,
      generateSummary: options.generateSummary !== false,
      analyzeTrends: options.analyzeTrends !== false,
    };

    console.log('[AI Analyze Route] Sending payload to AI service:', JSON.stringify({
      data: convertedData.slice(0, 2),
      options: analysisOptions,
    }, null, 2));
    
    const { searchParams } = new URL(req.url);
    const esklasiRegex = searchParams.get('esklasi_regex') || '';

    try {
      const hfClient = getHfClient();
      const aiResponse = await hfClient.fetch(
        `/api/ai/analyze?esklasi_regex=${encodeURIComponent(esklasiRegex)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: convertedData,
            options: analysisOptions,
          }),
        }
      );

      if (!aiResponse.ok) {
        throw new Error(`AI service error: ${aiResponse.status}`);
      }

      const aiResult = await aiResponse.json();
      const translatedResult = translateToIndonesian(aiResult);

      return NextResponse.json(translatedResult);
    } catch (aiError) {
      console.error('AI Service Error:', aiError);
      
      return NextResponse.json(
        { 
          error: 'AI service tidak tersedia',
          details: aiError instanceof Error ? aiError.message : 'Unknown error'
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('AI Analysis API Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat analisis AI' },
      { status: 500 }
    );
  }
}

/**
 * Translate AI response metrics to Bahasa Indonesia
 */
function translateToIndonesian(result: any) {
  return {
    ...result,
    regression: result.regression ? {
      ...result.regression,
      modelMetrics: result.regression.modelMetrics ? {
        ...result.regression.modelMetrics,
        mae: result.regression.modelMetrics.mae,
        rmse: result.regression.modelMetrics.rmse,
        r2: result.regression.modelMetrics.r2,
        keterangan: {
          mae: 'Rata-rata Selisih (Mean Absolute Error)',
          rmse: 'Akar Rata-rata Kuadrat Selisih (Root Mean Square Error)',
          r2: 'Tingkat Akurasi Model (R-squared)',
        }
      } : null,
    } : null,
    metadata: {
      ...result.metadata,
      infoBahasa: {
        totalRecords: 'Total Laporan yang Dianalisis',
        processingTime: 'Waktu Pemrosesan (milidetik)',
      }
    }
  };
}
