import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorBody: any = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        field: null,
      },
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && (exceptionResponse as any).error) {
        errorBody = exceptionResponse;
      } else if (typeof exceptionResponse === 'string') {
        errorBody = { error: { code: 'ERROR', message: exceptionResponse, field: null } };
      } else if (Array.isArray((exceptionResponse as any).message)) {
        // class-validator errors
        errorBody = {
          error: {
            code: 'VALIDATION_ERROR',
            message: (exceptionResponse as any).message[0],
            field: null,
          },
        };
      } else {
        errorBody = {
          error: {
            code: 'ERROR',
            message: (exceptionResponse as any).message || 'Error',
            field: null,
          },
        };
      }
    } else {
      this.logger.error(`Unhandled exception: ${exception}`, (exception as any)?.stack);
    }

    response.status(status).json(errorBody);
  }
}
