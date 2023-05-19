import { strict as assert } from 'node:assert';
import ParameterValidator from '../../lib/ParameterValidator.js';
import ParameterError from '../../lib/errors/ParameterError.js';

describe('unit: ParameterValidator', () => {
  describe('check: required or optional', () => {
    it('should throw when required param is not set', async () => {
      const parameter = new ParameterValidator([
        {
          name: 'pathString',
          in: 'path',
          required: true,
          description: 'user name.',
          schema: { type: 'string' },
        },
        {
          name: 'qsString',
          in: 'query',
          required: true,
          description: 'user name.',
          schema: { type: 'string' },
        },
      ]);
      assert.throws(() => parameter.test({}, {}), new ParameterError('INPUT_VALIDATION_FAILED', [
        {
          code: null,
          reason: 'optional',
          message: 'is missing and not optional',
          property: '@.path.pathString',
        },
        {
          code: null,
          reason: 'optional',
          message: 'is missing and not optional',
          property: '@.qs.qsString',
        },
      ]));
    });
    it('should not throw when optional param is not set', async () => {
      const parameter = new ParameterValidator([
        {
          name: 'pathString',
          in: 'path',
          required: false,
          description: 'user name.',
          schema: { type: 'string' },
        },
        {
          name: 'qsString',
          in: 'query',
          required: false,
          description: 'user name.',
          schema: { type: 'string' },
        },
      ]);
      parameter.test({}, {});
    });
  });

  describe('check: data types', () => {
    describe('type: primitives', () => {
      let parameter;

      beforeEach(() => {
        const queryParams = [
          {
            name: 'qsString',
            in: 'query',
            required: true,
            description: 'user name.',
            schema: { type: 'string' },
          },
          {
            name: 'qsNumber',
            in: 'query',
            required: true,
            description: 'user name.',
            schema: { type: 'number' },
          },
          {
            name: 'qsInteger',
            in: 'query',
            required: true,
            description: 'user name.',
            schema: { type: 'integer' },
          },
          {
            name: 'qsBoolean',
            in: 'query',
            required: true,
            description: 'user name.',
            schema: { type: 'boolean' },
          },
        ];

        const pathParams = queryParams.map((param) => ({
          ...param,
          name: param.name.replace('qs', 'path'),
          in: param.in.replace('query', 'path'),
        }));

        parameter = new ParameterValidator([...pathParams, ...queryParams]);
      });

      it('should throw when not correct data types', () => {
        let expectedErrors = [
          {
            code: null,
            reason: 'type',
            message: 'must be string, but is number',
            property: '@.path.pathString',
          },
          {
            code: null,
            reason: 'type',
            message: 'must be number, but is string',
            property: '@.path.pathNumber',
          },
          {
            code: null,
            reason: 'type',
            message: 'must be integer, but is number',
            property: '@.path.pathInteger',
          },
          {
            code: null,
            reason: 'type',
            message: 'must be boolean, but is number',
            property: '@.path.pathBoolean',
          },
        ];
        expectedErrors = expectedErrors.concat(expectedErrors.map((error) => ({
          ...error,
          property: error.property.replace(/path/g, 'qs'),
        })));

        assert.throws(() => parameter.test({
          pathString: 123,
          pathNumber: '123',
          pathInteger: 123.123,
          pathBoolean: 123,
        }, {
          qsString: 123,
          qsNumber: '123',
          qsInteger: 123.123,
          qsBoolean: 123,
        }), new ParameterError('INPUT_VALIDATION_FAILED', expectedErrors));
      });

      it('should not throw when correct data types', () => {
        parameter.test({
          pathString: '123',
          pathNumber: 123,
          pathInteger: 123,
          pathBoolean: true,
        }, {
          qsString: '123',
          qsNumber: 123,
          qsInteger: 123,
          qsBoolean: true,
        });
      });
    });
    describe('type: object', () => {
      let parameter;

      beforeEach(() => {
        parameter = new ParameterValidator([
          {
            name: 'pathObject',
            in: 'path',
            required: true,
            description: 'user name.',
            schema: {
              type: 'object',
              required: [
                'firstName',
              ],
              properties: {
                firstName: {
                  type: 'string',
                },
                lastName: {
                  type: 'string',
                },
              },
            },
          },
          {
            name: 'qsObject',
            in: 'query',
            required: true,
            description: 'user name.',
            schema: {
              type: 'object',
              required: [
                'firstName',
              ],
              properties: {
                firstName: {
                  type: 'string',
                },
                lastName: {
                  type: 'string',
                },
              },
            },
          },
        ]);
      });

      it('should throw when not object', () => {
        assert.throws(() => parameter.test({ pathObject: '123' }, { qsObject: '123' }), new ParameterError('INPUT_VALIDATION_FAILED', [
          {
            code: null,
            reason: 'type',
            message: 'must be object, but is string',
            property: '@.path.pathObject',
          },
          {
            code: null,
            reason: 'type',
            message: 'must be object, but is string',
            property: '@.qs.qsObject',
          },
        ]));
      });

      it('should throw when object but missing required property', () => {
        assert.throws(() => parameter.test({ pathObject: {} }, { qsObject: {} }), new ParameterError('INPUT_VALIDATION_FAILED', [
          {
            code: null,
            reason: 'optional',
            message: 'is missing and not optional',
            property: '@.path.pathObject.firstName',
          },
          {
            code: null,
            reason: 'optional',
            message: 'is missing and not optional',
            property: '@.qs.qsObject.firstName',
          },
        ]));
      });

      it('should throw when object but inner property is not a string', () => {
        assert.throws(() => parameter.test({ pathObject: { firstName: 123 } }, { qsObject: { firstName: 123 } }), new ParameterError('INPUT_VALIDATION_FAILED', [
          {
            code: null,
            reason: 'type',
            message: 'must be string, but is number',
            property: '@.path.pathObject.firstName',
          },
          {
            code: null,
            reason: 'type',
            message: 'must be string, but is number',
            property: '@.qs.qsObject.firstName',
          },
        ]));
      });

      it('should not throw on optional property', () => {
        parameter.test({ pathObject: { firstName: 'asd' } }, { qsObject: { firstName: 'asd' } });
      });
    });
    describe('type: array', () => {
      let parameter;

      beforeEach(() => {
        parameter = new ParameterValidator([
          {
            name: 'pathArray',
            in: 'path',
            required: true,
            description: 'user name.',
            schema: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
          {
            name: 'qsArray',
            in: 'query',
            required: true,
            description: 'user name.',
            schema: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
        ]);
      });

      it('should throw when not array', () => {
        assert.throws(() => parameter.test({ pathArray: 'daniel' }, { qsArray: 'daniel' }), new ParameterError('INPUT_VALIDATION_FAILED', [
          {
            code: null,
            reason: 'type',
            message: 'must be array, but is string',
            property: '@.path.pathArray',
          },
          {
            code: null,
            reason: 'type',
            message: 'must be array, but is string',
            property: '@.qs.qsArray',
          },
        ]));
      });

      it('should throw when array of number', () => {
        assert.throws(() => parameter.test({ pathArray: ['first name', 1] }, { qsArray: ['first name', 1] }), new ParameterError('INPUT_VALIDATION_FAILED', [
          {
            code: null,
            reason: 'type',
            message: 'must be string, but is number',
            property: '@.path.pathArray[1]',
          },
          {
            code: null,
            reason: 'type',
            message: 'must be string, but is number',
            property: '@.qs.qsArray[1]',
          },
        ]));
      });
      it('should not throw when array of strings', () => {
        parameter.test({ pathArray: ['first name', 'last name'] }, { qsArray: ['first name', 'last name'] });
      });
    });
  });

  describe('check: number validators', () => {
    describe('minimum / maximum', () => {
      let parameter;

      beforeEach(() => {
        parameter = new ParameterValidator([
          {
            name: 'pathNumber',
            in: 'path',
            required: true,
            schema: { type: 'number', minimum: 2, maximum: 4 },
          },
          {
            name: 'qsNumber',
            in: 'query',
            required: true,
            schema: { type: 'number', minimum: 2, maximum: 4 },
          },
        ]);
      });

      // TODO: following should work with the validation lib
      it.skip('should throw when not meeting number minimum', () => {
        assert.throws(() => parameter.test({}, {
          nameNumber: 1,
        }), new ParameterError('INPUT_VALIDATION_FAILED', [
          {
            code: null,
            reason: 'type',
            message: 'must be number, but is string',
            property: '@.qs.nameNumber',
          },
        ]));
      });
      it.skip('should throw when not meeting number maximum', () => {
        assert.throws(() => parameter.test({}, {
          nameNumber: 8,
        }), new ParameterError('INPUT_VALIDATION_FAILED', [
          {
            code: null,
            reason: 'type',
            message: 'must be number, but is string',
            property: '@.qs.nameNumber',
          },
        ]));
      });
      it('should not throw on ranged number', () => {
        parameter.test({
          pathNumber: 2,
        }, {
          qsNumber: 2,
        });
      });
    });

    describe('format', () => {
      let parameter;

      beforeEach(() => {
        parameter = new ParameterValidator([
          {
            name: 'pathFloat',
            in: 'path',
            required: true,
            schema: { type: 'number', format: 'float' },
          },
          {
            name: 'pathDouble',
            in: 'path',
            required: true,
            schema: { type: 'number', format: 'double' },
          },
          {
            name: 'pathInt32',
            in: 'path',
            required: true,
            schema: { type: 'number', format: 'int32' },
          },
          {
            name: 'pathInt64',
            in: 'path',
            required: true,
            schema: { type: 'number', format: 'int64' },
          },
          {
            name: 'qsFloat',
            in: 'query',
            required: true,
            schema: { type: 'number', format: 'float' },
          },
          {
            name: 'qsDouble',
            in: 'query',
            required: true,
            schema: { type: 'number', format: 'double' },
          },
          {
            name: 'qsInt32',
            in: 'query',
            required: true,
            schema: { type: 'number', format: 'int32' },
          },
          {
            name: 'qsInt64',
            in: 'query',
            required: true,
            schema: { type: 'number', format: 'int64' },
          },
        ]);
      });

      it('should throw on format mismatch', () => {
        assert.throws(() => parameter.test({
          pathFloat: 123,
          pathDouble: 123,
          pathInt32: 123.123,
          pathInt64: 123.123,
        }, {
          qsFloat: 123,
          qsDouble: 123,
          qsInt32: 123.123,
          qsInt64: 123.123,
        }), new ParameterError('INPUT_VALIDATION_FAILED', [
          {
            code: null,
            reason: 'type',
            message: 'must be integer, but is number',
            property: '@.path.pathInt32',
          },
          {
            code: null,
            reason: 'type',
            message: 'must be integer, but is number',
            property: '@.path.pathInt64',
          },
          {
            code: null,
            reason: 'type',
            message: 'must be integer, but is number',
            property: '@.qs.qsInt32',
          },
          {
            code: null,
            reason: 'type',
            message: 'must be integer, but is number',
            property: '@.qs.qsInt64',
          },
        ]));
      });

      it('should not throw when integer validation passed', () => {
        parameter.test({
          pathDouble: 123,
          pathFloat: 123,
          pathInt32: 123,
          pathInt64: 123,
        }, {
          qsFloat: 123,
          qsDouble: 123,
          qsInt32: 123,
          qsInt64: 123,
        });
      });
    });
  });

  describe('check: string validators', () => {
    describe('minLength / maxLength', () => {
      let parameter;

      beforeEach(() => {
        parameter = new ParameterValidator([
          {
            name: 'pathString',
            in: 'path',
            required: true,
            schema: { type: 'string', minLength: 2, maxLength: 4 },
          },
          {
            name: 'qsString',
            in: 'query',
            required: true,
            schema: { type: 'string', minLength: 2, maxLength: 4 },
          },
        ]);
      });

      it('should fail on minLength', () => {
        assert.throws(() => parameter.test({
          pathString: 't',
        }, {
          qsString: 't',
        }), new ParameterError('INPUT_VALIDATION_FAILED', [
          {
            code: null,
            reason: 'minLength',
            message: 'must be longer than 2 elements, but it has 1',
            property: '@.path.pathString',
          },
          {
            code: null,
            reason: 'minLength',
            message: 'must be longer than 2 elements, but it has 1',
            property: '@.qs.qsString',
          },
        ]));
      });

      it('should fail on maxLength', () => {
        assert.throws(() => parameter.test({
          pathString: 'test string',
        }, {
          qsString: 'test string',
        }), new ParameterError('INPUT_VALIDATION_FAILED', [
          {
            code: null,
            reason: 'maxLength',
            message: 'must be shorter than 4 elements, but it has 11',
            property: '@.path.pathString',
          },
          {
            code: null,
            reason: 'maxLength',
            message: 'must be shorter than 4 elements, but it has 11',
            property: '@.qs.qsString',
          },
        ]));
      });

      it('should not throw', () => {
        parameter.test({
          pathString: 'test',
        }, {
          qsString: 'test',
        });
      });
    });

    describe('format', () => {
      let parameter;

      beforeEach(() => {
        parameter = new ParameterValidator([
          {
            name: 'pathDate',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'date' },
          },
          {
            name: 'pathDateTime',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'qsDate',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date' },
          },
          {
            name: 'qsDateTime',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date-time' },
          },
          // {
          //   name: 'byte',
          //   in: 'query',
          //   required: true,
          //   schema: { type: 'string', format: 'byte', },
          // },
          // {
          //   name: 'binary',
          //   in: 'query',
          //   required: true,
          //   schema: { type: 'string', format: 'binary', },
          // },
        ]);
      });

      it('should throw on format mismatch', () => {
        assert.throws(() => parameter.test({
          pathDate: '123',
          pathDateTime: '123',
          pathByte: '123',
          pathBinary: '123',
        }, {
          qsDate: '123',
          qsDateTime: '123',
          qsByte: '123',
          qsBinary: '123',
        }), new ParameterError('INPUT_VALIDATION_FAILED', [
          {
            code: null,
            reason: 'pattern',
            message: 'must match [date], but is equal to "123"',
            property: '@.path.pathDate',
          },
          {
            code: null,
            reason: 'pattern',
            message: 'must match [date-time], but is equal to "123"',
            property: '@.path.pathDateTime',
          },
          {
            code: null,
            reason: 'pattern',
            message: 'must match [date], but is equal to "123"',
            property: '@.qs.qsDate',
          },
          {
            code: null,
            reason: 'pattern',
            message: 'must match [date-time], but is equal to "123"',
            property: '@.qs.qsDateTime',
          },
        ]));
      });
    });

    describe('pattern', () => {
      let parameter;

      beforeEach(() => {
        parameter = new ParameterValidator([
          {
            name: 'pathPattern',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: /[0-9]/ },
          },
          {
            name: 'qsPattern',
            in: 'query',
            required: true,
            schema: { type: 'string', pattern: /[0-9]/ },
          },
        ]);
      });

      it('should throw on mismatched pattern', () => {
        assert.throws(() => parameter.test({
          pathPattern: 'asdasd',
        }, {
          qsPattern: 'asdasd',
        }), new ParameterError('INPUT_VALIDATION_FAILED', [
          {
            code: null,
            reason: 'pattern',
            message: 'must match [/[0-9]/], but is equal to "asdasd"',
            property: '@.path.pathPattern',
          },
          {
            code: null,
            reason: 'pattern',
            message: 'must match [/[0-9]/], but is equal to "asdasd"',
            property: '@.qs.qsPattern',
          },
        ]));
      });

      it('should not throw', () => {
        parameter.test({
          pathPattern: '123123',
        }, {
          qsPattern: '123123',
        });
      });
    });
  });

  describe('check: nullable', () => {
    let parameter;

    beforeEach(() => {
      parameter = new ParameterValidator([
        {
          name: 'pathNullable',
          in: 'path',
          required: true,
          schema: { type: 'string', nullable: true },
        },
        {
          name: 'pathNotNullable',
          in: 'path',
          required: true,
          schema: { type: 'string', nullable: false },
        },
        {
          name: 'qsNullable',
          in: 'query',
          required: true,
          schema: { type: 'string', nullable: true },
        },
        {
          name: 'qsNotNullable',
          in: 'query',
          required: true,
          schema: { type: 'string', nullable: false },
        },
      ]);
    });

    it('should not throw on null', () => {
      assert.throws(() => parameter.test({
        pathNullable: null,
        pathNotNullable: null,
      }, {
        qsNullable: null,
        qsNotNullable: null,
      }), new ParameterError('INPUT_VALIDATION_FAILED', [
        {
          code: null,
          reason: 'type',
          message: 'must be string, but is null',
          property: '@.path.pathNotNullable',
        },
        {
          code: null,
          reason: 'type',
          message: 'must be string, but is null',
          property: '@.qs.qsNotNullable',
        },
      ]));
    });
  });

  describe('check: requestBody', () => {
    let parameter;

    beforeEach(() => {
      parameter = new ParameterValidator([], {
        'application/json': {
          type: 'object',
          required: ['nameString'],
          properties: {
            nameString: {
              description: 'user name.',
              type: 'string',
            },
            nameObject: {
              type: 'object',
              required: ['firstName'],
              properties: {
                firstName: {
                  type: 'string',
                },
                lastName: {
                  type: 'string',
                },
                profile: {
                  type: 'object',
                  required: ['image'],
                  properties: {
                    image: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    it('should throw on nameString that got number', () => {
      assert.throws(() => parameter.test({}, {}, {
        'application/json': {
          nameString: 123,
        },
      }), new ParameterError('INPUT_VALIDATION_FAILED', [
        {
          code: null,
          reason: 'type',
          message: 'must be string, but is number',
          property: '@.requestBody["application/json"].nameString',
        },
      ]));
    });

    it('should throw on nameObject missing required property', () => {
      assert.throws(() => parameter.test({}, {}, {
        'application/json': {
          nameString: '123',
          nameObject: {
            profile: {},
          },
        },
      }), new ParameterError('INPUT_VALIDATION_FAILED', [
        {
          code: null,
          reason: 'optional',
          message: 'is missing and not optional',
          property: '@.requestBody["application/json"].nameObject.firstName',
        },
        {
          code: null,
          reason: 'optional',
          message: 'is missing and not optional',
          property: '@.requestBody["application/json"].nameObject.profile.image',
        },
      ]));
    });

    it('should not throw on nameObject when profile is missing', () => {
      parameter.test({}, {}, {
        'application/json': {
          nameString: '123',
          nameObject: {
            firstName: 'test',
          },
        },
      });
    });

    it('should not throw on nameObject when profile is missing', () => {
      parameter.test({}, {}, {
        'application/json': {
          nameString: '123',
          nameObject: {
            firstName: 'test',
            profile: {
              image: 'test',
            },
          },
        },
      });
    });
  });
});
