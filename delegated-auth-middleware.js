// Configure the JWKS client
const jwksClient = require("jwks-rsa");
const delegatedAuthMiddleware = require("jsonwebtoken");

const client = jwksClient({
    jwksUri: 'https://admin.m2worlds.io/.well-known/jwks.json',
});

// Function to retrieve the signing key
function getKey(header, callback) {
    client.getSigningKey(header.kid, function (err, key) {
        if (err) {
            return callback(err);
        }
        const signingKey = key.publicKey || key.rsaPublicKey;
        callback(null, signingKey);
    });
}

// JWT validation middleware

function delegatedAuth(organizationId) {
    return (req, res, next) => {
        const authHeader = req.headers['authorization'];

        // Check if the Authorization header is present
        if (!authHeader) {
            return res.status(401).send('No authorization header provided');
        }

        // Extract the token from the Bearer scheme
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).send('No token provided');
        }

        const options = {
            algorithms: ['RS256'], // Specify the algorithm used
        };

        // Verify the token using the getKey function
        delegatedAuthMiddleware.verify(token, getKey, options, (err, decoded) => {
            if (err) {
                return res.status(401).send('Invalid token');
            }
            req.user = decoded; // Add decoded token to request object
            next();
        });

        // check organization_id claim in the token
        if (req.user.organization_id !== organizationId) {
            return res.status(403).send('Organization ID does not match');
        }
    }
}

module.exports = delegatedAuth;