import _ from 'lodash';

export function parseContentTypesPayloads(definition) {
  return {
    type: 'object',
    strict: true,
    optional: true,
    error: 'content-type invalid',
    properties: {
      ...Object.keys(definition).reduce((all, contentType) => ({
        ...all,
        [contentType]: _.pick(definition[contentType], ['properties', 'type', 'required']),
      }), {}),
    },
  };
}

/**
 * Parameter builder from openapi definition to schema-inspector
 * @private
 * @param {object} parent parent object in which we need to edit its properties
 * @param {integer} i     current iterator
 * @return {object}
 * @see {@link https://www.npmjs.com/package/schema-inspector} - for returned result
 */
function buildSchemaInspectorParam(parent, i) {
  const param = parent.properties[i];
  const correlations = _.pick(param, ['type', 'minLength', 'maxLength', 'properties', 'required', 'items']);
  const newParam = {
    ...correlations,
  };

  if (param.minimum) {
    newParam.min = param.minimum;
  }
  if (param.maximum) {
    newParam.max = param.maximum;
  }

  if (param.type === 'number') {
    if (param.format?.includes('int')) {
      newParam.type = 'integer';
    }
    // TODO: multipleOf
  }
  if (param.type === 'string') {
    if (param?.format === 'date') {
      newParam.pattern = 'date';
    }
    if (param?.format === 'date-time') {
      newParam.pattern = 'date-time';
    }
    if (param?.pattern) {
      newParam.pattern = param.pattern;
    }
  }

  if (param.nullable) {
    newParam.type = ['null', param.type];
  }

  return newParam;
}

/**
 * Recursion class that goes through each open api definition (to convert to schema-inspector)
 * @private
 * @param {object} param
 */
export function convertOpenAPIToSchemaInspector(param) {
  // eslint-disable-next-line no-param-reassign
  if (param.properties) {
    // eslint-disable-next-line no-restricted-syntax
    for (const i of Object.keys(param.properties)) {
      // eslint-disable-next-line no-param-reassign
      param.properties[i] = buildSchemaInspectorParam(param, i);
      // eslint-disable-next-line no-param-reassign
      param.properties[i].optional = !param.required || !param.required.includes(i);
      convertOpenAPIToSchemaInspector(param.properties[i]);
    }
  }
}
