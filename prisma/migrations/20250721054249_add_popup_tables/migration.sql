-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopupConfig" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "headline" TEXT NOT NULL DEFAULT 'Get 10% Off!',
    "description" TEXT NOT NULL DEFAULT 'Subscribe to our newsletter',
    "buttonText" TEXT NOT NULL DEFAULT 'Subscribe',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PopupConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectedEmail" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'popup',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectedEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_domain_key" ON "Shop"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "PopupConfig_shopId_key" ON "PopupConfig"("shopId");

-- CreateIndex
CREATE INDEX "CollectedEmail_shopId_idx" ON "CollectedEmail"("shopId");

-- CreateIndex
CREATE INDEX "CollectedEmail_email_idx" ON "CollectedEmail"("email");

-- AddForeignKey
ALTER TABLE "PopupConfig" ADD CONSTRAINT "PopupConfig_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectedEmail" ADD CONSTRAINT "CollectedEmail_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
