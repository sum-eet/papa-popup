import { type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { isMultiPopupEnabled } from "../utils/features";

export async function action({ request }: ActionFunctionArgs) {
  console.log("🚀 Papa Popup Status API: Action started");
  
  // Check feature flag
  if (!isMultiPopupEnabled()) {
    console.log("❌ Multi-popup system not enabled");
    return Response.json({ success: false, error: "Multi-popup system not enabled" }, { status: 400 });
  }

  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const popupId = formData.get("popupId") as string;
  const newStatus = formData.get("status") as string;
  
  console.log("📝 Status change request:", {
    popupId,
    newStatus,
    shop: session.shop
  });

  if (!popupId || !newStatus) {
    console.log("❌ Missing popupId or status");
    return Response.json({ success: false, error: "Missing popupId or status" }, { status: 400 });
  }

  if (!["ACTIVE", "DRAFT", "PAUSED"].includes(newStatus)) {
    console.log("❌ Invalid status:", newStatus);
    return Response.json({ success: false, error: "Invalid status" }, { status: 400 });
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
      console.log("❌ Popup not found:", popupId);
      return Response.json({ success: false, error: "Popup not found" }, { status: 404 });
    }

    console.log("🔍 Current popup state:", {
      id: popup.id,
      name: popup.name,
      currentStatus: popup.status,
      currentScriptTagId: popup.scriptTagId
    });

    let scriptTagId: string | null = popup.scriptTagId;

    // Handle script tag management based on status change
    if (newStatus === "ACTIVE") {
      // First, deactivate any other active popups (only one can be active at a time)
      const existingActivePopups = await prisma.popup.findMany({
        where: {
          shopId: popup.shopId,
          status: 'ACTIVE',
          isDeleted: false,
          id: { not: popupId } // Exclude current popup
        }
      });
      
      // Delete script tags for existing active popups
      for (const activePopup of existingActivePopups) {
        if (activePopup.scriptTagId) {
          try {
            console.log(`🗑️ Deleting script tag ${activePopup.scriptTagId} for popup ${activePopup.name}`);
            await admin.graphql(`
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
                id: `gid://shopify/ScriptTag/${activePopup.scriptTagId}`
              }
            });
          } catch (error) {
            console.warn(`⚠️ Failed to delete script tag ${activePopup.scriptTagId}:`, error);
          }
        }
      }
      
      // Deactivate existing active popups
      if (existingActivePopups.length > 0) {
        await prisma.popup.updateMany({
          where: {
            shopId: popup.shopId,
            status: 'ACTIVE',
            isDeleted: false,
            id: { not: popupId }
          },
          data: {
            status: 'PAUSED',
            scriptTagId: null
          }
        });
        console.log(`✅ Deactivated ${existingActivePopups.length} existing active popup(s)`);
      }
      
      // Activating popup - need to create script tag if it doesn't exist
      if (!popup.scriptTagId) {
        console.log("🏗️ Creating script tag for activation...");
        
        const scriptTagUrl = `${process.env.SHOPIFY_APP_URL}/popup-loader-enhanced.js`;
        console.log("📜 Script tag URL:", scriptTagUrl);
        
        const scriptTagResponse = await admin.graphql(`
          #graphql
          mutation scriptTagCreate($input: ScriptTagInput!) {
            scriptTagCreate(input: $input) {
              scriptTag {
                id
                src
              }
              userErrors {
                field
                message
              }
            }
          }
        `, {
          variables: {
            input: {
              src: scriptTagUrl,
              displayScope: "ONLINE_STORE"
            }
          }
        });

        const scriptTagResult = await scriptTagResponse.json();
        console.log("📋 Script tag creation response:", JSON.stringify(scriptTagResult, null, 2));
        
        if (scriptTagResult.data?.scriptTagCreate?.scriptTag?.id) {
          scriptTagId = scriptTagResult.data.scriptTagCreate.scriptTag.id.replace('gid://shopify/ScriptTag/', '');
          console.log("✅ Script tag created successfully! ID:", scriptTagId);
        } else if (scriptTagResult.data?.scriptTagCreate?.userErrors?.length > 0) {
          const error = scriptTagResult.data.scriptTagCreate.userErrors[0];
          console.log("❌ Script tag creation failed:", error);
          return Response.json({ 
            success: false, 
            error: `Script tag creation failed: ${error.message}` 
          }, { status: 400 });
        } else {
          console.log("⚠️ Unexpected script tag response:", scriptTagResult);
          return Response.json({ 
            success: false, 
            error: "Script tag creation failed: Unexpected response" 
          }, { status: 500 });
        }
      } else {
        console.log("ℹ️ Script tag already exists, reusing:", popup.scriptTagId);
      }
    } else if (popup.status === "ACTIVE" && newStatus !== "ACTIVE") {
      // Deactivating popup - delete script tag if it exists
      if (popup.scriptTagId) {
        console.log("🗑️ Deleting script tag for deactivation:", popup.scriptTagId);
        
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
            scriptTagId = null; // Clear the script tag ID
          } else {
            console.warn("⚠️ Could not delete script tag, continuing anyway");
          }
        } catch (error) {
          console.warn("⚠️ Error deleting script tag:", error);
        }
      }
    }

    // Update popup status and script tag ID in database
    console.log("💾 Updating popup in database:", {
      popupId,
      newStatus,
      scriptTagId
    });

    const updatedPopup = await prisma.popup.update({
      where: { id: popupId },
      data: {
        status: newStatus as any,
        scriptTagId: scriptTagId,
        updatedAt: new Date()
      }
    });

    console.log("✅ Popup updated successfully:", {
      id: updatedPopup.id,
      name: updatedPopup.name,
      status: updatedPopup.status,
      scriptTagId: updatedPopup.scriptTagId
    });

    // Return success response with script tag info
    const response = {
      success: true,
      popup: {
        id: updatedPopup.id,
        name: updatedPopup.name,
        status: updatedPopup.status,
        scriptTagId: updatedPopup.scriptTagId
      },
      message: newStatus === "ACTIVE" 
        ? `Popup activated${scriptTagId ? ` with script tag ID: ${scriptTagId}` : ''}`
        : `Popup ${newStatus.toLowerCase()}`
    };

    console.log("🎉 Status API completed successfully:", response);
    return Response.json(response);

  } catch (error) {
    console.error("❌ Papa Popup Status API Error:", error);
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update popup status" 
    }, { status: 500 });
  }
}