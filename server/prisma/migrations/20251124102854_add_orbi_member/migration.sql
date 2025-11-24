-- CreateTable
CREATE TABLE "OrbiMember" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "hashedEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "validFrom" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrbiMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrbiMember_hashedEmail_key" ON "OrbiMember"("hashedEmail");
