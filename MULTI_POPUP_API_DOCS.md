# Papa Popup Multi-Step API Documentation

## Overview

The Papa Popup system now supports multi-step popups with quiz functionality, discount generation, and comprehensive session management while maintaining full backward compatibility with the legacy single-popup system.

## API Endpoints

### 1. Session Management

#### Create Session
**POST** `/api/session/create`

Creates a new customer session for multi-step popup interactions.

**Request Body:**
```json
{
  "shopDomain": "example.myshopify.com",
  "popupId": "popup-uuid",
  "pageUrl": "https://example.myshopify.com/products/example",
  "userAgent": "Mozilla/5.0..."
}
```

**Response:**
```json
{
  "success": true,
  "sessionToken": "64-char-hex-token",
  "currentStep": 1,
  "totalSteps": 3,
  "popup": {
    "id": "popup-uuid",
    "type": "QUIZ_EMAIL",
    "steps": [
      {
        "stepNumber": 1,
        "stepType": "QUESTION",
        "content": {
          "question": "What's your preference?",
          "options": [
            { "id": "1", "text": "Option A", "value": "option_a" },
            { "id": "2", "text": "Option B", "value": "option_b" }
          ]
        }
      }
    ]
  }
}
```

#### Validate Session
**POST** `/api/session/validate`

Validates an existing session token and returns current state.

**Request Body:**
```json
{
  "sessionToken": "64-char-hex-token",
  "shopDomain": "example.myshopify.com"
}
```

**Response:**
```json
{
  "success": true,
  "sessionToken": "64-char-hex-token",
  "currentStep": 2,
  "totalSteps": 3,
  "responses": {
    "step_1": { "value": "option_a", "text": "Option A" }
  },
  "isCompleted": false,
  "popup": { /* popup data */ }
}
```

#### Update Progress
**POST** `/api/session/progress`

Updates session progress and stores step responses.

**Request Body:**
```json
{
  "sessionToken": "64-char-hex-token",
  "shopDomain": "example.myshopify.com",
  "stepNumber": 1,
  "stepResponse": {
    "value": "option_a",
    "text": "Option A",
    "index": 0
  },
  "action": "answer" // or "navigate", "complete"
}
```

**Response:**
```json
{
  "success": true,
  "sessionToken": "64-char-hex-token",
  "currentStep": 2,
  "totalSteps": 3,
  "responses": {
    "step_1": { "value": "option_a", "text": "Option A" }
  },
  "isCompleted": false,
  "nextStep": {
    "stepNumber": 2,
    "stepType": "EMAIL",
    "content": { /* step content */ }
  }
}
```

### 2. Email Collection

#### Collect Email (Enhanced)
**POST** `/api/collect-email`

Collects email addresses with optional session tracking and quiz response data.

**Request Body (Multi-step):**
```json
{
  "email": "user@example.com",
  "shopDomain": "example.myshopify.com",
  "sessionToken": "64-char-hex-token",
  "quizResponses": {
    "step_1": { "value": "option_a", "text": "Option A" },
    "step_2": { "value": "option_b", "text": "Option B" }
  },
  "popupId": "popup-uuid",
  "source": "popup"
}
```

**Request Body (Legacy):**
```json
{
  "email": "user@example.com",
  "shopDomain": "example.myshopify.com"
}
```

**Response:**
```json
{
  "success": true,
  "id": "collected-email-id",
  "discountCode": "QUIZVIP123456" // only if popup type is QUIZ_DISCOUNT
}
```

### 3. Discount Management

#### Generate Discount
**POST** `/api/discount/generate`

Generates a discount code for quiz completion.

**Request Body:**
```json
{
  "sessionToken": "64-char-hex-token",
  "shopDomain": "example.myshopify.com"
}
```

**Response:**
```json
{
  "success": true,
  "discountCode": "QUIZVIP123456",
  "discountInfo": {
    "headline": "Here's your discount!",
    "description": "Thanks for completing the quiz",
    "validityText": "Valid for 24 hours",
    "codeDisplay": "QUIZVIP123456"
  }
}
```

#### Validate Discount
**POST** `/api/discount/validate`

Validates a discount code and returns usage information.

**Request Body:**
```json
{
  "discountCode": "QUIZVIP123456",
  "shopDomain": "example.myshopify.com"
}
```

**Response:**
```json
{
  "success": true,
  "valid": true,
  "discountCode": "QUIZVIP123456",
  "sessionInfo": {
    "sessionToken": "64-char-hex-token",
    "popupType": "QUIZ_DISCOUNT",
    "completedAt": "2023-01-01T12:00:00Z",
    "emailCollected": true
  }
}
```

## Client-Side Integration

### Enhanced Popup Loader

The enhanced popup loader (`popup-loader-enhanced.js`) automatically detects popup types and provides appropriate functionality:

#### Features:
- **Multi-step Navigation**: Handles quiz flows with progress indicators
- **Session Persistence**: Maintains state across page reloads
- **Backward Compatibility**: Falls back to legacy mode for simple popups
- **Discount Display**: Shows generated discount codes
- **Responsive Design**: Works on desktop and mobile

#### Usage:
```html
<script src="https://smartpop-revenue-engine.vercel.app/popup-loader-enhanced.js"></script>
```

#### Debug Functions:
```javascript
// Clear all popup session data
clearPapaPopup();

// Test popup immediately
testPapaPopup();

// Show debug information
debugPapaPopup();
```

## Popup Types

### SIMPLE_EMAIL
Single-step email capture popup (legacy compatible).

### QUIZ_EMAIL
Multi-step popup with quiz questions followed by email capture.

### QUIZ_DISCOUNT
Multi-step popup with quiz questions followed by discount code reveal.

### DIRECT_DISCOUNT
Single-step popup that immediately shows a discount code.

## Step Types

### QUESTION
Interactive quiz question with multiple choice options.

### EMAIL
Email capture form with customizable messaging.

### DISCOUNT_REVEAL
Displays a discount code with optional validity information.

### CONTENT
Static content display (announcements, information, etc.).

## Feature Flag Control

All multi-popup functionality is controlled by the `ENABLE_MULTI_POPUP` environment variable:

- `true`: Multi-popup system enabled
- `false` or unset: Legacy single-popup system only

## Error Handling

All APIs return consistent error responses:

```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad request (missing/invalid parameters)
- `404`: Resource not found (shop, popup, session)  
- `405`: Method not allowed
- `500`: Internal server error

## Session Management

- Sessions expire after 24 hours
- Session tokens are 64-character hexadecimal strings
- Session state is automatically cleaned up on completion
- Client-side session persistence uses localStorage

## Database Schema

The system leverages existing database models:

- **Popup**: Main popup configuration
- **PopupStep**: Individual steps within popups
- **CustomerSession**: Session tracking and responses
- **CollectedEmail**: Email collection with quiz data
- **Shop**: Shop association and configuration

## Security Considerations

- CORS headers configured for Shopify storefronts
- Session tokens use cryptographically secure random generation
- Input validation on all API endpoints
- Rate limiting recommended for production deployment
- No sensitive data logged in console outputs

## Deployment Notes

1. Ensure `ENABLE_MULTI_POPUP=true` in production environment
2. Update script tag URLs to point to enhanced loader
3. Monitor API response times for session endpoints
4. Set up proper error logging for debugging
5. Consider CDN deployment for popup loader script