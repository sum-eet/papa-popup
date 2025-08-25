export default function Homepage() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Papa Popup - Smart Popups & Quizzes That Convert Visitors Into Loyal Customers</title>
        <meta name="description" content="Transform visitors into customers with intelligent popups and quizzes. Boost conversions by 40%+ with targeted messaging, analytics, and email capture." />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333;
            background: #f8fafc;
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
            padding: 80px 0;
            text-align: center;
          }
          
          .header h1 {
            font-size: 3.5rem;
            margin-bottom: 20px;
            font-weight: 700;
          }
          
          .header .subtitle {
            font-size: 1.3rem;
            margin-bottom: 30px;
            opacity: 0.9;
          }
          
          .cta-button {
            display: inline-block;
            background: #ff6b6b;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 1.1rem;
            transition: transform 0.3s ease;
          }
          
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(255, 107, 107, 0.3);
          }
          
          /* Features Section */
          .features {
            padding: 80px 0;
            background: white;
          }
          
          .section-title {
            text-align: center;
            font-size: 2.5rem;
            margin-bottom: 20px;
            color: #2d3748;
          }
          
          .section-subtitle {
            text-align: center;
            font-size: 1.2rem;
            color: #718096;
            margin-bottom: 60px;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
          }
          
          .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 40px;
            margin-top: 40px;
          }
          
          .feature-card {
            background: #f7fafc;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          
          .feature-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          }
          
          .feature-icon {
            font-size: 3rem;
            margin-bottom: 20px;
          }
          
          .feature-title {
            font-size: 1.4rem;
            margin-bottom: 15px;
            color: #2d3748;
            font-weight: 600;
          }
          
          .feature-desc {
            color: #4a5568;
          }
          
          /* Benefits Section */
          .benefits {
            padding: 80px 0;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
          }
          
          .benefits-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 40px;
            margin-top: 40px;
          }
          
          .benefit-card {
            text-align: center;
            padding: 20px;
          }
          
          .benefit-number {
            font-size: 3rem;
            font-weight: 700;
            margin-bottom: 10px;
          }
          
          .benefit-title {
            font-size: 1.3rem;
            margin-bottom: 10px;
            font-weight: 600;
          }
          
          /* Pricing Section */
          .pricing {
            padding: 80px 0;
            background: white;
          }
          
          .pricing-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin-top: 40px;
          }
          
          .pricing-card {
            background: #f7fafc;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
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
          
          .pricing-badge {
            background: #ff6b6b;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: 600;
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%);
          }
          
          .pricing-plan {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 10px;
          }
          
          .pricing-price {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 5px;
          }
          
          .pricing-period {
            color: #718096;
            margin-bottom: 30px;
          }
          
          .pricing-card.featured .pricing-period {
            color: rgba(255,255,255,0.8);
          }
          
          .pricing-features {
            list-style: none;
            margin-bottom: 30px;
          }
          
          .pricing-features li {
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
          }
          
          .pricing-card.featured .pricing-features li {
            border-bottom-color: rgba(255,255,255,0.2);
          }
          
          .pricing-button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 25px;
            font-weight: 600;
            transition: background 0.3s ease;
          }
          
          .pricing-button:hover {
            background: #5a6fd8;
          }
          
          .pricing-card.featured .pricing-button {
            background: white;
            color: #667eea;
          }
          
          /* Testimonials */
          .testimonials {
            padding: 80px 0;
            background: #2d3748;
            color: white;
          }
          
          .testimonials-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 40px;
            margin-top: 40px;
          }
          
          .testimonial-card {
            background: #4a5568;
            padding: 30px;
            border-radius: 12px;
            position: relative;
          }
          
          .testimonial-text {
            font-size: 1.1rem;
            margin-bottom: 20px;
            font-style: italic;
          }
          
          .testimonial-author {
            font-weight: 600;
            color: #81e6d9;
          }
          
          .testimonial-role {
            font-size: 0.9rem;
            color: #a0aec0;
          }
          
          /* Footer */
          .footer {
            background: #1a202c;
            color: white;
            padding: 60px 0 30px;
          }
          
          .footer-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 40px;
            margin-bottom: 40px;
          }
          
          .footer-section h3 {
            font-size: 1.3rem;
            margin-bottom: 20px;
            color: #81e6d9;
          }
          
          .footer-links {
            list-style: none;
          }
          
          .footer-links li {
            margin-bottom: 8px;
          }
          
          .footer-links a {
            color: #a0aec0;
            text-decoration: none;
            transition: color 0.3s ease;
          }
          
          .footer-links a:hover {
            color: #81e6d9;
          }
          
          .footer-bottom {
            border-top: 1px solid #2d3748;
            padding-top: 20px;
            text-align: center;
            color: #718096;
          }
          
          /* Responsive */
          @media (max-width: 768px) {
            .header h1 { font-size: 2.5rem; }
            .header .subtitle { font-size: 1.1rem; }
            .section-title { font-size: 2rem; }
            .container { padding: 0 15px; }
          }
        `}</style>
      </head>
      <body>
        {/* Header */}
        <section className="header">
          <div className="container">
            <h1>Papa Popup</h1>
            <p className="subtitle">Smart Popups & Quizzes That Convert Visitors Into Loyal Customers</p>
            <a href="#pricing" className="cta-button">Start Free Trial</a>
          </div>
        </section>

        {/* Benefits */}
        <section className="benefits">
          <div className="container">
            <h2 className="section-title">Why Papa Popup Works</h2>
            <p className="section-subtitle">Transform browsing into buying with intelligent popups that actually convert</p>
            <div className="benefits-grid">
              <div className="benefit-card">
                <div className="benefit-number">40%+</div>
                <h3 className="benefit-title">Conversion Increase</h3>
                <p>Average conversion rate improvement in the first month</p>
              </div>
              <div className="benefit-card">
                <div className="benefit-number">3x</div>
                <h3 className="benefit-title">Higher Engagement</h3>
                <p>Quiz-based approach creates 3x more engagement than traditional popups</p>
              </div>
              <div className="benefit-card">
                <div className="benefit-number">25%</div>
                <h3 className="benefit-title">Cart Recovery</h3>
                <p>Strategic exit-intent popups recover up to 25% of abandoning customers</p>
              </div>
              <div className="benefit-card">
                <div className="benefit-number">30s</div>
                <h3 className="benefit-title">Setup Time</h3>
                <p>Install and launch your first popup in under 30 seconds</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="features">
          <div className="container">
            <h2 className="section-title">Powerful Features That Drive Results</h2>
            <p className="section-subtitle">Everything you need to convert visitors into customers and grow your business</p>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">🎯</div>
                <h3 className="feature-title">Smart Targeting</h3>
                <p className="feature-desc">Advanced behavioral targeting based on location, device, traffic source, and user actions. Show the right message at the perfect moment.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📱</div>
                <h3 className="feature-title">Mobile Optimized</h3>
                <p className="feature-desc">Beautiful, responsive designs that look perfect on any device. Mobile-first approach ensures great experience across all platforms.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🧠</div>
                <h3 className="feature-title">Interactive Quizzes</h3>
                <p className="feature-desc">Create product recommendation quizzes that guide customers to their perfect purchase while capturing valuable preference data.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📊</div>
                <h3 className="feature-title">Advanced Analytics</h3>
                <p className="feature-desc">Real-time conversion tracking, funnel analysis, and performance insights. See exactly what's working and optimize accordingly.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🎨</div>
                <h3 className="feature-title">Professional Templates</h3>
                <p className="feature-desc">50+ beautifully designed templates for every industry. Fully customizable to match your brand perfectly.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">💌</div>
                <h3 className="feature-title">Email Integrations</h3>
                <p className="feature-desc">Seamless integration with Klaviyo, Mailchimp, and other platforms. Automatic tagging and list building.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🎁</div>
                <h3 className="feature-title">Smart Discounts</h3>
                <p className="feature-desc">Dynamic discount code generation with usage limits, expiration controls, and cart value-based optimization.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">⚡</div>
                <h3 className="feature-title">Lightning Fast</h3>
                <p className="feature-desc">Zero impact on site speed with optimized loading and CDN delivery. GDPR compliant and privacy-focused.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔄</div>
                <h3 className="feature-title">A/B Testing</h3>
                <p className="feature-desc">Test different designs, messages, and targeting to continuously improve your conversion rates automatically.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="testimonials">
          <div className="container">
            <h2 className="section-title">Success Stories</h2>
            <p className="section-subtitle">See how Papa Popup is transforming businesses worldwide</p>
            <div className="testimonials-grid">
              <div className="testimonial-card">
                <p className="testimonial-text">"Papa Popup increased our email signups by 300% in the first month. The quiz feature helped us understand our customers better and recommend the right products. Our conversion rate went from 2.1% to 3.4%!"</p>
                <div className="testimonial-author">Sarah Johnson</div>
                <div className="testimonial-role">Fashion Boutique Owner</div>
              </div>
              <div className="testimonial-card">
                <p className="testimonial-text">"The exit-intent popups alone recovered $15,000 in lost sales last quarter. The analytics dashboard shows exactly which messages work best. Game-changer for our business."</p>
                <div className="testimonial-author">Mike Chen</div>
                <div className="testimonial-role">Electronics Store Manager</div>
              </div>
              <div className="testimonial-card">
                <p className="testimonial-text">"Setup was incredibly easy and the results were immediate. We saw a 45% increase in newsletter signups within the first week. The mobile popups look amazing!"</p>
                <div className="testimonial-author">Lisa Rodriguez</div>
                <div className="testimonial-role">Beauty Brand Founder</div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="pricing">
          <div className="container">
            <h2 className="section-title">Simple, Transparent Pricing</h2>
            <p className="section-subtitle">Choose the plan that's right for your business. All plans include 14-day free trial.</p>
            <div className="pricing-grid">
              <div className="pricing-card">
                <h3 className="pricing-plan">Free</h3>
                <div className="pricing-price">$0</div>
                <div className="pricing-period">Perfect for getting started</div>
                <ul className="pricing-features">
                  <li>1 active popup</li>
                  <li>Basic templates</li>
                  <li>500 monthly popup views</li>
                  <li>Standard analytics</li>
                  <li>Email support</li>
                </ul>
                <a href="#" className="pricing-button">Get Started Free</a>
              </div>
              
              <div className="pricing-card featured">
                <div className="pricing-badge">Most Popular</div>
                <h3 className="pricing-plan">Pro</h3>
                <div className="pricing-price">$19</div>
                <div className="pricing-period">per month - For growing businesses</div>
                <ul className="pricing-features">
                  <li>Unlimited popups</li>
                  <li>All premium templates</li>
                  <li>Advanced targeting</li>
                  <li>A/B testing</li>
                  <li>10,000 monthly popup views</li>
                  <li>Quiz builder</li>
                  <li>Email integrations</li>
                  <li>Priority support</li>
                </ul>
                <a href="#" className="pricing-button">Start Free Trial</a>
              </div>
              
              <div className="pricing-card">
                <h3 className="pricing-plan">Enterprise</h3>
                <div className="pricing-price">$49</div>
                <div className="pricing-period">per month - For high-volume stores</div>
                <ul className="pricing-features">
                  <li>Everything in Pro</li>
                  <li>Unlimited popup views</li>
                  <li>Advanced analytics</li>
                  <li>Custom CSS & branding</li>
                  <li>API access</li>
                  <li>White-label options</li>
                  <li>Dedicated account manager</li>
                  <li>Custom integrations</li>
                </ul>
                <a href="#" className="pricing-button">Contact Sales</a>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <div className="container">
            <div className="footer-grid">
              <div className="footer-section">
                <h3>Papa Popup</h3>
                <p>Transform visitors into customers with intelligent popups and quizzes. Built by Shopify experts for e-commerce success.</p>
              </div>
              <div className="footer-section">
                <h3>Product</h3>
                <ul className="footer-links">
                  <li><a href="#features">Features</a></li>
                  <li><a href="#pricing">Pricing</a></li>
                  <li><a href="#">Templates</a></li>
                  <li><a href="#">Integrations</a></li>
                </ul>
              </div>
              <div className="footer-section">
                <h3>Support</h3>
                <ul className="footer-links">
                  <li><a href="mailto:sumeetkarwa@gmail.com">Contact Us</a></li>
                  <li><a href="#">Help Center</a></li>
                  <li><a href="#">Getting Started</a></li>
                  <li><a href="#">Best Practices</a></li>
                </ul>
              </div>
              <div className="footer-section">
                <h3>Legal</h3>
                <ul className="footer-links">
                  <li><a href="/privacy">Privacy Policy</a></li>
                  <li><a href="#">Terms of Service</a></li>
                  <li><a href="#">GDPR Compliance</a></li>
                </ul>
              </div>
            </div>
            <div className="footer-bottom">
              <p>&copy; 2025 Papa Popup. All rights reserved. Built for Shopify merchants worldwide.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}