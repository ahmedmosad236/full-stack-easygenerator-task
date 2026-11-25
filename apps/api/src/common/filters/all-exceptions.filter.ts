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
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'An unexpected internal error occurred.';
    let errorName = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        errorName = exception.name;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const resObj = exceptionResponse as Record<string, unknown>;
        if (
          typeof resObj.message === 'string' ||
          Array.isArray(resObj.message)
        ) {
          message = resObj.message as string | string[];
        }
        if (typeof resObj.error === 'string') {
          errorName = resObj.error;
        }
      }

      if (status === HttpStatus.TOO_MANY_REQUESTS) {
        message = 'Too many requests. Please try again later.';
        errorName = 'Too Many Requests';
      }
    } else if (this.isMongoDuplicateKeyError(exception)) {
      status = HttpStatus.CONFLICT;
      message = 'An account with this email address already exists.';
      errorName = 'Conflict';
    } else {
      this.logger.error(
        {
          method: request.method,
          path: request.url,
          errMessage:
            exception instanceof Error ? exception.message : 'Unknown error',
        },
        'Unhandled application exception',
      );
    }

    response.status(status).json({
      statusCode: status,
      error: errorName,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private isMongoDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 11000
    );
  }
}
