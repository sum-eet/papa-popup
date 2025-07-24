import { type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Form, useNavigation, useActionData, redirect } from "@remix-run/react";
import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Button,
  Banner,
  Text,
  Divider,
  ButtonGroup
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { isMultiPopupEnabled } from "../utils/features";
import { PopupType, StepType, DiscountType } from "../types/popup";

export async function loader({ request }: LoaderFunctionArgs) {
  // Check feature flag
  if (!isMultiPopupEnabled()) {
    return redirect("/app");
  }

  await authenticate.admin(request);
  return {};
}

export async function action({ request }: ActionFunctionArgs) {
  if (!isMultiPopupEnabled()) {
    return redirect("/app");
  }

  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  try {
    // Get shop
    const shop = await prisma.shop.findUnique({
      where: { domain: session.shop }
    });

    if (!shop) {
      throw new Error("Shop not found");
    }

    // Extract form data
    const name = formData.get("name") as string;
    const popupType = formData.get("popupType") as PopupType;
    const targetPages = formData.getAll("targetPages") as string[];
    const totalSteps = parseInt(formData.get("totalSteps") as string) || 1;

    // Create popup
    const popup = await prisma.popup.create({
      data: {
        shopId: shop.id,
        name,
        status: 'DRAFT',
        priority: 1,
        targetingRules: JSON.stringify({ pages: targetPages.length > 0 ? targetPages : ['all'] }),
        popupType,
        totalSteps,
        discountType: 'FIXED',
        discountConfig: JSON.stringify({}),
        emailRequired: true,
        emailStep: totalSteps // Email is the last step
      }
    });

    // Create steps based on popup type
    if (popupType === 'SIMPLE_EMAIL') {
      // Single email step
      await prisma.popupStep.create({
        data: {
          popupId: popup.id,
          stepNumber: 1,
          stepType: 'EMAIL',
          content: JSON.stringify({
            headline: formData.get("headline") || "",
            description: formData.get("description") || "",
            placeholder: "Enter your email",
            buttonText: formData.get("buttonText") || ""
          })
        }
      });
    } else if (popupType === 'QUIZ_EMAIL' || popupType === 'QUIZ_DISCOUNT') {
      // Create quiz steps + email/discount step
      for (let i = 1; i < totalSteps; i++) {
        const question = formData.get(`step_${i}_question`) as string;
        const option1 = formData.get(`step_${i}_option_1`) as string;
        const option2 = formData.get(`step_${i}_option_2`) as string;
        const option3 = formData.get(`step_${i}_option_3`) as string;

        const options = [
          { id: "1", text: option1 || "Option 1", value: "option1" },
          { id: "2", text: option2 || "Option 2", value: "option2" }
        ];

        if (option3) {
          options.push({ id: "3", text: option3, value: "option3" });
        }

        await prisma.popupStep.create({
          data: {
            popupId: popup.id,
            stepNumber: i,
            stepType: 'QUESTION',
            content: JSON.stringify({
              question: question || "",
              options
            })
          }
        });
      }

      // Final step (email or discount)
      if (popupType === 'QUIZ_EMAIL') {
        await prisma.popupStep.create({
          data: {
            popupId: popup.id,
            stepNumber: totalSteps,
            stepType: 'EMAIL',
            content: JSON.stringify({
              headline: formData.get("headline") || "",
              description: formData.get("description") || "",
              placeholder: "Enter your email",
              buttonText: formData.get("buttonText") || ""
            })
          }
        });
      } else {
        await prisma.popupStep.create({
          data: {
            popupId: popup.id,
            stepNumber: totalSteps,
            stepType: 'DISCOUNT_REVEAL',
            content: JSON.stringify({
              headline: formData.get("headline") || "",
              description: formData.get("description") || "",
              codeDisplay: formData.get("discountCode") || "",
              validityText: formData.get("validityText") || ""
            })
          }
        });
      }
    }

    return redirect(`/app/popups`);

  } catch (error) {
    console.error("Popup creation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create popup"
    };
  }
}

const POPUP_TYPE_OPTIONS = [
  { label: 'Simple Email Capture', value: 'SIMPLE_EMAIL' },
  { label: 'Quiz then Email', value: 'QUIZ_EMAIL' },
  { label: 'Quiz then Discount', value: 'QUIZ_DISCOUNT' },
  { label: 'Direct Discount', value: 'DIRECT_DISCOUNT' }
];

const PAGE_OPTIONS = [
  { id: 'home', label: 'Home page' },
  { id: 'product', label: 'Product pages' },
  { id: 'collection', label: 'Collection pages' },
  { id: 'cart', label: 'Cart page' },
  { id: 'blog', label: 'Blog pages' },
  { id: 'search', label: 'Search page' }
];

