-- CreateTable
CREATE TABLE "PopupDesign" (
    "id" TEXT NOT NULL,
    "popupId" TEXT NOT NULL,
    "themeId" TEXT,
    "autoThemeSync" BOOLEAN NOT NULL DEFAULT true,
    "lastThemeSync" TIMESTAMP(3),
    "primaryColor" TEXT NOT NULL DEFAULT '#007cba',
    "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
    "textColor" TEXT NOT NULL DEFAULT '#333333',
    "borderColor" TEXT NOT NULL DEFAULT '#e9ecef',
    "overlayColor" TEXT NOT NULL DEFAULT 'rgba(0, 0, 0, 0.5)',
    "fontFamily" TEXT NOT NULL DEFAULT '-apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif',
    "headingFontSize" TEXT NOT NULL DEFAULT '24px',
    "bodyFontSize" TEXT NOT NULL DEFAULT '16px',
    "buttonFontSize" TEXT NOT NULL DEFAULT '16px',
    "fontWeight" TEXT NOT NULL DEFAULT 'normal',
    "borderRadius" TEXT NOT NULL DEFAULT '12px',
    "padding" TEXT NOT NULL DEFAULT '40px',
    "maxWidth" TEXT NOT NULL DEFAULT '400px',
    "spacing" TEXT NOT NULL DEFAULT '16px',
    "customCSS" TEXT,
    "cssVariables" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PopupDesign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PopupDesign_popupId_key" ON "PopupDesign"("popupId");

-- CreateIndex
CREATE INDEX "PopupDesign_popupId_idx" ON "PopupDesign"("popupId");

-- CreateIndex
CREATE INDEX "PopupDesign_themeId_idx" ON "PopupDesign"("themeId");

-- AddForeignKey
ALTER TABLE "PopupDesign" ADD CONSTRAINT "PopupDesign_popupId_fkey" FOREIGN KEY ("popupId") REFERENCES "Popup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
