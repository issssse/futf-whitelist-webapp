-- Add membershipId to OrbiMember, keep unique when present
ALTER TABLE "OrbiMember" ADD COLUMN "membershipId" TEXT;

CREATE UNIQUE INDEX "OrbiMember_membershipId_key" ON "OrbiMember"("membershipId") WHERE "membershipId" IS NOT NULL;
