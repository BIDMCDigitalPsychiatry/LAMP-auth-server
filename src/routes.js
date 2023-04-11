/* eslint-disable no-console, camelcase, no-unused-vars */
import { strict as assert } from 'node:assert';
import * as querystring from 'node:querystring';
import { inspect } from 'node:util';

import { urlencoded } from 'express'; // eslint-disable-line import/no-unresolved

import Repository from './repository.js';

const body = urlencoded({ extended: false });

const keys = new Set();
const debug = (obj) => querystring.stringify(Object.entries(obj).reduce((acc, [key, value]) => {
  keys.add(key);
  if (!value || value.length === 0) return acc;
  acc[key] = inspect(value, { depth: null });
  return acc;
}, {}), '<br/>', ': ', {
  encodeURIComponent(value) { return keys.has(value) ? `<strong>${value}</strong>` : value; },
});

export default (app, provider) => {
  app.use((req, res, next) => {
    const orig = res.render;
    // you'll probably want to use a full blown render engine capable of layouts
    res.render = (view, locals) => {
      app.render(view, locals, (err, html) => {
        if (err) throw err;
        orig.call(res, '_layout', {
          ...locals,
          body: html,
        });
      });
    };
    next();
  });

  function setNoCache(req, res, next) {
    res.set('cache-control', 'no-store');
    next();
  }

  app.get('/interaction/:uid', setNoCache, async (req, res, next) => {
    try {
      const {
        uid, prompt, params, session,
      } = await provider.interactionDetails(req, res);

      const client = await provider.Client.find(params.client_id);

      switch (prompt.name) {
        case 'login': {
          return res.render('login', {
            client,
            uid,
            details: prompt.details,
            params,
            title: 'Sign-in',
            session: session ? debug(session) : undefined,
            dbg: {
              params: debug(params),
              prompt: debug(prompt),
            },
          });
        }
        case 'consent': {
          return res.render('interaction', {
            client,
            uid,
            details: prompt.details,
            params,
            title: 'Authorize',
            session: session ? debug(session) : undefined,
            dbg: {
              params: debug(params),
              prompt: debug(prompt),
            },
          });
        }
        default:
          return undefined;
      }
    } catch (err) {
      return next(err);
    }
  });

  app.get('/interaction/:uid/password', setNoCache, body, async(req, res, next) => {
    const {
      uid, prompt, params, session,
    } = await provider.interactionDetails(req, res);

    const client = await provider.Client.find(params.client_id);
    return res.render('reset', {
      client,
      uid,
      details: prompt.details,
      params,
      title: 'Reset Password',
      session: session ? debug(session) : undefined,
      dbg: {
        params: debug(params),
        prompt: debug(prompt),
      },
    });
  })

  app.post('/interaction/:uid/login', setNoCache, body, async (req, res, next) => {
    try {
      const { prompt: { name } } = await provider.interactionDetails(req, res);
      assert.equal(name, 'login');
      const {accountId} = await Repository.find(req.body.username, req.body.password);

      const result = {
        login: {
          accountId,
        },
      };

      await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
    } catch (err) {
      next(err);
    }
  });

  app.post('/interaction/:uid/reset', setNoCache, body, async (req, res, next) => {
    try {
      const { prompt: { name } } = await provider.interactionDetails(req, res);
      assert.equal(name, 'login');
      const {accountId} = await Repository.updateSecret(req.body.username, req.body.password, req.body.new_password);

      const result = {
        login: {
          accountId,
        },
      };

      await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
    } catch (err) {
      next(err);
    }
  });

  app.post('/interaction/:uid/confirm', setNoCache, body, async (req, res, next) => {
    try {
      const interactionDetails = await provider.interactionDetails(req, res);
      const { prompt: { name, details }, params, session: { accountId } } = interactionDetails;
      assert.equal(name, 'consent');

      let { grantId } = interactionDetails;
      let grant;

      if (grantId) {
        // we'll be modifying existing grant in existing session
        grant = await provider.Grant.find(grantId);
      } else {
        // we're establishing a new grant
        grant = new provider.Grant({
          accountId,
          clientId: params.client_id,
        });
      }

      if (details.missingOIDCScope) {
        grant.addOIDCScope(details.missingOIDCScope.join(' '));
      }
      if (details.missingOIDCClaims) {
        grant.addOIDCClaims(details.missingOIDCClaims);
      }
      if (details.missingResourceScopes) {
        for (const [indicator, scopes] of Object.entries(details.missingResourceScopes)) {
          grant.addResourceScope(indicator, scopes.join(' '));
        }
      }

      grantId = await grant.save();

      const consent = {};
      if (!interactionDetails.grantId) {
        // we don't have to pass grantId to consent, we're just modifying existing one
        consent.grantId = grantId;
      }

      const result = { consent };
      await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: true });
    } catch (err) {
      next(err);
    }
  });

  app.get('/interaction/:uid/abort', setNoCache, async (req, res, next) => {
    try {
      const result = {
        error: 'access_denied',
        error_description: 'End-User aborted interaction',
      };
      await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
    } catch (err) {
      next(err);
    }
  });

  app.use(async (err, req, res, next) => {
    // await provider.interactionFinished(req, res, {error: err.message}, { mergeWithLastSubmission: false });

    // next(err.message);
    console.log(err.message)
    res.status(404);

    // respond with html page
    if (req.accepts('html')) {
      const {
        uid, prompt, params, session,
      } = await provider.interactionDetails(req, res);
      const client = await provider.Client.find(params.client_id);

      res.render('error', {
        client,
        uid,
        details: prompt.details,
        params,
        title: "Oops there's been a problem",
        error: err.message,
        session: session ? debug(session) : undefined,
        dbg: {
          params: debug(params),
          prompt: debug(prompt),
        },
      });
      return;
    }

    // respond with json
    if (req.accepts('json')) {
      res.json({ error: 'Not found' });
      return;
    }

    // default to plain-text. send()
    res.type('txt').send('Not found');
  });
};