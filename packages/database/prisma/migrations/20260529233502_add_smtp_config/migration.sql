-- AlterTable
ALTER TABLE "config_entreprise" ADD COLUMN     "smtpFrom" TEXT,
ADD COLUMN     "smtpHost" TEXT,
ADD COLUMN     "smtpPass" TEXT,
ADD COLUMN     "smtpPort" INTEGER,
ADD COLUMN     "smtpTls" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "smtpUser" TEXT;
