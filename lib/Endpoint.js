import debug from 'debug';
import ParameterValidator from './ParameterValidator.js';
import SecurityValidator from './SecurityValidator.js';

/**
 * Endpoint instance (combines ParameterValidator + SecurityValidator)
 * @module Endpoint
 */
export default class Endpoint {
  /**
   * Endpoint constructor
   * @property {Object[]} securitySchemes - openapi parameters definition
   * @param {Map<string, function>} securityCallbacks
   * @param {string} path
   * @param {string} method
   * @param {object} definition
   * @param {Map<string, function>} controllerFunc
   * @see {@link https://swagger.io/docs/specification/authentication/} - for securitySchemes
   * @see {@link https://swagger.io/docs/specification/paths-and-operations/} - for definition
   */
  constructor(securitySchemes, securityCallbacks, path, method, definition, controllerFunc) {
    this.path = path;
    this.endpointDefinition = definition;
    this.securitySchemes = securitySchemes;
    this.securityCallbacks = securityCallbacks;
    this.method = method;
    this.controllerFunc = controllerFunc;

    this.debug = debug('openapi:endpoint');

    this.parseDefinition();
  }

  /**
   * Attach the relevant validators to this endpoint
   * @private
   */
  parseDefinition() {
    const requestBodyMap = this.endpointDefinition.requestBody ? Object.keys(this.endpointDefinition.requestBody.content).reduce((all, contentType) => ({
      ...all,
      [contentType]: this.endpointDefinition.requestBody.content[contentType].schema,
    }), {}) : null;
    this.paramValidator = new ParameterValidator(this.endpointDefinition.parameters, requestBodyMap);
    if (this.endpointDefinition.security) {
      this.securityValidator = new SecurityValidator(this.securitySchemes, this.endpointDefinition.security, this.securityCallbacks);
    }
  }

  /**
   * Test endpoint against a given input
   * @param {Map<string, any>} path
   * @param {Map<string, any>} headers
   * @param {Map<string, any>} queryParams
   * @param {string} contentType
   * @param {Map<string, any>} bodyParams
   * @throws {module:ParameterError|module:SecurityError}
   */
  test(path, headers, queryParams, contentType, bodyParams) {
    this.paramValidator.test(path, queryParams, { [contentType]: bodyParams });
    if (this.securityValidator) {
      this.securityValidator.test(headers, queryParams);
    }
  }
}
