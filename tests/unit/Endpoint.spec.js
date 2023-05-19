import sinon, { fake } from 'sinon';
import { strict as assert } from 'node:assert';
import Endpoint from '../../lib/Endpoint.js';
import { getOpenAPIDoc } from '../helpers/parser.js';
import ParameterError from '../../lib/errors/ParameterError.js';

describe('unit: Endpoint', () => {
  let endpoint;
  let controllerFunction;
  let securityCallbacks;
  let securitySchemes;
  let getDefinition;

  beforeEach(() => {
    const apiDoc = getOpenAPIDoc();
    const {
      paths: { '/greeting/:pathName': { post: postDefinition } },
    } = apiDoc;
    ({
      paths: { '/greeting': { get: getDefinition } },
      securitySchemes,
    } = apiDoc);
    controllerFunction = fake();
    securityCallbacks = {
      basicAuth: sinon.fake.resolves(),
    };
    endpoint = new Endpoint(securitySchemes, securityCallbacks, '/greeting', 'post', postDefinition, controllerFunction);
    sinon.spy(endpoint.paramValidator, 'test');
  });

  it('should throw in testing parameter', () => {
    assert.throws(() => endpoint.test({
      pathName: 123,
    }, {}, {
      qsName: 123,
    }, 'application/json', {
      bodyName: 123,
    }), new ParameterError('INPUT_VALIDATION_FAILED', [
      {
        code: null,
        reason: 'type',
        message: 'must be string, but is number',
        property: '@.path.pathName',
      },
      {
        code: null,
        reason: 'type',
        message: 'must be string, but is number',
        property: '@.qs.qsName',
      },
      {
        code: null,
        reason: 'type',
        message: 'must be string, but is number',
        property: '@.requestBody["application/json"].bodyName',
      },
    ]));
  });

  it('should throw if content type is incorrect', () => {
    assert.throws(() => endpoint.test({
      pathName: 123,
    }, {}, {
      qsName: 123,
    }, 'text/plain', {
      bodyName: 123,
    }), new ParameterError('INPUT_VALIDATION_FAILED', [
      {
        code: null,
        reason: 'type',
        message: 'must be string, but is number',
        property: '@.path.pathName',
      },
      {
        code: null,
        reason: 'type',
        message: 'must be string, but is number',
        property: '@.qs.qsName',
      },
      {
        code: null,
        reason: 'strict',
        message: 'request body content-type invalid',
        property: '@.requestBody',
      },
    ]));
  });

  it('should not throw in testing parameter', () => {
    endpoint.test({
      pathName: '123',
    }, {}, {
      qsName: '123',
    }, 'application/json', {
      bodyName: '123',
    });
    sinon.assert.calledOnce(endpoint.paramValidator.test);
  });

  it('should be able to pass through security validation', () => {
    endpoint = new Endpoint(securitySchemes, securityCallbacks, '/greeting', 'get', getDefinition, controllerFunction);
    sinon.spy(endpoint.securityValidator, 'test');

    const pathParams = {
      pathName: '123',
    };
    const security = {
      basicAuth: () => {},
    };
    const query = {
      qsName: '123',
    };

    endpoint.test(pathParams, security, query, 'application/json', {
      bodyName: '123',
    });
    sinon.assert.calledOnce(endpoint.securityValidator.test);
  });
});
