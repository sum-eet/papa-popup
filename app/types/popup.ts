/**
 * TypeScript type definitions for Papa Popup system
 * 
 * Covers both legacy and multi-popup systems
 */

// Enums matching Prisma schema
export enum PopupStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  DELETED = 'DELETED'
}

export enum PopupType {
  SIMPLE_EMAIL = 'SIMPLE_EMAIL',
  DIRECT_DISCOUNT = 'DIRECT_DISCOUNT',
  QUIZ_EMAIL = 'QUIZ_EMAIL',
  QUIZ_DISCOUNT = 'QUIZ_DISCOUNT'
}

export enum StepType {
  QUESTION = 'QUESTION',
  EMAIL = 'EMAIL',
  DISCOUNT_REVEAL = 'DISCOUNT_REVEAL',
  CONTENT = 'CONTENT'
}

export enum DiscountType {
  FIXED = 'FIXED',
  LOGIC_BASED = 'LOGIC_BASED',
  RANDOMIZED = 'RANDOMIZED'
}

// Page targeting types
export type PageType = 'home' | 'product' | 'collection' | 'cart' | 'blog' | 'search' | 'other' | 'all';

// Targeting rules structure
export interface TargetingRules {
  pages: PageType[];
  specific?: string[]; // Specific URLs or patterns
}

// Trigger types and configuration
export type TriggerType = 'delay' | 'scroll' | 'url';

export interface TriggerConfig {
  type: TriggerType;
  value: number | string; // seconds for delay, percentage for scroll, URL pattern for url
}

// Quiz option structure
export interface QuizOption {
  id: string;
  text: string;
  value: string;
}

// Step content structures based on step type
export interface QuestionStepContent {
  question: string;
  options: QuizOption[];
  allowMultiple?: boolean;
}

export interface EmailStepContent {
  headline: string;
  description?: string;
  placeholder: string;
  buttonText: string;
}

export interface DiscountRevealContent {
  headline: string;
  description?: string;
  codeDisplay: string; // Template like "{{DYNAMIC}}" or actual code
  validityText?: string;
}

export interface ContentStepContent {
  headline: string;
  description: string;
  buttonText?: string;
}

export type StepContent = QuestionStepContent | EmailStepContent | DiscountRevealContent | ContentStepContent;

// Discount configuration structures
export interface FixedDiscountConfig {
  code: string;
  amount: string; // "10%" or "$10"
  description?: string;
}

export interface LogicBasedTier {
  condition: 'steps_completed' | 'email_provided' | 'specific_answer';
  value: number | boolean | string;
  discount: string;
  code: string;
  description?: string;
}

export interface LogicBasedDiscountConfig {
  tiers: LogicBasedTier[];
  fallback?: FixedDiscountConfig; // If no tiers match
}

export interface RandomizedOption {
  weight: number; // 0-100
  discount: string;
  code: string;
  description?: string;
}

export interface RandomizedDiscountConfig {
  options: RandomizedOption[];
}

export type DiscountConfig = FixedDiscountConfig | LogicBasedDiscountConfig | RandomizedDiscountConfig;

// Database models (matching Prisma)
export interface PopupStep {
  id: string;
  popupId: string;
  stepNumber: number;
  stepType: StepType;
  content: StepContent;
  createdAt: string;
  updatedAt: string;
}

export interface Popup {
  id: string;
  shopId: string;
  name: string;
  status: PopupStatus;
  priority: number;
  targetingRules: TargetingRules;
  popupType: PopupType;
  totalSteps: number;
  discountType: DiscountType;
  discountConfig: DiscountConfig;
  emailRequired: boolean;
  emailStep?: number;
  steps: PopupStep[];
  scriptTagId?: string;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSession {
  id: string;
  sessionToken: string;
  shopId: string;
  popupId?: string;
  currentStep: number;
  stepsViewed: number;
  stepsCompleted: number;
  emailProvided: boolean;
  responses?: Record<string, any>;
  discountCode?: string;
  discountAmount?: string;
  ipAddress?: string;
  userAgent?: string;
  pageUrl?: string;
  createdAt: string;
  expiresAt: string;
  completedAt?: string;
}

// Legacy popup config (for backwards compatibility)
export interface LegacyPopupConfig {
  id: string;
  shopId: string;
  enabled: boolean;
  headline: string;
  description: string;
  buttonText: string;
  scriptTagId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollectedEmail {
  id: string;
  email: string;
  shopId: string;
  customerSessionId?: string;
  popupId?: string;
  quizResponses?: Record<string, any>;
  discountUsed?: string;
  source: string;
  createdAt: string;
}

// API response types
export interface PopupListResponse {
  popups: Popup[];
  total: number;
  system: 'legacy' | 'multi';
}

export interface PopupStatsResponse {
  totalPopups: number;
  activePopups: number;
  draftPopups: number;
  emailsCollectedToday: number;
  emailsCollectedTotal: number;
  topPerformingPopup?: {
    id: string;
    name: string;
    emailsCollected: number;
  };
}

export interface PopupCheckResponse {
  showPopup: boolean;
  config?: any; // Legacy or multi format
  pageType?: string;
  system: 'legacy' | 'multi';
  reason?: string;
}

// Form types for popup builder
export interface PopupFormData {
  name: string;
  popupType: PopupType;
  targetPages: PageType[];
  priority: number;
  totalSteps: number;
  emailRequired: boolean;
  emailStep?: number;
  discountType: DiscountType;
  discountConfig: Partial<DiscountConfig>;
  steps: Partial<PopupStep>[];
}

export interface PopupBuilderState {
  currentStep: number;
  formData: Partial<PopupFormData>;
  isValid: boolean;
  isDirty: boolean;
  errors: Record<string, string>;
}

// Component prop types
export interface PopupStatusBadgeProps {
  status: PopupStatus;
  size?: 'small' | 'medium';
}

export interface PopupTypeIconProps {
  type: PopupType;
  size?: number;
}

export interface PopupPreviewProps {
  popup: Partial<Popup>;
  mode: 'desktop' | 'mobile';
  interactive?: boolean;
}

export interface QuizStepEditorProps {
  step: Partial<PopupStep>;
  stepNumber: number;
  onChange: (step: Partial<PopupStep>) => void;
  onDelete: () => void;
  canDelete: boolean;
}

// Utility types
export type PopupActionType = 'activate' | 'pause' | 'delete' | 'duplicate' | 'preview';

export interface PopupAction {
  type: PopupActionType;
  popupId: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'destructive';
  loading?: boolean;
}

// Analytics types (for future use)
export interface PopupAnalytics {
  popupId: string;
  views: number;
  startedSessions: number;
  completedSessions: number;
  emailsCollected: number;
  averageCompletionTime: number;
  dropOffByStep: Record<number, number>;
  topAnswers: Record<string, Record<string, number>>;
  conversionRate: number;
}

// Error types
export interface PopupError {
  code: string;
  message: string;
  field?: string;
}