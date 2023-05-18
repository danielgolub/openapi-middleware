import express from 'express';
import sinon from 'sinon';
import supertest from 'supertest';
import { strict as assert } from 'node:assert';
import bodyParser from 'body-parser';
import ExpressMiddleware from '../../lib/integrators/ExpressMiddleware.js';
import { getOpenAPIDoc } from '../helpers/parser.js';
import MiddlewareError from '../../lib/errors/MiddlewareError.js';

describe('integration: Express', () => {
  let app;
  let sandbox;
  let greetingGet;
  let greetingCreate;
  let greetingGuest;
  before((done) => {
    sandbox = sinon.createSandbox();
    greetingGet = sandbox.fake((req, res) => res.send({
      pathName: req.params.pathName,
      qsName: req.query.qsName,
    }));
    greetingCreate = sandbox.fake((req, res) => res.send({
      pathName: req.params.pathName,
      qsName: req.query.qsName,
      bodyName: req.body.bodyName,
    }));
    greetingGuest = sandbox.fake((req, res) => res.send({}));

    app = express();
    const config = {
      definition: getOpenAPIDoc(),
      controllers: {
        greetingGet,
        greetingCreate,
        greetingGuest,
      },
      securitySchemes: {
        basicAuth: () => {},
      },
    };
    new ExpressMiddleware(config)
      .on('ready', (router) => {
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(router);
        app.listen(2020, () => done());
      })
      .on('error', (error) => {
        done(error);
      });
  });

  beforeEach(() => {
    sandbox.resetHistory();
  });

  it('should be able to add the openapi integrator on get request without query and without body', async () => {
    const { body } = await supertest(app)
      .get('/greeting/pathTest')
      .expect(200);
    sinon.assert.calledOnce(greetingGet);
    assert.deepEqual(body, {
      pathName: 'pathTest',
    });
  });

  it('should be able to add the openapi integrator on get request without body', async () => {
    const { body } = await supertest(app)
      .get('/greeting/pathTest')
      .query({ qsName: 'qsTest' })
      .expect(200);
    sinon.assert.calledOnce(greetingGet);
    assert.deepEqual(body, {
      pathName: 'pathTest',
      qsName: 'qsTest',
    });
  });

  it('should be able to add the openapi integrator on get request without any params', async () => {
    const { body } = await supertest(app)
      .get('/greeting')
      .send()
      .expect(200);
    sinon.assert.calledOnce(greetingGuest);
    assert.deepEqual(body, {});
  });

  it('should return 404 on unknown path', async () => {
    await supertest(app)
      .get('/unknown')
      .send()
      .expect(404);
    sinon.assert.notCalled(greetingGet);
    sinon.assert.notCalled(greetingCreate);
    sinon.assert.notCalled(greetingGuest);
  });

  describe('should not be able to startup because of configuration problem', () => {
    it('definition config is corrupted', (done) => {
      new ExpressMiddleware({ definition: 123 })
        .on('ready', () => {
          done(new Error('should not been started'));
        })
        .on('error', (error) => {
          assert.ok(error instanceof MiddlewareError);
          done();
        });
    });
    it('controllers config is corrupted', (done) => {
      new ExpressMiddleware({ definition: {}, controllers: 123 })
        .on('ready', () => {
          done(new Error('should not been started'));
        })
        .on('error', (error) => {
          assert.ok(error instanceof MiddlewareError);
          done();
        });
    });
    it('securitySchemes config is not provided', (done) => {
      new ExpressMiddleware({ definition: getOpenAPIDoc(), controllers: {} })
        .on('ready', () => {
          done(new Error('should not been started'));
        })
        .on('error', (error) => {
          if (error instanceof MiddlewareError && error.message === 'middleware init failure - could not setup endpoint because security definition was invalid') {
            return done();
          }

          return done(new Error('unknown error received'));
        });
    });
  });
});
