import { HttpException } from '../common/HttpException';

export class PostNotFoundException extends HttpException {
  constructor(id: string) {
    super(404, `Post with id ${id} not found`);
  }
}

export class NotAuthorizedException extends HttpException {
  constructor() {
    super(403, 'You\'re not authorized');
  }
}
