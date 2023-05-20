import debug from 'debug';
import inspector from 'schema-inspector';
import _ from 'lodash';
import ResponseError from './errors/ResponseError.js';
import { convertOpenAPIToSchemaInspector, parseContentTypesPayloads } from './helpers.js';
import openApiResponsesSchema from './openapi-validators/responses.json' assert { type: "json" };

/**
 * Response Validation class (should be initiated once per endpoint upon its setup)
 * @module ResponseValidator
 */
export default class ResponseValidator {
  /**
   * ResponseValidator
   * @property {Object[]} responseDefinition - openapi responses definition
   * @property {boolean} shouldEnforce - whether to throw or silently fail on invalid response
   * @see {@link https://swagger.io/docs/specification/describing-responses/} - for responseDefinition
   */
  constructor(responseDefinition, shouldEnforce) {
    this.debug = debug('openapi:response');
    /**
     * OpenAPI definition for responses
     * @type object
     * @see {@link https://swagger.io/docs/specification/describing-responses/} - for responseDefinition
     */
    this.definition = responseDefinition;

    /**
     * whether to throw or silently fail on invalid response
     * @type {boolean}
     */
    this.shouldEnforce = shouldEnforce;

    this.debug('set response definition', JSON.stringify(this.definition));

    this.validateOpenAPISchema();
    this.setupTestSchema();
  }

  /**
   * Validate the openapi schema
   * @private
   */
  validateOpenAPISchema() {
    const validationSchema = {
      ...openApiResponsesSchema,
      exec(schema, value) {
        const statusCodes = Object.keys(value);
        const invalidStatusCodes = statusCodes.filter((statusCode) => !/\d/.test(statusCode) && statusCode !== 'default');
        if (invalidStatusCodes.length > 0) {
          this.report(`invalid status codes: ${invalidStatusCodes.join(', ')}`, 'INVALID_STATUS_CODES');
        }
      },
    };

    const result = inspector.validate(validationSchema, this.definition);
    if (!result.valid) {
      throw new ResponseError('invalid openapi schema provided', result.error);
    }
  }

  /**
   * Convert openapi input to schema-inspector format
   * @private
   */
  setupTestSchema() {
    const testProperties = _.reduce(this.definition, (all, { content: contentTypes }, statusCode) => {
      const statusContentTypes = _.reduce(contentTypes, (allContentTypes, contentTypeDef, contentType) => {
        const data = { ...contentTypeDef.schema };
        convertOpenAPIToSchemaInspector(data);

        return {
          ...allContentTypes,
          [contentType]: data,
        };
      }, {});

      return {
        ...all,
        [statusCode]: parseContentTypesPayloads(statusContentTypes),
      };
    }, {});

    this.testSchema = {
      type: 'object',
      strict: true,
      error: 'status code is illegal',
      properties: testProperties,
    };
  }

  /**
   * test an outgoing response against the current instance of ResponseValidator
   * @param {string} statusCode       response status code
   * @param {string} contentType      response content type
   * @param {object} body     response body
   * @return {ResponseError|boolean}
   */
  test(statusCode, contentType, body) {
    const result = inspector.validate(this.testSchema, { [statusCode]: { [contentType]: body } });

    if (!result.valid) {
      const error = new ResponseError('invalid response sent from endpoint controller', result.error);
      if (this.shouldEnforce) {
        throw error;
      }
      return error;
    }

    return true;
  }
}
