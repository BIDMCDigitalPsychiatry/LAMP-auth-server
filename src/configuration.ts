import { Configuration, JWK } from "oidc-provider";

const getConfiguration: (jwksKeys: JWK[], clientId: string, clientSecret: string, clientBaseURI: string, clientRedirectURI?: string, tosURI?: string, policyURI?: string, cookiesKeys?: string[]) => Configuration = (jwksKeys, clientId, clientSecret, clientBaseURI, clientRedirectURI, tosURI, policyURI, cookiesKeys) => {
    return {
        jwks: {
            keys: jwksKeys
        },
        findAccount: (ctx, id, token) => {
            return {
                accountId: id,
                claims: async (use, scope) => { return { sub: id, email: id }; },
            };
        },
        features: {
            devInteractions: { enabled: false }, // defaults to true
            deviceFlow: { enabled: true }, // defaults to false
            revocation: { enabled: true }, // defaults to false\
            rpInitiatedLogout: { enabled: true },
            clientCredentials: {
                enabled: true
            },
            introspection: {
                enabled: true
            },
            resourceIndicators: {
                enabled: true,
                getResourceServerInfo(ctx, resourceIndicator) {
                    if (resourceIndicator ==='urn:api') {
                        return {
                            scope: 'read',
                            audience: 'urn:api',
                            accessTokenTTL: 1 * 60 * 60, // 1 hour
                            accessTokenFormat: 'jwt'
                        }
                    }

                    throw new Error("Invalid Target");
                }
            }
        },
        clients: [
            {
                client_id: clientId,
                client_secret: clientSecret,
                grant_types: ['authorization_code'],
                response_types: ['code'],
                redirect_uris: [clientRedirectURI ?? `${clientBaseURI}/oauth.html`],
                post_logout_redirect_uris: [clientBaseURI],
                tos_uri: tosURI,
                policy_uri: policyURI,
            }],
        claims: {
            profile: ['birthdate', 'family_name', 'gender', 'given_name', 'locale', 'middle_name', 'name', 'nickname', 'picture', 'preferred_username', 'profile', 'updated_at', 'website', 'zoneinfo'],
            email: ['email', 'email_verified']
        },
        cookies: {
            keys: cookiesKeys
        }
    };
};

export default getConfiguration;
