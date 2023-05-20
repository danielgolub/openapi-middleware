/**
 * Response Validator errors
 * @module ResponseError
 * @extends {Error}
 */
export default class ResponseError extends Error {
  /**
   * Constructor for response error
   * @param {string} errorCode
   * @param {SchemaInspectorError[]} details
   */
  constructor(errorCode, details) {
    super();

    /**
     * Error code
     * @enum {('invalid openapi schema provided'|'invalid response sent from endpoint controller')}
     */
    this.errorCode = errorCode;

    /**
     * Error details
     * @type {SchemaInspectorError[]}
     */
    this.details = details;

    /**
     * Friendly message for the error
     * @type {string}
     */
    this.message = 'failed to validate response';
  }
}
