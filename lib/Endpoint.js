import debug from 'debug';
import ParameterValidator from './ParameterValidator.js';
import EndpointError from './errors/EndpointErrors.js';

export default class Endpoint {
  constructor(path, method, definition, controllerFunc) {
    this.path = path;
    this.definition = definition;
    this.method = method;
    this.controllerFunc = controllerFunc;

    this.debug = debug('openapi:parameter');

    this.parseDefinition();
  }

  parseDefinition() {
    const requestBodyMap = this.definition.requestBody ? Object.keys(this.definition.requestBody.content).reduce((all, contentType) => ({
      ...all,
      [contentType]: this.definition.requestBody.content[contentType].schema,
    }), {}) : null;
    this.paramValidator = new ParameterValidator(this.definition.parameters, requestBodyMap);
  }

  test(path, queryParams, contentType, bodyParams) {
    const error = new EndpointError('INPUT_VALIDATION_FAILED');
    try {
      this.paramValidator.test(path, queryParams, { [contentType]: bodyParams });
    } catch (e) {
      error.details.push(e);
    }

    if (error.details.length) {
      throw error;
    }
  }
}
