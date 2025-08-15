import { type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useState } from "react";
import { 
  Page, 
  Layout, 
  Card, 
  Text,
  Grid,
  Button,
  Badge
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { isMultiPopupEnabled } from "../utils/features";
import { redirect } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  // Check feature flag
  if (!isMultiPopupEnabled()) {
    return redirect("/app");
  }

  await authenticate.admin(request);
  
  // Template data - these could later come from a database or external API
  const templates = [
    {
      id: 'skincare-quiz',
      name: 'Skincare Quiz',
      description: 'Multi-step quiz to collect customer preferences and email',
      type: 'QUIZ_EMAIL',
      steps: 3,
      category: 'Beauty & Health',
      preview: {
        headline: 'Find Your Perfect Skincare Routine',
        questions: ['What\'s your skin type?', 'What\'s your main concern?'],
        finalStep: 'Get personalized recommendations'
      },
      popular: true
    },
    {
      id: 'newsletter-signup',
      name: 'Newsletter Signup',
      description: 'Simple email capture for newsletter subscribers',
      type: 'SIMPLE_EMAIL',
      steps: 1,
      category: 'Email Marketing',
      preview: {
        headline: 'Get 10% Off Your First Order',
        description: 'Subscribe to our newsletter for exclusive deals',
        buttonText: 'Subscribe Now'
      },
      popular: false
    },
    {
      id: 'product-quiz',
      name: 'Product Recommendation Quiz',
      description: 'Help customers find the right product with a quiz',
      type: 'QUIZ_DISCOUNT',
      steps: 4,
      category: 'E-commerce',
      preview: {
        headline: 'Find Your Perfect Product',
        questions: ['What\'s your style?', 'What\'s your budget?', 'When will you use it?'],
        finalStep: 'Get 15% off your recommended products'
      },
      popular: true
    },
    {
      id: 'exit-intent',
      name: 'Exit Intent Discount',
      description: 'Capture leaving visitors with a discount offer',
      type: 'SIMPLE_EMAIL',
      steps: 1,
      category: 'Conversion',
      preview: {
        headline: 'Wait! Don\'t Leave Empty Handed',
        description: 'Get 15% off your first purchase',
        buttonText: 'Claim Discount'
      },
      popular: false
    },
    {
      id: 'size-guide-quiz',
      name: 'Size Guide Quiz',
      description: 'Help customers find their perfect size',
      type: 'QUIZ_EMAIL',
      steps: 3,
      category: 'Fashion',
      preview: {
        headline: 'Find Your Perfect Fit',
        questions: ['What\'s your height?', 'What\'s your preferred fit?'],
        finalStep: 'Get size recommendations via email'
      },
      popular: false
    },
    {
      id: 'birthday-club',
      name: 'Birthday Club Signup',
      description: 'Collect birthdays for special offers',
      type: 'SIMPLE_EMAIL',
      steps: 1,
      category: 'Customer Loyalty',
      preview: {
        headline: 'Join Our Birthday Club',
        description: 'Get a special gift on your birthday',
        buttonText: 'Join Now'
      },
      popular: false
    }
  ];

  return { templates };
}

