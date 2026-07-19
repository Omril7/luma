-- CreateEnum
CREATE TYPE "PriceOfferStatus" AS ENUM ('NEW', 'HANDLED');

-- CreateTable
CREATE TABLE "PriceOfferRequest" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "message" TEXT,
    "variantName" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "customWidth" DECIMAL(8,2),
    "customHeight" DECIMAL(8,2),
    "customDepth" DECIMAL(8,2),
    "colorName" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "quotedPrice" DECIMAL(10,2),
    "language" "Language" NOT NULL DEFAULT 'he',
    "status" "PriceOfferStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceOfferRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PriceOfferRequest" ADD CONSTRAINT "PriceOfferRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

