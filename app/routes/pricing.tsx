export default function Pricing() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Pricing - Papa Popup | Simple, Transparent Pricing Plans</title>
        <meta name="description" content="Choose the perfect Papa Popup plan for your business. Start free, then just $10/month for 10,000 popup views. No hidden fees, cancel anytime." />
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
          
          .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 0 20px;
          }
          
          /* Header */
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 100px 0 60px;
            text-align: center;
          }
          
          .header h1 {
            font-size: 3rem;
            margin-bottom: 20px;
            font-weight: 700;
          }
          
          .header .subtitle {
            font-size: 1.3rem;
            opacity: 0.9;
            max-width: 600px;
            margin: 0 auto;
          }
          
          /* Pricing Section */
          .pricing {
            padding: 80px 0;
            background: white;
          }
          
          .pricing-intro {
            text-align: center;
            margin-bottom: 60px;
          }
          
          .pricing-intro h2 {
            font-size: 2rem;
            margin-bottom: 15px;
            color: #2d3748;
          }
          
          .pricing-intro p {
            font-size: 1.1rem;
            color: #718096;
          }
          
          .pricing-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 30px;
            margin-top: 40px;
          }
          
          .pricing-card {
            background: #f7fafc;
            border: 2px solid #e2e8f0;
            border-radius: 16px;
            padding: 40px 30px;
            text-align: center;
            position: relative;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          
          .pricing-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          }
          
          .pricing-card.featured {
            border-color: #667eea;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            transform: scale(1.05);
          }
          
          .pricing-card.featured:hover {
            transform: scale(1.05) translateY(-5px);
          }
          
          .pricing-badge {
            background: #ff6b6b;
            color: white;
            padding: 8px 20px;
            border-radius: 25px;
            font-size: 0.9rem;
            font-weight: 600;
            position: absolute;
            top: -15px;
            left: 50%;
            transform: translateX(-50%);
          }
          
          .pricing-plan {
            font-size: 1.8rem;
            font-weight: 700;
            margin-bottom: 15px;
          }
          
          .pricing-price {
            font-size: 3.5rem;
            font-weight: 700;
            margin-bottom: 5px;
            display: flex;
            align-items: baseline;
            justify-content: center;
            gap: 5px;
          }
          
          .pricing-price .currency {
            font-size: 2rem;
          }
          
          .pricing-period {
            color: #718096;
            margin-bottom: 30px;
            font-size: 1rem;
          }
          
          .pricing-card.featured .pricing-period {
            color: rgba(255,255,255,0.8);
          }
          
          .pricing-description {
            margin-bottom: 30px;
            font-size: 1rem;
            color: #4a5568;
          }
          
          .pricing-card.featured .pricing-description {
            color: rgba(255,255,255,0.9);
          }
          
          .pricing-features {
            list-style: none;
            margin-bottom: 40px;
            text-align: left;
          }
          
          .pricing-features li {
            padding: 12px 0;
            border-bottom: 1px solid #e2e8f0;
            position: relative;
            padding-left: 30px;
          }
          
          .pricing-features li::before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #48bb78;
            font-weight: 700;
            font-size: 1.2rem;
          }
          
          .pricing-card.featured .pricing-features li {
            border-bottom-color: rgba(255,255,255,0.2);
          }
          
          .pricing-card.featured .pricing-features li::before {
            color: #90cdf4;
          }
          
          .pricing-button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 30px;
            font-weight: 600;
            font-size: 1.1rem;
            transition: all 0.3s ease;
            min-width: 200px;
          }
          
          .pricing-button:hover {
            background: #5a6fd8;
            transform: translateY(-2px);
          }
          
          .pricing-card.featured .pricing-button {
            background: white;
            color: #667eea;
          }
          
          .pricing-card.featured .pricing-button:hover {
            background: #f7fafc;
            transform: translateY(-2px);
          }
          
          /* FAQ Section */
          .faq {
            padding: 80px 0;
            background: #f7fafc;
          }
          
          .faq h2 {
            text-align: center;
            font-size: 2.5rem;
            margin-bottom: 60px;
            color: #2d3748;
          }
          
          .faq-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 30px;
            max-width: 900px;
            margin: 0 auto;
          }
          
          .faq-item {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          }
          
          .faq-question {
            font-size: 1.3rem;
            font-weight: 600;
            margin-bottom: 15px;
            color: #2d3748;
          }
          
          .faq-answer {
            color: #4a5568;
            line-height: 1.6;
          }
          
          /* CTA Section */
          .cta-section {
            padding: 80px 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
          }
          
          .cta-section h2 {
            font-size: 2.5rem;
            margin-bottom: 20px;
            font-weight: 700;
          }
          
          .cta-section p {
            font-size: 1.2rem;
            margin-bottom: 30px;
            opacity: 0.9;
          }
          
          .cta-button {
            display: inline-block;
            background: white;
            color: #667eea;
            padding: 15px 40px;
            text-decoration: none;
            border-radius: 30px;
            font-weight: 700;
            font-size: 1.1rem;
            transition: all 0.3s ease;
          }
          
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(255,255,255,0.3);
          }
          
          /* Footer */
          .footer {
            background: #1a202c;
            color: white;
            padding: 40px 0;
            text-align: center;
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
            .header .subtitle { font-size: 1.1rem; }
            .pricing-grid { grid-template-columns: 1fr; }
            .pricing-card.featured { transform: scale(1); }
            .pricing-card.featured:hover { transform: translateY(-5px); }
            .faq-grid { grid-template-columns: 1fr; }
            .cta-section h2 { font-size: 2rem; }
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
              <a href="/pricing" className="nav-link active">Pricing</a>
              <a href="/privacy" className="nav-link">Privacy</a>
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
            <h1>Simple, Transparent Pricing</h1>
            <p className="subtitle">Start free, then scale as you grow. No hidden fees, no long-term contracts. Cancel anytime.</p>
          </div>
        </section>

        {/* Pricing */}
        <section className="pricing">
          <div className="container">
            <div className="pricing-intro">
              <h2>Choose Your Perfect Plan</h2>
              <p>All plans include 14-day free trial with full access to premium features</p>
            </div>
            
            <div className="pricing-grid">
              <div className="pricing-card">
                <h3 className="pricing-plan">Free</h3>
                <div className="pricing-price">
                  <span className="currency">$</span>0
                </div>
                <div className="pricing-period">Forever free</div>
                <div className="pricing-description">Perfect for getting started and testing Papa Popup</div>
                <ul className="pricing-features">
                  <li>1 active popup</li>
                  <li>Basic templates (5 designs)</li>
                  <li>500 monthly popup views</li>
                  <li>Standard analytics</li>
                  <li>Email capture</li>
                  <li>Basic targeting</li>
                  <li>Email support</li>
                </ul>
                <a href="#" className="pricing-button">Get Started Free</a>
              </div>
              
              <div className="pricing-card featured">
                <div className="pricing-badge">Most Popular</div>
                <h3 className="pricing-plan">Pro</h3>
                <div className="pricing-price">
                  <span className="currency">$</span>10
                </div>
                <div className="pricing-period">per month</div>
                <div className="pricing-description">Perfect for growing businesses and serious marketers</div>
                <ul className="pricing-features">
                  <li>Unlimited popups</li>
                  <li>All premium templates (50+ designs)</li>
                  <li>10,000 monthly popup views</li>
                  <li>Advanced analytics & funnel tracking</li>
                  <li>Quiz builder & product recommendations</li>
                  <li>Advanced targeting & triggers</li>
                  <li>A/B testing</li>
                  <li>Email marketing integrations</li>
                  <li>Custom CSS support</li>
                  <li>Priority support</li>
                </ul>
                <a href="#" className="pricing-button">Start Free Trial</a>
              </div>
              
              <div className="pricing-card">
                <h3 className="pricing-plan">Enterprise</h3>
                <div className="pricing-price">
                  <span className="currency">$</span>100
                </div>
                <div className="pricing-period">per month</div>
                <div className="pricing-description">For high-volume stores and agencies</div>
                <ul className="pricing-features">
                  <li>Everything in Pro</li>
                  <li>Unlimited popup views</li>
                  <li>White-label options</li>
                  <li>API access</li>
                  <li>Custom integrations</li>
                  <li>Dedicated account manager</li>
                  <li>Phone support</li>
                  <li>Custom analytics reports</li>
                  <li>Advanced user permissions</li>
                  <li>SLA guarantee</li>
                </ul>
                <a href="#" className="pricing-button">Contact Sales</a>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="faq">
          <div className="container">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-grid">
              <div className="faq-item">
                <h3 className="faq-question">What counts as a popup view?</h3>
                <p className="faq-answer">A popup view is counted each time a popup is displayed to a visitor, regardless of whether they interact with it or not. Multiple views by the same visitor count as separate views.</p>
              </div>
              
              <div className="faq-item">
                <h3 className="faq-question">What happens if I exceed my monthly limit?</h3>
                <p className="faq-answer">Your popups will continue to work, but we'll suggest upgrading to the next plan. We'll never suddenly cut off your service or charge overage fees without notice.</p>
              </div>
              
              <div className="faq-item">
                <h3 className="faq-question">Can I cancel anytime?</h3>
                <p className="faq-answer">Absolutely! You can cancel your subscription at any time from your dashboard. You'll continue to have access to paid features until the end of your current billing period.</p>
              </div>
              
              <div className="faq-item">
                <h3 className="faq-question">Do you offer refunds?</h3>
                <p className="faq-answer">Yes, we offer a 30-day money-back guarantee. If you're not satisfied with Papa Popup, contact us within 30 days for a full refund.</p>
              </div>
              
              <div className="faq-item">
                <h3 className="faq-question">Is there a setup fee?</h3>
                <p className="faq-answer">No setup fees, no hidden costs. The price you see is exactly what you pay. Installation takes less than 30 seconds with our Shopify app.</p>
              </div>
              
              <div className="faq-item">
                <h3 className="faq-question">Can I upgrade or downgrade anytime?</h3>
                <p className="faq-answer">Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and billing is prorated accordingly.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section">
          <div className="container">
            <h2>Ready to Boost Your Conversions?</h2>
            <p>Join thousands of successful merchants using Papa Popup to grow their business</p>
            <a href="#" className="cta-button">Start Your Free Trial Today</a>
          </div>
        </section>

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