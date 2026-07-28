ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

CREATE TABLE "GoogleConnection" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "googleSubject" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT,
    "scopes" TEXT[] NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GoogleConnection_userId_key" ON "GoogleConnection"("userId");
CREATE UNIQUE INDEX "GoogleConnection_googleSubject_key" ON "GoogleConnection"("googleSubject");
CREATE INDEX "GoogleConnection_email_idx" ON "GoogleConnection"("email");

ALTER TABLE "GoogleConnection"
ADD CONSTRAINT "GoogleConnection_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
