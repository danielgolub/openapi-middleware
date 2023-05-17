## openapi-middleware
This is a wrapper for express that turns an openapi 3.0 document into a working api server. 
It sets up the endpoints, validates inputs, outputs, authentication and more.

[![Node.js CI](https://github.com/danielgolub/openapi-middleware/actions/workflows/node.js.yml/badge.svg)](https://github.com/danielgolub/openapi-middleware/actions/workflows/node.js.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/f4148be02def4054a2c97f671fdb4ce5)](https://app.codacy.com/gh/danielgolub/openapi-middleware/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[![Codacy Badge](https://app.codacy.com/project/badge/Coverage/f4148be02def4054a2c97f671fdb4ce5)](https://app.codacy.com/gh/danielgolub/openapi-middleware/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_coverage)
[![contributors](https://img.shields.io/github/contributors/danielgolub/openapi-middleware)](https://github.com/danielgolub/openapi-middleware/graphs/contributors)
[![npm version](https://badgen.net/npm/v/openapi-middleware)](https://www.npmjs.com/package/openapi-middleware)

### :warning: Important: WIP!
This is pre-release code that is not stable yet and does not fully meet open api 3.0 standards.
You're more than welcome to [contribute](./CONTRIBUTING.md) to this repo to increase the velocity of the development effort.

### :computer: Getting Started
You can install this fork via npm:
```bash
npm i openapi-middleware
```

Sample usage with express:
```javascript
import openapiMiddleware from 'openapi-middleware';
import express from 'express';
import bodyParser from 'body-parser';
import {resolve} from "path";

const config = {
  definition: resolve('./tests/helpers/openapi-sample-v3.yaml'),
  controllers: resolve('./tests/helpers/controllers'),
};

const app = express();

new openapiMiddleware.ExpressMiddleware(config)
  .on('ready', (router) => {
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(router);
    app.listen(2020, () => console.log('server is running!'));
  })
  .on('error', (error) => {
    console.error(error);
  });
```