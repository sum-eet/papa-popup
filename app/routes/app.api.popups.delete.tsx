import { type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { isMultiPopupEnabled } from "../utils/features";

export async function action({ request }: ActionFunctionArgs) {
  console.log("🚀 Papa Popup Delete API: Action started");
  
  // Check feature flag
  if (!isMultiPopupEnabled()) {
    console.log("❌ Multi-popup system not enabled");
    return Response.json({ success: false, error: "Multi-popup system not enabled" }, { status: 400 });
  }

  // Only allow DELETE method
  if (request.method !== "DELETE") {
    console.log("❌ Invalid method:", request.method);
    return Response.json({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const popupId = formData.get("popupId") as string;
  
  console.log("📝 Delete request:", {
    popupId,
    shop: session.shop
  });

  if (!popupId) {
    console.log("❌ Missing popupId");
    return Response.json({ success: false, error: "Missing popupId" }, { status: 400 });
  }

  try {
    // Get the popup and verify ownership
    const popup = await prisma.popup.findFirst({
      where: {
        id: popupId,
        shop: { domain: session.shop },
        isDeleted: false
      }
    });

    if (!popup) {
      console.log("❌ Popup not found or already deleted:", popupId);
      return Response.json({ success: false, error: "Popup not found" }, { status: 404 });
    }

    console.log("🔍 Popup to delete:", {
      id: popup.id,
      name: popup.name,
      status: popup.status,
      scriptTagId: popup.scriptTagId
    });

    // Delete script tag if it exists and popup is active
    if (popup.scriptTagId && popup.status === "ACTIVE") {
      console.log("🗑️ Deleting associated script tag:", popup.scriptTagId);
      
      try {
        const deleteResponse = await admin.graphql(`
          #graphql
          mutation scriptTagDelete($id: ID!) {
            scriptTagDelete(id: $id) {
              deletedScriptTagId
              userErrors {
                field
                message
              }
            }
          }
        `, {
          variables: {
            id: `gid://shopify/ScriptTag/${popup.scriptTagId}`
          }
        });

        const deleteResult = await deleteResponse.json();
        console.log("🗑️ Script tag deletion response:", JSON.stringify(deleteResult, null, 2));
        
        if (deleteResult.data?.scriptTagDelete?.deletedScriptTagId) {
          console.log("✅ Script tag deleted successfully");
        } else {
          console.warn("⚠️ Could not delete script tag, continuing with popup deletion");
        }
      } catch (error) {
        console.warn("⚠️ Error deleting script tag:", error);
        // Continue with popup deletion even if script tag deletion fails
      }
    }

    // Soft delete the popup (mark as deleted instead of actually deleting)
    console.log("💾 Soft deleting popup in database...");

    const deletedPopup = await prisma.popup.update({
      where: { id: popupId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: 'DELETED',
        scriptTagId: null, // Clear script tag reference
        updatedAt: new Date()
      }
    });

    console.log("✅ Popup soft deleted successfully:", {
      id: deletedPopup.id,
      name: deletedPopup.name,
      isDeleted: deletedPopup.isDeleted,
      deletedAt: deletedPopup.deletedAt
    });

    // Return success response
    const response = {
      success: true,
      message: `Popup "${popup.name}" deleted successfully`,
      deletedPopup: {
        id: deletedPopup.id,
        name: deletedPopup.name,
        deletedAt: deletedPopup.deletedAt
      }
    };

    console.log("🎉 Delete API completed successfully:", response);
    return Response.json(response);

  } catch (error) {
    console.error("❌ Papa Popup Delete API Error:", error);
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to delete popup" 
    }, { status: 500 });
  }
}