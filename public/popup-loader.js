(function() {
  'use strict';
  
  // Prevent duplicate loading
  if (window.papaPopupLoaded) {
    return;
  }
  window.papaPopupLoaded = true;

  const APP_URL = 'https://smartpop-revenue-engine.vercel.app';
  const POPUP_SHOWN_KEY = 'papa_popup_shown';
  const SESSION_KEY = 'papa_popup_session';
  
  // Global state management
  let currentPopupState = {
    sessionToken: null,
    currentStep: 1,
    totalSteps: 1,
    popupType: 'SIMPLE_EMAIL',
    responses: {},
    popup: null
  };
  
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

  // Convert multi-popup config to legacy format for fallback
  function convertMultiToLegacyConfig(multiConfig) {
    console.log('🔄 Papa Popup: Converting multi-popup config to legacy format', multiConfig);
    
    if (!multiConfig || !multiConfig.steps || multiConfig.steps.length === 0) {
      console.log('⚠️ Papa Popup: No config or steps found, using default fallback');
      return {
        headline: 'Subscribe to our newsletter',
        description: 'Get exclusive deals and updates',
        buttonText: 'Subscribe'
      };
    }

    // Find the first EMAIL step or use fallback
    const emailStep = multiConfig.steps.find(step => step.stepType === 'EMAIL');
    console.log('📧 Papa Popup: Found email step:', emailStep);
    
    if (emailStep && emailStep.content) {
      const result = {
        headline: emailStep.content.headline || 'Subscribe to our newsletter',
        description: emailStep.content.description || 'Get exclusive deals and updates',
        buttonText: emailStep.content.buttonText || 'Subscribe'
      };
      console.log('✅ Papa Popup: Legacy config conversion result:', result);
      return result;
    }

    // Fallback if no email step found
    console.log('⚠️ Papa Popup: No email step found, using quiz fallback');
    return {
      headline: 'Complete our quiz!',
      description: 'Help us understand your preferences',
      buttonText: 'Get Started'
    };
  }

  // Try to fetch multi-popup directly (bypass feature flag)
  async function tryFetchMultiPopup() {
    console.log('🎯 Papa Popup: Checking for active multi-popups...');
    
    try {
      const shopDomain = window.location.hostname;
      const pageType = getPageType();
      
      // Direct call to get active popups (this will work even with ENABLE_MULTI_POPUP=false)
      const response = await fetch(`${APP_URL}/api/popup-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopDomain,
          pageType,
          pageUrl: window.location.href,
          forceMultiCheck: true // Signal to try multi-popup even if flag is off
        })
      });

      if (!response.ok) {
        console.log('📊 Papa Popup: Multi-popup check failed, will try legacy');
        return null;
      }

      const data = await response.json();
      
      // Check if we got a multi-popup response
      if (data.showPopup && data.config && data.config.popupType && data.config.popupType !== 'SIMPLE_EMAIL') {
        console.log('✅ Papa Popup: Found multi-step popup:', data.config.popupType);
        return data.config;
      }
      
      console.log('📊 Papa Popup: No multi-step popups found, will use legacy');
      return null;
      
    } catch (error) {
      console.log('📊 Papa Popup: Multi-popup check error:', error);
      return null;
    }
  }

  // Check if popup should show
  async function checkPopup() {
    console.log('🔍 Papa Popup: Starting popup check process...');
    
    try {
      // Skip if already shown in this session
      if (sessionStorage.getItem(POPUP_SHOWN_KEY)) {
        console.log('⏭️ Papa Popup: Already shown in this session, skipping');
        return;
      }

      const shopDomain = window.location.hostname;
      const pageType = getPageType();
      const pageUrl = window.location.href;

      console.log('📊 Papa Popup: Gathered page info:', { 
        shopDomain, 
        pageType, 
        pageUrl,
        userAgent: navigator.userAgent.substring(0, 50) + '...',
        timestamp: new Date().toISOString()
      });

      // Step 1: Try to find active multi-popups first
      const multiPopupConfig = await tryFetchMultiPopup();
      
      if (multiPopupConfig) {
        console.log('🎯 Papa Popup: Using multi-step popup system');
        await initializeMultiStepPopup(multiPopupConfig);
        return;
      }

      // Step 2: Fall back to legacy system
      console.log('🌐 Papa Popup: Falling back to legacy popup check');

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

      console.log('📡 Papa Popup: Legacy API response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        console.log('❌ Papa Popup: Legacy API check failed with status:', response.status);
        return;
      }

      const data = await response.json();
      console.log('📋 Papa Popup: Legacy API response data:', JSON.stringify(data, null, 2));

      if (data.showPopup && data.config) {
        console.log('✅ Papa Popup: Using legacy popup');
        renderLegacyPopup(data.config);
      } else {
        console.log('🚫 Papa Popup: No popup to show');
      }
    } catch (error) {
      console.error('💥 Papa Popup: Check failed with error:', error);
    }
  }

  // Initialize multi-step popup session
  async function initializeMultiStepPopup(config) {
    console.log('🎯 Papa Popup: Initializing multi-step popup session...');
    
    try {
      const response = await fetch(`${APP_URL}/api/session/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopDomain: window.location.hostname,
          popupId: config.popupId,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent
        })
      });

      if (!response.ok) {
        console.log('❌ Papa Popup: Session creation failed, falling back to legacy');
        renderLegacyPopup(config);
        return;
      }

      const sessionData = await response.json();
      console.log('✅ Papa Popup: Session created:', sessionData);

      // Update global state
      currentPopupState = {
        sessionToken: sessionData.sessionToken,
        currentStep: sessionData.currentStep,
        totalSteps: sessionData.totalSteps,
        popupType: sessionData.popup.type,
        responses: {},
        popup: sessionData.popup
      };

      // Save session to localStorage for persistence
      localStorage.setItem(SESSION_KEY, JSON.stringify(currentPopupState));

      // Render the multi-step popup
      renderMultiStepPopup();

    } catch (error) {
      console.error('💥 Papa Popup: Multi-step initialization failed:', error);
      
      // Convert multi-popup config to legacy format for fallback
      const legacyConfig = convertMultiToLegacyConfig(config);
      renderLegacyPopup(legacyConfig);
    }
  }

  // Render multi-step popup
  function renderMultiStepPopup() {
    console.log('🎨 Papa Popup: Rendering multi-step popup...');
    
    const currentStepData = getCurrentStepData();
    if (!currentStepData) {
      console.error('❌ Papa Popup: No step data available');
      return;
    }

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
          
          ${renderProgressIndicator()}
          ${renderStepContent(currentStepData)}
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
        .papa-popup-option {
          padding: 12px 16px;
          margin: 8px 0;
          background: #f8f9fa;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .papa-popup-option:hover {
          background: #e9ecef;
          border-color: #007cba;
        }
        .papa-popup-option.selected {
          background: #007cba;
          color: white;
          border-color: #005a87;
        }
        .papa-popup-input {
          padding: 12px;
          border: 2px solid #ddd;
          border-radius: 6px;
          font-size: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          outline: none;
          transition: border-color 0.2s;
          width: 100%;
          box-sizing: border-box;
        }
        .papa-popup-input:focus {
          border-color: #007cba !important;
        }
        .papa-popup-button {
          background: #007cba;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          transition: background-color 0.2s;
          margin: 5px;
        }
        .papa-popup-button:hover {
          background: #005a87 !important;
        }
        .papa-popup-button:disabled {
          background: #ccc !important;
          cursor: not-allowed;
        }
        .papa-popup-discount-code {
          font-size: 24px;
          font-weight: bold;
          color: #007cba;
          background: #f0f9ff;
          padding: 16px;
          border: 2px dashed #007cba;
          border-radius: 8px;
          margin: 20px 0;
        }
      </style>
    `;

    document.body.insertAdjacentHTML('beforeend', popupHTML);
    setupMultiStepEvents();
    console.log('✅ Papa Popup: Multi-step popup rendered successfully!');
  }

  // Get current step data
  function getCurrentStepData() {
    if (!currentPopupState.popup || !currentPopupState.popup.steps) {
      return null;
    }

    return currentPopupState.popup.steps.find(
      step => step.stepNumber === currentPopupState.currentStep
    );
  }

  // Render progress indicator
  function renderProgressIndicator() {
    if (currentPopupState.totalSteps <= 1) {
      return '';
    }

    return `
      <div style="
        margin-bottom: 20px;
        padding-bottom: 20px;
        border-bottom: 1px solid #eee;
      ">
        <div style="
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        ">
          ${Array.from({ length: currentPopupState.totalSteps }, (_, i) => {
            const stepNum = i + 1;
            const isActive = stepNum === currentPopupState.currentStep;
            const isCompleted = stepNum < currentPopupState.currentStep;
            
            return `
              <div style="
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: ${isActive ? '#007cba' : isCompleted ? '#28a745' : '#ddd'};
              "></div>
            `;
          }).join('')}
        </div>
        <p style="
          margin: 0;
          font-size: 14px;
          color: #666;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">Step ${currentPopupState.currentStep} of ${currentPopupState.totalSteps}</p>
      </div>
    `;
  }

  // Render step content based on type
  function renderStepContent(stepData) {
    const { stepType, content } = stepData;

    switch (stepType) {
      case 'QUESTION':
        return renderQuestionStep(content);
      case 'EMAIL':
        return renderEmailStep(content);
      case 'DISCOUNT_REVEAL':
        return renderDiscountStep(content);
      case 'CONTENT':
        return renderContentStep(content);
      default:
        return renderEmailStep(content);
    }
  }

  // Render question step
  function renderQuestionStep(content) {
    const options = content.options || [];
    
    return `
      <div id="papa-popup-step-content">
        <h2 style="
          margin: 0 0 20px 0;
          font-size: 22px;
          color: #333;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.3;
        ">${content.question || 'Question'}</h2>
        
        <div id="papa-popup-options" style="margin-bottom: 20px;">
          ${options.map((option, index) => `
            <div class="papa-popup-option" data-value="${option.value}" data-index="${index}">
              ${option.text}
            </div>
          `).join('')}
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-top: 20px;">
          ${currentPopupState.currentStep > 1 ? 
            '<button class="papa-popup-button" id="papa-popup-back">Back</button>' : 
            '<div></div>'
          }
          <button class="papa-popup-button" id="papa-popup-next" disabled>Next</button>
        </div>
      </div>
    `;
  }

  // Render email step
  function renderEmailStep(content) {
    return `
      <div id="papa-popup-step-content">
        <h2 style="
          margin: 0 0 15px 0;
          font-size: 24px;
          color: #333;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">${content.headline || 'Get 10% Off!'}</h2>
        
        <p style="
          margin: 0 0 25px 0;
          color: #666;
          font-size: 16px;
          line-height: 1.5;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">${content.description || 'Subscribe to our newsletter'}</p>
        
        <form id="papa-popup-email-form" style="margin-bottom: 20px;">
          <input type="email" 
                 id="papa-popup-email" 
                 class="papa-popup-input"
                 placeholder="${content.placeholder || 'Enter your email'}" 
                 required 
                 style="margin-bottom: 15px;">
          <button type="submit" 
                  class="papa-popup-button" 
                  id="papa-popup-submit" 
                  style="width: 100%;">
            ${content.buttonText || 'Subscribe'}
          </button>
        </form>
        
        ${currentPopupState.currentStep > 1 ? 
          '<button class="papa-popup-button" id="papa-popup-back" style="width: 100%; background: #6c757d;">Back</button>' : 
          ''
        }
      </div>
    `;
  }

  // Render discount step
  function renderDiscountStep(content) {
    return `
      <div id="papa-popup-step-content">
        <h2 style="
          margin: 0 0 20px 0;
          font-size: 24px;
          color: #333;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">${content.headline || "Here's your discount!"}</h2>
        
        ${content.description ? `
          <p style="
            margin: 0 0 20px 0;
            color: #666;
            font-size: 16px;
            line-height: 1.5;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">${content.description}</p>
        ` : ''}
        
        <div class="papa-popup-discount-code">
          ${content.codeDisplay || 'SAVE10'}
        </div>
        
        ${content.validityText ? `
          <p style="
            margin: 10px 0 20px 0;
            color: #666;
            font-size: 14px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">${content.validityText}</p>
        ` : ''}
        
        <button class="papa-popup-button" id="papa-popup-close-final" style="width: 100%;">
          Close
        </button>
      </div>
    `;
  }

  // Render content step
  function renderContentStep(content) {
    return `
      <div id="papa-popup-step-content">
        <h2 style="
          margin: 0 0 20px 0;
          font-size: 24px;
          color: #333;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">${content.headline || 'Welcome!'}</h2>
        
        ${content.description ? `
          <p style="
            margin: 0 0 25px 0;
            color: #666;
            font-size: 16px;
            line-height: 1.5;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">${content.description}</p>
        ` : ''}
        
        <div style="display: flex; justify-content: space-between; margin-top: 20px;">
          ${currentPopupState.currentStep > 1 ? 
            '<button class="papa-popup-button" id="papa-popup-back">Back</button>' : 
            '<div></div>'
          }
          <button class="papa-popup-button" id="papa-popup-next">Continue</button>
        </div>
      </div>
    `;
  }

  // Setup multi-step event listeners
  function setupMultiStepEvents() {
    const overlay = document.getElementById('papa-popup-overlay');
    const closeBtn = document.getElementById('papa-popup-close');

    // Close popup function
    function closePopup() {
      if (overlay && overlay.parentNode) {
        overlay.remove();
      }
      sessionStorage.setItem(POPUP_SHOWN_KEY, 'true');
      localStorage.removeItem(SESSION_KEY);
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

    // Setup step-specific events
    const currentStepData = getCurrentStepData();
    if (currentStepData) {
      setupStepEvents(currentStepData.stepType, closePopup);
    }
  }

  // Setup events for specific step types
  function setupStepEvents(stepType, closePopup) {
    switch (stepType) {
      case 'QUESTION':
        setupQuestionEvents();
        break;
      case 'EMAIL':
        setupEmailEvents(closePopup);
        break;
      case 'DISCOUNT_REVEAL':
        setupDiscountEvents(closePopup);
        break;
      case 'CONTENT':
        setupContentEvents();
        break;
    }
  }

  // Setup question step events
  function setupQuestionEvents() {
    const options = document.querySelectorAll('.papa-popup-option');
    const nextBtn = document.getElementById('papa-popup-next');
    const backBtn = document.getElementById('papa-popup-back');
    
    let selectedOption = null;

    // Option selection
    options.forEach(option => {
      option.addEventListener('click', () => {
        // Remove selection from all options
        options.forEach(opt => opt.classList.remove('selected'));
        
        // Select clicked option
        option.classList.add('selected');
        selectedOption = {
          value: option.dataset.value,
          text: option.textContent.trim(),
          index: parseInt(option.dataset.index)
        };
        
        // Enable next button
        if (nextBtn) {
          nextBtn.disabled = false;
        }
      });
    });

    // Next button
    if (nextBtn) {
      nextBtn.addEventListener('click', async () => {
        if (selectedOption) {
          await handleStepNavigation('next', selectedOption);
        }
      });
    }

    // Back button
    if (backBtn) {
      backBtn.addEventListener('click', async () => {
        await handleStepNavigation('back');
      });
    }
  }

  // Setup email step events
  function setupEmailEvents(closePopup) {
    const form = document.getElementById('papa-popup-email-form');
    const emailInput = document.getElementById('papa-popup-email');
    const submitBtn = document.getElementById('papa-popup-submit');
    const backBtn = document.getElementById('papa-popup-back');

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
          const success = await submitEmailWithSession(email);
          if (success) {
            showSuccessMessage();
            setTimeout(closePopup, 3000);
          } else {
            throw new Error('Submission failed');
          }
        } catch (error) {
          console.error('💥 Papa Popup: Email submission failed:', error);
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
          alert('Sorry, there was an error. Please try again.');
        }
      });
    }

    // Back button
    if (backBtn) {
      backBtn.addEventListener('click', async () => {
        await handleStepNavigation('back');
      });
    }
  }

  // Setup discount step events
  function setupDiscountEvents(closePopup) {
    const closeFinalBtn = document.getElementById('papa-popup-close-final');
    
    if (closeFinalBtn) {
      closeFinalBtn.addEventListener('click', closePopup);
    }
  }

  // Setup content step events
  function setupContentEvents() {
    const nextBtn = document.getElementById('papa-popup-next');
    const backBtn = document.getElementById('papa-popup-back');

    if (nextBtn) {
      nextBtn.addEventListener('click', async () => {
        await handleStepNavigation('next');
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', async () => {
        await handleStepNavigation('back');
      });
    }
  }

  // Handle step navigation
  async function handleStepNavigation(direction, stepResponse = null) {
    console.log(`🔄 Papa Popup: Navigating ${direction}`, stepResponse);

    try {
      const response = await fetch(`${APP_URL}/api/session/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionToken: currentPopupState.sessionToken,
          shopDomain: window.location.hostname,
          stepNumber: direction === 'back' ? 
            Math.max(1, currentPopupState.currentStep - 1) :
            currentPopupState.currentStep,
          stepResponse,
          action: direction === 'back' ? 'navigate' : (stepResponse ? 'answer' : 'navigate')
        })
      });

      if (!response.ok) {
        throw new Error('Navigation failed');
      }

      const data = await response.json();
      console.log('✅ Papa Popup: Navigation successful:', data);

      // Update state
      currentPopupState.currentStep = data.currentStep;
      currentPopupState.responses = data.responses;
      
      // Save updated state
      localStorage.setItem(SESSION_KEY, JSON.stringify(currentPopupState));

      // Re-render popup with new step
      const overlay = document.getElementById('papa-popup-overlay');
      if (overlay) {
        overlay.remove();
      }
      renderMultiStepPopup();

    } catch (error) {
      console.error('💥 Papa Popup: Navigation failed:', error);
      alert('Sorry, there was an error. Please try again.');
    }
  }

  // Submit email with session data
  async function submitEmailWithSession(email) {
    console.log('📧 Papa Popup: Submitting email with session...');
    
    try {
      const response = await fetch(`${APP_URL}/api/collect-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          shopDomain: window.location.hostname,
          sessionToken: currentPopupState.sessionToken,
          quizResponses: currentPopupState.responses,
          popupId: currentPopupState.popup.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Papa Popup: Email submitted successfully:', data);
        
        // If discount code was generated, show it
        if (data.discountCode) {
          currentPopupState.discountCode = data.discountCode;
        }
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('💥 Papa Popup: Email submission error:', error);
      return false;
    }
  }

  // Render legacy popup (backward compatibility)
  function renderLegacyPopup(config) {
    console.log('🎨 Papa Popup: Rendering legacy popup...');
    
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
    setupLegacyPopupEvents();
    console.log('✅ Papa Popup: Legacy popup rendered successfully!');
  }

  // Setup legacy popup events
  function setupLegacyPopupEvents() {
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
            setTimeout(closePopup, 3000);
          } else {
            throw new Error('Submission failed');
          }
        } catch (error) {
          console.error('💥 Papa Popup: Form submission failed:', error);
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
          alert('Sorry, there was an error. Please try again.');
        }
      });
    }
  }

  // Submit email (legacy)
  async function submitEmail(email) {
    console.log('📧 Papa Popup: Submitting email (legacy):', email);
    
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
      console.error('💥 Papa Popup: Email submission error:', error);
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
          ${currentPopupState.discountCode ? `
            <div style="margin-top: 20px;">
              <p style="color: #666; margin: 10px 0; font-size: 14px;">Here's your discount code:</p>
              <div class="papa-popup-discount-code">${currentPopupState.discountCode}</div>
            </div>
          ` : ''}
        </div>
      `;
    }
  }

  // Wait for DOM ready and then check popup
  function initPopup() {
    console.log('⏰ Papa Popup: DOM ready, waiting 2 seconds before checking popup...');
    setTimeout(() => {
      console.log('⏰ Papa Popup: 2 second delay complete, starting popup check...');
      checkPopup();
    }, 2000);
  }

  // DOM ready detection
  console.log('🔄 Papa Popup: Checking document ready state:', document.readyState);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPopup);
  } else {
    initPopup();
  }

  // Add global helper functions for testing
  window.clearPapaPopup = function() {
    console.log('🧹 Clearing Papa Popup session data...');
    sessionStorage.removeItem(POPUP_SHOWN_KEY);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem('smartpop_shown');
    sessionStorage.removeItem('popup_shown');
    console.log('✅ Papa Popup session data cleared! Reload page to test popup.');
  };

  window.testPapaPopup = function() {
    console.log('🧪 Testing Papa Popup immediately...');
    sessionStorage.removeItem(POPUP_SHOWN_KEY);
    localStorage.removeItem(SESSION_KEY);
    checkPopup();
  };

  window.debugPapaPopup = function() {
    console.log('🔍 Papa Popup Debug Info:', {
      scriptLoaded: window.papaPopupLoaded,
      currentState: currentPopupState,
      sessionStorage: {
        papaPopupShown: sessionStorage.getItem(POPUP_SHOWN_KEY),
        sessionData: localStorage.getItem(SESSION_KEY)
      },
      currentPage: {
        url: window.location.href,
        hostname: window.location.hostname,
        pathname: window.location.pathname,
        pageType: getPageType()
      },
      appUrl: APP_URL
    });
  };

  console.log('🚀 Papa Popup Enhanced: Loader script initialized successfully!');
  console.log('💡 Papa Popup: Helper functions available:');
  console.log('   - clearPapaPopup() - Clear session data');
  console.log('   - testPapaPopup() - Test popup immediately');  
  console.log('   - debugPapaPopup() - Show debug info');
})();