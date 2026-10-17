/**
 * Base class for all operational (expected) errors in the system.
 * Thrown deliberately by services/controllers; caught centrally by
 * error.middleware.ts and turned into the standard error response shape.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors: unknown[];

  constructor(message: string, statusCode = 500, errors: unknown[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', errors: unknown[] = []) {
    return new AppError(message, 400, errors);
  }
  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, 401);
  }
  static forbidden(message = 'Forbidden') {
    return new AppError(message, 403);
  }
  static notFound(message = 'Resource not found') {
    return new AppError(message, 404);
  }
  static conflict(message = 'Conflict', errors: unknown[] = []) {
    return new AppError(message, 409, errors);
  }
  static unprocessable(message = 'Unprocessable entity', errors: unknown[] = []) {
    return new AppError(message, 422, errors);
  }
  static tooManyRequests(message = 'Too many requests') {
    return new AppError(message, 429);
  }
  static internal(message = 'Internal server error') {
    return new AppError(message, 500);
  }
}
