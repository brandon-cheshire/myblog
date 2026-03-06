import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRepository } from '../users/user.repository.js';
import { getJwtConfig } from './auth.config.js';
import type { RequestUser } from './auth.types.js';
import {
  WrongAuthenticationTokenException,
  PasswordResetRequiredException,
  UserNotActiveException,
} from './auth.errors.js';

interface JwtPayload {
  sub: string;
  email: string;
  isSecondFactorAuthenticated?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly userRepository: UserRepository) {
    const { secret } = getJwtConfig();
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new WrongAuthenticationTokenException();
    }
    if (user.status === 'password_reset_required') {
      throw new PasswordResetRequiredException();
    }
    if (user.status !== 'active') {
      throw new UserNotActiveException();
    }
    if (
      user.isTwoFactorAuthenticationEnabled &&
      !payload.isSecondFactorAuthenticated
    ) {
      throw new WrongAuthenticationTokenException();
    }
    return { userId: user.id };
  }
}
