-- AlterTable
ALTER TABLE "Popup" ADD COLUMN     "triggerConfig" JSONB NOT NULL DEFAULT '{"type": "delay", "value": 2}';
