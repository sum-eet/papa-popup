import { type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Form, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  TextField,
  FormLayout,
  Badge,
  DataTable,
  EmptyState
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  
  // Get shop and popup config
  const shop = await prisma.shop.findUnique({
    where: { domain: session.shop },
    include: {
      popupConfig: true,
      emails: {
        take: 10,
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  return { shop };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const shop = await prisma.shop.findUnique({
    where: { domain: session.shop }
  });

  if (!shop) throw new Error("Shop not found");

  // Create or update popup config
  await prisma.popupConfig.upsert({
    where: { shopId: shop.id },
    create: {
      shopId: shop.id,
      enabled: true,
      headline: formData.get("headline") as string,
      description: formData.get("description") as string,
      buttonText: formData.get("buttonText") as string,
    },
    update: {
      enabled: true,
      headline: formData.get("headline") as string,
      description: formData.get("description") as string,
      buttonText: formData.get("buttonText") as string,
    }
  });

  return { success: true };
}

export default function Index() {
  const { shop } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const emailRows = shop?.emails.map(email => [
    email.email,
    new Date(email.createdAt).toLocaleDateString()
  ]) || [];

  return (
    <Page title="Email Popup Dashboard">
      <Layout>
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2>Popup Configuration</h2>
                {shop?.popupConfig?.enabled && (
                  <Badge tone="success">Active</Badge>
                )}
              </div>
            </div>
            
            <div style={{ padding: '20px' }}>
              <Form method="post">
                <FormLayout>
                  <TextField
                    label="Popup Headline"
                    name="headline"
                    value={shop?.popupConfig?.headline || "Get 10% Off!"}
                    autoComplete="off"
                    helpText="This is the main headline visitors will see"
                    onChange={() => {}}
                  />
                  
                  <TextField
                    label="Description"
                    name="description"
                    value={shop?.popupConfig?.description || "Subscribe to our newsletter for exclusive deals"}
                    autoComplete="off"
                    multiline
                    onChange={() => {}}
                  />
                  
                  <TextField
                    label="Button Text"
                    name="buttonText"
                    value={shop?.popupConfig?.buttonText || "Subscribe"}
                    autoComplete="off"
                    onChange={() => {}}
                  />
                  
                  <Button submit variant="primary" loading={isSubmitting}>
                    {shop?.popupConfig ? "Update Popup" : "Enable Popup"}
                  </Button>
                </FormLayout>
              </Form>
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <h2>Recent Email Submissions</h2>
            </div>
            <div style={{ padding: '20px' }}>
              {emailRows.length > 0 ? (
                <DataTable
                  columnContentTypes={['text', 'text']}
                  headings={['Email', 'Date']}
                  rows={emailRows}
                />
              ) : (
                <EmptyState
                  heading="No emails collected yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Emails will appear here once visitors start subscribing</p>
                </EmptyState>
              )}
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}