import { Page, Layout, Card, Text, List } from "@shopify/polaris";

export default function PrivacyPolicy() {
  return (
    <Page title="Privacy Policy">
      <Layout>
        <Layout.Section>
          <Card>
            <div style={{ padding: '24px' }}>
              <Text variant="headingLg" as="h1">
                Privacy Policy for Papa Popup
              </Text>
              
              <div style={{ marginTop: '24px' }}>
                <Text variant="bodyMd" as="p">
                  <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
                </Text>
              </div>

              <div style={{ marginTop: '32px' }}>
                <Text variant="headingMd" as="h2">1. Information We Collect</Text>
                <div style={{ marginTop: '16px' }}>
                  <Text variant="bodyMd" as="p">
                    Papa Popup collects and processes the following information:
                  </Text>
                  <div style={{ marginTop: '12px' }}>
                    <List type="bullet">
                      <List.Item>Store information (domain, theme, configuration)</List.Item>
                      <List.Item>Popup performance data (views, clicks, conversions)</List.Item>
                      <List.Item>Customer email addresses (when provided voluntarily)</List.Item>
                      <List.Item>Anonymous visitor analytics (IP address, user agent, page views)</List.Item>
                      <List.Item>Usage data to improve our service</List.Item>
                    </List>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '32px' }}>
                <Text variant="headingMd" as="h2">2. How We Use Your Information</Text>
                <div style={{ marginTop: '16px' }}>
                  <Text variant="bodyMd" as="p">
                    We use collected information to:
                  </Text>
                  <div style={{ marginTop: '12px' }}>
                    <List type="bullet">
                      <List.Item>Provide and maintain the Papa Popup service</List.Item>
                      <List.Item>Generate analytics and conversion reports</List.Item>
                      <List.Item>Improve our app functionality and user experience</List.Item>
                      <List.Item>Provide customer support</List.Item>
                      <List.Item>Comply with legal obligations</List.Item>
                    </List>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '32px' }}>
                <Text variant="headingMd" as="h2">3. Data Storage and Security</Text>
                <div style={{ marginTop: '16px' }}>
                  <Text variant="bodyMd" as="p">
                    Your data is stored securely using industry-standard encryption and security practices:
                  </Text>
                  <div style={{ marginTop: '12px' }}>
                    <List type="bullet">
                      <List.Item>Data is encrypted in transit and at rest</List.Item>
                      <List.Item>Access is restricted to authorized personnel only</List.Item>
                      <List.Item>Regular security audits and updates</List.Item>
                      <List.Item>Data is stored on secure cloud infrastructure</List.Item>
                    </List>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '32px' }}>
                <Text variant="headingMd" as="h2">4. Data Sharing and Third Parties</Text>
                <div style={{ marginTop: '16px' }}>
                  <Text variant="bodyMd" as="p">
                    We do not sell, trade, or rent your personal information to third parties. We may share data only in these circumstances:
                  </Text>
                  <div style={{ marginTop: '12px' }}>
                    <List type="bullet">
                      <List.Item>With your explicit consent</List.Item>
                      <List.Item>To comply with legal requirements</List.Item>
                      <List.Item>With trusted service providers who assist our operations (under strict confidentiality agreements)</List.Item>
                      <List.Item>In connection with a business transfer or merger</List.Item>
                    </List>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '32px' }}>
                <Text variant="headingMd" as="h2">5. Your Rights and Choices</Text>
                <div style={{ marginTop: '16px' }}>
                  <Text variant="bodyMd" as="p">
                    You have the following rights regarding your data:
                  </Text>
                  <div style={{ marginTop: '12px' }}>
                    <List type="bullet">
                      <List.Item><strong>Access:</strong> Request a copy of your personal data</List.Item>
                      <List.Item><strong>Correction:</strong> Update or correct inaccurate information</List.Item>
                      <List.Item><strong>Deletion:</strong> Request deletion of your personal data</List.Item>
                      <List.Item><strong>Portability:</strong> Request transfer of your data</List.Item>
                      <List.Item><strong>Opt-out:</strong> Unsubscribe from marketing communications</List.Item>
                    </List>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '32px' }}>
                <Text variant="headingMd" as="h2">6. Cookies and Tracking</Text>
                <div style={{ marginTop: '16px' }}>
                  <Text variant="bodyMd" as="p">
                    Papa Popup uses cookies and similar tracking technologies to:
                  </Text>
                  <div style={{ marginTop: '12px' }}>
                    <List type="bullet">
                      <List.Item>Remember user preferences and settings</List.Item>
                      <List.Item>Analyze app usage and performance</List.Item>
                      <List.Item>Provide personalized experiences</List.Item>
                      <List.Item>Ensure security and prevent fraud</List.Item>
                    </List>
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <Text variant="bodyMd" as="p">
                      You can control cookie preferences through your browser settings.
                    </Text>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '32px' }}>
                <Text variant="headingMd" as="h2">7. Data Retention</Text>
                <div style={{ marginTop: '16px' }}>
                  <Text variant="bodyMd" as="p">
                    We retain your data for as long as necessary to provide our services and comply with legal obligations:
                  </Text>
                  <div style={{ marginTop: '12px' }}>
                    <List type="bullet">
                      <List.Item>Account data: Retained while your account is active</List.Item>
                      <List.Item>Analytics data: Retained for up to 2 years for reporting purposes</List.Item>
                      <List.Item>Email addresses: Retained until you request deletion or unsubscribe</List.Item>
                      <List.Item>Legal compliance data: Retained as required by applicable laws</List.Item>
                    </List>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '32px' }}>
                <Text variant="headingMd" as="h2">8. International Data Transfers</Text>
                <div style={{ marginTop: '16px' }}>
                  <Text variant="bodyMd" as="p">
                    Your data may be transferred to and processed in countries other than your own. 
                    We ensure appropriate safeguards are in place to protect your data during international transfers, 
                    including the use of standard contractual clauses and adherence to applicable data protection frameworks.
                  </Text>
                </div>
              </div>

              <div style={{ marginTop: '32px' }}>
                <Text variant="headingMd" as="h2">9. Children's Privacy</Text>
                <div style={{ marginTop: '16px' }}>
                  <Text variant="bodyMd" as="p">
                    Papa Popup is not intended for use by children under 13 years of age. 
                    We do not knowingly collect personal information from children under 13. 
                    If you believe we have collected information from a child under 13, please contact us immediately.
                  </Text>
                </div>
              </div>

              <div style={{ marginTop: '32px' }}>
                <Text variant="headingMd" as="h2">10. Changes to This Privacy Policy</Text>
                <div style={{ marginTop: '16px' }}>
                  <Text variant="bodyMd" as="p">
                    We may update this Privacy Policy from time to time. When we make significant changes, 
                    we will notify you by email or through the app. The "Last Updated" date at the top of 
                    this policy indicates when the most recent changes were made.
                  </Text>
                </div>
              </div>

              <div style={{ marginTop: '32px' }}>
                <Text variant="headingMd" as="h2">11. Contact Us</Text>
                <div style={{ marginTop: '16px' }}>
                  <Text variant="bodyMd" as="p">
                    If you have questions about this Privacy Policy or how we handle your data, please contact us:
                  </Text>
                  <div style={{ marginTop: '12px' }}>
                    <List type="bullet">
                      <List.Item><strong>Email:</strong> sumeetkarwa@gmail.com</List.Item>
                      <List.Item><strong>Response Time:</strong> We will respond to privacy requests within 30 days</List.Item>
                    </List>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '32px', padding: '16px', backgroundColor: '#f6f6f7', borderRadius: '8px' }}>
                <Text variant="bodyMd" as="p">
                  <strong>GDPR Compliance:</strong> If you are located in the European Union, you have additional rights under GDPR. 
                  Papa Popup is committed to compliance with GDPR and will honor all valid requests for data access, 
                  correction, deletion, and portability within the required timeframes.
                </Text>
              </div>

              <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
                <Text variant="bodyMd" as="p">
                  <strong>California Privacy Rights:</strong> California residents have specific rights under CCPA. 
                  You may request information about the categories of personal information we collect, 
                  the purposes for collection, and with whom we share information. You may also request deletion of your personal information.
                </Text>
              </div>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}