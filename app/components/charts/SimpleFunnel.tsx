import React from 'react';
import { Text } from '@shopify/polaris';

interface FunnelData {
  impressions: number;
  step1Completions: number;
  step2Completions: number;
  step3Completions: number;
  emailCompletions: number;
}

interface SimpleFunnelProps {
  data: FunnelData;
}

const SHOPIFY_COLORS = {
  primary: '#007cba',
  success: '#00AA5B', 
  warning: '#FFA500',
  danger: '#E53E3E',
  subdued: '#6d7175',
  background: '#f6f6f7'
};

export const SimpleFunnel: React.FC<SimpleFunnelProps> = ({ data }) => {
  // Calculate conversion rates
  const step1Rate = data.impressions > 0 ? Math.round((data.step1Completions / data.impressions) * 100) : 0;
  const step2Rate = data.impressions > 0 ? Math.round((data.step2Completions / data.impressions) * 100) : 0;
  const step3Rate = data.impressions > 0 ? Math.round((data.step3Completions / data.impressions) * 100) : 0;
  const emailRate = data.impressions > 0 ? Math.round((data.emailCompletions / data.impressions) * 100) : 0;
  
  const funnelSteps = [
    {
      name: 'Impressions',
      value: data.impressions,
      width: 100,
      color: SHOPIFY_COLORS.subdued,
      rate: 100
    },
    {
      name: 'Step 1',
      value: data.step1Completions,
      width: step1Rate,
      color: step1Rate > 50 ? SHOPIFY_COLORS.success : step1Rate > 25 ? SHOPIFY_COLORS.warning : SHOPIFY_COLORS.danger,
      rate: step1Rate
    },
    {
      name: 'Step 2', 
      value: data.step2Completions,
      width: step2Rate,
      color: step2Rate > 40 ? SHOPIFY_COLORS.success : step2Rate > 20 ? SHOPIFY_COLORS.warning : SHOPIFY_COLORS.danger,
      rate: step2Rate
    },
    {
      name: 'Step 3',
      value: data.step3Completions, 
      width: step3Rate,
      color: step3Rate > 30 ? SHOPIFY_COLORS.success : step3Rate > 15 ? SHOPIFY_COLORS.warning : SHOPIFY_COLORS.danger,
      rate: step3Rate
    },
    {
      name: 'Email Capture',
      value: data.emailCompletions,
      width: emailRate, 
      color: SHOPIFY_COLORS.success,
      rate: emailRate
    }
  ];

  if (data.impressions === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px',
        backgroundColor: SHOPIFY_COLORS.background,
        borderRadius: '8px'
      }}>
        <Text variant="bodyMd" as="p" tone="subdued">
          No funnel data available yet
        </Text>
        <Text variant="bodySm" as="p" tone="subdued" style={{ marginTop: '4px' }}>
          Activate your popups to start collecting analytics
        </Text>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Funnel Steps */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '8px',
        marginBottom: '24px'
      }}>
        {funnelSteps.map((step, index) => (
          <div key={step.name} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px',
            padding: '8px 0'
          }}>
            {/* Step Label */}
            <div style={{ 
              minWidth: '120px',
              textAlign: 'right'
            }}>
              <Text variant="bodyMd" as="span" fontWeight="medium">
                {step.name}
              </Text>
            </div>
            
            {/* Funnel Bar */}
            <div style={{ 
              flex: 1,
              height: '40px',
              backgroundColor: '#f0f0f0',
              borderRadius: '8px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div
                style={{
                  height: '100%',
                  width: `${step.width}%`,
                  backgroundColor: step.color,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: step.width > 15 ? '12px' : '0',
                  transition: 'width 0.5s ease'
                }}
              >
                {step.width > 15 && (
                  <Text variant="bodySm" as="span" style={{ 
                    color: 'white', 
                    fontWeight: '600',
                    fontSize: '12px'
                  }}>
                    {step.value.toLocaleString()}
                  </Text>
                )}
              </div>
              
              {/* Value outside bar if bar is too small */}
              {step.width <= 15 && (
                <div style={{
                  position: 'absolute',
                  left: `${step.width + 2}%`,
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}>
                  <Text variant="bodySm" as="span" tone="subdued">
                    {step.value.toLocaleString()}
                  </Text>
                </div>
              )}
            </div>
            
            {/* Conversion Rate */}
            <div style={{ 
              minWidth: '60px',
              textAlign: 'center'
            }}>
              <Text variant="bodySm" as="span" fontWeight="medium" style={{
                color: step.rate > 50 ? SHOPIFY_COLORS.success :
                       step.rate > 25 ? SHOPIFY_COLORS.warning : SHOPIFY_COLORS.danger
              }}>
                {step.rate}%
              </Text>
            </div>
          </div>
        ))}
      </div>
      
      {/* Summary */}
      <div style={{ 
        padding: '16px', 
        backgroundColor: SHOPIFY_COLORS.background,
        borderRadius: '8px',
        borderLeft: `4px solid ${SHOPIFY_COLORS.primary}`
      }}>
        <Text variant="bodyMd" as="p" fontWeight="semibold">
          Funnel Summary
        </Text>
        <Text variant="bodySm" as="p" tone="subdued" style={{ marginTop: '4px' }}>
          Overall conversion rate: <strong>{emailRate}%</strong> • 
          {data.emailCompletions} of {data.impressions.toLocaleString()} visitors completed the full funnel
        </Text>
      </div>
    </div>
  );
};