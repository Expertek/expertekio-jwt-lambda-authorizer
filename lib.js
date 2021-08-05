require('dotenv').config({ silent: true });

const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');
const util = require('util');

// extract and return the Bearer Token from the Lambda event parameters
const getToken = (event) => {
  if (!event.type || event.type !== 'REQUEST') {
    throw new Error('Expected "event.type" parameter to have value "REQUEST"');
  }
  
  const tokenString = event.headers.authorization;
  if (!tokenString) {
    throw new Error('Expected "event.headers.authorization" parameter to be set');
  }
  
  const match = tokenString.match(/^Bearer (.*)$/);
  if (!match || match.length < 2) {
    throw new Error(`Invalid Authorization token - ${tokenString} does not match "Bearer .*"`);
  }
  return match[1];
}

module.exports.authenticate = (event) => {
  const token = getToken(event);
  
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || !decoded.header || !decoded.header.kid) {
    throw new Error('invalid token');
  }

  const jwtOptions = {};
  const issuer = process.env.TOKEN_ISSUER
  if (issuer) {
    jwtOptions.issuer = issuer.split(',')
  }

  const getSigningKey = util.promisify(client.getSigningKey);
  return getSigningKey(decoded.header.kid)
  .then((key) => {
    const signingKey = key.publicKey || key.rsaPublicKey;
    return jwt.verify(token, signingKey, jwtOptions);
  })
  .then((decoded) => {
    for (const pkg of decoded.pks) {
      if (pkg === process.env.PACKAGE) {
        return {
          isAuthorized: true,
          context: {
            jwt: decoded
          }
        }
      }
    }
    return {
      isAuthorized: false,
      context: {}
    }
  });
}

const client = jwksClient({
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
  jwksUri: process.env.JWKS_URI
});
