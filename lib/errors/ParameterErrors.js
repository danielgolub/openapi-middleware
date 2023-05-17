export default class ParameterError extends Error {
  constructor(errorCode, details) {
    super();

    this.errorCode = errorCode;
    this.details = details;
    this.message = 'failed to validate parameter';
  }
}
