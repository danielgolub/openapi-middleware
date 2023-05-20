import debug from 'debug';
import ParameterValidator from './ParameterValidator.js';
import SecurityValidator from './SecurityValidator.js';
import ResponseValidator from './ResponseValidator.js';

/**
 * Endpoint instance (combines ParameterValidator + SecurityValidator)
 * @module Endpoint
 */
export default class Endpoint {
  /**
   * Endpoint constructor
   * @param {Object[]} securitySchemes                 openapi top-level security definition
   * @param {Map<string, function>} securityCallbacks  matching security definition validators
   * @param {object} definition                        openapi endpoint definition
   * @param {Map<string, function>} controllerFunc     matching endpoint controller function
   * @param {boolean} enforceResponseValidation        flag for failing invalid responses (that don't match the endpoint's responseScheme)
   * @see {@link https://swagger.io/docs/specification/authentication/}
   * @see {@link https://swagger.io/docs/specification/paths-and-operations/}
   */
  constructor(securitySchemes, securityCallbacks, definition, controllerFunc, enforceResponseValidation) {
    this.securitySchemes = securitySchemes;
    this.securityCallbacks = securityCallbacks;
    this.endpointDefinition = definition;
    this.controllerFunc = controllerFunc;
    this.enforceResponseValidation = enforceResponseValidation;

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
    if (this.endpointDefinition.responses) {
      this.responseValidator = new ResponseValidator(this.endpointDefinition.responses, this.enforceResponseValidation);
    }
    if (this.endpointDefinition.security) {
      this.securityValidator = new SecurityValidator(this.securitySchemes, this.endpointDefinition.security, this.securityCallbacks);
    }
  }

  /**
   * Test request against the endpoint input validators
   * @param {Map<string, any>} path           path parameters object
   * @param {Map<string, any>} headers        header parameters object
   * @param {Map<string, any>} queryParams    query string parameters object
   * @param {string} contentType              content type of the input
   * @param {Map<string, any>} bodyParams     body
   * @throws {module:ParameterError|module:SecurityError}
   */
  async testIncoming(path, headers, queryParams, contentType, bodyParams) {
    this.paramValidator.test(path, queryParams, { [contentType]: bodyParams });
    if (this.securityValidator) {
      await this.securityValidator.test(headers, queryParams);
    }
  }

  /**
   * Test response against the endpoint output validators
   * @param {string} statusCode       response status code
   * @param {string} contentType      response content type
   * @param {object} responseBody     response body
   * @return {Promise<ResponseError|boolean>}
   */
  async testOutgoing(statusCode, contentType, responseBody) {
    if (this.responseValidator) {
      return this.responseValidator.test(statusCode, contentType, responseBody);
    }

    return true;
  }
}
