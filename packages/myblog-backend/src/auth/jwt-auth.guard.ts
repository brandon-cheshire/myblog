import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

/** Validates JWT and sets request.user. Use on protected routes. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
