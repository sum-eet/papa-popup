import { Card, Text, Button } from "@shopify/polaris";
import type { Popup } from "../../types/popup";

interface PopupPreviewProps {
  popup: Partial<Popup>;
  mode?: 'desktop' | 'mobile';
  interactive?: boolean;
}

export function PopupPreview({ popup, mode = 'desktop', interactive = false }: PopupPreviewProps) {
  const isDesktop = mode === 'desktop';
  
  const containerStyle = {
    width: isDesktop ? '400px' : '280px',
    maxWidth: '100%',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    border: '1px solid #e1e5e9',
    textAlign: 'center' as const
  };

  if (!popup.steps || popup.steps.length === 0) {
    return (
      <div style={containerStyle}>
        <Text variant="bodyMd" as="p" tone="subdued">
          No content to preview yet
        </Text>
      </div>
    );
  }

  // Show first step for preview
  const firstStep = popup.steps[0];
  const content = firstStep.content || {};

  return (
    <div style={containerStyle}>
      {firstStep.stepType === 'QUESTION' && (
        <>
          <Text variant="headingMd" as="h3" alignment="center">
            {(content as any).question || 'Your question here'}
          </Text>
          <div style={{ marginTop: '20px' }}>
            {((content as any).options || []).map((option: any, index: number) => (
              <div
                key={option.id || index}
                style={{
                  padding: '12px 16px',
                  margin: '8px 0',
                  backgroundColor: '#f6f6f7',
                  borderRadius: '8px',
                  cursor: interactive ? 'pointer' : 'default',
                  border: '1px solid #e1e5e9'
                }}
              >
                <Text variant="bodyMd" as="p">
                  {option.text || `Option ${index + 1}`}
                </Text>
              </div>
            ))}
          </div>
        </>
      )}

      {firstStep.stepType === 'EMAIL' && (
        <>
          <Text variant="headingMd" as="h3" alignment="center">
            {(content as any).headline || 'Get 10% Off!'}
          </Text>
          {(content as any).description && (
            <div style={{ marginTop: '12px' }}>
              <Text variant="bodyMd" as="p" tone="subdued">
                {(content as any).description}
              </Text>
            </div>
          )}
          <div style={{ marginTop: '20px' }}>
            <div style={{
              padding: '12px',
              backgroundColor: '#f6f6f7',
              borderRadius: '6px',
              border: '1px solid #e1e5e9',
              marginBottom: '12px'
            }}>
              <Text variant="bodyMd" as="p" tone="subdued">
                {(content as any).placeholder || 'Enter your email'}
              </Text>
            </div>
            <Button fullWidth variant="primary">
              {(content as any).buttonText || 'Subscribe'}
            </Button>
          </div>
        </>
      )}

      {firstStep.stepType === 'DISCOUNT_REVEAL' && (
        <>
          <Text variant="headingMd" as="h3" alignment="center">
            {(content as any).headline || "Here's your discount!"}
          </Text>
          <div style={{ 
            marginTop: '20px',
            padding: '20px',
            backgroundColor: '#f0f9ff',
            borderRadius: '8px',
            border: '2px dashed #0070f3'
          }}>
            <Text variant="headingLg" as="p" fontWeight="bold">
              {(content as any).codeDisplay || 'SAVE10'}
            </Text>
          </div>
          {(content as any).validityText && (
            <div style={{ marginTop: '12px' }}>
              <Text variant="bodySm" as="p" tone="subdued">
                {(content as any).validityText}
              </Text>
            </div>
          )}
        </>
      )}

      {firstStep.stepType === 'CONTENT' && (
        <>
          <Text variant="headingMd" as="h3" alignment="center">
            {(content as any).headline || 'Welcome!'}
          </Text>
          {(content as any).description && (
            <div style={{ marginTop: '12px' }}>
              <Text variant="bodyMd" as="p">
                {(content as any).description}
              </Text>
            </div>
          )}
        </>
      )}

      {/* Step indicator for multi-step popups */}
      {popup.totalSteps && popup.totalSteps > 1 && (
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e1e5e9' }}>
          <Text variant="bodySm" as="p" tone="subdued">
            Step 1 of {popup.totalSteps}
          </Text>
        </div>
      )}
    </div>
  );
}