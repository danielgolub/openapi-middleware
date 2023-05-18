import { strict as assert } from 'node:assert';
import sinon from 'sinon';
import SecurityValidator from '../../lib/SecurityValidator.js';
import SecurityError from '../../lib/errors/SecurityError.js';

describe('unit: SecurityValidator', () => {
  let securityDefinition;
  let endpointSecurityDefinition;

  it('should throw on corrupted definitions', () => {
    securityDefinition = {
      emptyObj: {},
      basicAuth: { type: 'failure' },
      apiKeyInQuery: { type: 'apiKey', in: 'failure', name: 123 },
      apiKeyInHeader: { type: 'apiKey', in: 'failure', name: 123 },
      apiKeyInvalid: { type: 'apiKey' },
      http: { type: 'http', scheme: 'failure', bearerFormat: 123 },
      httpInvalid: { type: 'http' },
      oauth2: { type: 'oauth2' },
      openIdConnect: { type: 'openIdConnect' },
    };
    endpointSecurityDefinition = [
      { emptyObj: [] },
      { basicAuth: [] },
      { apiKeyInQuery: [] },
      { apiKeyInHeader: [] },
      { apiKeyInvalid: [] },
      { http: [] },
      { httpInvalid: [] },
      { oauth2: [] },
      { openIdConnect: [] },
    ];

    assert.throws(() => new SecurityValidator(securityDefinition, endpointSecurityDefinition, { emptyObj: 'string' }), new SecurityError('security definition was invalid', [
      {
        code: 'optional',
        message: 'apiKeyInvalid is of type apiKey but missing in / name definition',
        property: '@.securitySchemes',
        reason: 'unknown',
      },
      {
        code: 'optional',
        message: 'httpInvalid is of type http but missing scheme definition',
        property: '@.securitySchemes',
        reason: 'unknown',
      },
      {
        code: null,
        message: 'is missing and not optional',
        property: '@.securitySchemes.emptyObj.type',
        reason: 'optional',
      },
      {
        code: null,
        message: 'must be equal to ["http" or "apiKey"], but is equal to "failure"',
        property: '@.securitySchemes.basicAuth.type',
        reason: 'eq',
      },
      {
        code: null,
        message: 'must be equal to ["header" or "query"], but is equal to "failure"',
        property: '@.securitySchemes.apiKeyInQuery.in',
        reason: 'eq',
      },
      {
        code: null,
        message: 'must be string, but is number',
        property: '@.securitySchemes.apiKeyInQuery.name',
        reason: 'type',
      },
      {
        code: null,
        message: 'must be equal to ["header" or "query"], but is equal to "failure"',
        property: '@.securitySchemes.apiKeyInHeader.in',
        reason: 'eq',
      },
      {
        code: null,
        message: 'must be string, but is number',
        property: '@.securitySchemes.apiKeyInHeader.name',
        reason: 'type',
      },
      {
        code: null,
        message: 'must be equal to ["bearer" or "basic"], but is equal to "failure"',
        property: '@.securitySchemes.http.scheme',
        reason: 'eq',
      },
      {
        code: null,
        message: 'must be string, but is number',
        property: '@.securitySchemes.http.bearerFormat',
        reason: 'type',
      },
      {
        code: null,
        message: 'must be equal to ["http" or "apiKey"], but is equal to "oauth2"',
        property: '@.securitySchemes.oauth2.type',
        reason: 'eq',
      },
      {
        code: null,
        message: 'must be equal to ["http" or "apiKey"], but is equal to "openIdConnect"',
        property: '@.securitySchemes.openIdConnect.type',
        reason: 'eq',
      },
      {
        code: 'optional',
        message: 'all securitySchemes must have correlating callbacks',
        property: '@.securityCallbacks',
        reason: 'unknown',
      },
      {
        code: null,
        message: 'must be function, but is string',
        property: '@.securityCallbacks.emptyObj',
        reason: 'type',
      },
    ]));
  });

  describe('should succeed security definition validation', () => {
    let securityCallbacks;
    before(() => {
      securityDefinition = {
        basicAuth: { type: 'http', scheme: 'basic' },
        apiKeyInQuery: { type: 'apiKey', in: 'query', name: 'authorizationQuery' },
        apiKeyInHeader: { type: 'apiKey', in: 'header', name: 'authorizationHeader' },
        http: { type: 'http', scheme: 'bearer', bearerFormat: 'somedoc' },
      };
      securityCallbacks = {
        basicAuth: sinon.fake.rejects(new Error('basic auth failed')),
        apiKeyInQuery: sinon.fake.resolves(),
        apiKeyInHeader: sinon.fake.resolves(),
        http: sinon.fake.resolves(),
      };
      endpointSecurityDefinition = [
        { basicAuth: [] },
        { apiKeyInQuery: [] },
        { apiKeyInHeader: [] },
        { http: [] },
      ];
    });

    it('should be able to validate definitions', () => {
      assert.ok(new SecurityValidator(securityDefinition, endpointSecurityDefinition, securityCallbacks));
    });
    it('should fail to call callback', async () => {
      const headers = { };
      const query = {};

      const validator = new SecurityValidator(securityDefinition, endpointSecurityDefinition, securityCallbacks);
      await assert.rejects(() => validator.test(headers, query), new SecurityError('missing security parameters from request', [
        {
          code: null,
          reason: 'optional',
          message: 'is missing and not optional',
          property: '@.header.authorization',
        },
        {
          code: null,
          reason: 'optional',
          message: 'is missing and not optional',
          property: '@.header.authorizationHeader',
        },
        {
          code: null,
          reason: 'optional',
          message: 'is missing and not optional',
          property: '@.query.authorizationQuery',
        },
      ]));
    });
    it('should fail to test all callbacks', async () => {
      const headers = { authorization: 'test basic', authorizationHeader: 'test header' };
      const query = { authorizationQuery: 'test query' };
      const errors = [
        new Error('basicAuth auth failed'),
        new Error('apiKeyInQuery auth failed'),
        new Error('apiKeyInHeader auth failed'),
        new Error('http auth failed'),
      ];
      securityCallbacks = {
        basicAuth: sinon.fake.rejects(errors[0]),
        apiKeyInQuery: sinon.fake.rejects(errors[1]),
        apiKeyInHeader: sinon.fake.rejects(errors[2]),
        http: sinon.fake.rejects(errors[3]),
      };

      const validator = new SecurityValidator(securityDefinition, endpointSecurityDefinition, securityCallbacks);
      await assert.rejects(
        () => validator.test(headers, query),
        new SecurityError('unauthorized', errors),
      );

      sinon.assert.calledOnce(securityCallbacks.basicAuth);
      sinon.assert.calledOnce(securityCallbacks.apiKeyInQuery);
      sinon.assert.calledOnce(securityCallbacks.apiKeyInHeader);
      sinon.assert.calledOnce(securityCallbacks.http);

      sinon.assert.calledWith(securityCallbacks.basicAuth, 'test basic');
      sinon.assert.calledWith(securityCallbacks.apiKeyInQuery, 'test query');
      sinon.assert.calledWith(securityCallbacks.apiKeyInHeader, 'test header');
      sinon.assert.calledWith(securityCallbacks.http, 'test basic');
    });
    it('should succeed in test of second callback', async () => {
      const headers = { authorization: 'test basic', authorizationHeader: 'test header' };
      const query = { authorizationQuery: 'test query' };
      securityCallbacks = {
        basicAuth: sinon.fake.rejects(new Error('basicAuth auth failed')),
        apiKeyInQuery: sinon.fake.resolves(),
        apiKeyInHeader: sinon.fake.resolves(),
        http: sinon.fake.resolves(),
      };

      const validator = new SecurityValidator(securityDefinition, endpointSecurityDefinition, securityCallbacks);
      await validator.test(headers, query);
      sinon.assert.calledOnce(securityCallbacks.basicAuth);
      sinon.assert.calledOnce(securityCallbacks.apiKeyInQuery);
      sinon.assert.notCalled(securityCallbacks.apiKeyInHeader);
      sinon.assert.notCalled(securityCallbacks.http);
    });
  });
});
