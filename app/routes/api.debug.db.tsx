import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const debugResults = {
    timestamp: new Date().toISOString(),
    tests: [] as any[]
  };

  // Test 1: Basic Prisma connection
  try {
    await prisma.$queryRaw`SELECT 1 as test`;
    debugResults.tests.push({
      name: "Basic Database Connection",
      status: "SUCCESS",
      message: "Prisma can connect to database"
    });
  } catch (error) {
    debugResults.tests.push({
      name: "Basic Database Connection", 
      status: "FAILED",
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 2: Shop table exists and is accessible
  try {
    const shopCount = await prisma.shop.count();
    debugResults.tests.push({
      name: "Shop Table Access",
      status: "SUCCESS", 
      message: `Found ${shopCount} shops in database`
    });
  } catch (error) {
    debugResults.tests.push({
      name: "Shop Table Access",
      status: "FAILED",
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 3: Popup table exists and is accessible
  try {
    const popupCount = await prisma.popup.count();
    debugResults.tests.push({
      name: "Popup Table Access",
      status: "SUCCESS",
      message: `Found ${popupCount} popups in database`
    });
  } catch (error) {
    debugResults.tests.push({
      name: "Popup Table Access", 
      status: "FAILED",
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 4: PopupDesign table exists (this should fail if migration not applied)
  try {
    const designCount = await prisma.popupDesign.count();
    debugResults.tests.push({
      name: "PopupDesign Table Access",
      status: "SUCCESS",
      message: `Found ${designCount} popup designs in database`
    });
  } catch (error) {
    debugResults.tests.push({
      name: "PopupDesign Table Access",
      status: "EXPECTED_FAILURE",
      error: error instanceof Error ? error.message : String(error),
      note: "This is expected if PopupDesign migration hasn't been applied"
    });
  }

  // Test 5: Environment variables
  const envVars = {
    DATABASE_URL: process.env.DATABASE_URL ? "SET" : "MISSING",
    DIRECT_URL: process.env.DIRECT_URL ? "SET" : "MISSING", 
    SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL ? "SET" : "MISSING",
    NODE_ENV: process.env.NODE_ENV || "undefined"
  };

  debugResults.tests.push({
    name: "Environment Variables",
    status: "INFO",
    envVars
  });

  // Test 6: Check for recent CustomerSession entries (last 24 hours)
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSessions = await prisma.customerSession.findMany({
      where: {
        createdAt: {
          gte: twentyFourHoursAgo
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
      select: {
        id: true,
        sessionToken: true,
        currentStep: true,
        stepsViewed: true,
        stepsCompleted: true,
        responses: true,
        completedAt: true,
        createdAt: true,
        popup: {
          select: {
            name: true,
            totalSteps: true
          }
        }
      }
    });

    debugResults.tests.push({
      name: "Recent CustomerSession Entries (24h)",
      status: "SUCCESS",
      message: `Found ${recentSessions.length} recent sessions`,
      data: recentSessions.map(session => ({
        sessionToken: session.sessionToken.slice(-8), // Show last 8 chars for privacy
        currentStep: session.currentStep,
        stepsViewed: session.stepsViewed,
        stepsCompleted: session.stepsCompleted,
        hasResponses: !!session.responses,
        responses: session.responses,
        completed: !!session.completedAt,
        popupName: session.popup?.name,
        totalSteps: session.popup?.totalSteps,
        createdAt: session.createdAt.toISOString(),
        ageMinutes: Math.round((Date.now() - session.createdAt.getTime()) / (1000 * 60))
      }))
    });
  } catch (error) {
    debugResults.tests.push({
      name: "Recent CustomerSession Entries",
      status: "FAILED",
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 7: Try a specific popup query (similar to what design route does)
  try {
    const url = new URL(request.url);
    const testPopupId = url.searchParams.get('popupId');
    
    if (testPopupId) {
      const popup = await prisma.popup.findFirst({
        where: { id: testPopupId }
      });
      
      debugResults.tests.push({
        name: `Specific Popup Query (${testPopupId})`,
        status: popup ? "SUCCESS" : "NOT_FOUND",
        message: popup ? `Found popup: ${popup.name}` : "Popup not found with that ID"
      });
    }
  } catch (error) {
    debugResults.tests.push({
      name: "Specific Popup Query",
      status: "FAILED", 
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return json(debugResults, {
    headers: {
      'Cache-Control': 'no-cache'
    }
  });
}