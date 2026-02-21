import { HttpException } from '../common/HttpException';

export class UserNotFoundException extends HttpException {
  constructor(identifier: string) {
    super(404, `User not found: ${identifier}`);
  }
}

export class UserWithThatEmailAlreadyExistsException extends HttpException {
  constructor(email: string) {
    super(409, `User with email ${email} already exists`);
  }
}

export class UsernameAlreadyTakenException extends HttpException {
  constructor(username: string) {
    super(409, `Username "${username}" is already taken`);
  }
}
