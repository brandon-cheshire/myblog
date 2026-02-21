import { HttpException } from './HttpException';

class PasswordResetRequiredException extends HttpException {
  constructor() {
    super(401, 'Password reset required');
  }
}

export { PasswordResetRequiredException };