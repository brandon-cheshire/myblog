import { HttpException } from './HttpException';

class UserNotActiveException extends HttpException {
  constructor() {
    super(401, 'Confirm your account to proceed');
  }
}

export { UserNotActiveException };