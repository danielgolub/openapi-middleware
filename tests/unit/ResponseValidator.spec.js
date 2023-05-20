import { strict as assert } from 'node:assert';
import ResponseValidator from '../../lib/ResponseValidator.js';
import ResponseError from '../../lib/errors/ResponseError.js';
import { getOpenAPIDoc } from '../helpers/parser.js';

describe('unit: ResponseValidator', () => {
  let responsesDefinition;

  beforeEach(() => {
    ({ paths: { '/greeting': { get: { responses: responsesDefinition } } } } = getOpenAPIDoc());
  });

  it('should throw when schema is corrupted', async () => {
    responsesDefinition.corruptedStatus = {};
    responsesDefinition['201'] = { corrupted: true };
    responsesDefinition['202'] = { content: 123 };
    responsesDefinition['203'] = { content: { 'application/json': 123 } };
    responsesDefinition['204'] = { content: { 'application/json': { schema: 123 } } };

    assert.throws(() => new ResponseValidator(responsesDefinition, true), new ResponseError('invalid openapi schema provided', [
      {
        code: 'INVALID_STATUS_CODES',
        message: 'invalid status codes: corruptedStatus',
        property: '@',
        reason: 'unknown',
      },
      {
        code: null,
        message: 'is missing and not optional',
        property: '@["201"].content',
        reason: 'optional',
      },
      {
        code: null,
        message: 'must be object, but is number',
        property: '@["202"].content',
        reason: 'type',
      },
      {
        code: null,
        message: 'must be object, but is number',
        property: '@["203"].content["application/json"]',
        reason: 'type',
      },
      {
        code: null,
        message: 'must be object, but is number',
        property: '@["204"].content["application/json"].schema',
        reason: 'type',
      },
      {
        code: null,
        message: 'is missing and not optional',
        property: '@.corruptedStatus.content',
        reason: 'optional',
      },
    ]));
  });

  describe('check: test()', () => {
    it('should silently fail on invalid content type', () => {
      const response = new ResponseValidator(responsesDefinition, false);
      const error = response.test('failure', 'failure', {});
      assert.deepEqual(error, new ResponseError('invalid response sent from endpoint controller', [
        {
          code: null,
          message: 'status code is illegal',
          property: '@',
          reason: 'strict',
        },

      ]));
    });
    it('should throw on invalid content type', () => {
      const response = new ResponseValidator(responsesDefinition, true);
      assert.throws(() => response.test('failure', 'failure', {}), new ResponseError('invalid response sent from endpoint controller', [
        {
          code: null,
          message: 'status code is illegal',
          property: '@',
          reason: 'strict',
        },

      ]));
    });
    it('should throw on unmatched first-level schema', () => {
      const response = new ResponseValidator(responsesDefinition, true);
      assert.throws(() => response.test('200', 'application/json', {}), new ResponseError('invalid response sent from endpoint controller', [
        {
          code: null,
          message: 'is missing and not optional',
          property: '@["200"]["application/json"].responseText',
          reason: 'optional',
        },
      ]));
    });
    it('should throw on unmatched second-level schema', () => {
      const response = new ResponseValidator(responsesDefinition, true);
      assert.throws(() => response.test('200', 'application/json', { responseText: 'test', responseDetails: {} }), new ResponseError('invalid response sent from endpoint controller', [
        {
          code: null,
          message: 'is missing and not optional',
          property: '@["200"]["application/json"].responseDetails.text',
          reason: 'optional',
        },
      ]));
    });
    it('should not throw matched first-level schema', () => {
      const response = new ResponseValidator(responsesDefinition, true);
      response.test('200', 'application/json', { responseText: 'test' });
    });
    it('should not throw matched second-level schema', () => {
      const response = new ResponseValidator(responsesDefinition, true);
      response.test('200', 'application/json', { responseText: 'test', responseDetails: { text: 'test' } });
    });
  });
});
