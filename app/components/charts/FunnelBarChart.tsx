import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Text } from '@shopify/polaris';

interface FunnelData {
  impressions: number;
  step1Completions: number;
  step2Completions: number;
  step3Completions: number;
  emailCompletions: number;
}

interface FunnelBarChartProps {
  data: FunnelData;
}

// Shopify color palette
const SHOPIFY_COLORS = {
  primary: '#007cba',
  success: '#00AA5B', 
  warning: '#FFA500',
  danger: '#E53E3E',
  subdued: '#6d7175',
  background: '#f6f6f7'
};

export const FunnelBarChart = React.memo(({ data }: FunnelBarChartProps) => {
  // Calculate rates
  const step1Rate = data.impressions > 0 ? Math.round((data.step1Completions / data.impressions) * 100) : 0;
  const step2Rate = data.step1Completions > 0 ? Math.round((data.step2Completions / data.step1Completions) * 100) : 0;
  const step3Rate = data.step2Completions > 0 ? Math.round((data.step3Completions / data.step2Completions) * 100) : 0;
  const emailRate = data.step3Completions > 0 ? Math.round((data.emailCompletions / data.step3Completions) * 100) : 0;
  const overallConversionRate = data.impressions > 0 ? Math.round((data.emailCompletions / data.impressions) * 100) : 0;
  
  // Prepare chart data - always show all funnel stages
  const chartData = [
    {
      name: 'Impressions',
      value: data.impressions,
      color: SHOPIFY_COLORS.subdued,
      percentage: 100
    }
  ];

  if (data.step1Completions >= 0) {
    chartData.push({
      name: 'Step 1',
      value: data.step1Completions,
      color: step1Rate > 70 ? SHOPIFY_COLORS.success : step1Rate > 40 ? SHOPIFY_COLORS.warning : SHOPIFY_COLORS.danger,
      percentage: step1Rate
    });
  }

  if (data.step2Completions >= 0) {
    chartData.push({
      name: 'Step 2',
      value: data.step2Completions,
      color: step2Rate > 70 ? SHOPIFY_COLORS.success : step2Rate > 40 ? SHOPIFY_COLORS.warning : SHOPIFY_COLORS.danger,
      percentage: data.impressions > 0 ? Math.round((data.step2Completions / data.impressions) * 100) : 0
    });
  }

  if (data.step3Completions >= 0) {
    chartData.push({
      name: 'Step 3',
      value: data.step3Completions,
      color: step3Rate > 70 ? SHOPIFY_COLORS.success : step3Rate > 40 ? SHOPIFY_COLORS.warning : SHOPIFY_COLORS.danger,
      percentage: data.impressions > 0 ? Math.round((data.step3Completions / data.impressions) * 100) : 0
    });
  }

  if (data.emailCompletions >= 0) {
    chartData.push({
      name: 'Emails',
      value: data.emailCompletions,
      color: SHOPIFY_COLORS.success,
      percentage: data.impressions > 0 ? Math.round((data.emailCompletions / data.impressions) * 100) : 0
    });
  }

  // If no meaningful data, show empty state
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

  // Custom tooltip with Shopify styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'white',
          border: `1px solid ${SHOPIFY_COLORS.background}`,
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
        }}>
          <Text variant="bodyMd" as="p" fontWeight="semibold">{label}</Text>
          <Text variant="bodySm" as="p" tone="subdued">
            Count: {payload[0].value.toLocaleString()}
          </Text>
          <Text variant="bodySm" as="p" tone="subdued">
            Rate: {data.percentage}%
          </Text>
        </div>
      );
    }
    return null;
  };

  // Custom bar shape to use dynamic colors
  const CustomBar = (props: any) => {
    const { fill, ...rest } = props;
    const dataPoint = chartData.find(d => d.name === props.payload.name);
    return <Bar {...rest} fill={dataPoint?.color || SHOPIFY_COLORS.primary} />;
  };

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          barCategoryGap="20%"
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={SHOPIFY_COLORS.background}
            vertical={false}
          />
          <XAxis 
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ 
              fontSize: 12, 
              fill: SHOPIFY_COLORS.subdued,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ 
              fontSize: 12, 
              fill: SHOPIFY_COLORS.subdued,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
            tickFormatter={(value) => value.toLocaleString()}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="value" 
            fill={SHOPIFY_COLORS.primary}
            radius={[4, 4, 0, 0]}
            shape={<CustomBar />}
          />
        </BarChart>
      </ResponsiveContainer>
      
      {/* Chart Legend/Summary */}
      <div style={{ 
        marginTop: '16px', 
        padding: '12px', 
        backgroundColor: SHOPIFY_COLORS.background,
        borderRadius: '8px'
      }}>
        <Text variant="bodyMd" as="p" fontWeight="semibold">
          Funnel Summary
        </Text>
        <Text variant="bodySm" as="p" tone="subdued" style={{ marginTop: '4px' }}>
          {data.impressions > 0 ? (
            <>
              Overall conversion rate: <strong>{overallConversionRate}%</strong>
              {' • '}Step 1 completion: <strong>{step1Rate}%</strong>
              {data.emailCompletions > 0 && (
                <>
                  {' • '}Email capture: <strong>{Math.round((data.emailCompletions / data.impressions) * 100)}%</strong>
                </>
              )}
            </>
          ) : (
            'No funnel data available yet'
          )}
        </Text>
      </div>
    </div>
  );
});

FunnelBarChart.displayName = 'FunnelBarChart';