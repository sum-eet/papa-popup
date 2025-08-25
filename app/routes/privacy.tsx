import { Page, Layout, Card, Text, List } from "@shopify/polaris";

export default function Privacy() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Privacy Policy - Papa Popup</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333;
            background: #f8fafc;
            padding-top: 80px;
          }
          
          /* Navigation */
          .navbar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            z-index: 1000;
            padding: 0;
          }
          
          .navbar .container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            max-width: 1200px;
            margin: 0 auto;
          }
          
          .nav-brand a {
            font-size: 1.5rem;
            font-weight: 700;
            color: #667eea;
            text-decoration: none;
          }
          
          .nav-menu {
            display: flex;
            align-items: center;
            gap: 30px;
          }
          
          .nav-link {
            color: #4a5568;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.3s ease;
          }
          
          .nav-link:hover {
            color: #667eea;
          }
          
          .nav-link.active {
            color: #667eea;
            font-weight: 600;
          }
          
          .nav-cta {
            background: #667eea;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            text-decoration: none;
            font-weight: 600;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          
          .nav-cta:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
          }
          
          .nav-toggle {
            display: none;
            flex-direction: column;
            cursor: pointer;
            gap: 4px;
          }
          
          .nav-toggle span {
            width: 25px;
            height: 3px;
            background: #4a5568;
            border-radius: 3px;
            transition: all 0.3s ease;
          }
          
          /* Header */
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 100px 0 60px;
            text-align: center;
          }
          
          .header h1 {
            font-size: 2.8rem;
            margin-bottom: 20px;
            font-weight: 700;
          }
          
          .header .subtitle {
            font-size: 1.2rem;
            opacity: 0.9;
            max-width: 600px;
            margin: 0 auto;
          }
          
          .container { 
            max-width: 900px; 
            margin: 0 auto; 
            padding: 0 20px;
          }
          
          .content {
            background: white;
            margin: -40px auto 0;
            padding: 60px;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            position: relative;
            z-index: 1;
          }
          
          .last-updated {
            background: #f7fafc;
            padding: 15px 25px;
            border-radius: 8px;
            margin-bottom: 40px;
            text-align: center;
            font-weight: 600;
            color: #4a5568;
          }
          
          h2 { 
            color: #2d3748; 
            margin: 40px 0 20px 0;
            font-size: 1.6rem;
            font-weight: 700;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
          }
          
          h2:first-of-type {
            margin-top: 0;
          }
          
          p {
            margin-bottom: 16px;
            color: #4a5568;
            font-size: 1rem;
          }
          
          ul { 
            padding-left: 25px;
            margin-bottom: 20px;
          }
          
          li { 
            margin: 10px 0;
            color: #4a5568;
          }
          
          li strong {
            color: #2d3748;
          }
          
          .highlight { 
            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
            padding: 25px; 
            border-radius: 12px; 
            margin: 30px 0;
            border-left: 4px solid #667eea;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
          }
          
          .gdpr { 
            background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
            padding: 25px; 
            border-radius: 12px; 
            margin: 30px 0;
            border-left: 4px solid #9c27b0;
            box-shadow: 0 4px 12px rgba(156, 39, 176, 0.15);
          }
          
          .highlight p,
          .gdpr p {
            margin-bottom: 0;
            font-weight: 500;
          }
          
          /* Footer */
          .footer {
            background: #1a202c;
            color: white;
            padding: 40px 0;
            text-align: center;
            margin-top: 80px;
          }
          
          .footer p {
            color: #718096;
          }
          
          /* Responsive */
          @media (max-width: 768px) {
            .nav-menu {
              display: none;
              position: absolute;
              top: 100%;
              left: 0;
              right: 0;
              background: white;
              flex-direction: column;
              padding: 20px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              gap: 15px;
            }
            
            .nav-toggle {
              display: flex;
            }
            
            .header h1 { font-size: 2.2rem; }
            .content { padding: 40px 25px; margin-top: -30px; }
            .container { padding: 0 15px; }
            body { padding-top: 70px; }
          }
        `}</style>
      </head>
      <body>
        {/* Navigation */}
        <nav className="navbar">
          <div className="container">
            <div className="nav-brand">
              <a href="/home">Papa Popup</a>
            </div>
            <div className="nav-menu">
              <a href="/pricing" className="nav-link">Pricing</a>
              <a href="/privacy" className="nav-link active">Privacy</a>
              <a href="#" className="nav-cta">Start Free Trial</a>
            </div>
            <div className="nav-toggle">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </nav>

        {/* Header */}
        <section className="header">
          <div className="container">
            <h1>Privacy Policy</h1>
            <p className="subtitle">How we protect and handle your data with complete transparency</p>
          </div>
        </section>

        <div className="container">
          <div className="content">
            <div className="last-updated">
              <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
            </div>

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
        </div>

        {/* Footer */}
        <footer className="footer">
          <div className="container">
            <p>&copy; 2025 Papa Popup. All rights reserved. Built for Shopify merchants worldwide.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}