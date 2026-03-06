import { Global, Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UsersModule } from '../users/users.module.js';
import { getJwtConfig } from './auth.config.js';
import { JwtStrategy } from './jwt.strategy.js';

/**
 * Auth module (3-layer: Controller → Service → Repository via UserService).
 * Owns: login, JWT signing, JwtStrategy, JwtAuthGuard, CurrentUser decorator.
 * Import AuthModule once in AppModule so JwtStrategy is registered at bootstrap.
 */
@Global()
@Module({
  imports: [
    forwardRef(() => UsersModule),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => {
        const { secret, expiresInSeconds } = getJwtConfig();
        return {
          secret,
          signOptions: { expiresIn: expiresInSeconds },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
