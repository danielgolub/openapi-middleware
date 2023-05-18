import debug from 'debug';
import ParameterValidator from './ParameterValidator.js';
import EndpointError from './errors/EndpointErrors.js';
import SecurityValidator from './SecurityValidator.js';

export default class Endpoint {
  constructor(securitySchemes, securityCallbacks, path, method, definition, controllerFunc) {
    this.path = path;
    this.endpointDefinition = definition;
    this.securitySchemes = securitySchemes;
    this.securityCallbacks = securityCallbacks;
    this.method = method;
    this.controllerFunc = controllerFunc;

    this.debug = debug('openapi:parameter');

    this.parseDefinition();
  }

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

  test(path, headers, queryParams, contentType, bodyParams) {
    const error = new EndpointError('INPUT_VALIDATION_FAILED');
    try {
      this.paramValidator.test(path, queryParams, { [contentType]: bodyParams });
      if (this.securityValidator) {
        this.securityValidator.test(headers, queryParams);
      }
    } catch (e) {
      error.details.push(e);
    }

    if (error.details.length) {
      throw error;
    }
  }
}
