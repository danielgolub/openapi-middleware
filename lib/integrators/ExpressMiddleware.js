import _ from 'lodash';
import debug from 'debug';
import EventEmitter from 'events';
import { Router } from 'express';
import { getControllers, getDefinition } from './IntegratorHelpers.js';
import Endpoint from '../Endpoint.js';
import MiddlewareError from '../errors/MiddlewareError.js';

export default class ExpressMiddleware {
  constructor(configRaw) {
    this.debug = debug('openapi:ExpressMiddleware');
    this.endpoints = {};
    this.events = new EventEmitter();
    this.configRaw = configRaw;

    this.setupSequence();
  }

  async setupSequence() {
    try {
      await this.parseConfig();
      const router = await this.setupRouter();
      this.events.emit('ready', router);
    } catch (e) {
      this.events.emit('error', e);
    }
  }

  on(...args) {
    return this.events.on(...args);
  }

  async parseConfig() {
    this.config = {};

    this.config.definition = getDefinition(this.configRaw);
    this.config.controllers = await getControllers(this.configRaw);
    this.config.securitySchemes = this.configRaw.securitySchemes;

    this.debug('setup config finished');
  }

  setupEndpoint(req, res, next) {
    this.debug('catched request, starting the middleware sequence');
    const { route: { path: endpointPattern }, method } = req;
    const { config: { definition: { paths } } } = this;
    const { [endpointPattern]: { [method.toLowerCase()]: { operationId } } } = paths;
    const { endpoints: { [operationId]: endpoint } } = this;

    endpoint.test(req.params, req.headers, req.query, req.headers.contentType || 'application/json', req.body);
    endpoint.controllerFunc(req, res, next);
  }

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
