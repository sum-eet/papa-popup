import React from 'react';
import { Text } from '@shopify/polaris';

interface SimpleBarData {
  name: string;
  value: number;
  color?: string;
  percentage?: number;
}

interface SimpleBarChartProps {
  data: SimpleBarData[];
  title?: string;
}

const SHOPIFY_COLORS = {
  primary: '#007cba',
  success: '#00AA5B', 
  warning: '#FFA500',
  danger: '#E53E3E',
  subdued: '#6d7175',
  background: '#f6f6f7'
};

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ data, title }) => {
  const maxValue = Math.max(...data.map(d => d.value));

  if (!data || data.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px',
        backgroundColor: SHOPIFY_COLORS.background,
        borderRadius: '8px'
      }}>
        <Text variant="bodyMd" as="p" tone="subdued">
          No data available yet
        </Text>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {title && (
        <Text variant="headingMd" as="h3" style={{ marginBottom: '16px' }}>
          {title}
        </Text>
      )}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {data.map((item, index) => {
          const width = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          const color = item.color || SHOPIFY_COLORS.primary;
          
          return (
            <div key={index} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              minHeight: '48px'
            }}>
              <div style={{ 
                minWidth: '80px', 
                textAlign: 'right'
              }}>
                <Text variant="bodyMd" as="span" fontWeight="medium">
                  {item.name}
                </Text>
              </div>
              
              <div style={{ 
                flex: 1, 
                position: 'relative',
                height: '32px',
                backgroundColor: '#f0f0f0',
                borderRadius: '6px',
                overflow: 'hidden'
              }}>
                <div
                  style={{
                    height: '100%',
                    width: `${width}%`,
                    backgroundColor: color,
                    borderRadius: '6px',
                    transition: 'width 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: width > 20 ? '12px' : '0'
                  }}
                >
                  {width > 20 && (
                    <Text variant="bodySm" as="span" style={{ color: 'white', fontWeight: '600' }}>
                      {item.value.toLocaleString()}
                    </Text>
                  )}
                </div>
                {width <= 20 && (
                  <div style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}>
                    <Text variant="bodySm" as="span" tone="subdued">
                      {item.value.toLocaleString()}
                    </Text>
                  </div>
                )}
              </div>
              
              <div style={{ 
                minWidth: '50px', 
                textAlign: 'left'
              }}>
                <Text variant="bodySm" as="span" tone="subdued">
                  {item.percentage ? `${item.percentage}%` : ''}
                </Text>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};