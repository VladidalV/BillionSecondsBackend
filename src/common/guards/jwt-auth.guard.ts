import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, _context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException({
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token', field: null },
      });
    }
    return user;
  }
}
