!function (url) {
    'use strict';

    module.exports = function (options) {
        options || (options = {});

        var whitelist = options.whitelist || function () {};

        return function (req, res, next) {
            if (whitelist(req, res)) {
                return next();
            }

            var authorization = req.headers.authorization,
                authorizationSegments = authorization ? authorization.split(' ') : [],
                authorizationType = authorizationSegments[0];

            if (authorizationType !== 'Basic') {
                return sendAuthenticate(options.realm, res);
            }

            var credentials;

            try {
                credentials = new Buffer(authorizationSegments[1], 'base64').toString();
            } catch (ex) {
                return sendAuthenticate(options.realm, res);
            }

            if (credentials === options.username + ':' + options.password) {
                return next();
            } else {
                return sendAuthenticate(options.realm, res);
            }
        };
    };

    function sendAuthenticate(realm, res) {
        res.set('WWW-Authenticate', 'Basic realm="' + realm + '"').status(401).send();
    }
}(require('url'));