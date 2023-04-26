# LAMP OAuth Server

## Setup
To connect the OAuth server to the lamp server we'll need the following configurations:

### OAuth Server Configurations
First we'll need to configure the OAuth server.

#### .env
The next variables are required for the oauth server to work.
- OAUTH_CLIENT_ID: Define a client id for the LAMP-server
- OAUTH_CLIENT_SECRET: Define a client id for the LAMP-server
- DASHBOARD_BASE_URI: The base uri of the dashboard (https://dashboard.lamp.digital)
- MONGODB_URI: The uri to the mongodb as it's configured in the LAMP-server
- ISSUER_URI: The uri on which the OAuth-Server will be running (https://oauth.lamp.digital)
- ROOT_KEY: The key to encrypt and decrypt passwords as it's configured in the LAMP-server

These are not extrictly required.
- LISTEN_PORT: The port on which the OAuth-Server should be listening. If this is not provided will use 3000 as default:
    - When using alongside docker should be the 3000 as it's the one configured in the dockerfile. 
    - When using it locally should match the base auth url on which the LAMP-server is pointing.
- DASHBOARD_REDIRECT_URI: If the redirect url is not the DASHBOARD_BASE_URI/oauth.html define it here
- REDIS_URL: The url to connect the redis adatper to store session data if not provided will use in-memory storage
- COOKIES_KEYS: List of keys (separated by comma) to validate [cookies](https://github.com/panva/node-oidc-provider/blob/main/docs/README.md#cookieskeys). ("FIRST_KEY,SECOND_KEY,THIRD_KEY")
- TOS_URI: Terms of service URL
- POLICY_URI: Policy URL

#### .jwks.json
This file should have an array with the JWKS keys to sign tokens. [jwks set format](https://github.com/panva/node-oidc-provider/blob/main/docs/README.md#jwks)

#### Understanding configuration.ts
This is a helper to get the OIDC Configuration, to learn more about it visiting the [official documentation](https://github.com/panva/node-oidc-provider/blob/main/docs/README.md#configuration-options)
- jwks.keys: Set of jwks keys to sign tokens [jwks set format](https://github.com/panva/node-oidc-provider/blob/main/docs/README.md#jwks)
- clients: Here we define the LAMP-server [client](https://github.com/panva/node-oidc-provider/blob/main/docs/README.md#clients)
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
- OAUTH_REDIRECT_URI: The dashboard uri which processes OAuth access code (https://dashboard.lamp.digital/oauth.html)

## Development
To configure the server locally you'll need to define on which local port will the auth server run. As the server is usually running on the 3000 and the dashboard is running in the 3001. We can use the 3002.
Therefore the configured urls would be:

### LAMP-oauth-server ENV
- MONGODB_URI="mongodb://root:password@localhost"
- OAUTH_CLIENT_ID="lamp-server"
- OAUTH_CLIENT_SECRET="lamp-client-secret"
- ROOT_KEY="2646294A404E635166546A576E5A7234753778214125442A472D4B6150645367"
- ISSUER_URI="http://localhost"
- LISTEN_PORT=3002
- DASHBOARD_BASE_URI="http://localhost:3001"

### LAMP-server ENV
- DB="mongodb://root:password@localhost
- OAUTH_CLIENT_ID="lamp-server"
- OAUTH_CLIENT_SECRET="lamp-client-secret"
- ROOT_KEY="2646294A404E635166546A576E5A7234753778214125442A472D4B6150645367"
- OAUTH_AUTH_URL="http://localhost:3002/auth"
- OAUTH_TOKEN_URL="http://localhost:3002/token"
- OAUTH_REDIRECT_URI: "http://localhost:3001/oauth.html"

### Run
Run `npm i` and then `npm dev`

## Production
To configure the server for production we'll need to run a new docker configured with the LAMP-server as client.

### Run
Create Docker image and replace src/.jwks.json file with specifically generated [JWKS keys](https://github.com/panva/node-oidc-provider/blob/main/docs/README.md#jwks)
