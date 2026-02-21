import { HttpException } from '../common/HttpException';

export class AuthenticationTokenMissingException extends HttpException {
  constructor() {
    super(401, 'Authentication token missing');
  }
}

export class PasswordResetRequiredException extends HttpException {
  constructor() {
    super(401, 'Password reset required');
  }
}

export class UserNotActiveException extends HttpException {
  constructor() {
    super(401, 'Confirm your account to proceed');
  }
}

export class WrongAuthenticationTokenException extends HttpException {
  constructor() {
    super(401, 'Wrong authentication token');
  }
}

export class WrongCredentialsException extends HttpException {
  constructor() {
    super(401, 'Wrong credentials provided');
  }
}
