import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { admin, session } = await authenticate.admin(request);
    const { collectedEmailId, forceSync = false } = await request.json();

    if (!collectedEmailId) {
      return json(
        { success: false, error: "collectedEmailId is required" },
        { status: 400 }
      );
    }

    // Get the collected email record
    const collectedEmail = await prisma.collectedEmail.findUnique({
      where: { id: collectedEmailId },
      include: {
        shop: true,
        customerSession: {
          include: {
            popup: true
          }
        },
        shopifyCustomerSync: true
      }
    });

    if (!collectedEmail) {
      return json(
        { success: false, error: "Collected email not found" },
        { status: 404 }
      );
    }

    // Verify shop ownership
    if (collectedEmail.shop.domain !== session.shop) {
      return json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Check if already synced and not forcing resync
    if (collectedEmail.shopifyCustomerSync && 
        collectedEmail.shopifyCustomerSync.syncStatus === 'synced' && 
        !forceSync) {
      return json({
        success: true,
        message: "Already synced",
        shopifyCustomerId: collectedEmail.shopifyCustomerSync.shopifyCustomerId,
        status: 'already_synced'
      });
    }

    // Check if customer already exists in Shopify
    const existingCustomerResponse = await admin.graphql(`
      #graphql
      query getCustomerByEmail($email: String!) {
        customers(first: 1, query: $email) {
          edges {
            node {
              id
              email
              tags
            }
          }
        }
      }
    `, {
      variables: {
        email: `email:${collectedEmail.email}`
      }
    });

    const existingCustomerResult = await existingCustomerResponse.json();
    let shopifyCustomerId: string | null = null;
    let isNewCustomer = true;
    let tags: string[] = [];

    if (existingCustomerResult.data?.customers?.edges?.length > 0) {
      // Customer exists, update their tags
      const existingCustomer = existingCustomerResult.data.customers.edges[0].node;
      shopifyCustomerId = existingCustomer.id.replace('gid://shopify/Customer/', '');
      isNewCustomer = false;
      tags = existingCustomer.tags || [];

      // Add papa-popup tags
      const popupTags = [
        'papa-popup',
        collectedEmail.customerSession?.popup?.name ? 
          `popup-${collectedEmail.customerSession.popup.name.toLowerCase().replace(/\s+/g, '-')}` : 
          'popup-legacy'
      ];

      const newTags = [...new Set([...tags, ...popupTags])];

      // Update customer tags
      const updateResponse = await admin.graphql(`
        #graphql
        mutation customerUpdate($input: CustomerInput!) {
          customerUpdate(input: $input) {
            customer {
              id
              tags
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
            id: existingCustomer.id,
            tags: newTags
          }
        }
      });

      const updateResult = await updateResponse.json();
      if (updateResult.data?.customerUpdate?.userErrors?.length > 0) {
        throw new Error(updateResult.data.customerUpdate.userErrors[0].message);
      }

      tags = newTags;
    } else {
      // Create new customer
      const popupTags = [
        'papa-popup',
        collectedEmail.customerSession?.popup?.name ? 
          `popup-${collectedEmail.customerSession.popup.name.toLowerCase().replace(/\s+/g, '-')}` : 
          'popup-legacy'
      ];

      const createResponse = await admin.graphql(`
        #graphql
        mutation customerCreate($input: CustomerInput!) {
          customerCreate(input: $input) {
            customer {
              id
              email
              tags
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
            email: collectedEmail.email,
            tags: popupTags,
            acceptsMarketing: true,
            note: `Created via Papa Popup - ${collectedEmail.customerSession?.popup?.name || 'Legacy Popup'}`
          }
        }
      });

      const createResult = await createResponse.json();
      if (createResult.data?.customerCreate?.userErrors?.length > 0) {
        throw new Error(createResult.data.customerCreate.userErrors[0].message);
      }

      if (createResult.data?.customerCreate?.customer) {
        shopifyCustomerId = createResult.data.customerCreate.customer.id.replace('gid://shopify/Customer/', '');
        tags = createResult.data.customerCreate.customer.tags || [];
      } else {
        throw new Error("Failed to create customer");
      }
    }

    // Update or create sync record
    const syncRecord = await prisma.shopifyCustomerSync.upsert({
      where: { collectedEmailId: collectedEmail.id },
      create: {
        collectedEmailId: collectedEmail.id,
        shopId: collectedEmail.shopId,
        shopifyCustomerId,
        syncStatus: 'synced',
        syncAttempts: 1,
        lastSyncAttempt: new Date(),
        appliedTags: tags
      },
      update: {
        shopifyCustomerId,
        syncStatus: 'synced',
        syncAttempts: { increment: 1 },
        lastSyncAttempt: new Date(),
        syncError: null,
        appliedTags: tags
      }
    });

    return json({
      success: true,
      message: isNewCustomer ? "Customer created successfully" : "Customer updated successfully",
      shopifyCustomerId,
      status: isNewCustomer ? 'created' : 'updated',
      appliedTags: tags,
      syncRecord: {
        id: syncRecord.id,
        syncAttempts: syncRecord.syncAttempts
      }
    });

  } catch (error) {
    console.error("Customer sync error:", error);

    // Log failed attempt if we have a collectedEmailId
    const { collectedEmailId } = await request.json().catch(() => ({}));
    if (collectedEmailId) {
      try {
        await prisma.shopifyCustomerSync.upsert({
          where: { collectedEmailId },
          create: {
            collectedEmailId,
            shopId: (await prisma.collectedEmail.findUnique({
              where: { id: collectedEmailId },
              select: { shopId: true }
            }))?.shopId || '',
            syncStatus: 'failed',
            syncAttempts: 1,
            lastSyncAttempt: new Date(),
            syncError: error instanceof Error ? error.message : 'Unknown error'
          },
          update: {
            syncStatus: 'failed',
            syncAttempts: { increment: 1 },
            lastSyncAttempt: new Date(),
            syncError: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      } catch (dbError) {
        console.error("Failed to log sync error:", dbError);
      }
    }

    return json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to sync customer" 
      },
      { status: 500 }
    );
  }
}

// Bulk sync endpoint
export async function loader({ request }: ActionFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const status = url.searchParams.get('status') || 'pending';

    // Get shop
    const shop = await prisma.shop.findUnique({
      where: { domain: session.shop }
    });

    if (!shop) {
      return json({ success: false, error: "Shop not found" }, { status: 404 });
    }

    // Get emails that need syncing
    const emails = await prisma.collectedEmail.findMany({
      where: {
        shopId: shop.id,
        shopifyCustomerSync: status === 'pending' ? null : {
          syncStatus: status
        }
      },
      include: {
        shopifyCustomerSync: true,
        customerSession: {
          include: {
            popup: true
          }
        }
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    return json({
      success: true,
      emails: emails.map(email => ({
        id: email.id,
        email: email.email,
        popupName: email.customerSession?.popup?.name || 'Legacy Popup',
        createdAt: email.createdAt,
        syncStatus: email.shopifyCustomerSync?.syncStatus || 'pending',
        shopifyCustomerId: email.shopifyCustomerSync?.shopifyCustomerId,
        syncAttempts: email.shopifyCustomerSync?.syncAttempts || 0,
        lastSyncAttempt: email.shopifyCustomerSync?.lastSyncAttempt,
        syncError: email.shopifyCustomerSync?.syncError
      })),
      total: emails.length
    });

  } catch (error) {
    console.error("Bulk sync query error:", error);
    return json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to query sync status" 
      },
      { status: 500 }
    );
  }
}