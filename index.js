import ExpressMiddleware from './lib/integrators/ExpressMiddleware.js';
import Endpoint from './lib/Endpoint.js';
import ParameterValidator from './lib/ParameterValidator.js';
import EndpointError from './lib/errors/EndpointErrors.js';
import ParameterError from './lib/errors/ParameterErrors.js';

export default {
  errors: {
    EndpointError,
    ParameterError,
  },
  modules: {
    Endpoint,
    ParameterValidator,
  },
  ExpressMiddleware,
};