export default function NewPopup() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [popupType, setPopupType] = useState<PopupType>('SIMPLE_EMAIL');
  const [totalSteps, setTotalSteps] = useState(1);
  const [targetPages, setTargetPages] = useState<string[]>(['home']);

  const isQuizType = popupType === 'QUIZ_EMAIL' || popupType === 'QUIZ_DISCOUNT';

  return (
    <Page
      title="Create New Popup"
      backAction={{
        content: 'Back to popups',
        url: '/app/popups'
      }}
    >
      <Layout>
        <Layout.Section>
          {actionData && !actionData.success && (
            <Banner status="critical">
              <p>Error: {actionData.error}</p>
            </Banner>
          )}

          <Form method="post">
            <Card>
              <div style={{ padding: '20px' }}>
                <Text variant="headingMd" as="h2">Basic Information</Text>
                <div style={{ marginTop: '16px' }}>
                  <FormLayout>
                    <TextField
                      label="Popup Name"
                      name="name"
                      placeholder="Summer Sale Popup"
                      helpText="Internal name to identify this popup"
                      autoComplete="off"
                      requiredIndicator
                    />

                    <Select
                      label="Popup Type"
                      name="popupType"
                      options={POPUP_TYPE_OPTIONS}
                      value={popupType}
                      onChange={(value) => setPopupType(value as PopupType)}
                      helpText="Choose the type of popup experience"
                    />

                    <div>
                      <Text variant="bodyMd" as="p">Target Pages</Text>
                      <div style={{ marginTop: '8px' }}>
                        {PAGE_OPTIONS.map((page) => (
                          <Checkbox
                            key={page.id}
                            label={page.label}
                            name="targetPages"
                            value={page.id}
                            checked={targetPages.includes(page.id)}
                            onChange={(checked) => {
                              if (checked) {
                                setTargetPages([...targetPages, page.id]);
                              } else {
                                setTargetPages(targetPages.filter(p => p !== page.id));
                              }
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </FormLayout>
                </div>
              </div>
            </Card>

            {/* Content Configuration */}
            <Card>
              <div style={{ padding: '20px' }}>
                <Text variant="headingMd" as="h2">Content</Text>
                <div style={{ marginTop: '16px' }}>
                  <FormLayout>
                    {popupType === 'SIMPLE_EMAIL' && (
                      <>
                        <TextField
                          label="Headline"
                          name="headline"
                          placeholder="Get 10% Off!"
                          autoComplete="off"
                        />
                        <TextField
                          label="Description"
                          name="description"
                          placeholder="Subscribe to our newsletter for exclusive deals"
                          multiline
                          autoComplete="off"
                        />
                        <TextField
                          label="Button Text"
                          name="buttonText"
                          placeholder="Subscribe"
                          autoComplete="off"
                        />
                      </>
                    )}

                    {isQuizType && (
                      <>
                        <Select
                          label="Number of Quiz Steps"
                          name="totalSteps"
                          options={[
                            { label: '1 Question + Email', value: '2' },
                            { label: '2 Questions + Email', value: '3' },
                            { label: '3 Questions + Email', value: '4' }
                          ]}
                          value={totalSteps.toString()}
                          onChange={(value) => setTotalSteps(parseInt(value))}
                        />

                        {/* Quiz Steps */}
                        {Array.from({ length: totalSteps - 1 }, (_, i) => (
                          <Card key={i} subdued>
                            <div style={{ padding: '16px' }}>
                              <Text variant="bodyMd" as="p" fontWeight="semibold">
                                Question {i + 1}
                              </Text>
                              <div style={{ marginTop: '12px' }}>
                                <FormLayout>
                                  <TextField
                                    label="Question"
                                    name={`step_${i + 1}_question`}
                                    placeholder={`What's your preference?`}
                                    autoComplete="off"
                                  />
                                  <TextField
                                    label="Option 1"
                                    name={`step_${i + 1}_option_1`}
                                    placeholder="First option"
                                    autoComplete="off"
                                  />
                                  <TextField
                                    label="Option 2"
                                    name={`step_${i + 1}_option_2`}
                                    placeholder="Second option"
                                    autoComplete="off"
                                  />
                                  <TextField
                                    label="Option 3 (optional)"
                                    name={`step_${i + 1}_option_3`}
                                    placeholder="Third option"
                                    autoComplete="off"
                                  />
                                </FormLayout>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </>
                    )}

                    {popupType === 'QUIZ_DISCOUNT' && (
                      <>
                        <Divider />
                        <TextField
                          label="Discount Code"
                          name="discountCode"
                          placeholder="SAVE10"
                          helpText="The discount code to reveal after the quiz"
                          autoComplete="off"
                        />
                      </>
                    )}
                  </FormLayout>
                </div>
              </div>
            </Card>

            {/* Submit */}
            <Card>
              <div style={{ padding: '20px' }}>
                <ButtonGroup>
                  <Button
                    variant="primary"
                    submit
                    loading={isSubmitting}
                  >
                    Create Popup
                  </Button>
                  <Button url="/app/popups">Cancel</Button>
                </ButtonGroup>
              </div>
            </Card>
          </Form>
        </Layout.Section>

        {/* Simple Preview */}
        <Layout.Section variant="oneThird">
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Preview</Text>
              <div style={{ 
                marginTop: '16px',
                padding: '20px',
                border: '2px dashed #e1e5e9',
                borderRadius: '8px',
                textAlign: 'center',
                backgroundColor: '#fafbfb'
              }}>
                <Text variant="bodyMd" as="p" tone="subdued">
                  {popupType === 'SIMPLE_EMAIL' && "Simple email capture popup"}
                  {popupType === 'QUIZ_EMAIL' && `${totalSteps - 1} question quiz + email`}
                  {popupType === 'QUIZ_DISCOUNT' && `${totalSteps - 1} question quiz + discount`}
                  {popupType === 'DIRECT_DISCOUNT' && "Direct discount reveal"}
                </Text>
                <div style={{ marginTop: '12px' }}>
                  <Text variant="bodySm" as="p" tone="subdued">
                    Targeting: {targetPages.length === 0 ? 'All pages' : targetPages.join(', ')}
                  </Text>
                </div>
              </div>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}