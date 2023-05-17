export default class MiddlewareError extends Error {
  constructor(reason) {
    super();

    this.reason = reason;
    this.message = `middleware init failure - ${reason}`;
  }
}
