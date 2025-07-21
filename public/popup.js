(function() {
  'use strict';
  
  // Get shop domain from the current URL
  const shopDomain = window.location.hostname;
  
  // Check if popup has already been shown in this session
  const POPUP_SHOWN_KEY = 'papa_popup_shown';
  if (sessionStorage.getItem(POPUP_SHOWN_KEY)) {
    return;
  }

  // Fetch popup configuration
  async function fetchPopupConfig() {
    try {
      // This would need to be your actual app URL
      const response = await fetch(`${window.location.origin}/api/popup-config?shop=${shopDomain}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.warn('Papa Popup: Failed to fetch config', error);
      return null;
    }
  }

  // Create popup HTML
  function createPopupHTML(config) {
    return `
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
          ">&times;</button>
          
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
            ">
            <button type="submit" style="
              background: #007cba;
              color: white;
              padding: 12px;
              border: none;
              border-radius: 6px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">${config.buttonText}</button>
          </form>
        </div>
      </div>
    `;
  }

  // Submit email
  async function submitEmail(email, config) {
    try {
      // This should match your collect-email API endpoint
      const response = await fetch('/api/collect-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          shopDomain: shopDomain
        })
      });
      
      return response.ok;
    } catch (error) {
      console.error('Papa Popup: Failed to submit email', error);
      return false;
    }
  }

  // Show success message
  function showSuccessMessage() {
    const modal = document.getElementById('papa-popup-modal');
    if (modal) {
      modal.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <h2 style="
            color: #28a745;
            margin: 0 0 15px 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">Success!</h2>
          <p style="
            color: #666;
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">Thank you for subscribing!</p>
        </div>
      `;
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        closePopup();
      }, 2000);
    }
  }

  // Close popup
  function closePopup() {
    const overlay = document.getElementById('papa-popup-overlay');
    if (overlay) {
      overlay.remove();
    }
    sessionStorage.setItem(POPUP_SHOWN_KEY, 'true');
  }

  // Initialize popup
  async function initPopup() {
    // Wait a bit for page to load
    setTimeout(async () => {
      const config = await fetchPopupConfig();
      if (!config || !config.enabled) return;

      // Create and inject popup
      const popupHTML = createPopupHTML(config);
      document.body.insertAdjacentHTML('beforeend', popupHTML);

      // Add event listeners
      const overlay = document.getElementById('papa-popup-overlay');
      const closeBtn = document.getElementById('papa-popup-close');
      const form = document.getElementById('papa-popup-form');
      const emailInput = document.getElementById('papa-popup-email');

      // Close on overlay click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closePopup();
      });

      // Close on X button click
      closeBtn.addEventListener('click', closePopup);

      // Handle form submission
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        
        if (!email) return;

        const success = await submitEmail(email, config);
        if (success) {
          showSuccessMessage();
        } else {
          alert('Sorry, there was an error. Please try again.');
        }
      });

      // Close on Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePopup();
      });

    }, 2000); // Show popup after 2 seconds
  }

  // Start the popup when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPopup);
  } else {
    initPopup();
  }
})();