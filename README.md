<p align="center"><img src="https://user-images.githubusercontent.com/109659/40094839-2bc8f2ee-5897-11e8-8092-583c26e4d0df.png" width="100" alt="Sequelize logo" /></p>
<h1 align="center" style="margin-top: 0;"><a href="https://danielgolub.github.io/openapi-middleware">openapi-middleware</a></h1>

This is a wrapper for express that turns an openapi 3.0 document into a working api server.
It sets up the endpoints, validates inputs, outputs, authentication and more.

[![Node.js CI](https://github.com/danielgolub/openapi-middleware/actions/workflows/node.js.yml/badge.svg)](https://github.com/danielgolub/openapi-middleware/actions/workflows/node.js.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/f4148be02def4054a2c97f671fdb4ce5)](https://app.codacy.com/gh/danielgolub/openapi-middleware/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[![Codacy Badge](https://app.codacy.com/project/badge/Coverage/f4148be02def4054a2c97f671fdb4ce5)](https://app.codacy.com/gh/danielgolub/openapi-middleware/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_coverage)
[![contributors](https://img.shields.io/github/contributors/danielgolub/openapi-middleware)](https://github.com/danielgolub/openapi-middleware/graphs/contributors)
[![npm version](https://badgen.net/npm/v/openapi-middleware)](https://www.npmjs.com/package/openapi-middleware)
[![JSDocs Automation](https://github.com/danielgolub/openapi-middleware/actions/workflows/github-pages.yml/badge.svg)](https://github.com/danielgolub/openapi-middleware/actions/workflows/github-pages.yml)
[![Release Automation](https://github.com/danielgolub/openapi-middleware/actions/workflows/npm-publish-github-packages.yml/badge.svg?event=release)](https://github.com/danielgolub/openapi-middleware/actions/workflows/npm-publish-github-packages.yml)

### ⚠️ Important: WIP!
This is pre-release code that is not stable yet and does not fully meet open api 3.0 standards.
You're more than welcome to [contribute](./CONTRIBUTING.md) to this repo to increase the velocity of the development effort.

### 📖 Resources

- [Documentation](https://danielgolub.github.io/openapi-middleware)
  - [module:ExpressMiddleware](https://danielgolub.github.io/openapi-middleware/module-ExpressMiddleware.html)
    - [ExpressMiddleware.ConfigOptions](https://danielgolub.github.io/openapi-middleware/module-ExpressMiddleware.html#.ConfigOptions)
  - [module:ParameterValidator](https://danielgolub.github.io/openapi-middleware/module-ParameterValidator.html)
  - [module:SecurityValidator](https://danielgolub.github.io/openapi-middleware/module-SecurityValidator.html)
  - [module:Endpoint](https://danielgolub.github.io/openapi-middleware/module-Endpoint.html)
- [Changelog](https://github.com/danielgolub/openapi-middleware/releases)

### 💻 Getting Started
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
