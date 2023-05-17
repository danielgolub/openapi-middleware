import _ from 'lodash';
import debug from 'debug';
import EventEmitter from 'events';
import { Router } from 'express';
import { getControllers, getDefinition } from './IntegratorHelpers.js';
import Endpoint from '../Endpoint.js';

export default class ExpressMiddleware {
  constructor(configRaw) {
    this.debug = debug('openapi:ExpressMiddleware');
    this.endpoints = {};
    this.events = new EventEmitter();

    this.parseConfig(configRaw)
      .then(() => this.setup())
      .then((router) => this.events.emit('ready', router))
      .catch((e) => this.events.emit('error', e));
  }

  on(...args) {
    return this.events.on(...args);
  }

  async parseConfig(configRaw) {
    this.config = {};

    this.config.definition = getDefinition(configRaw);
    this.config.controllers = await getControllers(configRaw);

    this.debug('setup config finished');
  }

  setupEndpoint(req, res, next) {
    this.debug('catched request, starting the middleware sequence');
    const { route: { path: endpointPattern }, method } = req;
    const { config: { definition: { paths } } } = this;
    const { [endpointPattern]: { [method.toLowerCase()]: { operationId } } } = paths;
    const { endpoints: { [operationId]: endpoint } } = this;

    endpoint.test(req.params, req.query, req.headers.contentType || 'application/json', req.body);
    endpoint.controllerFunc(req, res, next);
  }

  setup() {
    const router = Router();

    _.map(this.config.definition.paths, (pathDef, path) => {
      _.map(pathDef, (methodDef, method) => {
        this.endpoints[pathDef[method].operationId] = new Endpoint(path, method, pathDef[method], this.config.controllers[pathDef[method].operationId]);
        router[method](path, (...args) => this.setupEndpoint(...args));
      });
    });

    this.debug('setup router finished');
    return router;
  }
}
