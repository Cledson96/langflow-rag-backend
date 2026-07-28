-- CreateEnum
CREATE TYPE "MemoryScope" AS ENUM ('USER', 'PROJECT');

-- CreateTable
CREATE TABLE "AgentSoul" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "companyContext" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentSoul_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentMemory" (
    "id" UUID NOT NULL,
    "scope" "MemoryScope" NOT NULL,
    "key" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdByUserId" UUID NOT NULL,
    "projectId" UUID,
    "sourceMessageId" UUID,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastAccessedAt" TIMESTAMP(3),

    CONSTRAINT "AgentMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentMemory_createdByUserId_scope_archived_updatedAt_idx" ON "AgentMemory"("createdByUserId", "scope", "archived", "updatedAt");

-- CreateIndex
CREATE INDEX "AgentMemory_projectId_scope_archived_updatedAt_idx" ON "AgentMemory"("projectId", "scope", "archived", "updatedAt");

-- CreateIndex
CREATE INDEX "AgentMemory_sourceMessageId_idx" ON "AgentMemory"("sourceMessageId");

-- AddForeignKey
ALTER TABLE "AgentMemory" ADD CONSTRAINT "AgentMemory_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMemory" ADD CONSTRAINT "AgentMemory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMemory" ADD CONSTRAINT "AgentMemory_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
