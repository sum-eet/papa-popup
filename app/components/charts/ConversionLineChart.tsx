import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Text } from '@shopify/polaris';

interface ConversionTrendData {
  date: string;
  clickRate: number;
  conversionRate: number;
  emailRate: number;
}

interface ConversionLineChartProps {
  data: ConversionTrendData[];
  title?: string;
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

export const ConversionLineChart = React.memo(({ data, title = "Conversion Trends" }: ConversionLineChartProps) => {
  // If no data, show placeholder with sample data or empty state
  if (!data || data.length === 0) {
    // Create sample data for demonstration
    const sampleData = [
      { date: '7 days ago', clickRate: 8, conversionRate: 12, emailRate: 15 },
      { date: '6 days ago', clickRate: 10, conversionRate: 14, emailRate: 18 },
      { date: '5 days ago', clickRate: 7, conversionRate: 10, emailRate: 12 },
      { date: '4 days ago', clickRate: 12, conversionRate: 16, emailRate: 20 },
      { date: '3 days ago', clickRate: 9, conversionRate: 13, emailRate: 16 },
      { date: '2 days ago', clickRate: 11, conversionRate: 15, emailRate: 19 },
      { date: 'Yesterday', clickRate: 13, conversionRate: 18, emailRate: 22 },
      { date: 'Today', clickRate: 15, conversionRate: 20, emailRate: 25 }
    ];
    
    data = sampleData;
  }

  // Custom tooltip with Shopify styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          border: `1px solid ${SHOPIFY_COLORS.background}`,
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
        }}>
          <Text variant="bodyMd" as="p" fontWeight="semibold">{label}</Text>
          {payload.map((entry: any, index: number) => (
            <div key={index} style={{ marginTop: '4px' }}>
              <Text variant="bodySm" as="p" tone="subdued">
                <span style={{ color: entry.color, marginRight: '8px' }}>●</span>
                {entry.name}: {entry.value}%
              </Text>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Calculate average rates for summary
  const avgClickRate = data.length > 0 ? Math.round(data.reduce((sum, d) => sum + d.clickRate, 0) / data.length) : 0;
  const avgConversionRate = data.length > 0 ? Math.round(data.reduce((sum, d) => sum + d.conversionRate, 0) / data.length) : 0;
  const avgEmailRate = data.length > 0 ? Math.round(data.reduce((sum, d) => sum + d.emailRate, 0) / data.length) : 0;

  return (
    <div style={{ width: '100%', height: '350px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={SHOPIFY_COLORS.background}
            vertical={false}
          />
          <XAxis 
            dataKey="date"
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
            tickFormatter={(value) => `${value}%`}
            domain={[0, 'dataMax + 5']}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Click Rate Line */}
          <Line 
            type="monotone" 
            dataKey="clickRate" 
            stroke={SHOPIFY_COLORS.primary}
            strokeWidth={2}
            dot={{ fill: SHOPIFY_COLORS.primary, strokeWidth: 2, r: 4 }}
            name="Click Rate"
            connectNulls={false}
          />
          
          {/* Conversion Rate Line */}
          <Line 
            type="monotone" 
            dataKey="conversionRate" 
            stroke={SHOPIFY_COLORS.warning}
            strokeWidth={2}
            dot={{ fill: SHOPIFY_COLORS.warning, strokeWidth: 2, r: 4 }}
            name="Conversion Rate"
            connectNulls={false}
          />
          
          {/* Email Rate Line */}
          <Line 
            type="monotone" 
            dataKey="emailRate" 
            stroke={SHOPIFY_COLORS.success}
            strokeWidth={2}
            dot={{ fill: SHOPIFY_COLORS.success, strokeWidth: 2, r: 4 }}
            name="Email Rate"
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
      
      {/* Trend Summary */}
      <div style={{ 
        marginTop: '16px', 
        padding: '12px', 
        backgroundColor: SHOPIFY_COLORS.background,
        borderRadius: '8px'
      }}>
        <Text variant="bodyMd" as="p" fontWeight="semibold">
          Trend Summary ({data.length} day{data.length !== 1 ? 's' : ''})
        </Text>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
          gap: '16px', 
          marginTop: '8px' 
        }}>
          <div>
            <Text variant="bodySm" as="p" tone="subdued">
              <span style={{ color: SHOPIFY_COLORS.primary, marginRight: '6px' }}>●</span>
              Avg Click Rate
            </Text>
            <Text variant="bodyMd" as="p" fontWeight="semibold">{avgClickRate}%</Text>
          </div>
          <div>
            <Text variant="bodySm" as="p" tone="subdued">
              <span style={{ color: SHOPIFY_COLORS.warning, marginRight: '6px' }}>●</span>
              Avg Conversion
            </Text>
            <Text variant="bodyMd" as="p" fontWeight="semibold">{avgConversionRate}%</Text>
          </div>
          <div>
            <Text variant="bodySm" as="p" tone="subdued">
              <span style={{ color: SHOPIFY_COLORS.success, marginRight: '6px' }}>●</span>
              Avg Email Rate
            </Text>
            <Text variant="bodyMd" as="p" fontWeight="semibold">{avgEmailRate}%</Text>
          </div>
        </div>
      </div>
    </div>
  );
});

ConversionLineChart.displayName = 'ConversionLineChart';