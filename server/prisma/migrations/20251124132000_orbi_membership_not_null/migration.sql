-- Make membershipId mandatory and unique, backfill with hashedEmail when missing
UPDATE "OrbiMember" SET "membershipId" = "hashedEmail" WHERE "membershipId" IS NULL;
ALTER TABLE "OrbiMember" ALTER COLUMN "membershipId" SET NOT NULL;
-- Drop partial index if it exists, then create a standard unique index
DO $$ BEGIN
  DROP INDEX IF EXISTS "OrbiMember_membershipId_key";
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
CREATE UNIQUE INDEX "OrbiMember_membershipId_key" ON "OrbiMember"("membershipId");
