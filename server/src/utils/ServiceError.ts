/**
 * Typed error for service layer functions.
 * Route handlers catch these and map statusCode to HTTP response.
 */
export class ServiceError extends Error {
  statusCode: number;
  extra?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number,
    extra?: Record<string, any>
  ) {
    super(message);
    this.name = 'ServiceError';
    this.statusCode = statusCode;
    this.extra = extra;
  }
}
