!function (crypto) {
    'use strict';

    var NONCE_COUNT = 1;

    function md5(text) {
        var md5 = crypto.createHash('md5');

        return md5.update(text).digest('hex');
    }

    function parseDigest(wwwAuthenticate) {
        var pattern = /([A-Za-z]+)=(\"?)(.*?)(\2)(,|$)/g,
            match,
            result = {};

        while ((match = pattern.exec(wwwAuthenticate))) {
            result[match[1]] = match[3];
        }

        return result;
    }

    function signDigest(wwwAuthenticate, method, url, body, username, password) {
        method = (method || 'GET').toLowerCase();

        var digest = parseDigest(wwwAuthenticate),
            algorithm = digest.algorithm,
            realm = digest.realm,
            nonce = digest.nonce,
            qop = digest.qop.split(','),
            cnonce = crypto.randomBytes(8).toString('hex'),
            cqop = ~qop.indexOf('auth-int') ? 'auth-int' : ~qop.indexOf('auth') ? 'auth' : undefined,
            ha1 =
                algorithm === 'MD5-sess' ?
                md5(md5(username + ':' + realm + ':' + password) + ':' + nonce + ':' + cnonce) :
                md5(username + ':' + realm + ':' + password),
            ha2 = 
                cqop === 'auth-int' ? 
                    md5(method + ':' + url + ':' + md5(body || '')) :
                    md5(method + ':' + url),
            // nonceCount = '00000001',
            // cnonce = '0a4f113b',
            nonceCount = NONCE_COUNT++,
            response =
                cqop ?
                    md5(ha1 + ':' + nonce + ':' + nonceCount + ':' + cnonce + ':' + cqop + ':' + ha2) :
                    md5(ha1 + ':' + nonce + ':' + ha2),
            digestRes = {
                username: username,
                realm: realm,
                nonce: nonce,
                uri: url,
                qop: cqop,
                nc: nonceCount,
                cnonce: cnonce,
                response: response,
                opaque: digest.opaque
            };

        console.log(digestRes);

        return 'Digest ' + Object.getOwnPropertyNames(digestRes).reduce(function (result, name) {
            var value = digestRes[name];

            value && result.push(name + '="' + value + '"');

            return result;
        }, []).join(',');
    }

    module.exports = {
        parse: parseDigest,
        sign: signDigest
    };
}(require('crypto'));