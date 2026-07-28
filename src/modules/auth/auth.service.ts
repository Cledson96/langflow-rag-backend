import argon2 from 'argon2';
import { jwtVerify, SignJWT } from 'jose';

import { UserRepository } from '@/modules/users/user.repository';

interface AuthConfig {
  adminEmails?: readonly string[];
  expiresIn: string;
  secret: string;
}

interface RegisterInput {
  email: string;
  name?: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export interface PublicUser {
  email: string;
  id: string;
  name: string | null;
  role: 'USER' | 'ADMIN';
}

export class AuthService {
  private readonly signingKey: Uint8Array;

  constructor(
    private readonly users: UserRepository,
    private readonly config: AuthConfig,
  ) {
    this.signingKey = new TextEncoder().encode(config.secret);
  }

  async register(input: RegisterInput): Promise<{ token: string; user: PublicUser }> {
    const email = input.email.toLowerCase();
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const user = await this.users.create({
      email,
      name: input.name,
      passwordHash,
      role: this.isAdminEmail(email) ? 'ADMIN' : 'USER',
    });

    return {
      token: await this.createToken(user.id, user.email),
      user: this.toPublicUser(user),
    };
  }

  async login(input: LoginInput): Promise<{ token: string; user: PublicUser }> {
    const email = input.email.toLowerCase();
    let user = await this.users.findByEmail(email);

    if (!user?.passwordHash || !(await argon2.verify(user.passwordHash, input.password))) {
      throw new Error('invalid credentials');
    }

    if (this.isAdminEmail(email) && user.role !== 'ADMIN') {
      user = await this.users.updateRole(user.id, 'ADMIN');
    }

    return {
      token: await this.createToken(user.id, user.email),
      user: this.toPublicUser(user),
    };
  }

  async getAuthenticatedUser(token: string): Promise<PublicUser | null> {
    try {
      const verified = await jwtVerify(token, this.signingKey);
      const userId = verified.payload.sub;

      if (!userId) {
        return null;
      }

      const user = await this.users.findById(userId);
      return user ? this.toPublicUser(user) : null;
    } catch {
      return null;
    }
  }

  async getOrCreateGoogleUser(emailValue: string, name: string | undefined) {
    const email = emailValue.toLowerCase();
    const existing = await this.users.findByEmail(email);
    if (existing) {
      if (this.isAdminEmail(email) && existing.role !== 'ADMIN') {
        return this.users.updateRole(existing.id, 'ADMIN');
      }
      return existing;
    }

    return this.users.create({
      email,
      name,
      passwordHash: null,
      role: this.isAdminEmail(email) ? 'ADMIN' : 'USER',
    });
  }

  async createSessionForUser(userId: string): Promise<{ token: string; user: PublicUser }> {
    const user = await this.users.findById(userId);
    if (!user) throw new Error('user not found');

    return {
      token: await this.createToken(user.id, user.email),
      user: this.toPublicUser(user),
    };
  }

  async createGoogleLoginHandoff(userId: string): Promise<string> {
    return new SignJWT({ purpose: 'google_login_handoff' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime('2m')
      .sign(this.signingKey);
  }

  async exchangeGoogleLoginHandoff(code: string): Promise<{ token: string; user: PublicUser }> {
    const verified = await jwtVerify(code, this.signingKey);
    if (verified.payload.purpose !== 'google_login_handoff' || !verified.payload.sub) {
      throw new Error('invalid Google login handoff');
    }

    return this.createSessionForUser(verified.payload.sub);
  }

  private async createToken(userId: string, email: string) {
    return new SignJWT({ email })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime(this.config.expiresIn)
      .sign(this.signingKey);
  }

  private isAdminEmail(email: string): boolean {
    return (this.config.adminEmails ?? []).some((candidate) => candidate.toLowerCase() === email);
  }

  private toPublicUser(user: { email: string; id: string; name: string | null; role: 'USER' | 'ADMIN' }): PublicUser {
    return {
      email: user.email,
      id: user.id,
      name: user.name,
      role: user.role,
    };
  }
}
