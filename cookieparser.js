!function () {
  'use strict';

  module.exports.parseSetCookie = function (setCookies, existing) {
    var setCookiePattern = /^\s*([^=]+)=([^\s;]+)/;

    existing = existing || {};

    (typeof setCookies === 'string' ? [setCookies] : setCookies).forEach(function (setCookie) {
      var match = setCookiePattern.exec(setCookie);

      if (match) {
        existing[match[1]] = match[2];
      }
    });

    return existing;
  };

  module.exports.parseCookie = function (cookies) {
    var cookiePattern = /\s*([^=]+)=([^\s;]+)(;|$)\s*/g,
      result = {},
      match;

    while ((match = cookiePattern.exec(cookies))) {
      result[match[1]] = match[2];
    }

    return result;
  };

  module.exports.serializeCookie = function (map) {
    var result = [];

    Object.getOwnPropertyNames(map).forEach(function (name) {
      const value = map[name];

      value && result.push(name + '=' + value);
    });

    return result.join('; ');
  };
}();