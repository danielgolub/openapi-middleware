import debug from 'debug';
import _ from 'lodash';
import inspector from 'schema-inspector';
import SecurityError from './errors/SecurityError.js';
import openApiSecuritySchema from './openapi-validators/securitySchemes.js';

/**
 * Security Validation class (should be initiated once per endpoint upon its setup)
 * @module SecurityValidator
 */
export default class SecurityValidator {
  /**
   * SecurityValidator
   * @property {Object[]} securitySchemes - openapi parameters definition
   * @property {Object}   requestBodyDefinition - openapi body definition
   * @see {@link https://swagger.io/docs/specification/authentication/} - for securitySchemes
   * @see {@link https://swagger.io/docs/specification/describing-request-body/} - for requestBodyDefinition
   */
  constructor(securitySchemes, endpointSecurityDefinition = [], securityCallbacks = {}) {
    this.securitySchemes = securitySchemes;
    this.endpointSecurityDefinition = endpointSecurityDefinition;
    this.securityCallbacks = securityCallbacks;
    this.debug = debug('openapi:security');

    this.validateOpenAPISchema();
    this.setupTestSchema();
  }

  /**
   * Validate the openapi schema
   * @private
   */
  validateOpenAPISchema() {
    // top-level openapi securitySchemes checking
    const securitySchemesValidation = {
      ...openApiSecuritySchema,
      exec(schema, data) {
        _.map(data, (authDefinition, authName) => {
          const malformedApiKeyDefinition = authDefinition.type === 'apiKey' && (!authDefinition.in || !authDefinition.name);
          const malformedHttpDefinition = authDefinition.type === 'http' && !authDefinition.scheme;

          if (malformedApiKeyDefinition) {
            this.report(`${authName} is of type ${authDefinition.type} but missing in / name definition`, 'optional');
          } else if (malformedHttpDefinition) {
            this.report(`${authName} is of type ${authDefinition.type} but missing scheme definition`, 'optional');
          }
        });
      },
    };

    // names of endpoint-level securitySchemes set up
    const endpointSecurityFnNames = this.endpointSecurityDefinition.map((endpointSecurityObj) => {
      const [callbackName] = Object.keys(endpointSecurityObj);
      return callbackName;
    });

    // openapi-middleware usage checking (that provided all relevant callbacks)
    const securityCallbacksValidation = {
      type: 'object',
      required: true,
      exec(callbackDef, data) {
        if (endpointSecurityFnNames.some((securityHandler) => !Object.keys(data).includes(securityHandler))) {
          this.report('all securitySchemes must have correlating callbacks', 'optional');
        }
      },
      properties: {
        '*': {
          type: 'function',
        },
      },
    };

    // run the validation
    const result = inspector.validate({
      type: 'object',
      properties: {
        securitySchemes: securitySchemesValidation,
        securityCallbacks: securityCallbacksValidation,
      },
    }, { securitySchemes: this.securitySchemes, securityCallbacks: this.securityCallbacks });

    if (!result.valid) {
      throw new SecurityError('security definition was invalid', result.error);
    }
  }

  /**
   * Convert openapi input to schema-inspector format
   * @private
   */
  setupTestSchema() {
    this.endpointSchema = this.endpointSecurityDefinition.reduce((allRaw, endpointSecurityObj) => {
      const all = { ...allRaw };
      const [callbackName] = Object.keys(endpointSecurityObj);
      const { securitySchemes: { [callbackName]: definition } } = this;

      if (definition.type === 'http') {
        if (!all.header) {
          all.header = {
            type: 'object',
            required: true,
            properties: {},
          };
        }

        if (!all.header.properties.authorization) {
          all.header.properties.authorization = {
            type: 'string',
            required: true,
          };
        }
      }
      if (definition.type === 'apiKey') {
        if (!all[definition.in]) {
          all[definition.in] = {
            type: 'object',
            required: true,
            properties: {},
          };
        }

        if (!all[definition.in].properties[definition.name]) {
          all[definition.in].properties[definition.name] = {
            type: 'string',
            required: true,
          };
        }
      }
      return all;
    }, {});
  }

  /**
   * Test given header/query input against the instance schema
   * @param {object} header
   * @param {object} query
   * @return {Promise<void>}
   * @throws {module:SecurityError}
   */
  async test(header, query) {
    const result = inspector.validate({
      type: 'object',
      properties: this.endpointSchema,
    }, { header, query });

    if (!result.valid) {
      throw new SecurityError('missing security parameters from request', result.error);
    }

    let i;
    const errors = [];
    for (i = 0; i < this.endpointSecurityDefinition.length; i += 1) {
      const endpointSecurityObj = this.endpointSecurityDefinition[i];
      const [callbackName] = Object.keys(endpointSecurityObj);
      const {
        securitySchemes: { [callbackName]: securityDefinition },
        securityCallbacks: { [callbackName]: securityFn },
      } = this;
      let param;

      if (securityDefinition.type === 'http') {
        param = header.authorization;
      } else if (securityDefinition.type === 'apiKey' && securityDefinition.in === 'header') {
        param = header[securityDefinition.name];
      } else if (securityDefinition.type === 'apiKey' && securityDefinition.in === 'query') {
        param = query[securityDefinition.name];
      }

      try {
        await securityFn(param);
        break;
      } catch (e) {
        errors.push(e);
      }
    }

    if (errors.length === this.endpointSecurityDefinition.length) {
      throw new SecurityError('unauthorized', errors);
    }
  }
}
