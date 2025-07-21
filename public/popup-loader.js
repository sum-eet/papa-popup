(function() {
  'use strict';
  
  // Prevent duplicate loading
  if (window.papaPopupLoaded) {
    return;
  }
  window.papaPopupLoaded = true;

  const APP_URL = 'https://smartpop-revenue-engine.vercel.app';
  const POPUP_SHOWN_KEY = 'papa_popup_shown';
  
  // Parse current page type from URL
  function getPageType() {
    const path = window.location.pathname;
    
    if (path === '/' || path === '') return 'home';
    if (path.includes('/products/')) return 'product';
    if (path.includes('/collections/')) return 'collection';
    if (path.includes('/cart')) return 'cart';
    if (path.includes('/search')) return 'search';
    if (path.includes('/pages/')) return 'page';
    if (path.includes('/blogs/')) return 'blog';
    
    return 'other';
  }

  // Check if popup should show
  async function checkPopup() {
    try {
      // Skip if already shown in this session
      if (sessionStorage.getItem(POPUP_SHOWN_KEY)) {
        console.log('Papa Popup: Already shown in this session');
        return;
      }

      const shopDomain = window.location.hostname;
      const pageType = getPageType();
      const pageUrl = window.location.href;

      console.log('Papa Popup: Checking if popup should show', { shopDomain, pageType });

      const response = await fetch(`${APP_URL}/api/popup-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopDomain,
          pageType,
          pageUrl
        })
      });

      if (!response.ok) {
        console.log('Papa Popup: API check failed', response.status);
        return;
      }

      const data = await response.json();
      console.log('Papa Popup: API response', data);

      if (data.showPopup && data.config) {
        renderPopup(data.config);
      }
    } catch (error) {
      console.log('Papa Popup: Check failed', error);
    }
  }

  // Render the popup
  function renderPopup(config) {
    try {
      const popupHTML = `
        <div id="papa-popup-overlay" style="
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease-out;
        ">
          <div id="papa-popup-modal" style="
            background: white;
            padding: 40px;
            border-radius: 12px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            position: relative;
            animation: slideIn 0.3s ease-out;
          ">
            <button id="papa-popup-close" style="
              position: absolute;
              top: 15px;
              right: 15px;
              background: none;
              border: none;
              font-size: 24px;
              cursor: pointer;
              color: #666;
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
            " aria-label="Close">&times;</button>
            
            <h2 style="
              margin: 0 0 15px 0;
              font-size: 24px;
              color: #333;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">${config.headline}</h2>
            
            <p style="
              margin: 0 0 25px 0;
              color: #666;
              font-size: 16px;
              line-height: 1.5;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">${config.description}</p>
            
            <form id="papa-popup-form" style="
              display: flex;
              flex-direction: column;
              gap: 15px;
            ">
              <input type="email" id="papa-popup-email" placeholder="Enter your email" required style="
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 6px;
                font-size: 16px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                outline: none;
                transition: border-color 0.2s;
              ">
              <button type="submit" id="papa-popup-submit" style="
                background: #007cba;
                color: white;
                padding: 12px;
                border: none;
                border-radius: 6px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                transition: background-color 0.2s;
              ">${config.buttonText}</button>
            </form>
          </div>
        </div>

        <style>
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideIn {
            from { transform: translateY(-50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          #papa-popup-email:focus {
            border-color: #007cba !important;
          }
          #papa-popup-submit:hover {
            background: #005a87 !important;
          }
          #papa-popup-close:hover {
            background: rgba(0, 0, 0, 0.1) !important;
            border-radius: 4px;
          }
        </style>
      `;

      document.body.insertAdjacentHTML('beforeend', popupHTML);
      setupPopupEvents(config);
      console.log('Papa Popup: Rendered successfully');
    } catch (error) {
      console.log('Papa Popup: Render failed', error);
    }
  }

  // Setup popup event listeners
  function setupPopupEvents(config) {
    const overlay = document.getElementById('papa-popup-overlay');
    const closeBtn = document.getElementById('papa-popup-close');
    const form = document.getElementById('papa-popup-form');
    const emailInput = document.getElementById('papa-popup-email');
    const submitBtn = document.getElementById('papa-popup-submit');

    // Close popup function
    function closePopup() {
      if (overlay && overlay.parentNode) {
        overlay.remove();
      }
      sessionStorage.setItem(POPUP_SHOWN_KEY, 'true');
      console.log('Papa Popup: Closed');
    }

    // Close on overlay click
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closePopup();
      });
    }

    // Close on X button click
    if (closeBtn) {
      closeBtn.addEventListener('click', closePopup);
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePopup();
    });

    // Handle form submission
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!emailInput || !submitBtn) return;

        const email = emailInput.value.trim();
        if (!email) return;

        // Show loading state
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;

        try {
          const success = await submitEmail(email);
          if (success) {
            showSuccessMessage();
          } else {
            throw new Error('Submission failed');
          }
        } catch (error) {
          console.log('Papa Popup: Email submission failed', error);
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
          alert('Sorry, there was an error. Please try again.');
        }
      });
    }
  }

  // Submit email to collection endpoint
  async function submitEmail(email) {
    try {
      const response = await fetch(`${APP_URL}/api/collect-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          shopDomain: window.location.hostname
        })
      });

      return response.ok;
    } catch (error) {
      console.log('Papa Popup: Email submission error', error);
      return false;
    }
  }

  // Show success message
  function showSuccessMessage() {
    const modal = document.getElementById('papa-popup-modal');
    if (modal) {
      modal.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <div style="
            width: 60px;
            height: 60px;
            background: #28a745;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            color: white;
            font-size: 24px;
          ">✓</div>
          <h2 style="
            color: #28a745;
            margin: 0 0 15px 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">Thank you!</h2>
          <p style="
            color: #666;
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">Successfully subscribed to our newsletter.</p>
        </div>
      `;
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        const overlay = document.getElementById('papa-popup-overlay');
        if (overlay && overlay.parentNode) {
          overlay.remove();
        }
        sessionStorage.setItem(POPUP_SHOWN_KEY, 'true');
      }, 3000);
    }
  }

  // Wait for DOM ready and then check popup
  function initPopup() {
    // Wait 2 seconds after DOM ready for better UX
    setTimeout(() => {
      checkPopup();
    }, 2000);
  }

  // DOM ready detection
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPopup);
  } else {
    initPopup();
  }

  console.log('Papa Popup: Loader initialized');
})();