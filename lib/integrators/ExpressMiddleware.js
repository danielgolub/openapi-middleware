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
   * @property {boolean} enforceResponseValidation - Flag for failing invalid responses (that don't match the endpoint's responseScheme)
   * @example
   * new ExpressMiddleware({
   *   definition: './openapi-sample-v3.yaml',
   *   controllers: {
   *     greetingGet: (req, res, next) => { res.send({ ok: true }) }
   *   },
   *   securitySchemes: {
   *     basicAuth: (authHeaderValue) => {},
   *   },
   *   enforceResponseValidation: false
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
   * Router can now be attached to the express app
   *
   * @event ExpressMiddleware#invalidResponse
   * @type {Object}
   * @property {Error} error object - Error class
   */

  /**
   * Express router integrator
   * @param  {ConfigOptions} configRaw
   * @fires ExpressMiddleware#ready
   * @fires ExpressMiddleware#error
   * @fires ExpressMiddleware#invalidResponse
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
      const router = await this.setupMiddleware();

      this.emit('ready', { router });
    } catch (error) {
      this.emit('error', { error });
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
     * @property {boolean}  enforceResponseValidation  flag for failing invalid responses (that don't match the endpoint's responseScheme)
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
    this.config.enforceResponseValidation = this.configRaw.enforceResponseValidation;

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

    req.openApi = {
      operationId,
    };
    endpoint.testIncoming(req.params, req.headers, req.query, req.headers.contentType || 'application/json', req.body);
    endpoint.controllerFunc(req, res, next);
  }

  /**
   * Global response catcher + validator
   * @private
   */
  responseValidator() {
    const resSendInterceptor = (res, send) => (content) => {
      res.contentBody = content;
      res.send = send;
      res.send(content);
    };

    this.router.use((req, res, next) => {
      res.send = resSendInterceptor(res, res.send);

      res.on('finish', async () => {
        const { openApi } = req;

        if (!openApi) {
          // unknown endpoint
          return;
        }

        const { _header: resHeaders, statusCode, contentBody } = res;
        const { 'Content-Type': contentTypeWithCarset } = resHeaders.split('\n').reduce((all, line) => {
          const [key, val] = line.split(':');
          return {
            ...all,
            [key]: val,
          };
        }, {});
        const [contentType] = contentTypeWithCarset.trim().split(';');

        const silentError = await this.endpoints[openApi.operationId]?.testOutgoing(statusCode, contentType, contentBody);
        if (silentError instanceof Error) {
          this.emit('invalidResponse', { error: silentError });
        }
      });
      next();
    });
  }

  /**
   * Setup router (returns the router to attach to the express app)
   * @return {Express.Router}
   */
  setupMiddleware() {
    /**
     * Express.Router object to be attached to the express api server
     * @type {Express.Router}
     * @see {@link https://expressjs.com/en/4x/api.html#router}
     */
    this.router = Router();

    this.responseValidator();

    const { config: { definition: { paths: allPaths } } } = this;

    _.map(allPaths, (pathMethods, path) => {
      _.map(pathMethods, (endpointDef, method) => {
        try {
          const { operationId } = endpointDef;
          const {
            config: { controllers: { [operationId]: endpointFn } },
          } = this;

          // setup new endpoint class for this particular operationId
          this.endpoints[operationId] = new Endpoint(this.config.definition.securitySchemes, this.config?.securitySchemes, pathMethods[method], endpointFn, this.config.enforceResponseValidation);

          // setup new express route
          this.router[method](path, (...args) => this.setupEndpoint(...args));
        } catch (e) {
          this.debug('endpoint setup failed', e);
          throw new MiddlewareError(`could not setup endpoint because ${e.message}`);
        }
      });
    });

    this.debug('setup router finished');
    return this.router;
  }
}
