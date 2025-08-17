import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);
    const url = new URL(request.url);
    
    // Parse query parameters
    const popupId = url.searchParams.get('popupId');
    const timeframe = url.searchParams.get('timeframe') || '7d'; // 7d, 30d, 90d, all
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Get shop
    const shop = await prisma.shop.findUnique({
      where: { domain: session.shop }
    });

    if (!shop) {
      return json({ success: false, error: "Shop not found" }, { status: 404 });
    }

    // Calculate date range
    let dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      };
    } else if (timeframe !== 'all') {
      const days = parseInt(timeframe.replace('d', ''));
      const date = new Date();
      date.setDate(date.getDate() - days);
      dateFilter = {
        createdAt: { gte: date }
      };
    }

    // Base analytics filter
    const analyticsFilter = {
      shopId: shop.id,
      ...(popupId && { popupId }),
      ...dateFilter
    };

    // Get performance metrics
    const [
      impressions,
      clicks,
      closes,
      completions,
      stepViews,
      stepCompletions,
      emailsCollected,
      popupData
    ] = await Promise.all([
      // Impressions
      prisma.popupAnalytics.count({
        where: { ...analyticsFilter, eventType: 'impression' }
      }),
      
      // Clicks (any interaction)
      prisma.popupAnalytics.count({
        where: { 
          ...analyticsFilter, 
          eventType: { in: ['click', 'step_complete', 'button_click'] }
        }
      }),
      
      // Closes
      prisma.popupAnalytics.count({
        where: { ...analyticsFilter, eventType: 'close' }
      }),
      
      // Completions
      prisma.popupAnalytics.count({
        where: { ...analyticsFilter, eventType: 'complete' }
      }),
      
      // Step views
      prisma.popupAnalytics.groupBy({
        by: ['stepNumber'],
        where: { 
          ...analyticsFilter, 
          eventType: 'step_view',
          stepNumber: { not: null }
        },
        _count: { stepNumber: true },
        orderBy: { stepNumber: 'asc' }
      }),
      
      // Step completions
      prisma.popupAnalytics.groupBy({
        by: ['stepNumber'],
        where: { 
          ...analyticsFilter, 
          eventType: 'step_complete',
          stepNumber: { not: null }
        },
        _count: { stepNumber: true },
        orderBy: { stepNumber: 'asc' }
      }),
      
      // Email collections in timeframe
      prisma.collectedEmail.count({
        where: {
          shopId: shop.id,
          ...(popupId && { popupId }),
          ...dateFilter
        }
      }),

      // Popup data if specific popup requested
      popupId ? prisma.popup.findUnique({
        where: { id: popupId },
        include: {
          steps: {
            orderBy: { stepNumber: 'asc' }
          }
        }
      }) : null
    ]);

    // Calculate rates
    const clickRate = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const closeRate = impressions > 0 ? (closes / impressions) * 100 : 0;
    const conversionRate = impressions > 0 ? (emailsCollected / impressions) * 100 : 0;
    const completionRate = impressions > 0 ? (completions / impressions) * 100 : 0;

    // Process step-by-step funnel data
    const stepFunnel = [];
    if (popupData?.steps) {
      for (const step of popupData.steps) {
        const views = stepViews.find(s => s.stepNumber === step.stepNumber)?._count.stepNumber || 0;
        const completions = stepCompletions.find(s => s.stepNumber === step.stepNumber)?._count.stepNumber || 0;
        const completionRate = views > 0 ? (completions / views) * 100 : 0;
        
        stepFunnel.push({
          stepNumber: step.stepNumber,
          stepType: step.stepType,
          views,
          completions,
          completionRate,
          dropOffCount: views - completions,
          dropOffRate: views > 0 ? ((views - completions) / views) * 100 : 0
        });
      }
    }

    // Get daily performance for charts
    const dailyPerformance = await prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        "eventType",
        COUNT(*) as count
      FROM "PopupAnalytics"
      WHERE "shopId" = ${shop.id}
        ${popupId ? `AND "popupId" = ${popupId}` : ''}
        ${dateFilter.createdAt ? `AND "createdAt" >= ${dateFilter.createdAt.gte}` : ''}
        ${dateFilter.createdAt?.lte ? `AND "createdAt" <= ${dateFilter.createdAt.lte}` : ''}
      GROUP BY DATE("createdAt"), "eventType"
      ORDER BY date DESC
      LIMIT 30
    `;

    // Process daily data for charting
    const chartData = {};
    (dailyPerformance as any[]).forEach(row => {
      const dateStr = row.date.toISOString().split('T')[0];
      if (!chartData[dateStr]) {
        chartData[dateStr] = {};
      }
      chartData[dateStr][row.eventType] = parseInt(row.count);
    });

    const performanceData = {
      summary: {
        impressions,
        clicks,
        closes,
        completions,
        emailsCollected,
        clickRate: Math.round(clickRate * 100) / 100,
        closeRate: Math.round(closeRate * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100
      },
      stepFunnel,
      dailyPerformance: chartData,
      popup: popupData ? {
        id: popupData.id,
        name: popupData.name,
        type: popupData.popupType,
        totalSteps: popupData.totalSteps,
        status: popupData.status
      } : null,
      timeframe: {
        requested: timeframe,
        startDate: dateFilter.createdAt?.gte?.toISOString(),
        endDate: dateFilter.createdAt?.lte?.toISOString()
      }
    };

    return json({
      success: true,
      data: performanceData
    });

  } catch (error) {
    console.error("Performance analytics error:", error);
    return json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to get performance data" 
      },
      { status: 500 }
    );
  }
}