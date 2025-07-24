import { type ActionFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";
import { isMultiPopupEnabled } from "../utils/features";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export async function loader() {
  return new Response(null, { 
    status: 200,
    headers: corsHeaders
  });
}

export async function action({ request }: ActionFunctionArgs) {
  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }), 
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const { 
      sessionToken, 
      shopDomain, 
      stepNumber, 
      stepResponse, 
      action: stepAction 
    } = await request.json();

    if (!sessionToken || !shopDomain || !stepNumber) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Session token, shop domain, and step number are required" 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Only update progress for multi-popup system
    if (!isMultiPopupEnabled()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Multi-popup system not enabled" 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Find the shop
    const shop = await prisma.shop.findUnique({
      where: { domain: shopDomain }
    });

    if (!shop) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Shop not found" 
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Find customer session
    const customerSession = await prisma.customerSession.findFirst({
      where: {
        sessionToken,
        shopId: shop.id,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        popup: {
          include: {
            steps: {
              orderBy: { stepNumber: 'asc' }
            }
          }
        }
      }
    });

    if (!customerSession) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Session not found or expired" 
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Parse existing responses
    const currentResponses = typeof customerSession.responses === 'string' 
      ? JSON.parse(customerSession.responses) 
      : customerSession.responses || {};

    let updatedResponses = { ...currentResponses };
    let newCurrentStep = customerSession.currentStep;
    let completedAt = customerSession.completedAt;

    // Handle different step actions
    if (stepAction === 'answer' && stepResponse) {
      // Store the response for this step
      updatedResponses[`step_${stepNumber}`] = stepResponse;
      
      // Move to next step if not already there
      if (stepNumber >= newCurrentStep) {
        newCurrentStep = Math.min(stepNumber + 1, customerSession.popup.totalSteps);
      }
    } else if (stepAction === 'navigate') {
      // Just update current step (for back/forward navigation)
      newCurrentStep = Math.max(1, Math.min(stepNumber, customerSession.popup.totalSteps));
    } else if (stepAction === 'complete') {
      // Mark session as completed
      completedAt = new Date();
      newCurrentStep = customerSession.popup.totalSteps;
    }

    // Update customer session
    const updatedSession = await prisma.customerSession.update({
      where: { id: customerSession.id },
      data: {
        currentStep: newCurrentStep,
        responses: JSON.stringify(updatedResponses),
        completedAt,
        updatedAt: new Date()
      }
    });

    console.log(`[Session Progress] Updated session ${sessionToken}: step ${newCurrentStep}/${customerSession.popup.totalSteps}, action: ${stepAction}`);

    // Determine next step info
    const nextStep = customerSession.popup.steps.find(step => step.stepNumber === newCurrentStep);
    const nextStepContent = nextStep ? (
      typeof nextStep.content === 'string' 
        ? JSON.parse(nextStep.content) 
        : nextStep.content
    ) : null;

    return new Response(
      JSON.stringify({
        success: true,
        sessionToken: updatedSession.sessionToken,
        currentStep: newCurrentStep,
        totalSteps: customerSession.popup.totalSteps,
        responses: updatedResponses,
        isCompleted: !!completedAt,
        nextStep: nextStep ? {
          stepNumber: nextStep.stepNumber,
          stepType: nextStep.stepType,
          content: nextStepContent
        } : null
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error("[Session Progress] Error:", error);
    console.error("[Session Progress] Error stack:", error.stack);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Internal server error",
        debug: error.message // Temporary debug info
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}