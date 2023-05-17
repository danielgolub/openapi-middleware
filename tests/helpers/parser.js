import { parse as yamlParse } from 'yaml';
import * as fs from 'fs';
import { resolve } from 'path';

export function getOpenAPIDoc() {
  const openApiLocation = resolve('./tests/helpers/openapi-sample-v3.yaml');
  const openApiText = fs.readFileSync(openApiLocation)
    .toString();

  return yamlParse(openApiText);
}

export function test() {}
