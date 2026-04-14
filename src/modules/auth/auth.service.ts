import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { User, AuthProvider } from '../../entities/user.entity';
import { UserSettings } from '../../entities/user-settings.entity';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user_id: string;
}

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(UserSettings) private readonly settingsRepo: Repository<UserSettings>,
    @InjectRepository(RefreshToken) private readonly tokensRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(configService.get('google.clientId'));
  }

  async loginAnonymous(deviceId: string): Promise<AuthTokens> {
    let user = await this.usersRepo.findOne({
      where: { anonymousId: deviceId, authProvider: AuthProvider.ANONYMOUS },
    });

    if (!user) {
      user = this.usersRepo.create({
        anonymousId: deviceId,
        authProvider: AuthProvider.ANONYMOUS,
      });
      user = await this.usersRepo.save(user);
      await this.createDefaultSettings(user.id);
    }

    return this.generateTokens(user);
  }

  async loginApple(identityToken: string, name?: string): Promise<AuthTokens> {
    // Verify Apple token
    let applePayload: any;
    try {
      const appleSignIn = require('apple-signin-auth');
      applePayload = await appleSignIn.verifyIdToken(identityToken, {
        audience: this.configService.get('apple.clientId'),
        ignoreExpiration: false,
      });
    } catch {
      throw new UnauthorizedException({
        error: { code: 'INVALID_APPLE_TOKEN', message: 'Invalid Apple identity token', field: null },
      });
    }

    const providerId = applePayload.sub;
    return this.findOrCreateOAuthUser(AuthProvider.APPLE, providerId, applePayload.email, name);
  }

  async loginGoogle(idToken: string): Promise<AuthTokens> {
    let ticket: any;
    try {
      ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.configService.get('google.clientId'),
      });
    } catch {
      throw new UnauthorizedException({
        error: { code: 'INVALID_GOOGLE_TOKEN', message: 'Invalid Google ID token', field: null },
      });
    }

    const payload = ticket.getPayload();
    return this.findOrCreateOAuthUser(AuthProvider.GOOGLE, payload.sub, payload.email, payload.name);
  }

  private async findOrCreateOAuthUser(
    provider: AuthProvider,
    providerId: string,
    email?: string,
    displayName?: string,
  ): Promise<AuthTokens> {
    let user = await this.usersRepo.findOne({
      where: { authProvider: provider, authProviderId: providerId },
    });

    if (!user && email) {
      user = await this.usersRepo.findOne({ where: { email } });
    }

    if (!user) {
      user = this.usersRepo.create({
        authProvider: provider,
        authProviderId: providerId,
        email: email || null,
        displayName: displayName || null,
      });
      user = await this.usersRepo.save(user);
      await this.createDefaultSettings(user.id);
    } else {
      // Update provider info
      user.authProvider = provider;
      user.authProviderId = providerId;
      if (email && !user.email) user.email = email;
      if (displayName && !user.displayName) user.displayName = displayName;
      await this.usersRepo.save(user);
    }

    return this.generateTokens(user);
  }

  async refreshTokens(rawRefreshToken: string): Promise<AuthTokens> {
    let payload: any;
    try {
      payload = this.jwtService.verify(rawRefreshToken, {
        secret: this.configService.get('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException({
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired refresh token', field: null },
      });
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException({
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid token type', field: null },
      });
    }

    const tokenRecord = await this.tokensRepo.findOne({ where: { id: payload.jti } });
    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException({
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token revoked or expired', field: null },
      });
    }

    const user = await this.usersRepo.findOne({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();

    // Rotate: revoke old token
    tokenRecord.revokedAt = new Date();
    await this.tokensRepo.save(tokenRecord);

    return this.generateTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.tokensRepo
      .createQueryBuilder()
      .update()
      .set({ revokedAt: new Date() })
      .where('user_id = :userId AND revoked_at IS NULL', { userId })
      .execute();
  }

  async mergeAccounts(anonymousToken: string, providerToken: string): Promise<AuthTokens> {
    // Verify anonymous token
    let anonPayload: any;
    try {
      anonPayload = this.jwtService.verify(anonymousToken, {
        secret: this.configService.get('jwt.accessSecret'),
      });
    } catch {
      throw new BadRequestException({
        error: { code: 'INVALID_TOKEN', message: 'Invalid anonymous token', field: 'anonymous_token' },
      });
    }

    const anonUser = await this.usersRepo.findOne({ where: { id: anonPayload.sub } });
    if (!anonUser || anonUser.authProvider !== AuthProvider.ANONYMOUS) {
      throw new BadRequestException({
        error: { code: 'NOT_ANONYMOUS', message: 'Token does not belong to anonymous user', field: null },
      });
    }

    // Verify provider token (Google for now — Apple handled separately)
    let providerTicket: any;
    try {
      providerTicket = await this.googleClient.verifyIdToken({ idToken: providerToken });
    } catch {
      throw new BadRequestException({
        error: { code: 'INVALID_PROVIDER_TOKEN', message: 'Invalid provider token', field: 'provider_token' },
      });
    }

    const gpayload = providerTicket.getPayload();
    const existingProvider = await this.usersRepo.findOne({
      where: { authProvider: AuthProvider.GOOGLE, authProviderId: gpayload.sub },
    });

    if (existingProvider) {
      throw new ConflictException({
        error: { code: 'ACCOUNT_ALREADY_EXISTS', message: 'Provider account already linked to another user', field: null },
      });
    }

    // Upgrade anonymous account
    anonUser.authProvider = AuthProvider.GOOGLE;
    anonUser.authProviderId = gpayload.sub;
    anonUser.email = gpayload.email || null;
    anonUser.displayName = gpayload.name || null;
    anonUser.anonymousId = null;
    await this.usersRepo.save(anonUser);

    return this.generateTokens(anonUser);
  }

  private async createDefaultSettings(userId: string): Promise<void> {
    const settings = this.settingsRepo.create({ userId });
    await this.settingsRepo.save(settings);
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const jti = uuidv4();
    const accessExpiresIn = this.configService.get<string>('jwt.accessExpiresIn');
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn');

    const accessToken = this.jwtService.sign(
      { sub: user.id, type: 'access' },
      { secret: this.configService.get('jwt.accessSecret'), expiresIn: accessExpiresIn },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh', jti },
      { secret: this.configService.get('jwt.refreshSecret'), expiresIn: refreshExpiresIn },
    );

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    // Parse "30d" → days
    const match = (refreshExpiresIn ?? '30d').match(/^(\d+)d$/);
    if (match) expiresAt.setDate(expiresAt.getDate() + parseInt(match[1]));
    else expiresAt.setDate(expiresAt.getDate() + 30);

    await this.tokensRepo.save(
      this.tokensRepo.create({ id: jti, userId: user.id, tokenHash, expiresAt }),
    );

    return { access_token: accessToken, refresh_token: refreshToken, user_id: user.id };
  }
}
