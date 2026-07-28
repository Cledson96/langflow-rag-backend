CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

ALTER TABLE "User"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

-- Bootstrap the owner of an existing installation as administrator.
UPDATE "User"
SET "role" = 'ADMIN'
WHERE "id" = (
    SELECT "id"
    FROM "User"
    ORDER BY "createdAt" ASC
    LIMIT 1
);

CREATE TABLE "AIModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AIModel_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AIModel" ("id", "name", "provider", "enabled", "isDefault", "updatedAt")
VALUES ('openai/gpt-4.1-mini', 'GPT-4.1 Mini', 'OpenAI', true, true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
