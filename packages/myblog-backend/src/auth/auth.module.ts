import { Global, Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UsersModule } from '../users/users.module.js';
import { JwtStrategy } from './jwt.strategy.js';
import { AppConfigService } from '../appconfig/appconfig.service.js';

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
      inject: [AppConfigService],
      useFactory: (appConfigService: AppConfigService) => {
        const {
          jwtConfig: { secret, expiresInSeconds },
        } = appConfigService.get();
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
