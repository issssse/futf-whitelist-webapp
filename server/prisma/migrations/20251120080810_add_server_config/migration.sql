-- CreateTable
CREATE TABLE "ServerConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL DEFAULT 'public',
    "requiredEmailDomain" TEXT,
    "appealPolicy" TEXT NOT NULL DEFAULT 'never',
    "contact" TEXT,
    "rules" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServerConfig_pkey" PRIMARY KEY ("id")
);
