import * as path from 'node:path';
import * as url from 'node:url';
import {dirname} from 'desm';
import dotenv  from 'dotenv';
import Provider from 'oidc-provider';
import express from 'express';
import isEmpty from 'lodash/isEmpty.js';

dotenv.config()

import routes from './routes.js';
import Repository from './repository.js';
import getConfiguration from './configuration.js';
import RedisAdapter from './adapter.js';
import jwksKeys from "./.jwks.json" assert { type: "json" };

const app = express();

const __dirname = dirname(import.meta.url);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

let server;
try {
  if (!process.env.OAUTH_CLIENT_ID
     || !process.env.OAUTH_CLIENT_SECRET
     || !process.env.DASHBOARD_BASE_URI
     || !process.env.MONGODB_URI
     || !process.env.LISTEN_PORT
     || !process.env.ISSUER_URI
     || !process.env.ROOT_KEY) {
    throw new Error("Missing Required Configuration");
  }
  
  if (isEmpty(jwksKeys)) {
    throw new Error("Missing JWKS KEYS");
  }
  const configuration = getConfiguration(jwksKeys, process.env.OAUTH_CLIENT_ID, process.env.OAUTH_CLIENT_SECRET, process.env.DASHBOARD_BASE_URI, process.env.DASHBOARD_REDIRECT_URI, process.env.TOS_URI, process.env.POLICY_URI, process.env.COOKIES_KEYS?.split(","));
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