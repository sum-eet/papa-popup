import { type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Form, useNavigation, useActionData, redirect } from "@remix-run/react";
import { useState, useEffect } from "react";
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
  
  // Check for template parameter
  const url = new URL(request.url);
  const templateId = url.searchParams.get('template');
  
  return { templateId };
}

export async function action({ request }: ActionFunctionArgs) {
  if (!isMultiPopupEnabled()) {
    return redirect("/app");
  }

  const { session, admin } = await authenticate.admin(request);
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
    const createAsActive = formData.get("createAsActive") === "true";

    console.log("🚀 Creating popup:", { name, popupType, totalSteps, createAsActive });

    let scriptTagId: string | null = null;

    // Create script tag if popup should be created as active
    if (createAsActive) {
      console.log("🏗️ Creating script tag for new active popup...");
      
      // Simple database-only single popup enforcement
      await prisma.popup.updateMany({
        where: {
          shopId: shop.id,
          status: 'ACTIVE',
          isDeleted: false
        },
        data: {
          status: 'PAUSED'
        }
      });
      console.log("✅ Deactivated existing active popups (database only)");
      
      const scriptTagUrl = `${process.env.SHOPIFY_APP_URL}popup-loader-enhanced.js`;
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
        return {
          success: false,
          error: `Script tag creation failed: ${error.message}`
        };
      }
    }

    // Create popup
    const popup = await prisma.popup.create({
      data: {
        shopId: shop.id,
        name,
        status: createAsActive ? 'ACTIVE' : 'DRAFT',
        priority: 1,
        targetingRules: JSON.stringify({ pages: targetPages.length > 0 ? targetPages : ['all'] }),
        popupType,
        totalSteps,
        discountType: 'FIXED',
        discountConfig: JSON.stringify({}),
        emailRequired: true,
        emailStep: totalSteps, // Email is the last step
        scriptTagId: scriptTagId
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

    console.log("✅ Popup created successfully:", {
      id: popup.id,
      name: popup.name,
      status: popup.status,
      scriptTagId: popup.scriptTagId
    });

    // Return success response with script tag info
    return redirect(`/app/popups?created=${popup.id}&scriptTag=${scriptTagId || ''}`);

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
  const { templateId } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Template configurations
  const getTemplateDefaults = (templateId: string | null) => {
    switch (templateId) {
      case 'skincare-quiz':
        return {
          popupType: 'QUIZ_EMAIL' as PopupType,
          name: 'Skincare Quiz',
          headline: 'Find Your Perfect Skincare Routine',
          description: 'Get personalized recommendations',
          totalSteps: 3
        };
      case 'newsletter-signup':
        return {
          popupType: 'SIMPLE_EMAIL' as PopupType,
          name: 'Newsletter Signup',
          headline: 'Get 10% Off Your First Order',
          description: 'Subscribe to our newsletter for exclusive deals',
          totalSteps: 1
        };
      case 'product-quiz':
        return {
          popupType: 'QUIZ_DISCOUNT' as PopupType,
          name: 'Product Recommendation Quiz',
          headline: 'Find Your Perfect Product',
          description: 'Get 15% off your recommended products',
          totalSteps: 4
        };
      default:
        return {
          popupType: 'SIMPLE_EMAIL' as PopupType,
          name: '',
          headline: '',
          description: '',
          totalSteps: 1
        };
    }
  };

  const templateDefaults = getTemplateDefaults(templateId);
  const [popupType, setPopupType] = useState<PopupType>(templateDefaults.popupType);
  const [totalSteps, setTotalSteps] = useState(templateDefaults.totalSteps);
  const [targetPages, setTargetPages] = useState<string[]>(['home']);
  const [createAsActive, setCreateAsActive] = useState(false);
  
  // Form field states
  const [popupName, setPopupName] = useState(templateDefaults.name);
  const [headline, setHeadline] = useState(templateDefaults.headline);
  const [description, setDescription] = useState(templateDefaults.description);
  const [buttonText, setButtonText] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  
  // Quiz step states
  const [quizSteps, setQuizSteps] = useState<{[key: number]: {question: string, option1: string, option2: string, option3: string}}>({});
  
  // Helper function to update quiz step
  const updateQuizStep = (stepIndex: number, field: string, value: string) => {
    setQuizSteps(prev => ({
      ...prev,
      [stepIndex]: {
        ...prev[stepIndex],
        [field]: value
      }
    }));
  };

  const isQuizType = popupType === 'QUIZ_EMAIL' || popupType === 'QUIZ_DISCOUNT';

  // Auto-set totalSteps when quiz type is selected to ensure forms render
  useEffect(() => {
    if (isQuizType && totalSteps < 2) {
      console.log('🎯 Auto-setting totalSteps to 2 for quiz type:', popupType);
      setTotalSteps(2); // Show 1 question + email by default
    }
  }, [popupType, isQuizType, totalSteps]);

  return (
    <Page
      title={templateId ? `Create New Popup (${templateDefaults.name})` : "Create New Popup"}
      subtitle={templateId ? "Using template with pre-filled defaults" : undefined}
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
                      value={popupName}
                      onChange={setPopupName}
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

                    <Checkbox
                      label="Create as Active"
                      checked={createAsActive}
                      onChange={setCreateAsActive}
                      helpText="If checked, the popup will be created as ACTIVE with a script tag and will immediately show to customers"
                    />
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
                          value={headline}
                          onChange={setHeadline}
                          placeholder="Get 10% Off!"
                          autoComplete="off"
                        />
                        <TextField
                          label="Description"
                          name="description"
                          value={description}
                          onChange={setDescription}
                          placeholder="Subscribe to our newsletter for exclusive deals"
                          multiline
                          autoComplete="off"
                        />
                        <TextField
                          label="Button Text"
                          name="buttonText"
                          value={buttonText}
                          onChange={setButtonText}
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
                        {console.log('🔍 Rendering quiz steps:', { totalSteps, isQuizType, arrayLength: totalSteps - 1 })}
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
                                    value={quizSteps[i + 1]?.question || ''}
                                    onChange={(value) => updateQuizStep(i + 1, 'question', value)}
                                    placeholder={`What's your preference?`}
                                    autoComplete="off"
                                  />
                                  <TextField
                                    label="Option 1"
                                    name={`step_${i + 1}_option_1`}
                                    value={quizSteps[i + 1]?.option1 || ''}
                                    onChange={(value) => updateQuizStep(i + 1, 'option1', value)}
                                    placeholder="First option"
                                    autoComplete="off"
                                  />
                                  <TextField
                                    label="Option 2"
                                    name={`step_${i + 1}_option_2`}
                                    value={quizSteps[i + 1]?.option2 || ''}
                                    onChange={(value) => updateQuizStep(i + 1, 'option2', value)}
                                    placeholder="Second option"
                                    autoComplete="off"
                                  />
                                  <TextField
                                    label="Option 3 (optional)"
                                    name={`step_${i + 1}_option_3`}
                                    value={quizSteps[i + 1]?.option3 || ''}
                                    onChange={(value) => updateQuizStep(i + 1, 'option3', value)}
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
                          value={discountCode}
                          onChange={setDiscountCode}
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
                <input type="hidden" name="createAsActive" value={createAsActive.toString()} />
                <ButtonGroup>
                  <Button
                    variant="primary"
                    submit
                    loading={isSubmitting}
                  >
                    {createAsActive ? 'Create Active Popup' : 'Create Popup'}
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