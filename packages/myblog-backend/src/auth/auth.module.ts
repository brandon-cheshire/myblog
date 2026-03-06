import { Global, Module, forwardRef } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UsersModule } from '../users/users.module.js';

/**
 * Auth module (3-layer: Controller → Service → Repository via UserService).
 * Owns: AuthService, AuthController (login, register, 2FA, password reset, etc.).
 * @Global() so guards and AuthService are available to other modules without importing AuthModule.
 */
@Global()
@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
