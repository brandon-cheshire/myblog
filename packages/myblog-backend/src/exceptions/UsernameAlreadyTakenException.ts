import { HttpException } from './HttpException';

export class UsernameAlreadyTakenException extends HttpException {
    constructor(username: string) {
        super(409, `Username "${username}" is already taken`);
    }
}
