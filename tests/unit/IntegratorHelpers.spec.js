import { strict as assert } from 'node:assert';
import { resolve } from 'path';
import { getControllers, getDefinition } from '../../lib/integrators/IntegratorHelpers.js';

describe('unit: IntegratorHelpers', () => {
  describe('#getDefinition()', () => {
    describe('param: definition', () => {
      let expectedConfig;

      before(() => {
        expectedConfig = { test: true };
      });

      it('when openapi definition is given in json format', () => {
        const definition = getDefinition({ definition: { test: true } });
        assert.ok(typeof definition === 'object');
        assert.deepEqual(definition, expectedConfig);
      });
      it('when openapi definition is given in yaml format', () => {
        const definition = getDefinition({ definition: 'test: true\n' });
        assert.ok(typeof definition === 'object');
        assert.deepEqual(definition, expectedConfig);
      });
      it('when openapi definition is given in file format (json)', () => {
        const definition = getDefinition({ definition: 'tests/helpers/openapi-sample-v3.json' });
        assert.ok(typeof definition === 'object');
        assert.deepEqual(definition.openapi, '3.0.0');
      });
      it('when openapi definition is given in file format (yaml)', () => {
        const definition = getDefinition({ definition: 'tests/helpers/openapi-sample-v3.yaml' });
        assert.ok(typeof definition === 'object');
        assert.deepEqual(definition.openapi, '3.0.0');
      });
    });
  });

  describe('#getControllers()', () => {
    it('should allow to pass controller callbacks directly', async () => {
      const input = {
        test: () => {},
      };

      const controllers = await getControllers({
        controllers: input,
      });

      assert.deepEqual(controllers, input);
    });
    it('should allow to pass controller folder', async () => {
      const controllers = await getControllers({
        controllers: resolve('./tests/helpers/controllers'),
      });

      assert.deepEqual(Object.keys(controllers), ['greetingCreate', 'greetingGet', 'greetingGuest']);
      assert.ok(typeof controllers.greetingGet === 'function');
    });
  });
});