function TemplateCard({ template }: { template: any }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleUseTemplate = (templateId: string) => {
    setIsLoading(true);
    // Use proper Remix navigation instead of window.location
    navigate(`/app/popups/new?template=${templateId}`);
  };

  return (
    <Card>
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Text variant="headingMd" as="h3">{template.name}</Text>
              {template.popular && (
                <Badge tone="success">Popular</Badge>
              )}
            </div>
            <Text variant="bodySm" as="p" tone="subdued">{template.category}</Text>
          </div>
          <Badge tone="subdued">{template.steps} step{template.steps !== 1 ? 's' : ''}</Badge>
        </div>
        
        <Text variant="bodyMd" as="p" style={{ marginBottom: '16px' }}>
          {template.description}
        </Text>

        {/* Preview */}
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#f6f6f7', 
          borderRadius: '8px', 
          marginBottom: '16px',
          border: '1px dashed #c9cccf'
        }}>
          <Text variant="bodySm" as="p" tone="subdued" style={{ marginBottom: '8px' }}>
            Preview:
          </Text>
          <Text variant="bodyMd" as="p" fontWeight="semibold" style={{ marginBottom: '4px' }}>
            {template.preview.headline}
          </Text>
          {template.preview.description && (
            <Text variant="bodySm" as="p" tone="subdued" style={{ marginBottom: '8px' }}>
              {template.preview.description}
            </Text>
          )}
          {template.preview.questions && (
            <div style={{ marginBottom: '8px' }}>
              {template.preview.questions.map((question: string, index: number) => (
                <Text key={index} variant="bodySm" as="p" tone="subdued">
                  Step {index + 1}: {question}
                </Text>
              ))}
            </div>
          )}
          <Text variant="bodySm" as="p" style={{ 
            padding: '6px 12px', 
            backgroundColor: '#008060', 
            color: 'white', 
            borderRadius: '4px',
            display: 'inline-block'
          }}>
            {template.preview.buttonText || template.preview.finalStep}
          </Text>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button 
            variant="primary" 
            onClick={() => handleUseTemplate(template.id)}
            loading={isLoading}
          >
            Use This Template
          </Button>
          <Button variant="secondary" disabled>
            Preview
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function PopupTemplates() {
  const { templates } = useLoaderData<typeof loader>();

  // Group templates by category
  const categories = templates.reduce((acc: any, template: any) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {});

  const popularTemplates = templates.filter((t: any) => t.popular);

  return (
    <Page
      title="Popup Templates"
      subtitle="Choose from pre-built templates to get started quickly"
      backAction={{
        content: 'Back to Popups',
        url: '/app/popups'
      }}
      primaryAction={{
        content: 'Create Custom Popup',
        url: '/app/popups/new',
        variant: 'secondary'
      }}
    >
      <Layout>
        {/* Popular Templates */}
        {popularTemplates.length > 0 && (
          <Layout.Section>
            <Card>
              <div style={{ padding: '20px' }}>
                <Text variant="headingMd" as="h2" style={{ marginBottom: '16px' }}>
                  🔥 Popular Templates
                </Text>
                <Grid>
                  {popularTemplates.map((template: any) => (
                    <Grid.Cell key={template.id} columnSpan={{ xs: 6, sm: 6, md: 6, lg: 4, xl: 4 }}>
                      <TemplateCard template={template} />
                    </Grid.Cell>
                  ))}
                </Grid>
              </div>
            </Card>
          </Layout.Section>
        )}

        {/* All Templates by Category */}
        {Object.entries(categories).map(([category, categoryTemplates]: [string, any]) => (
          <Layout.Section key={category}>
            <Card>
              <div style={{ padding: '20px' }}>
                <Text variant="headingMd" as="h2" style={{ marginBottom: '16px' }}>
                  {category}
                </Text>
                <Grid>
                  {(categoryTemplates as any[]).map((template: any) => (
                    <Grid.Cell key={template.id} columnSpan={{ xs: 6, sm: 6, md: 6, lg: 4, xl: 4 }}>
                      <TemplateCard template={template} />
                    </Grid.Cell>
                  ))}
                </Grid>
              </div>
            </Card>
          </Layout.Section>
        ))}

        {/* Custom Template Option */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ marginBottom: '16px' }}>
                <Text variant="headingLg" as="h2">Need Something Custom?</Text>
                <Text variant="bodyMd" as="p" tone="subdued" style={{ marginTop: '8px' }}>
                  Create a popup from scratch with our flexible builder
                </Text>
              </div>
              <Button variant="primary" size="large" url="/app/popups/new">
                Create Custom Popup
              </Button>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}