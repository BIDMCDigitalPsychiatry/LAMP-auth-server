import * as path from 'node:path';
import * as url from 'node:url';
import {dirname} from 'desm';
import dotenv  from 'dotenv';
import Provider from 'oidc-provider';
import express from 'express';

dotenv.config()

import routes from './routes.js';
import Repository from './repository.js';
import configuration from './configuration.js';
import RedisAdapter from './adapter.js';

const app = express();

const __dirname = dirname(import.meta.url);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

let server;
try {
  Repository.connect();
  const prod = process.env.NODE_ENV === 'production';
  if (process.env.REDIS_URL) {
    console.log("Using Redis")
    configuration.adapter = RedisAdapter;
  }

  const PROVIDER_URL = `${process.env.ISSUER_URI}`;
  const provider = new Provider(PROVIDER_URL, configuration);

  if (prod) {
    app.enable('trust proxy');
    provider.proxy = true;

    app.use((req, res, next) => {
      if (req.secure) {
        next();
      } else if (req.method === 'GET' || req.method === 'HEAD') {
        res.redirect(url.format({
          protocol: 'https',
          host: req.get('host'),
          pathname: req.originalUrl,
        }));
      } else {
        res.status(400).json({
          error: 'invalid_request',
          error_description: 'do yourself a favor and only use https',
        });
      }
    });
  }

  routes(app, provider);
  app.use(provider.callback());
  server = app.listen(process.env.LISTEN_PORT, () => {
    console.log(`application is listening on port ${process.env.LISTEN_PORT}, check its /.well-known/openid-configuration`);
  });
} catch (err) {
  if (server?.listening) server.close();
  console.error(err);
  process.exitCode = 1;
}