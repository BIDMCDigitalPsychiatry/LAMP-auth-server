# LAMP OAuth Server

## Setup
To connect the OAuth server to the lamp server we'll need the following configurations:

### OAuth Server Configurations
First we'll need to configure the OAuth server.

#### .env
- MONGODB_URI: The uri to the mongodb as it's configured in the LAMP-server
- LISTEN_PORT: The port on which the OAuth-Server should be listening
- ISSUER_URI: The uri on which the OAuth-Server will be running (https://oauth.lamp.digital)
- ROOT_KEY: The key to encrypt and decrypt passwords as it's configured in the LAMP-server
- REDIS_URL: The url to connect the redis adatper to store session data

### configuration.js
OIDC Configuration, to learn more about it visit the [official documentation](https://github.com/panva/node-oidc-provider/blob/main/docs/README.md#configuration-options)
- jwks.keys: Set of jwks keys to sign tokens [jwks set format](https://github.com/panva/node-oidc-provider/blob/main/docs/README.md#jwks)
- clients:
    - Here we´ll define the LAMP-server client
          - client_id: Define Client ID
          - client_secret: Define Client Secret
          - redirect_uris: The dashboard uri which processes OAuth access code (https://dashboard.lamp.digital/oauth)
          post_logout_redirect_uris: The dashboard uri (https://dashboard.lamp.digital)
          tos_uri: Terms of service URL
          policy_uri: Policy URL
- cookies.keys: Set of keys to validate [cookies](https://github.com/panva/node-oidc-provider/blob/main/docs/README.md#cookieskeys)

### LAMP-server Configuration
Now we'll configure the LAMP-server to use the LAMP-oauth-server as authorization service.

#### .env
- OAUTH: Set it "on" to enable OAuth
- OAUTH_AUTH_URL: The OAuth Server URL to start the auth process (https://oauth.lamp.digital/auth)
- OAUTH_TOKEN_URL: The OAuth Server URL to request the tokens (https://oauth.lamp.digital/token)
- OAUTH_SCOPE: Set it on "openid".
- OAUTH_LOGOUT_URL: The OAuth Server URL to log out (https://oauth.lamp.digital/session/end)
- OAUTH_CLIENT_ID: The client_id defined in the OIDC configuration
- OAUTH_CLIENT_SECRET: The client_secret defined in the OIDC configuration
- TOKEN_SECRET: The secret to sign the access tokens issued by the server
- OAUTH_REDIRECT_URI: The dashboard uri which processes OAuth access code (https://dashboard.lamp.digital/oauth)

## Development
Run `npm i` and then `npm dev`
