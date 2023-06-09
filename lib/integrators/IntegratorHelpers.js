import _ from 'lodash';
import fs from 'fs';
import { parse as yamlParse } from 'yaml';
import MiddlewareError from '../errors/MiddlewareError.js';

/**
 * @module IntegratorHelpers
 */

/**
 * Parse user-provided definition to openapi json
 *
 * @param {object|string} configRaw
 * @return {object}
 */
export function getDefinition(configRaw) {
  if (_.isObject(configRaw.definition)) {
    return configRaw.definition;
  }

  if (!_.isString(configRaw.definition)) {
    throw new MiddlewareError('config property of definition could not be parsed');
  }

  const newLineRegex = /\r\n|\r|\n/;
  let content = configRaw.definition;
  if (!newLineRegex.test(configRaw.definition)) {
    content = fs.readFileSync(configRaw.definition).toString();
  }

  if (content[0] === '{') {
    return JSON.parse(content);
  }

  return yamlParse(content);
}

/**
 * Parse user-provided controllers to json map of operationId against a function
 * @param {string|Map<string, object>} configRaw
 * @return {Promise<Map<string, object>>}
 */
export async function getControllers(configRaw) {
  if (_.isObject(configRaw.controllers)) {
    return configRaw.controllers;
  }

  if (!_.isString(configRaw.controllers)) {
    throw new MiddlewareError('config property of controllers could not be parsed');
  }

  const controllers = fs.readdirSync(configRaw.controllers);
  const controllersFunctions = await Promise.all(controllers.map((controller) => import(`${configRaw.controllers}/${controller}`)));

  return controllersFunctions.reduce((all, controller) => ({
    ...all,
    ...controller,
  }), {});
}
