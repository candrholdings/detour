/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, evil:false, bitwise:false, strict:true, undef:true, curly:true, devel:true, indent:4, maxerr:50, expr:true, loopfunc:true, onevar:false, multistr:true, node:true */

!function () {
    'use strict';

    var parseUrl = require('url').parse;

    module.exports = function (req, rule) {
        var url = parseUrl(req.url),
            urlPathname = url.pathname,
            from = rule.from,
            to = rule.to,
            toDir = /[\\\/]$/.test(to),
            fromDir = /[\\\/]$/.test(from);

        if (toDir) {
            if (fromDir) {
                return to + urlPathname.substr(from.length) + (url.search || '');
            } else {
                return to + urlPathname.split('/').pop() + (url.search || '');
            }
        } else if (urlPathname === from) {
            return to + (url.search || '');
        }
    };
}();