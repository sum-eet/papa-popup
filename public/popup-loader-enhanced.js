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

  // Analytics tracking
  function trackAnalyticsEvent(eventType, metadata = {}) {
    try {
      const eventData = {
        eventType,
        shopDomain: window.Shopify?.shop || 'unknown',
        sessionToken: currentPopupState.sessionToken,
        popupId: currentPopupState.popup?.id,
        stepNumber: currentPopupState.currentStep,
        metadata,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent
      };

      // Send to analytics API
      fetch(`${APP_URL}/api/analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData)
      }).catch(error => {
        console.warn('Papa Popup: Analytics tracking failed:', error);
      });
      
      console.log('📊 Papa Popup: Tracked event:', eventType, metadata);
    } catch (error) {
      console.warn('Papa Popup: Analytics error:', error);
    }
  }

  // Track loaded CSS to avoid duplicates
  let loadedPopupCSS = null;
  
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

  // Load dynamic popup CSS
  async function loadPopupCSS(popupId) {
    // Skip if already loaded for this popup
    if (loadedPopupCSS === popupId) {
      console.log('🎨 Papa Popup: CSS already loaded for popup:', popupId);
      return;
    }

    try {
      console.log('🎨 Papa Popup: Loading dynamic CSS for popup:', popupId);
      
      // Remove existing dynamic styles
      const existingStyles = document.getElementById('papa-popup-dynamic-styles');
      if (existingStyles) {
        existingStyles.remove();
      }

      // Create link element for dynamic CSS
      const linkElement = document.createElement('link');
      linkElement.id = 'papa-popup-dynamic-styles';
      linkElement.rel = 'stylesheet';
      linkElement.type = 'text/css';
      linkElement.href = `${APP_URL}/api/popup-styles/${popupId}/css`;
      
      // Add to head
      document.head.appendChild(linkElement);
      
      // Wait for CSS to load
      await new Promise((resolve, reject) => {
        linkElement.onload = resolve;
        linkElement.onerror = () => {
          console.warn('⚠️ Papa Popup: Failed to load dynamic CSS, using fallback');
          resolve(); // Don't reject, just continue with fallback styles
        };
        // Timeout after 3 seconds
        setTimeout(resolve, 3000);
      });

      loadedPopupCSS = popupId;
      console.log('✅ Papa Popup: Dynamic CSS loaded successfully');
      
    } catch (error) {
      console.warn('⚠️ Papa Popup: Error loading dynamic CSS:', error);
      // Continue without dynamic styles - fallback styles will be used
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
      renderLegacyPopup(config);
    }
  }

  // Render multi-step popup
  async function renderMultiStepPopup() {
    console.log('🎨 Papa Popup: Rendering multi-step popup...');
    
    const currentStepData = getCurrentStepData();
    if (!currentStepData) {
      console.error('❌ Papa Popup: No step data available');
      return;
    }

    // Load dynamic CSS for this popup
    if (currentPopupState.popup && currentPopupState.popup.id) {
      await loadPopupCSS(currentPopupState.popup.id);
    }

    const popupHTML = `
      <div id="papa-popup-overlay">
        <div id="papa-popup-modal">
          <button id="papa-popup-close" aria-label="Close">&times;</button>
          ${renderProgressIndicator()}
          ${renderStepContent(currentStepData)}
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', popupHTML);
    
    // Track impression and step view
    trackAnalyticsEvent('impression', {
      popupType: currentPopupState.popupType,
      totalSteps: currentPopupState.totalSteps,
      pageType: getPageType()
    });
    
    trackAnalyticsEvent('step_view', {
      stepNumber: currentPopupState.currentStep,
      stepType: currentStepData?.stepType
    });
    
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
      <div class="papa-popup-progress">
        <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-bottom: 10px;">
          ${Array.from({ length: currentPopupState.totalSteps }, (_, i) => {
            const stepNum = i + 1;
            const isActive = stepNum === currentPopupState.currentStep;
            const isCompleted = stepNum < currentPopupState.currentStep;
            
            return `
              <div class="papa-popup-progress-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}"></div>
            `;
          }).join('')}
        </div>
        <p class="papa-popup-text" style="margin: 0; font-size: 14px;">Step ${currentPopupState.currentStep} of ${currentPopupState.totalSteps}</p>
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
        <h2 class="papa-popup-heading">${content.question || 'Question'}</h2>
        
        <div id="papa-popup-options" style="margin-bottom: 20px;">
          ${options.map((option, index) => `
            <div class="papa-popup-option" data-value="${option.value}" data-index="${index}">
              ${option.text}
            </div>
          `).join('')}
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-top: 20px;">
          ${currentPopupState.currentStep > 1 ? 
            '<button class="papa-popup-button secondary" id="papa-popup-back">Back</button>' : 
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
        <h2 class="papa-popup-heading">${content.headline || 'Get 10% Off!'}</h2>
        
        <p class="papa-popup-text">${content.description || 'Subscribe to our newsletter'}</p>
        
        <form id="papa-popup-email-form" style="margin-bottom: 20px;">
          <input type="email" 
                 id="papa-popup-email" 
                 class="papa-popup-input"
                 placeholder="${content.placeholder || 'Enter your email'}" 
                 required>
          <button type="submit" 
                  class="papa-popup-button" 
                  id="papa-popup-submit" 
                  style="width: 100%;">
            ${content.buttonText || 'Subscribe'}
          </button>
        </form>
        
        ${currentPopupState.currentStep > 1 ? 
          '<button class="papa-popup-button secondary" id="papa-popup-back" style="width: 100%;">Back</button>' : 
          ''
        }
      </div>
    `;
  }

  // Render discount step
  function renderDiscountStep(content) {
    return `
      <div id="papa-popup-step-content">
        <h2 class="papa-popup-heading">${content.headline || "Here's your discount!"}</h2>
        
        ${content.description ? `
          <p class="papa-popup-text">${content.description}</p>
        ` : ''}
        
        <div class="papa-popup-discount-code">
          ${content.codeDisplay || 'SAVE10'}
        </div>
        
        ${content.validityText ? `
          <p class="papa-popup-text" style="font-size: 14px;">${content.validityText}</p>
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
        <h2 class="papa-popup-heading">${content.headline || 'Welcome!'}</h2>
        
        ${content.description ? `
          <p class="papa-popup-text">${content.description}</p>
        ` : ''}
        
        <div style="display: flex; justify-content: space-between; margin-top: 20px;">
          ${currentPopupState.currentStep > 1 ? 
            '<button class="papa-popup-button secondary" id="papa-popup-back">Back</button>' : 
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
  async function renderLegacyPopup(config) {
    console.log('🎨 Papa Popup: Rendering legacy popup...');
    
    // Load dynamic CSS if popupId is available
    if (config.popupId) {
      await loadPopupCSS(config.popupId);
    }
    
    const popupHTML = `
      <div id="papa-popup-overlay">
        <div id="papa-popup-modal">
          <button id="papa-popup-close" aria-label="Close">&times;</button>
          
          <h2 class="papa-popup-heading">${config.headline}</h2>
          
          <p class="papa-popup-text">${config.description}</p>
          
          <form id="papa-popup-form" style="display: flex; flex-direction: column; gap: 15px;">
            <input type="email" 
                   id="papa-popup-email" 
                   class="papa-popup-input"
                   placeholder="Enter your email" 
                   required>
            <button type="submit" 
                    id="papa-popup-submit" 
                    class="papa-popup-button">
              ${config.buttonText}
            </button>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', popupHTML);
    
    // Track impression
    trackAnalyticsEvent('impression', {
      popupType: 'legacy',
      pageType: getPageType()
    });
    
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
        // Track close event
        trackAnalyticsEvent('close', {
          popupType: 'legacy',
          method: 'manual_close'
        });
        
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
          // Track email submission attempt
          trackAnalyticsEvent('button_click', {
            buttonType: 'email_submit',
            email: email
          });
          
          const success = await submitEmail(email);
          if (success) {
            // Track successful completion
            trackAnalyticsEvent('complete', {
              popupType: 'legacy',
              email: email
            });
            
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
          <h2 class="papa-popup-heading" style="color: #28a745;">Thank you!</h2>
          <p class="papa-popup-text">Successfully subscribed to our newsletter.</p>
          ${currentPopupState.discountCode ? `
            <div style="margin-top: 20px;">
              <p class="papa-popup-text" style="font-size: 14px;">Here's your discount code:</p>
              <div class="papa-popup-discount-code">${currentPopupState.discountCode}</div>
            </div>
          ` : ''}
        </div>
      `;
    }
  }

  // Check popup with trigger evaluation
  async function checkPopupWithTrigger() {
    console.log('🎯 Papa Popup: Starting popup check with trigger evaluation...');
    
    try {
      // Skip if already shown in this session
      if (sessionStorage.getItem(POPUP_SHOWN_KEY)) {
        console.log('⏭️ Papa Popup: Already shown in this session, skipping');
        return;
      }

      const shopDomain = window.location.hostname;
      const pageType = getPageType();
      const pageUrl = window.location.href;

      console.log('📊 Papa Popup: Fetching popup config with trigger info...');

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
        console.log('❌ Papa Popup: API check failed with status:', response.status);
        return;
      }

      const data = await response.json();
      console.log('📋 Papa Popup: API response with trigger config:', JSON.stringify(data, null, 2));

      if (data.showPopup && data.config) {
        const triggerConfig = data.config.triggerConfig || { type: 'delay', value: 2 };
        console.log('🔧 Papa Popup: Evaluating trigger:', triggerConfig);
        
        await evaluateTrigger(triggerConfig, data.config);
      } else {
        console.log('🚫 Papa Popup: No popup to show');
      }
    } catch (error) {
      console.error('💥 Papa Popup: Trigger evaluation failed:', error);
    }
  }

  // Evaluate trigger and show popup when condition is met
  async function evaluateTrigger(triggerConfig, popupConfig) {
    const { type, value } = triggerConfig;
    
    console.log(`⏰ Papa Popup: Evaluating ${type} trigger with value:`, value);
    
    switch (type) {
      case 'delay':
        const delaySeconds = parseInt(value) || 2;
        console.log(`⏰ Papa Popup: Setting ${delaySeconds}s delay trigger...`);
        setTimeout(() => {
          console.log(`⏰ Papa Popup: ${delaySeconds}s delay completed, showing popup...`);
          showPopupWithConfig(popupConfig);
        }, delaySeconds * 1000);
        break;
        
      case 'scroll':
        const scrollPercentage = parseInt(value) || 50;
        console.log(`📜 Papa Popup: Setting ${scrollPercentage}% scroll trigger...`);
        setupScrollTrigger(scrollPercentage, popupConfig);
        break;
        
      default:
        console.log(`⚠️ Papa Popup: Unknown trigger type: ${type}, defaulting to 2s delay`);
        setTimeout(() => {
          showPopupWithConfig(popupConfig);
        }, 2000);
    }
  }

  // Setup scroll percentage trigger
  function setupScrollTrigger(percentage, popupConfig) {
    let triggered = false;
    
    const checkScroll = () => {
      if (triggered) return;
      
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / documentHeight) * 100);
      
      console.log(`📜 Papa Popup: Current scroll: ${scrollPercent}%, target: ${percentage}%`);
      
      if (scrollPercent >= percentage) {
        triggered = true;
        console.log(`📜 Papa Popup: Scroll target reached (${scrollPercent}%), showing popup...`);
        window.removeEventListener('scroll', checkScroll);
        showPopupWithConfig(popupConfig);
      }
    };
    
    window.addEventListener('scroll', checkScroll, { passive: true });
    
    // Also check immediately in case user is already past the threshold
    checkScroll();
  }

  // Show popup with the given config (replaces the old checkPopup logic)
  async function showPopupWithConfig(config) {
    console.log('🎨 Papa Popup: Showing popup with config:', config);
    
    // Check if this is a multi-step popup
    if (config.popupType && config.popupType !== 'SIMPLE_EMAIL') {
      await initializeMultiStepPopup(config);
    } else {
      await renderLegacyPopup(config);
    }
  }

  // Wait for DOM ready and then check popup with trigger logic
  function initPopup() {
    console.log('⏰ Papa Popup: DOM ready, starting popup check with trigger evaluation...');
    checkPopupWithTrigger();
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
    console.log('🧪 Testing Papa Popup immediately with trigger system...');
    sessionStorage.removeItem(POPUP_SHOWN_KEY);
    localStorage.removeItem(SESSION_KEY);
    checkPopupWithTrigger();
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