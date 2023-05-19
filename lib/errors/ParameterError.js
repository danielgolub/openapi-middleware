/**
 * Parameter Validator errors
 * @module ParameterError
 * @extends {Error}
 */
export default class ParameterError extends Error {
  /**
   * Constructor for parameter error
   * @param {string} errorCode
   * @param {SchemaInspectorError[]} details
   */
  constructor(errorCode, details) {
    super();

    /**
     * Error code
     * @enum {('INPUT_VALIDATION_FAILED')}
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
    this.message = 'failed to validate parameter';
  }
}
