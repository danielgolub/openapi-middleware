/**
 * Security Validator errors
 * @module SecurityError
 * @extends {Error}
 */
export default class SecurityError extends Error {
  /**
   * Constructor for security error
   * @param {string} errorCode
   * @param {SchemaInspectorError[]} details
   */
  constructor(errorCode, details) {
    super();

    /**
     * Error code
     * @enum {('security definition was invalid'|'missing security parameters from request'|'unauthorized')}
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
    this.message = errorCode;
  }
}
