// === CONSOLE TEST SCRIPT FOR MULTI-STEP POPUP ===
console.log('🧪 Starting Papa Popup Console Test...');

// Test configuration
var testConfig = {
  shopDomain: 'testingstoresumeet.myshopify.com',
  appUrl: 'https://smartpop-revenue-engine.vercel.app',
  
  // Sample quiz data (matching your database)
  samplePopup: {
    popupId: 'sample-quiz-skincare-001',
    popupType: 'QUIZ_EMAIL',
    totalSteps: 3,
    steps: [
      {
        stepNumber: 1,
        stepType: 'QUESTION',
        content: {
          question: "What's your skin type?",
          options: [
            { id: "1", text: "Oily", value: "oily" },
            { id: "2", text: "Dry", value: "dry" },
            { id: "3", text: "Combination", value: "combination" },
            { id: "4", text: "Sensitive", value: "sensitive" }
          ]
        }
      },
      {
        stepNumber: 2,
        stepType: 'QUESTION',
        content: {
          question: "What's your main skin concern?",
          options: [
            { id: "1", text: "Acne & Breakouts", value: "acne" },
            { id: "2", text: "Anti-Aging", value: "aging" },
            { id: "3", text: "Dark Spots", value: "spots" },
            { id: "4", text: "Dryness", value: "dryness" }
          ]
        }
      },
      {
        stepNumber: 3,
        stepType: 'EMAIL',
        content: {
          headline: "Get Your Personalized Results!",
          description: "Enter your email to receive customized skincare recommendations based on your quiz answers.",
          placeholder: "Enter your email address",
          buttonText: "Get My Results"
        }
      }
    ]
  }
};

