import { strict as assert } from 'node:assert';
import pkg from '../../index.js';
import ParameterError from '../../lib/errors/ParameterError.js';
import Endpoint from '../../lib/Endpoint.js';
import ParameterValidator from '../../lib/ParameterValidator.js';
import ExpressMiddleware from '../../lib/integrators/ExpressMiddleware.js';
import SecurityError from '../../lib/errors/SecurityError.js';
import MiddlewareError from '../../lib/errors/MiddlewareError.js';
import SecurityValidator from '../../lib/SecurityValidator.js';

describe('unit: index', () => {
  it('should expose the correct package output', () => {
    assert.deepEqual(pkg, {
      errors: {
        ParameterError,
        SecurityError,
        MiddlewareError,
      },
      modules: {
        Endpoint,
        ParameterValidator,
        SecurityValidator,
      },
      ExpressMiddleware,
    });
  });
});
