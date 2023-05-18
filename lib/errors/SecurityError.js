export default class SecurityError extends Error {
  constructor(errorCode, details) {
    super();

    this.errorCode = errorCode;
    this.details = details;
    this.message = errorCode;
  }
}
