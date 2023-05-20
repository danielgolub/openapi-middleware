import debug from 'debug';
import inspector from 'schema-inspector';
import ParameterError from './errors/ParameterError.js';
import { convertOpenAPIToSchemaInspector, parseContentTypesPayloads } from './helpers.js';

/**
 * Parameter Validation class (should be initiated once per endpoint upon its setup)
 * @module ParameterValidator
 */
export default class ParameterValidator {
  /**
   * ParameterValidator
   * @property {Object[]} parametersDefinition - openapi parameters definition
   * @see {@link https://swagger.io/docs/specification/describing-parameters/} - for parametersDefinition
   * @property {Object}   requestBodyDefinition - openapi body definition
   * @see {@link https://swagger.io/docs/specification/describing-request-body/} - for requestBodyDefinition
   */
  constructor(parametersDefinition, requestBodyDefinition) {
    const pathParamsDefinition = parametersDefinition?.filter(({ in: source }) => source === 'path');
    const qsParamsDefinition = parametersDefinition?.filter(({ in: source }) => source === 'query');
    this.debug = debug('openapi:parameter');
    this.definition = { pathParamsDefinition, qsParamsDefinition, requestBodyDefinition };
    this.debug('set parameter definition', JSON.stringify(this.definition));
    this.setupSchema();
  }

  /**
   * Setup the dynamic schema of parameters (path / query / body)
   * @private
   */
  setupSchema() {
    this.schema = {
      type: 'object',
      required: [],
      properties: {},
    };

    const mapParams = (array) => array.reduce((all, property) => ({
      ...all,
      [property.name]: { ...property, ...property.schema },
    }), {});

    if (this.definition.pathParamsDefinition) {
      this.schema.properties.path = {
        type: 'object',
        required: this.definition.pathParamsDefinition.filter((param) => param.required).map((i) => i.name),
        properties: {
          ...mapParams(this.definition.pathParamsDefinition),
        },
      };
      this.schema.required.push('path');
      convertOpenAPIToSchemaInspector(this.schema.properties.path);
    }

    if (this.definition.qsParamsDefinition) {
      this.schema.properties.qs = {
        type: 'object',
        required: this.definition.qsParamsDefinition.filter((param) => param.required).map((i) => i.name),
        properties: {
          ...mapParams(this.definition.qsParamsDefinition),
        },
      };
      this.schema.required.push('qs');
      convertOpenAPIToSchemaInspector(this.schema.properties.qs);
    }

    if (this.definition.requestBodyDefinition) {
      this.schema.properties.requestBody = parseContentTypesPayloads(this.definition.requestBodyDefinition);
      this.schema.required.push('requestBody');
      convertOpenAPIToSchemaInspector(this.schema.properties.requestBody);
    }

    this.debug('created validation schema', JSON.stringify(this.schema));
  }

  /**
   * test an incoming request against the current instance of ParameterValidator
   * @param {Map<string, any>} path
   * @param {Map<string, any>} qs
   * @param {Map<string, any>} requestBody
   * @throws module:ParameterError
   */
  test(path = {}, qs = {}, requestBody = {}) {
    this.debug('testing parameter', path, qs, requestBody);
    // TODO: check string byte / binary via custom validator
    const result = inspector.validate(this.schema, { path, qs, requestBody });
    if (!result.valid) {
      this.debug('error found', result.format());
      throw new ParameterError('INPUT_VALIDATION_FAILED', result.error);
    }
  }
}
