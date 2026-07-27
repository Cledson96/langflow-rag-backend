import argon2 from 'argon2';
import { jwtVerify, SignJWT } from 'jose';

import { UserRepository } from '@/modules/users/user.repository';

interface AuthConfig {
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

interface PublicUser {
  email: string;
  id: string;
  name: string | null;
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
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const user = await this.users.create({
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash,
    });

    return {
      token: await this.createToken(user.id, user.email),
      user: this.toPublicUser(user),
    };
  }

  async login(input: LoginInput): Promise<{ token: string; user: PublicUser }> {
    const user = await this.users.findByEmail(input.email.toLowerCase());

    if (!user || !(await argon2.verify(user.passwordHash, input.password))) {
      throw new Error('invalid credentials');
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

  private async createToken(userId: string, email: string) {
    return new SignJWT({ email })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime(this.config.expiresIn)
      .sign(this.signingKey);
  }

  private toPublicUser(user: { email: string; id: string; name: string | null }): PublicUser {
    return {
      email: user.email,
      id: user.id,
      name: user.name,
    };
  }
}
