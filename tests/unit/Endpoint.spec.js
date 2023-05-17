import { fake } from 'sinon';
import { strict as assert } from 'node:assert';
import Endpoint from '../../lib/Endpoint.js';
import { getOpenAPIDoc } from '../helpers/parser.js';
import EndpointError from '../../lib/errors/EndpointErrors.js';
import ParameterError from '../../lib/errors/ParameterErrors.js';

describe('unit: Endpoint', () => {
  let endpoint;
  let controllerFunction;

  beforeEach(() => {
    const { paths: { '/greeting/:pathName': { post: definition } } } = getOpenAPIDoc();
    controllerFunction = fake();
    endpoint = new Endpoint('/greeting', 'post', definition, controllerFunction);
  });

  it('should throw in testing parameter', () => {
    assert.throws(() => endpoint.test({
      pathName: 123,
    }, {
      qsName: 123,
    }, 'application/json', {
      bodyName: 123,
    }), new EndpointError('INPUT_VALIDATION_FAILED', [
      new ParameterError('INPUT_VALIDATION_FAILED', [
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
      ]),
    ]));
  });

  it('should throw if content type is incorrect', () => {
    assert.throws(() => endpoint.test({
      pathName: 123,
    }, {
      qsName: 123,
    }, 'text/plain', {
      bodyName: 123,
    }), new EndpointError('INPUT_VALIDATION_FAILED', [
      new ParameterError('INPUT_VALIDATION_FAILED', [
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
      ]),
    ]));
  });

  it('should not throw in testing parameter', () => {
    endpoint.test({
      pathName: '123',
    }, {
      qsName: '123',
    }, 'application/json', {
      bodyName: '123',
    });
  });
});
