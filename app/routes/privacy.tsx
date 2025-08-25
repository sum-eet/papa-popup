import { Page, Layout, Card, Text, List } from "@shopify/polaris";

export default function Privacy() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Privacy Policy - Papa Popup</title>
        <style>{`
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px;
            background: #f9f9f9;
          }
          .container { 
            background: white; 
            padding: 40px; 
            border-radius: 8px; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          h1 { 
            color: #2c5aa0; 
            border-bottom: 3px solid #2c5aa0; 
            padding-bottom: 10px;
          }
          h2 { 
            color: #2c5aa0; 
            margin-top: 30px;
          }
          ul { 
            padding-left: 20px;
          }
          li { 
            margin: 8px 0;
          }
          .highlight { 
            background: #e3f2fd; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 20px 0;
            border-left: 4px solid #2c5aa0;
          }
          .gdpr { 
            background: #f3e5f5; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 20px 0;
            border-left: 4px solid #7b1fa2;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <h1>Privacy Policy for Papa Popup</h1>
          
          <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>

          <h2>1. Information We Collect</h2>
          <p>Papa Popup collects and processes the following information:</p>
          <ul>
            <li>Store information (domain, theme, configuration)</li>
            <li>Popup performance data (views, clicks, conversions)</li>
            <li>Customer email addresses (when provided voluntarily)</li>
            <li>Anonymous visitor analytics (IP address, user agent, page views)</li>
            <li>Usage data to improve our service</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use collected information to:</p>
          <ul>
            <li>Provide and maintain the Papa Popup service</li>
            <li>Generate analytics and conversion reports</li>
            <li>Improve our app functionality and user experience</li>
            <li>Provide customer support</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2>3. Data Storage and Security</h2>
          <p>Your data is stored securely using industry-standard encryption and security practices:</p>
          <ul>
            <li>Data is encrypted in transit and at rest</li>
            <li>Access is restricted to authorized personnel only</li>
            <li>Regular security audits and updates</li>
            <li>Data is stored on secure cloud infrastructure</li>
          </ul>

          <h2>4. Data Sharing and Third Parties</h2>
          <p>We do not sell, trade, or rent your personal information to third parties. We may share data only in these circumstances:</p>
          <ul>
            <li>With your explicit consent</li>
            <li>To comply with legal requirements</li>
            <li>With trusted service providers who assist our operations (under strict confidentiality agreements)</li>
            <li>In connection with a business transfer or merger</li>
          </ul>

          <h2>5. Your Rights and Choices</h2>
          <p>You have the following rights regarding your data:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Update or correct inaccurate information</li>
            <li><strong>Deletion:</strong> Request deletion of your personal data</li>
            <li><strong>Portability:</strong> Request transfer of your data</li>
            <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
          </ul>

          <h2>6. Cookies and Tracking</h2>
          <p>Papa Popup uses cookies and similar tracking technologies to:</p>
          <ul>
            <li>Remember user preferences and settings</li>
            <li>Analyze app usage and performance</li>
            <li>Provide personalized experiences</li>
            <li>Ensure security and prevent fraud</li>
          </ul>
          <p>You can control cookie preferences through your browser settings.</p>

          <h2>7. Data Retention</h2>
          <p>We retain your data for as long as necessary to provide our services and comply with legal obligations:</p>
          <ul>
            <li>Account data: Retained while your account is active</li>
            <li>Analytics data: Retained for up to 2 years for reporting purposes</li>
            <li>Email addresses: Retained until you request deletion or unsubscribe</li>
            <li>Legal compliance data: Retained as required by applicable laws</li>
          </ul>

          <h2>8. International Data Transfers</h2>
          <p>Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data during international transfers, including the use of standard contractual clauses and adherence to applicable data protection frameworks.</p>

          <h2>9. Children's Privacy</h2>
          <p>Papa Popup is not intended for use by children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.</p>

          <h2>10. Changes to This Privacy Policy</h2>
          <p>We may update this Privacy Policy from time to time. When we make significant changes, we will notify you by email or through the app. The "Last Updated" date at the top of this policy indicates when the most recent changes were made.</p>

          <h2>11. Contact Us</h2>
          <p>If you have questions about this Privacy Policy or how we handle your data, please contact us:</p>
          <ul>
            <li><strong>Email:</strong> sumeetkarwa@gmail.com</li>
            <li><strong>Response Time:</strong> We will respond to privacy requests within 30 days</li>
          </ul>

          <div className="gdpr">
            <p><strong>GDPR Compliance:</strong> If you are located in the European Union, you have additional rights under GDPR. Papa Popup is committed to compliance with GDPR and will honor all valid requests for data access, correction, deletion, and portability within the required timeframes.</p>
          </div>

          <div className="highlight">
            <p><strong>California Privacy Rights:</strong> California residents have specific rights under CCPA. You may request information about the categories of personal information we collect, the purposes for collection, and with whom we share information. You may also request deletion of your personal information.</p>
          </div>
        </div>
      </body>
    </html>
  );
}