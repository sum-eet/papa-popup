-- CreateEnum
CREATE TYPE "PopupStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'DELETED');

-- CreateEnum
CREATE TYPE "PopupType" AS ENUM ('SIMPLE_EMAIL', 'DIRECT_DISCOUNT', 'QUIZ_EMAIL', 'QUIZ_DISCOUNT');

-- CreateEnum
CREATE TYPE "StepType" AS ENUM ('QUESTION', 'EMAIL', 'DISCOUNT_REVEAL', 'CONTENT');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('FIXED', 'LOGIC_BASED', 'RANDOMIZED');

-- AlterTable
ALTER TABLE "CollectedEmail" ADD COLUMN     "customerSessionId" TEXT,
ADD COLUMN     "discountUsed" TEXT,
ADD COLUMN     "popupId" TEXT,
ADD COLUMN     "quizResponses" JSONB;

-- CreateTable
CREATE TABLE "Popup" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "PopupStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "targetingRules" JSONB NOT NULL DEFAULT '{}',
    "popupType" "PopupType" NOT NULL DEFAULT 'SIMPLE_EMAIL',
    "totalSteps" INTEGER NOT NULL DEFAULT 1,
    "discountType" "DiscountType" NOT NULL DEFAULT 'FIXED',
    "discountConfig" JSONB NOT NULL DEFAULT '{}',
    "emailRequired" BOOLEAN NOT NULL DEFAULT true,
    "emailStep" INTEGER,
    "scriptTagId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Popup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopupStep" (
    "id" TEXT NOT NULL,
    "popupId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "stepType" "StepType" NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PopupStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerSession" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "popupId" TEXT,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "stepsViewed" INTEGER NOT NULL DEFAULT 0,
    "stepsCompleted" INTEGER NOT NULL DEFAULT 0,
    "emailProvided" BOOLEAN NOT NULL DEFAULT false,
    "responses" JSONB,
    "discountCode" TEXT,
    "discountAmount" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "pageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CustomerSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Popup_shopId_status_idx" ON "Popup"("shopId", "status");

-- CreateIndex
CREATE INDEX "Popup_shopId_priority_idx" ON "Popup"("shopId", "priority");

-- CreateIndex
CREATE INDEX "Popup_shopId_isDeleted_idx" ON "Popup"("shopId", "isDeleted");

-- CreateIndex
CREATE INDEX "PopupStep_popupId_idx" ON "PopupStep"("popupId");

-- CreateIndex
CREATE UNIQUE INDEX "PopupStep_popupId_stepNumber_key" ON "PopupStep"("popupId", "stepNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSession_sessionToken_key" ON "CustomerSession"("sessionToken");

-- CreateIndex
CREATE INDEX "CustomerSession_sessionToken_idx" ON "CustomerSession"("sessionToken");

-- CreateIndex
CREATE INDEX "CustomerSession_shopId_createdAt_idx" ON "CustomerSession"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerSession_popupId_idx" ON "CustomerSession"("popupId");

-- CreateIndex
CREATE INDEX "CollectedEmail_customerSessionId_idx" ON "CollectedEmail"("customerSessionId");

-- AddForeignKey
ALTER TABLE "CollectedEmail" ADD CONSTRAINT "CollectedEmail_customerSessionId_fkey" FOREIGN KEY ("customerSessionId") REFERENCES "CustomerSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Popup" ADD CONSTRAINT "Popup_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopupStep" ADD CONSTRAINT "PopupStep_popupId_fkey" FOREIGN KEY ("popupId") REFERENCES "Popup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSession" ADD CONSTRAINT "CustomerSession_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSession" ADD CONSTRAINT "CustomerSession_popupId_fkey" FOREIGN KEY ("popupId") REFERENCES "Popup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
