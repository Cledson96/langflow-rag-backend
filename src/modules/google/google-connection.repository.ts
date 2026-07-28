import type { PrismaClient } from '@/generated/prisma';

interface GoogleConnectionInput {
  accessTokenEncrypted: string;
  email: string;
  expiresAt?: Date;
  googleSubject: string;
  refreshTokenEncrypted?: string;
  scopes: string[];
  userId: string;
}

export class GoogleConnectionRepository {
  constructor(private readonly database: PrismaClient) {}

  findByGoogleSubject(googleSubject: string) {
    return this.database.googleConnection.findUnique({
      include: { user: true },
      where: { googleSubject },
    });
  }

  findByUserId(userId: string) {
    return this.database.googleConnection.findUnique({ where: { userId } });
  }

  async save(input: GoogleConnectionInput) {
    const existing = await this.findByUserId(input.userId);
    const refreshTokenEncrypted = input.refreshTokenEncrypted ?? existing?.refreshTokenEncrypted;

    if (!refreshTokenEncrypted) throw new Error('Google did not provide an offline refresh token');

    return this.database.googleConnection.upsert({
      create: {
        ...input,
        refreshTokenEncrypted,
      },
      update: {
        accessTokenEncrypted: input.accessTokenEncrypted,
        email: input.email,
        expiresAt: input.expiresAt,
        googleSubject: input.googleSubject,
        refreshTokenEncrypted,
        scopes: input.scopes,
      },
      where: { userId: input.userId },
    });
  }

  disconnect(userId: string) {
    return this.database.googleConnection.deleteMany({ where: { userId } });
  }
}
