import debug from 'debug';
import inspector from 'schema-inspector';
import _ from 'lodash';
import ParameterError from './errors/ParameterError.js';

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
   * Parameter builder from openapi definition to schema-inspector
   * @private
   * @param {object} parent parent object in which we need to edit its properties
   * @param {integer} i     current iterator
   * @return {object}
   * @see {@link https://www.npmjs.com/package/schema-inspector} - for returned result
   */
  static buildParam(parent, i) {
    const param = parent.properties[i];
    const correlations = _.pick(param, ['type', 'minLength', 'maxLength', 'properties', 'required', 'items']);
    const newParam = {
      ...correlations,
      min: param.minimum,
      max: param.maximum,
    };

    if (param.type === 'number') {
      if (param.format?.includes('int')) {
        newParam.type = 'integer';
      }
      // TODO: multipleOf
    }
    if (param.type === 'string') {
      if (param?.format === 'date') {
        newParam.pattern = 'date';
      }
      if (param?.format === 'date-time') {
        newParam.pattern = 'date-time';
      }
      if (param?.pattern) {
        newParam.pattern = param.pattern;
      }
    }

    if (param.nullable) {
      newParam.type = ['null', param.type];
    }

    return newParam;
  }

  /**
   * Recursion class that goes through each open api definition (to convert to schema-inspector)
   * @private
   * @param {object} param
   */
  eachRecursive(param) {
    // eslint-disable-next-line no-param-reassign
    if (param.properties) {
      // eslint-disable-next-line no-restricted-syntax
      for (const i of Object.keys(param.properties)) {
        // eslint-disable-next-line no-param-reassign
        param.properties[i] = ParameterValidator.buildParam(param, i);
        // eslint-disable-next-line no-param-reassign
        param.properties[i].optional = !param.required || !param.required.includes(i);
        this.eachRecursive(param.properties[i]);
      }
    }
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
      this.eachRecursive(this.schema.properties.path);
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
      this.eachRecursive(this.schema.properties.qs);
    }

    if (this.definition.requestBodyDefinition) {
      this.schema.properties.requestBody = {
        type: 'object',
        strict: true,
        error: 'request body content-type invalid',
        properties: {
          ...Object.keys(this.definition.requestBodyDefinition).reduce((all, contentType) => ({
            ...all,
            [contentType]: _.pick(this.definition.requestBodyDefinition[contentType], ['properties', 'type', 'required']),
          }), {}),
        },
      };
      this.schema.required.push('requestBody');
      this.eachRecursive(this.schema.properties.requestBody);
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
