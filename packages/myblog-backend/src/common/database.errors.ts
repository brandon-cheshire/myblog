import { HttpException } from './HttpException';

export class UniqueConstraintViolationException extends HttpException {
  constructor() {
    super(409, 'A unique constraint was violated');
  }
}
