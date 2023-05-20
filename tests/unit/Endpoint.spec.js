import sinon, { fake } from 'sinon';
import { strict as assert } from 'node:assert';
import Endpoint from '../../lib/Endpoint.js';
import { getOpenAPIDoc } from '../helpers/parser.js';
import ParameterError from '../../lib/errors/ParameterError.js';
import ResponseError from '../../lib/errors/ResponseError.js';

describe('unit: Endpoint', () => {
  let postEndpoint;
  let getEndpoint;
  let putEndpoint;
  let controllerFunction;
  let securityCallbacks;

  beforeEach(() => {
    const apiDoc = getOpenAPIDoc();
    const {
      paths: {
        '/greeting/:pathName': { post: postDefinition },
        '/greeting': { get: getDefinition, put: putDefinition },
      },
      securitySchemes,
    } = apiDoc;
    controllerFunction = fake();
    securityCallbacks = {
      basicAuth: sinon.fake.resolves(),
    };

    postEndpoint = new Endpoint(securitySchemes, securityCallbacks, postDefinition, controllerFunction, true);
    getEndpoint = new Endpoint(securitySchemes, securityCallbacks, getDefinition, controllerFunction, false);
    putEndpoint = new Endpoint(securitySchemes, securityCallbacks, putDefinition, controllerFunction, false);

    sinon.spy(postEndpoint.paramValidator, 'test');
    sinon.spy(postEndpoint.responseValidator, 'test');

    sinon.spy(getEndpoint.securityValidator, 'test');
    sinon.spy(getEndpoint.responseValidator, 'test');
  });

  describe('check: testIncoming()', () => {
    it('should throw in testing parameter', async () => {
      await assert.rejects(() => postEndpoint.testIncoming({
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

    it('should throw if content type is incorrect', async () => {
      await assert.rejects(() => postEndpoint.testIncoming({
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
          message: 'content-type invalid',
          property: '@.requestBody',
        },
      ]));
    });

    it('should not throw in testing parameter', () => {
      postEndpoint.testIncoming({
        pathName: '123',
      }, {}, {
        qsName: '123',
      }, 'application/json', {
        bodyName: '123',
      });
      sinon.assert.calledOnce(postEndpoint.paramValidator.test);
    });

    it('should be able to pass through security validation', async () => {
      postEndpoint.securityCallbacks = {
        basicAuth: () => {
        },
      };
      const pathParams = {
        pathName: '123',
      };
      const query = {
        qsName: '123',
      };
      const headers = {
        authorization: 'test',
      };

      await getEndpoint.testIncoming(pathParams, headers, query, 'application/json', {
        bodyName: '123',
      });
      sinon.assert.calledOnce(securityCallbacks.basicAuth);
      sinon.assert.calledOnce(getEndpoint.securityValidator.test);
    });
  });

  describe('check: testOutgoing', () => {
    it('should be able to throw on response validation', async () => {
      await assert.rejects(postEndpoint.testOutgoing('200', 'application/json', {
        invalidResponse: '',
      }), new ResponseError('invalid response sent from endpoint controller', [
        {
          code: null,
          message: 'is missing and not optional',
          property: '@["200"]["application/json"].responseText',
          reason: 'optional',
        },
      ]));
      sinon.assert.calledOnce(postEndpoint.responseValidator.test);
    });

    it('should be able to pass through response validation', async () => {
      await postEndpoint.testOutgoing('200', 'application/json', {
        responseText: '123',
      });
      sinon.assert.calledOnce(postEndpoint.responseValidator.test);
    });

    it('should be able to silently fail on response', async () => {
      const error = await getEndpoint.testOutgoing('fail', 'fail', {});

      sinon.assert.calledOnce(getEndpoint.responseValidator.test);
      assert.deepEqual(error, new ResponseError('invalid response sent from endpoint controller', [
        {
          code: null,
          message: 'status code is illegal',
          property: '@',
          reason: 'strict',
        },
      ]));
    });

    it('should be able to succeed on response with silent error flag on', async () => {
      const response = await getEndpoint.testOutgoing('200', 'application/json', {
        responseText: '123',
      });
      assert.deepEqual(response, true);
      sinon.assert.calledOnce(getEndpoint.responseValidator.test);
    });

    it('should be able to succeed without ResponseValidator', async () => {
      const response = await putEndpoint.testOutgoing('200', 'application/json', {
        responseText: '123',
      });
      assert.deepEqual(response, true);
      sinon.assert.notCalled(getEndpoint.responseValidator.test);
    });
  });
});
