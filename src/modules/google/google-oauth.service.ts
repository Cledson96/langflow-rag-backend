import { jwtVerify, SignJWT } from 'jose';
import { z } from 'zod';

import { AuthService } from '@/modules/auth/auth.service';
import { GoogleConnectionRepository } from '@/modules/google/google-connection.repository';
import { TokenCipher } from '@/shared/security/token-cipher';

const googleAuthorizationEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
const googleTokenEndpoint = 'https://oauth2.googleapis.com/token';
const googleUserInfoEndpoint = 'https://openidconnect.googleapis.com/v1/userinfo';
const googleRevokeEndpoint = 'https://oauth2.googleapis.com/revoke';

export const googleIdentityScopes = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
] as const;

export const googleWorkspaceScopes = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/chat.spaces.readonly',
  'https://www.googleapis.com/auth/chat.messages.readonly',
  'https://www.googleapis.com/auth/chat.messages.create',
] as const;

export const googleScopes = [...googleIdentityScopes, ...googleWorkspaceScopes] as const;

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive().optional(),
  refresh_token: z.string().min(1).optional(),
  scope: z.string().optional(),
  token_type: z.string().optional(),
});

const userInfoSchema = z.object({
  email: z.email(),
  email_verified: z.boolean(),
  name: z.string().optional(),
  sub: z.string().min(1),
});

type OAuthMode = 'connect' | 'login';
type Fetcher = typeof fetch;

interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  frontendUrl: string;
  jwtSecret: string;
  redirectUri: string;
}

export class GoogleOAuthService {
  private readonly signingKey: Uint8Array;

  constructor(
    private readonly auth: AuthService,
    private readonly connections: GoogleConnectionRepository,
    private readonly cipher: TokenCipher,
    private readonly config: GoogleOAuthConfig,
    private readonly fetcher: Fetcher = fetch,
  ) {
    this.signingKey = new TextEncoder().encode(config.jwtSecret);
  }

  async createAuthorizationUrl(mode: OAuthMode, userId?: string): Promise<string> {
    if (mode === 'connect' && !userId) throw new Error('user is required to connect Google');

    const state = await new SignJWT({ mode, purpose: 'google_oauth_state' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(userId ?? 'anonymous')
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(this.signingKey);

    const url = new URL(googleAuthorizationEndpoint);
    url.search = new URLSearchParams({
      access_type: 'offline',
      client_id: this.config.clientId,
      include_granted_scopes: 'true',
      prompt: 'consent',
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: (mode === 'login' ? googleIdentityScopes : googleScopes).join(' '),
      state,
    }).toString();

    return url.toString();
  }

  async handleCallback(code: string, state: string): Promise<string> {
    const verifiedState = await jwtVerify(state, this.signingKey);
    if (verifiedState.payload.purpose !== 'google_oauth_state') throw new Error('invalid Google OAuth state');

    const mode = verifiedState.payload.mode;
    if (mode !== 'connect' && mode !== 'login') throw new Error('invalid Google OAuth mode');

    const tokens = await this.exchangeAuthorizationCode(code);
    const profile = await this.getUserInfo(tokens.access_token);
    if (!profile.email_verified) throw new Error('Google account email is not verified');

    let userId: string;
    if (mode === 'connect') {
      const subject = verifiedState.payload.sub;
      if (!subject || subject === 'anonymous') throw new Error('invalid Google connection state');
      userId = subject;
      const linked = await this.connections.findByGoogleSubject(profile.sub);
      if (linked && linked.userId !== userId) throw new Error('Google account is already linked to another user');
    } else {
      const linked = await this.connections.findByGoogleSubject(profile.sub);
      const user = linked?.user ?? await this.auth.getOrCreateGoogleUser(profile.email, profile.name);
      userId = user.id;
    }

    await this.connections.save({
      accessTokenEncrypted: this.cipher.encrypt(tokens.access_token),
      email: profile.email.toLowerCase(),
      expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined,
      googleSubject: profile.sub,
      refreshTokenEncrypted: tokens.refresh_token ? this.cipher.encrypt(tokens.refresh_token) : undefined,
      scopes: tokens.scope?.split(/\s+/).filter(Boolean) ?? [...googleScopes],
      userId,
    });

    if (mode === 'connect') {
      return new URL('/settings/integrations?google=connected', this.config.frontendUrl).toString();
    }

    const handoff = await this.auth.createGoogleLoginHandoff(userId);
    const frontendCallback = new URL('/api/auth/google/callback', this.config.frontendUrl);
    frontendCallback.searchParams.set('code', handoff);
    return frontendCallback.toString();
  }

  async getConnection(userId: string) {
    const connection = await this.connections.findByUserId(userId);
    const workspaceConnected = connection?.scopes.includes(googleWorkspaceScopes[0]) === true;
    if (!connection || !workspaceConnected) return { connected: false as const };

    return {
      connected: true as const,
      email: connection.email,
      scopes: connection.scopes,
      updatedAt: connection.updatedAt,
    };
  }

  async disconnect(userId: string): Promise<void> {
    const connection = await this.connections.findByUserId(userId);
    if (!connection) return;

    const refreshToken = connection.refreshTokenEncrypted
      ? this.cipher.decrypt(connection.refreshTokenEncrypted)
      : this.cipher.decrypt(connection.accessTokenEncrypted);

    await this.fetcher(googleRevokeEndpoint, {
      body: new URLSearchParams({ token: refreshToken }),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      method: 'POST',
    }).catch(() => undefined);

    await this.connections.disconnect(userId);
  }

  async getAccessToken(userId: string): Promise<string> {
    const connection = await this.connections.findByUserId(userId);
    if (!connection?.refreshTokenEncrypted) throw new Error('Google account is not connected');

    if (connection.expiresAt && connection.expiresAt.getTime() > Date.now() + 60_000) {
      return this.cipher.decrypt(connection.accessTokenEncrypted);
    }

    const response = await this.fetcher(googleTokenEndpoint, {
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: this.cipher.decrypt(connection.refreshTokenEncrypted),
      }),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      method: 'POST',
    });
    if (!response.ok) throw new Error(`Google token refresh failed with status ${response.status}`);
    const tokens = tokenResponseSchema.parse(await response.json());

    await this.connections.save({
      accessTokenEncrypted: this.cipher.encrypt(tokens.access_token),
      email: connection.email,
      expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined,
      googleSubject: connection.googleSubject,
      scopes: tokens.scope?.split(/\s+/).filter(Boolean) ?? connection.scopes,
      userId,
    });

    return tokens.access_token;
  }

  private async exchangeAuthorizationCode(code: string) {
    const response = await this.fetcher(googleTokenEndpoint, {
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri,
      }),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      method: 'POST',
    });
    if (!response.ok) throw new Error(`Google authorization failed with status ${response.status}`);

    return tokenResponseSchema.parse(await response.json());
  }

  private async getUserInfo(accessToken: string) {
    const response = await this.fetcher(googleUserInfoEndpoint, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(`Google user info failed with status ${response.status}`);

    return userInfoSchema.parse(await response.json());
  }
}
