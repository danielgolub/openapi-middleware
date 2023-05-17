import { strict as assert } from 'node:assert';
import pkg from '../../index.js';
import EndpointError from '../../lib/errors/EndpointErrors.js';
import ParameterError from '../../lib/errors/ParameterErrors.js';
import Endpoint from '../../lib/Endpoint.js';
import ParameterValidator from '../../lib/ParameterValidator.js';
import ExpressMiddleware from '../../lib/integrators/ExpressMiddleware.js';

describe('unit: index', () => {
  it('should expose the correct package output', () => {
    assert.deepEqual(pkg, {
      errors: {
        EndpointError,
        ParameterError,
      },
      modules: {
        Endpoint,
        ParameterValidator,
      },
      ExpressMiddleware,
    });
  });
});
