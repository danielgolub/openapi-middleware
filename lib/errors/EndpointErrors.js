export default class EndpointError extends Error {
  constructor(errorCode, details) {
    super();

    this.errorCode = errorCode;
    this.details = details || [];
    this.message = 'endpoint failure';
  }
}
