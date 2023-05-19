/**
 * @typedef {object} SchemaInspectorError
 * @property {string|null} code schema-inspector code
 * @property {string} reason schema-inspector reason
 * @property {string} message schema-inspector message
 * @property {string} property schema-inspector property
 */

/**
 * Middleware integrator errors
 * @module MiddlewareError
 * @extends {Error}
 */
export default class MiddlewareError extends Error {
  /**
   * Constructor for MiddlewareError
   * @param {string} reason
   */
  constructor(reason) {
    super();

    /**
     * friendly string for failure reason
     * @type {('config property of definition could not be parsed'|'config property of controllers could not be parsed'|'could not setup endpoint because {X}')}
     */
    this.reason = reason;

    /**
     * Error class message alias for reason
     * @type {string}
     */
    this.message = `middleware init failure - ${reason}`;
  }
}