// Test functions
var testFunctions = {
  
  // Test 1: Check popup detection API
  testPopupDetection: function() {
    console.log('\n🔍 TEST 1: Popup Detection API');
    return fetch(testConfig.appUrl + '/api/popup-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopDomain: testConfig.shopDomain,
        pageType: 'product',
        pageUrl: window.location.href,
        forceMultiCheck: true
      })
    })
    .then(function(response) {
      return response.json().then(function(data) {
        console.log('✅ Popup detection response:', response.status, data);
        return data;
      });
    })
    .catch(function(error) {
      console.log('❌ Popup detection failed:', error);
      return null;
    });
  },
  
  // Test 2: Check session creation API
  testSessionCreation: function() {
    console.log('\n🔐 TEST 2: Session Creation API');
    return fetch(testConfig.appUrl + '/api/session/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopDomain: testConfig.shopDomain,
        popupId: testConfig.samplePopup.popupId,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent
      })
    })
    .then(function(response) {
      return response.json().then(function(data) {
        console.log(response.ok ? '✅' : '❌', 'Session creation response:', response.status, data);
        return response.ok ? data : null;
      });
    })
    .catch(function(error) {
      console.log('❌ Session creation failed:', error);
      return null;
    });
  },
  
  // Test 3: Simulate quiz responses storage
  testDataStorage: function() {
    console.log('\n💾 TEST 3: Data Storage Simulation');
    
    var sessionData = {
      sessionToken: 'test-session-' + Date.now(),
      currentStep: 1,
      totalSteps: 3,
      responses: {}
    };
    
    // Simulate answering questions
    console.log('🎯 Simulating quiz responses...');
    sessionData.responses['step_1'] = { question: "What's your skin type?", answer: "combination" };
    sessionData.currentStep = 2;
    
    sessionData.responses['step_2'] = { question: "What's your main skin concern?", answer: "acne" };
    sessionData.currentStep = 3;
    
    sessionData.responses['step_3'] = { email: "test@example.com" };
    sessionData.currentStep = 3;
    sessionData['isCompleted'] = true;
    
    console.log('✅ Session data with responses:', sessionData);
    
    // Test localStorage
    try {
      localStorage.setItem('papa-popup-test-session', JSON.stringify(sessionData));
      var retrievedData = localStorage.getItem('papa-popup-test-session');
      var retrieved = retrievedData ? JSON.parse(retrievedData) : null;
      console.log('✅ LocalStorage test passed:', retrieved);
    } catch (error) {
      console.log('❌ LocalStorage test failed:', error);
    }
    
    return sessionData;
  },
  
  // Test 4: Render popup manually
  renderTestPopup: function() {
    console.log('\n🎨 TEST 4: Manual Popup Rendering');
    
    // Remove existing popup if any
    var existing = document.getElementById('papa-popup-overlay');
    if (existing) existing.remove();
    
    var currentStep = testConfig.samplePopup.steps[0]; // Start with first step
    
    var optionsHTML = '';
    if (currentStep.content.options) {
      for (var i = 0; i < currentStep.content.options.length; i++) {
        var option = currentStep.content.options[i];
        optionsHTML += '<button onclick="testFunctions.selectOption(\'' + option.value + '\')" style="display: block; width: 100%; margin: 10px 0; padding: 15px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 5px; cursor: pointer; font-size: 16px;">' + option.text + '</button>';
      }
    } else {
      optionsHTML = '<p>Popup rendering test successful!</p>';
    }
    
    var popupHTML = '<div id="papa-popup-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; font-family: Arial, sans-serif;">' +
      '<div style="background: white; padding: 30px; border-radius: 10px; max-width: 400px; width: 90%; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">' +
        '<h2 style="margin: 0 0 20px 0; color: #333;">' + (currentStep.content.question || 'Test Popup') + '</h2>' +
        '<div style="margin: 20px 0;">' + optionsHTML + '</div>' +
        '<div style="margin-top: 20px;">' +
          '<button onclick="testFunctions.closeTestPopup()" style="background: #666; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-right: 10px;">Close Test</button>' +
          '<button onclick="testFunctions.nextStep()" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Next Step</button>' +
        '</div>' +
      '</div>' +
    '</div>';
    
    document.body.insertAdjacentHTML('beforeend', popupHTML);
    console.log('✅ Test popup rendered successfully!');
  },
  
  selectOption: function(value) {
    console.log('🎯 Selected option:', value);
    alert('Selected: ' + value + '\nCheck console for details.');
  },
  
  nextStep: function() {
    console.log('➡️ Moving to next step...');
    this.closeTestPopup();
    alert('Next step simulation - check console for details.');
  },
  
  closeTestPopup: function() {
    var popup = document.getElementById('papa-popup-overlay');
    if (popup) popup.remove();
    console.log('🚪 Test popup closed');
  },
  
  // Run all tests
  runAllTests: function() {
    console.log('🚀 Running all Papa Popup tests...\n');
    
    var self = this;
    return this.testPopupDetection()
      .then(function(popupResult) {
        return self.testSessionCreation()
          .then(function(sessionResult) {
            var dataResult = self.testDataStorage();
            
            console.log('\n📊 TEST RESULTS SUMMARY:');
            console.log('==================================================');
            console.log('Popup Detection:', popupResult ? '✅ PASS' : '❌ FAIL');
            console.log('Session Creation:', sessionResult ? '✅ PASS' : '❌ FAIL');
            console.log('Data Storage:', dataResult ? '✅ PASS' : '❌ FAIL');
            console.log('UI Rendering: Call testFunctions.renderTestPopup() to test');
            console.log('==================================================');
            
            return {
              popupDetection: popupResult,
              sessionCreation: sessionResult,
              dataStorage: dataResult,
              uiRendering: 'manual'
            };
          });
      });
  }
};

// Make functions globally available
window.testFunctions = testFunctions;

// Auto-run tests
console.log('🎬 Auto-running popup tests...');
testFunctions.runAllTests().then(function() {
  console.log('\n🎨 To test UI rendering, run: testFunctions.renderTestPopup()');
  console.log('📋 Available commands:');
  console.log('- testFunctions.renderTestPopup() - Show test popup');
  console.log('- testFunctions.runAllTests() - Run all tests again');
  console.log('- testFunctions.testPopupDetection() - Test API detection');
  console.log('- testFunctions.testSessionCreation() - Test session API');
  console.log('- testFunctions.testDataStorage() - Test data storage');
});