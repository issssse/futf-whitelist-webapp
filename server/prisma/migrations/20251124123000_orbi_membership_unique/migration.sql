-- Ensure membershipId has a unique constraint usable for upsert
ALTER TABLE "OrbiMember" ALTER COLUMN "membershipId" DROP NOT NULL;
DO $$ BEGIN
  ALTER TABLE "OrbiMember" ADD CONSTRAINT "OrbiMember_membershipId_key" UNIQUE ("membershipId");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;
