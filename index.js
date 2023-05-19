import ExpressMiddleware from './lib/integrators/ExpressMiddleware.js';
import Endpoint from './lib/Endpoint.js';
import ParameterValidator from './lib/ParameterValidator.js';
import ParameterError from './lib/errors/ParameterError.js';
import SecurityError from './lib/errors/SecurityError.js';
import MiddlewareError from './lib/errors/MiddlewareError.js';
import SecurityValidator from './lib/SecurityValidator.js';

export default {
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
};
