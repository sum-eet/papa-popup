import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Text } from '@shopify/polaris';

interface DropoffData {
  clickToStep1Dropoff: number;
  step1ToStep2Dropoff: number;
  step2ToStep3Dropoff: number;
  step3ToEmailDropoff: number;
}

interface DropoffBarChartProps {
  data: DropoffData;
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

export function DropoffBarChart({ data }: DropoffBarChartProps) {
  // Prepare chart data - only include dropoffs with data
  const chartData = [];

  if (data.clickToStep1Dropoff > 0) {
    chartData.push({
      name: 'Click → Step 1',
      value: data.clickToStep1Dropoff,
      color: data.clickToStep1Dropoff > 50 ? SHOPIFY_COLORS.danger : 
             data.clickToStep1Dropoff > 25 ? SHOPIFY_COLORS.warning : SHOPIFY_COLORS.success
    });
  }

  if (data.step1ToStep2Dropoff > 0) {
    chartData.push({
      name: 'Step 1 → Step 2',
      value: data.step1ToStep2Dropoff,
      color: data.step1ToStep2Dropoff > 50 ? SHOPIFY_COLORS.danger : 
             data.step1ToStep2Dropoff > 25 ? SHOPIFY_COLORS.warning : SHOPIFY_COLORS.success
    });
  }

  if (data.step2ToStep3Dropoff > 0) {
    chartData.push({
      name: 'Step 2 → Step 3',
      value: data.step2ToStep3Dropoff,
      color: data.step2ToStep3Dropoff > 50 ? SHOPIFY_COLORS.danger : 
             data.step2ToStep3Dropoff > 25 ? SHOPIFY_COLORS.warning : SHOPIFY_COLORS.success
    });
  }

  if (data.step3ToEmailDropoff > 0) {
    chartData.push({
      name: 'Step 3 → Email',
      value: data.step3ToEmailDropoff,
      color: data.step3ToEmailDropoff > 50 ? SHOPIFY_COLORS.danger : 
             data.step3ToEmailDropoff > 25 ? SHOPIFY_COLORS.warning : SHOPIFY_COLORS.success
    });
  }

  // If no dropoff data, show empty state
  if (chartData.length === 0) {
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
        <Text variant="bodySm" as="p" tone="subdued" style={{ marginTop: '4px' }}>
          Activate your popups to start collecting analytics
        </Text>
      </div>
    );
  }

  // Custom tooltip with Shopify styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dropoffValue = payload[0].value;
      const severity = dropoffValue > 50 ? 'High' : dropoffValue > 25 ? 'Medium' : 'Low';
      
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
            Drop-off Rate: {dropoffValue}%
          </Text>
          <Text variant="bodySm" as="p" tone="subdued">
            Severity: {severity}
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
    return <Bar {...rest} fill={dataPoint?.color || SHOPIFY_COLORS.danger} />;
  };

  // Get the highest dropoff for insights
  const highestDropoff = Math.max(...chartData.map(d => d.value));
  const highestDropoffStage = chartData.find(d => d.value === highestDropoff);

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
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
            height={100}
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
            domain={[0, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="value" 
            fill={SHOPIFY_COLORS.danger}
            radius={[4, 4, 0, 0]}
            shape={<CustomBar />}
          />
        </BarChart>
      </ResponsiveContainer>
      
      {/* Analysis Summary */}
      <div style={{ 
        marginTop: '16px', 
        padding: '12px', 
        backgroundColor: highestDropoff > 50 ? '#fef7f0' : SHOPIFY_COLORS.background,
        borderRadius: '8px',
        borderLeft: `4px solid ${highestDropoff > 50 ? SHOPIFY_COLORS.danger : 
                                 highestDropoff > 25 ? SHOPIFY_COLORS.warning : SHOPIFY_COLORS.success}`
      }}>
        <Text variant="bodyMd" as="p" fontWeight="semibold">
          Drop-off Analysis
        </Text>
        <Text variant="bodySm" as="p" tone="subdued" style={{ marginTop: '4px' }}>
          {highestDropoffStage ? (
            <>
              Highest drop-off: <strong>{highestDropoffStage.name}</strong> at {highestDropoff}%
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
}