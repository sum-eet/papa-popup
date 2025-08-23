import { type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { 
  Page, 
  Layout, 
  Card, 
  DataTable, 
  Button, 
  EmptyState,
  Text,
  Select
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { isMultiPopupEnabled } from "../utils/features";
import { redirect } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  // Check if analytics are available (only in multi-popup mode)
  if (!isMultiPopupEnabled()) {
    return redirect("/app");
  }

  const { session } = await authenticate.admin(request);
  
  // Get popup filter from URL params
  const url = new URL(request.url);
  const selectedPopupId = url.searchParams.get('popupId');
  
  // Get funnel data for this shop
  const shop = await prisma.shop.findUnique({
    where: { domain: session.shop },
    include: {
      popups: {
        where: { isDeleted: false },
        orderBy: { updatedAt: 'desc' }
      }
    }
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  // Build filter condition for popup-specific data
  const popupFilter = selectedPopupId ? { popupId: selectedPopupId } : {};

  // Get conversion funnel data from PopupAnalytics (filtered by popup if selected)
  const impressions = await prisma.popupAnalytics.count({
    where: { shopId: shop.id, eventType: 'impression', ...popupFilter }
  });

  const clicks = await prisma.popupAnalytics.count({
    where: { shopId: shop.id, eventType: 'click', ...popupFilter }
  });

  const closes = await prisma.popupAnalytics.count({
    where: { shopId: shop.id, eventType: 'close', ...popupFilter }
  });

  const step1Completions = await prisma.popupAnalytics.count({
    where: { shopId: shop.id, eventType: 'step_complete', stepNumber: 1, ...popupFilter }
  });

  const step2Completions = await prisma.popupAnalytics.count({
    where: { shopId: shop.id, eventType: 'step_complete', stepNumber: 2, ...popupFilter }
  });

  const step3Completions = await prisma.popupAnalytics.count({
    where: { shopId: shop.id, eventType: 'step_complete', stepNumber: 3, ...popupFilter }
  });

  const emailsProvided = await prisma.popupAnalytics.count({
    where: {
      shopId: shop.id,
      ...popupFilter,
      OR: [
        { eventType: 'email_provided' },
        { eventType: 'complete' }
      ]
    }
  });

  const completions = await prisma.popupAnalytics.count({
    where: { shopId: shop.id, eventType: 'complete', ...popupFilter }
  });

  // Calculate conversion rates and drop-offs
  const clickRate = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const step1Rate = clicks > 0 ? (step1Completions / clicks) * 100 : 0;
  const step2Rate = step1Completions > 0 ? (step2Completions / step1Completions) * 100 : 0;
  const step3Rate = step2Completions > 0 ? (step3Completions / step2Completions) * 100 : 0;
  const emailRate = (step1Completions + step2Completions + step3Completions) > 0 ? 
    (emailsProvided / Math.max(step1Completions, step2Completions, step3Completions)) * 100 : 0;
  const completionRate = emailsProvided > 0 ? (completions / emailsProvided) * 100 : 0;

  // Overall conversion rate (impression to completion)
  const overallConversionRate = impressions > 0 ? (completions / impressions) * 100 : 0;

  // Get selected popup details if filtering
  const selectedPopup = selectedPopupId ? 
    shop.popups.find(p => p.id === selectedPopupId) : null;

  // Form complexity analysis
  const oneStepForms = shop.popups.filter(p => p.totalSteps === 1).length;
  const twoStepForms = shop.popups.filter(p => p.totalSteps === 2).length;
  const threeStepForms = shop.popups.filter(p => p.totalSteps >= 3).length;

  return {
    shop,
    selectedPopup,
    selectedPopupId,
    funnelStats: {
      // Form complexity
      oneStepForms,
      twoStepForms,
      threeStepForms,
      totalForms: shop.popups.length,
      
      // Conversion funnel data
      impressions,
      clicks,
      closes,
      step1Completions,
      step2Completions,
      step3Completions,
      emailsProvided,
      completions,
      
      // Conversion rates (rounded to 2 decimals)
      clickRate: Math.round(clickRate * 100) / 100,
      step1Rate: Math.round(step1Rate * 100) / 100,
      step2Rate: Math.round(step2Rate * 100) / 100,
      step3Rate: Math.round(step3Rate * 100) / 100,
      emailRate: Math.round(emailRate * 100) / 100,
      completionRate: Math.round(completionRate * 100) / 100,
      overallConversionRate: Math.round(overallConversionRate * 100) / 100,
      
      // Drop-off calculations
      impressionToClickDropoff: Math.round((100 - clickRate) * 100) / 100,
      clickToStep1Dropoff: Math.round((100 - step1Rate) * 100) / 100,
      step1ToStep2Dropoff: step1Completions > 0 ? Math.round((100 - step2Rate) * 100) / 100 : 0,
      step2ToStep3Dropoff: step2Completions > 0 ? Math.round((100 - step3Rate) * 100) / 100 : 0
    }
  };
}


export default function FunnelAnalytics() {
  const { shop, funnelStats, selectedPopup, selectedPopupId } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Popup selector options
  const popupOptions = [
    { label: 'All Popups', value: '' },
    ...shop.popups.map((popup: any) => ({
      label: popup.name,
      value: popup.id
    }))
  ];
  
  // Handle popup selection change
  const handlePopupChange = (value: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (value) {
      newSearchParams.set('popupId', value);
    } else {
      newSearchParams.delete('popupId');
    }
    setSearchParams(newSearchParams);
  };

  // Helper function to get color for conversion rates
  const getConversionColor = (rate: number) => {
    if (rate >= 15) return '#00AA5B'; // Green - good
    if (rate >= 5) return '#FFA500';  // Orange - okay  
    return '#E53E3E';                  // Red - needs improvement
  };

  // Helper function to get drop-off color (inverted - high drop-off is bad)
  const getDropoffColor = (dropoff: number) => {
    if (dropoff <= 20) return '#00AA5B'; // Green - low drop-off is good
    if (dropoff <= 50) return '#FFA500'; // Orange - medium drop-off
    return '#E53E3E';                    // Red - high drop-off is bad
  };

  // Funnel step data for visualization
  const funnelSteps = [
    { label: 'Impressions', count: funnelStats.impressions, rate: 100, color: '#007cba' },
    { label: 'Clicks', count: funnelStats.clicks, rate: funnelStats.clickRate, color: getConversionColor(funnelStats.clickRate) },
    { label: 'Step 1 Completed', count: funnelStats.step1Completions, rate: funnelStats.step1Rate, color: getConversionColor(funnelStats.step1Rate) },
    { label: 'Step 2 Completed', count: funnelStats.step2Completions, rate: funnelStats.step2Rate, color: getConversionColor(funnelStats.step2Rate) },
    { label: 'Step 3 Completed', count: funnelStats.step3Completions, rate: funnelStats.step3Rate, color: getConversionColor(funnelStats.step3Rate) },
    { label: 'Emails Provided', count: funnelStats.emailsProvided, rate: funnelStats.emailRate, color: getConversionColor(funnelStats.emailRate) },
    { label: 'Completions', count: funnelStats.completions, rate: funnelStats.completionRate, color: getConversionColor(funnelStats.completionRate) }
  ];

  // Filter out steps with 0 count after step 2 (for shops that don't use 3+ steps)
  const activeFunnelSteps = funnelSteps.filter((step, index) => {
    if (index <= 4) return true; // Always show impression, click, step1, step2, step3
    return step.count > 0; // Only show email/completion if they have data
  });

  return (
    <Page
      title="Conversion Funnel Analytics"
      subtitle={selectedPopup ? 
        `Funnel analysis for "${selectedPopup.name}"` : 
        "Track user journey and conversion patterns across your popup forms"
      }
      backAction={{
        content: 'Dashboard',
        url: '/app'
      }}
    >
      <Layout>
        {/* Popup Selector */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Popup Filter</Text>
              <div style={{ marginTop: '16px', maxWidth: '300px' }}>
                <Select
                  label="Select Popup"
                  options={popupOptions}
                  value={selectedPopupId || ''}
                  onChange={handlePopupChange}
                  helpText={selectedPopup ? 
                    `Analyzing ${selectedPopup.totalSteps}-step ${selectedPopup.popupType.replace('_', ' ').toLowerCase()} popup` :
                    "View funnel data for all popups or select a specific popup"
                  }
                />
              </div>
            </div>
          </Card>
        </Layout.Section>
        
        {/* Form Complexity Analysis */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Form Complexity Distribution</Text>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginTop: '16px' }}>
                <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f6f6f7', borderRadius: '8px' }}>
                  <Text variant="headingLg" as="p">{funnelStats.oneStepForms}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">1-Step Forms</Text>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f6f6f7', borderRadius: '8px' }}>
                  <Text variant="headingLg" as="p">{funnelStats.twoStepForms}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">2-Step Forms</Text>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f6f6f7', borderRadius: '8px' }}>
                  <Text variant="headingLg" as="p">{funnelStats.threeStepForms}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">3+ Step Forms</Text>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
                  <Text variant="headingLg" as="p">{funnelStats.totalForms}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Total Forms</Text>
                </div>
              </div>
            </div>
          </Card>
        </Layout.Section>

        {/* Key Funnel Metrics */}
        <Layout.Section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="headingXl" as="p">{funnelStats.impressions.toLocaleString()}</Text>
                <Text variant="bodyMd" as="p" tone="subdued">👁️ Total Impressions</Text>
              </div>
            </Card>
            
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="headingXl" as="p">{funnelStats.clicks.toLocaleString()}</Text>
                <Text variant="bodyMd" as="p" tone="subdued">🖱️ Clicks</Text>
                <Text variant="bodySm" as="p" style={{color: getConversionColor(funnelStats.clickRate)}}>{funnelStats.clickRate}% rate</Text>
              </div>
            </Card>
            
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="headingXl" as="p">{funnelStats.emailsProvided.toLocaleString()}</Text>
                <Text variant="bodyMd" as="p" tone="subdued">📧 Emails Captured</Text>
                <Text variant="bodySm" as="p" style={{color: getConversionColor(funnelStats.emailRate)}}>{funnelStats.emailRate}% rate</Text>
              </div>
            </Card>
            
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="headingXl" as="p">{funnelStats.completions.toLocaleString()}</Text>
                <Text variant="bodyMd" as="p" tone="subdued">✅ Completions</Text>
                <Text variant="bodySm" as="p" style={{color: getConversionColor(funnelStats.overallConversionRate)}}>{funnelStats.overallConversionRate}% overall</Text>
              </div>
            </Card>
            
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="headingXl" as="p">{funnelStats.closes.toLocaleString()}</Text>
                <Text variant="bodyMd" as="p" tone="subdued">❌ Popup Closes</Text>
              </div>
            </Card>
          </div>
        </Layout.Section>

        {/* Visual Conversion Funnel */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Conversion Funnel Visualization</Text>
              <Text variant="bodyMd" as="p" tone="subdued" style={{ marginTop: '8px' }}>
                Complete user journey from impression to conversion with drop-off analysis
              </Text>
              
              {/* Funnel Steps */}
              <div style={{ marginTop: '32px' }}>
                {activeFunnelSteps.map((step, index) => {
                  const isLast = index === activeFunnelSteps.length - 1;
                  const maxWidth = 100;
                  const stepWidth = step.count > 0 ? Math.max((step.count / funnelStats.impressions) * maxWidth, 10) : 10;
                  
                  return (
                    <div key={step.label} style={{ marginBottom: '16px' }}>
                      {/* Funnel Bar */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        marginBottom: '8px',
                        justifyContent: 'center'
                      }}>
                        <div style={{
                          width: `${stepWidth}%`,
                          height: '50px',
                          backgroundColor: step.color,
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          minWidth: '120px',
                          position: 'relative'
                        }}>
                          {step.count.toLocaleString()}
                        </div>
                      </div>
                      
                      {/* Step Details */}
                      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <Text variant="bodyMd" as="p" fontWeight="semibold">{step.label}</Text>
                        {index > 0 && (
                          <Text variant="bodySm" as="p" tone="subdued">
                            {step.rate}% conversion rate
                          </Text>
                        )}
                      </div>
                      
                      {/* Drop-off Arrow */}
                      {!isLast && (
                        <div style={{ textAlign: 'center', margin: '8px 0' }}>
                          <div style={{ color: '#666', fontSize: '20px' }}>↓</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </Layout.Section>
        
        {/* Drop-off Analysis */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Drop-off Analysis</Text>
              <Text variant="bodyMd" as="p" tone="subdued" style={{ marginTop: '8px' }}>
                Where users are leaving your funnel - identify optimization opportunities
              </Text>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '20px' }}>
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: '#f6f6f7', 
                  borderRadius: '8px',
                  borderLeft: `4px solid ${getDropoffColor(funnelStats.impressionToClickDropoff)}`
                }}>
                  <Text variant="bodyMd" as="p" fontWeight="semibold">Impression → Click</Text>
                  <Text variant="headingLg" as="p" style={{color: getDropoffColor(funnelStats.impressionToClickDropoff)}}>
                    {funnelStats.impressionToClickDropoff}% drop-off
                  </Text>
                </div>
                
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: '#f6f6f7', 
                  borderRadius: '8px',
                  borderLeft: `4px solid ${getDropoffColor(funnelStats.clickToStep1Dropoff)}`
                }}>
                  <Text variant="bodyMd" as="p" fontWeight="semibold">Click → Step 1</Text>
                  <Text variant="headingLg" as="p" style={{color: getDropoffColor(funnelStats.clickToStep1Dropoff)}}>
                    {funnelStats.clickToStep1Dropoff}% drop-off
                  </Text>
                </div>
                
                {funnelStats.step1ToStep2Dropoff > 0 && (
                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: '#f6f6f7', 
                    borderRadius: '8px',
                    borderLeft: `4px solid ${getDropoffColor(funnelStats.step1ToStep2Dropoff)}`
                  }}>
                    <Text variant="bodyMd" as="p" fontWeight="semibold">Step 1 → Step 2</Text>
                    <Text variant="headingLg" as="p" style={{color: getDropoffColor(funnelStats.step1ToStep2Dropoff)}}>
                      {funnelStats.step1ToStep2Dropoff}% drop-off
                    </Text>
                  </div>
                )}
                
                {funnelStats.step2ToStep3Dropoff > 0 && (
                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: '#f6f6f7', 
                    borderRadius: '8px',
                    borderLeft: `4px solid ${getDropoffColor(funnelStats.step2ToStep3Dropoff)}`
                  }}>
                    <Text variant="bodyMd" as="p" fontWeight="semibold">Step 2 → Step 3</Text>
                    <Text variant="headingLg" as="p" style={{color: getDropoffColor(funnelStats.step2ToStep3Dropoff)}}>
                      {funnelStats.step2ToStep3Dropoff}% drop-off
                    </Text>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </Layout.Section>

        {/* Funnel Insights */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Funnel Insights & Recommendations</Text>
              <div style={{ marginTop: '16px' }}>
                {funnelStats.impressions === 0 ? (
                  <EmptyState
                    heading="No funnel data available yet"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Start collecting funnel analytics by activating your popups and tracking user interactions</p>
                    <div style={{ marginTop: '16px' }}>
                      <Button variant="primary" url="/app/popups">
                        Manage Popups
                      </Button>
                    </div>
                  </EmptyState>
                ) : (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {/* Overall Performance */}
                    <div style={{ padding: '16px', backgroundColor: funnelStats.overallConversionRate >= 5 ? '#f0f9ff' : '#fef7f0', borderRadius: '8px' }}>
                      <Text variant="bodyMd" as="p" fontWeight="semibold">
                        Overall Funnel Performance: {funnelStats.overallConversionRate}%
                      </Text>
                      <Text variant="bodySm" as="p" tone="subdued" style={{ marginTop: '4px' }}>
                        {funnelStats.overallConversionRate >= 5 ? 
                          '🎉 Great conversion rate! Your funnel is performing well.' :
                          funnelStats.overallConversionRate >= 2 ?
                          '👍 Decent conversion rate with room for improvement.' :
                          '⚠️ Low conversion rate - consider optimizing your popup timing, targeting, or content.'
                        }
                      </Text>
                    </div>
                    
                    {/* Click Rate Analysis */}
                    {funnelStats.clickRate < 10 && (
                      <div style={{ padding: '16px', backgroundColor: '#fef7f0', borderRadius: '8px' }}>
                        <Text variant="bodyMd" as="p" fontWeight="semibold">
                          Low Click Rate ({funnelStats.clickRate}%)
                        </Text>
                        <Text variant="bodySm" as="p" tone="subdued" style={{ marginTop: '4px' }}>
                          💡 Consider improving popup design, timing, or value proposition to increase engagement.
                        </Text>
                      </div>
                    )}
                    
                    {/* High Drop-off Warning */}
                    {funnelStats.impressionToClickDropoff > 80 && (
                      <div style={{ padding: '16px', backgroundColor: '#fef7f0', borderRadius: '8px' }}>
                        <Text variant="bodyMd" as="p" fontWeight="semibold">
                          High Impression Drop-off ({funnelStats.impressionToClickDropoff}%)
                        </Text>
                        <Text variant="bodySm" as="p" tone="subdued" style={{ marginTop: '4px' }}>
                          🚨 Most users see but don't interact with popups. Try adjusting timing, positioning, or offer.
                        </Text>
                      </div>
                    )}
                    
                    {/* Email Capture Success */}
                    {funnelStats.emailRate >= 15 && (
                      <div style={{ padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
                        <Text variant="bodyMd" as="p" fontWeight="semibold">
                          Excellent Email Capture ({funnelStats.emailRate}%)
                        </Text>
                        <Text variant="bodySm" as="p" tone="subdued" style={{ marginTop: '4px' }}>
                          ✨ Great job! Users who engage are providing their emails at a high rate.
                        </Text>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}