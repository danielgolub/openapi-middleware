import ExpressMiddleware from './lib/integrators/ExpressMiddleware.js';
import Endpoint from './lib/Endpoint.js';
import ParameterValidator from './lib/ParameterValidator.js';
import ParameterError from './lib/errors/ParameterError.js';
import SecurityError from './lib/errors/SecurityError.js';
import MiddlewareError from './lib/errors/MiddlewareError.js';
import SecurityValidator from './lib/SecurityValidator.js';
import ResponseValidator from './lib/ResponseValidator.js';
import ResponseError from './lib/errors/ResponseError.js';

/**
 * @module
 */
export default {
  /**
   * @type {object}
   * @description errors custom error objects
   * @property {module:ParameterError} ParameterError input validator error
   * @property {module:SecurityError} SecurityError security validator error
   * @property {module:MiddlewareError} MiddlewareError express error
   * @property {module:ResponseError} ResponseError response validator error
   */
  errors: {
    ParameterError,
    SecurityError,
    MiddlewareError,
    ResponseError,
  },

  /**
   * @type {object}
   * @description standalone modules for openapi validation
   * @property {module:Endpoint} Endpoint endpoint validator class (integrates all the other validators)
   * @property {module:ParameterValidator} ParameterValidator inputs validator per endpoint
   * @property {module:SecurityValidator} SecurityValidator security validator per endpoint
   * @property {module:ResponseValidator} ResponseValidator output validator per endpoint
   */
  modules: {
    Endpoint,
    ParameterValidator,
    SecurityValidator,
    ResponseValidator,
  },

  /**
   * @type {module:ExpressMiddleware}
   * @description express router for validating your openapi definitions
   */
  ExpressMiddleware,
};
