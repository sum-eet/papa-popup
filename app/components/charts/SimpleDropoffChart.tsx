import React from 'react';
import { Text } from '@shopify/polaris';

interface DropoffData {
  step1Dropoff: number;
  step2Dropoff: number;
  step3Dropoff: number;
  emailDropoff: number;
}

interface SimpleDropoffChartProps {
  data: DropoffData;
}

const SHOPIFY_COLORS = {
  primary: '#007cba',
  success: '#00AA5B', 
  warning: '#FFA500',
  danger: '#E53E3E',
  subdued: '#6d7175',
  background: '#f6f6f7'
};

export const SimpleDropoffChart: React.FC<SimpleDropoffChartProps> = ({ data }) => {
  const dropoffSteps = [
    {
      name: 'Step 1 Drop-off',
      value: data.step1Dropoff,
      color: data.step1Dropoff > 50 ? SHOPIFY_COLORS.danger : 
             data.step1Dropoff > 25 ? SHOPIFY_COLORS.warning : SHOPIFY_COLORS.success
    },
    {
      name: 'Step 2 Drop-off',
      value: data.step2Dropoff,
      color: data.step2Dropoff > 50 ? SHOPIFY_COLORS.danger : 
             data.step2Dropoff > 25 ? SHOPIFY_COLORS.warning : SHOPIFY_COLORS.success
    },
    {
      name: 'Step 3 Drop-off',
      value: data.step3Dropoff,
      color: data.step3Dropoff > 50 ? SHOPIFY_COLORS.danger : 
             data.step3Dropoff > 25 ? SHOPIFY_COLORS.warning : SHOPIFY_COLORS.success
    },
    {
      name: 'Email Drop-off',
      value: data.emailDropoff,
      color: data.emailDropoff > 50 ? SHOPIFY_COLORS.danger : 
             data.emailDropoff > 25 ? SHOPIFY_COLORS.warning : SHOPIFY_COLORS.success
    }
  ];

  // Filter out steps with 0 drop-off
  const validSteps = dropoffSteps.filter(step => step.value > 0);

  if (validSteps.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px',
        backgroundColor: SHOPIFY_COLORS.background,
        borderRadius: '8px'
      }}>
        <Text variant="bodyMd" as="p" tone="subdued">
          No drop-off data available yet
        </Text>
      </div>
    );
  }

  const highestDropoff = Math.max(...validSteps.map(s => s.value));
  const highestDropoffStep = validSteps.find(s => s.value === highestDropoff);

  return (
    <div style={{ width: '100%' }}>
      {/* Dropoff Bars */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px',
        marginBottom: '24px'
      }}>
        {validSteps.map((step, index) => {
          const width = (step.value / 100) * 100; // Already percentage
          
          return (
            <div key={step.name} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px'
            }}>
              <div style={{ 
                minWidth: '140px',
                textAlign: 'right'
              }}>
                <Text variant="bodyMd" as="span" fontWeight="medium">
                  {step.name}
                </Text>
              </div>
              
              <div style={{ 
                flex: 1,
                height: '36px',
                backgroundColor: '#f0f0f0',
                borderRadius: '6px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div
                  style={{
                    height: '100%',
                    width: `${width}%`,
                    backgroundColor: step.color,
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: width > 20 ? '12px' : '0',
                    transition: 'width 0.4s ease'
                  }}
                >
                  {width > 20 && (
                    <Text variant="bodySm" as="span" style={{ 
                      color: 'white', 
                      fontWeight: '600',
                      fontSize: '12px'
                    }}>
                      {step.value}%
                    </Text>
                  )}
                </div>
                
                {width <= 20 && (
                  <div style={{
                    position: 'absolute',
                    left: `${width + 3}%`,
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}>
                    <Text variant="bodySm" as="span" tone="subdued">
                      {step.value}%
                    </Text>
                  </div>
                )}
              </div>
              
              <div style={{ 
                minWidth: '80px',
                textAlign: 'left'
              }}>
                <Text variant="bodySm" as="span" tone="subdued">
                  {step.value > 50 ? 'High' : step.value > 25 ? 'Medium' : 'Low'}
                </Text>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Analysis */}
      <div style={{ 
        padding: '16px', 
        backgroundColor: highestDropoff > 50 ? '#fef7f0' : SHOPIFY_COLORS.background,
        borderRadius: '8px',
        borderLeft: `4px solid ${highestDropoff > 50 ? SHOPIFY_COLORS.danger : 
                                 highestDropoff > 25 ? SHOPIFY_COLORS.warning : SHOPIFY_COLORS.success}`
      }}>
        <Text variant="bodyMd" as="p" fontWeight="semibold">
          Drop-off Analysis
        </Text>
        <Text variant="bodySm" as="p" tone="subdued" style={{ marginTop: '4px' }}>
          {highestDropoffStep ? (
            <>
              Highest drop-off: <strong>{highestDropoffStep.name}</strong> at {highestDropoff}%
              {highestDropoff > 50 ? ' • Consider optimizing this step' :
               highestDropoff > 25 ? ' • Room for improvement' :
               ' • Good retention rate'}
            </>
          ) : (
            'All funnel stages are performing well'
          )}
        </Text>
      </div>
    </div>
  );
};