import _ from 'lodash';
import debug from 'debug';
import EventEmitter from 'events';
import { Router } from 'express';
import { getControllers, getDefinition } from './IntegratorHelpers.js';
import Endpoint from '../Endpoint.js';
import MiddlewareError from '../errors/MiddlewareError.js';

/**
 * Express router integrator
 * @module ExpressMiddleware
 * @extends {EventEmitter}
 */
export default class ExpressMiddleware extends EventEmitter {
  /**
   * Options used when creating the `ExpressMiddleware`.
   *
   * @typedef {object} ConfigOptions
   *
   * @property {object|string} definition - The OpenAPI 3.0 definition location (location string for file type of json/yaml) or structure (json/yaml)
   * @property {Map<String, Function>} controllers - The controllers location or structure
   * @property {Map<String, Function>} securitySchemes - The security schemes validation functions
   * @example
   * new ExpressMiddleware({
   *   definition: './openapi-sample-v3.yaml',
   *   controllers: {
   *     greetingGet: (req, res, next) => { res.send({ ok: true }) }
   *   },
   *   securitySchemes: {
   *     basicAuth: (authHeaderValue) => {},
   *   }
   * })
   *
   * @memberof module:ExpressMiddleware
   */

  /**
   * Router can now be attached to the express app
   *
   * @event ExpressMiddleware#ready
   * @type {Object}
   * @property {Express.Router} router - Express router object
   */

  /**
   * Router can now be attached to the express app
   *
   * @event ExpressMiddleware#error
   * @type {Object}
   * @property {Error} error object - Error class
   */

  /**
   * Express router integrator
   * @param  {ConfigOptions} configRaw                     - configuration obj
   * @fires ExpressMiddleware#ready
   * @fires ExpressMiddleware#error
   */
  constructor(configRaw) {
    super();

    /**
     * debugging helper
     * @private
     */
    this.debug = debug('openapi:ExpressMiddleware');

    /**
     * operation controllers, being built internally
     * @type Map<string, function>
     * @protected
     */
    this.endpoints = {};

    /**
     * user-provided configuration (immutable)
     * @type Map<string, any>
     * @private
     */
    this.configRaw = configRaw;

    this.setupSequence();
  }

  /**
   * sequence for class initialization
   * @private
   */
  async setupSequence() {
    try {
      await this.parseConfig();
      const router = await this.setupRouter();

      this.emit('ready', router);
    } catch (e) {
      this.emit('error', e);
    }
  }

  /**
   * parse the raw config object to finalized config json
   * @private
   */
  async parseConfig() {
    /**
     * @typedef {object} ExpressMiddlewareParsedConfig
     * @property {object}  definition  openapi json definition
     * @property {Map<string, function>}  controllers  controller functions (operationId as key, and controller function as function)
     * @property {Object}  securitySchemes  openapi securitySchemes
     */

    /**
     * Parsed configuration
     * @type {ExpressMiddlewareParsedConfig}
     * @memberof module:ExpressMiddleware
     */
    this.config = {};

    this.config.definition = getDefinition(this.configRaw);
    this.config.controllers = await getControllers(this.configRaw);
    this.config.securitySchemes = this.configRaw.securitySchemes;

    this.debug('setup config finished');
  }

  /**
   * Setup endpoint handler
   * @private
   * @param {Express.Request} req
   * @param {Express.Response} res
   * @param {Express.NextFunction} next
   */
  setupEndpoint(req, res, next) {
    this.debug('catched request, starting the middleware sequence');
    const { route: { path: endpointPattern }, method } = req;
    const { config: { definition: { paths } } } = this;
    const { [endpointPattern]: { [method.toLowerCase()]: { operationId } } } = paths;
    const { endpoints: { [operationId]: endpoint } } = this;

    endpoint.test(req.params, req.headers, req.query, req.headers.contentType || 'application/json', req.body);
    endpoint.controllerFunc(req, res, next);
  }

  /**
   * Setup router (returns the router to attach to the express app)
   * @return {Express.Router}
   */
  setupRouter() {
    const router = Router();

    _.map(this.config.definition.paths, (pathDef, path) => {
      _.map(pathDef, (methodDef, method) => {
        try {
          const { operationId } = methodDef;
          const {
            config: { controllers: { [operationId]: endpointFn } },
          } = this;

          this.endpoints[operationId] = new Endpoint(this.config.definition.securitySchemes, this.config?.securitySchemes, path, method, pathDef[method], endpointFn);
          router[method](path, (...args) => this.setupEndpoint(...args));
        } catch (e) {
          throw new MiddlewareError(`could not setup endpoint because ${e.message}`);
        }
      });
    });

    this.debug('setup router finished');
    return router;
  }
}
