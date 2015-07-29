#!/usr/bin/env node

!function (async, express, fs, http, htps, mime, path, url, winston) {
    'use strict';

    var cookieParser = require('./cookieparser'),
        parseCookie = cookieParser.parseCookie,
        parseSetCookie = cookieParser.parseSetCookie,
        serializeCookie = cookieParser.serializeCookie,
        formatUrl = url.format,
        parseUrl = url.parse,
        resolveUrl = url.resolve,
        evaluate = require('./rule-evaluator'),
        configPath = process.argv[2] || 'detour-config.json',
        systemProxy = process.env.http_proxy;

    systemProxy = systemProxy && parseUrl(systemProxy);

    winston.addColors({
        // error: 'bold red',
        // warn: 'bold yellow',
        // info: 'bold green',
        skip: 'bold yellow',
        forward: 'bold cyan',
        follow: 'bold green'
    });

    require.main === module && readJsonFile(configPath, function (err, config) {
        if (err) {
            console.error('Failed to read "' + configPath + '" due to "' + describe(err) + '".');
            process.exit(-1);
        }

        new DetourProxy(config, process.env.port || process.argv[3] || 7000 + Math.floor(Math.random() * 1000));

        fs.watch(configPath, function () {
            console.warn('"' + configPath + '" updated, exiting with code 2');
            process.exit(2);
        });
    });

    module.exports = function (config, port) {
        new DetourProxy(config, port || 1337);
    };

    function DetourProxy(config, port) {
        var that = this,
            app = express(),
            livereload = config.livereload !== false && require('./util/livereload')().listen(),
            logger = that.logger = new (winston.Logger)({
                levels: {
                    error: 9,
                    warn: 7,
                    info: 5,
                    skip: 4,
                    forward: 3,
                    follow: 3
                },
                transports: [new (winston.transports.Console)({ colorize: true })]
            }),
            logLevel = config.logLevel;

        Object.getOwnPropertyNames(logger.transports).forEach(function (name) {
            logger.transports[name].level = logLevel || 'info';
        });

        systemProxy && logger.info('System proxy is set', { proxy: systemProxy });

        that.config = config;

        config.mappings.forEach(function (rule) {
            app.use(function (req, res, next) {
                that.handleRequestByRule(req, rule, function (err, body, statusCode, headers) {
                    if (err) {
                        res.status(500).send();
                    } else if (body) {
                        Object.getOwnPropertyNames(headers).forEach(function (name) {
                            res.set(name, headers[name]);
                        });

                        res.status(statusCode).send(body);
                    } else {
                        next();
                    }
                });
            });

            if (!/^http/.test(rule.to)) {
                // path.resolve will remove trailing slash, we use trailing slash to indicate a file or folder
                // Therefore, remember the trailing slash and add it back if needed
                var toDir = /[\\\/]$/.test(rule.to);

                rule.to = path.resolve(path.dirname(configPath), rule.to) + (toDir ? path.sep : '');

                if (livereload) {
                    var watcher = require('./util/watch')(),
                        loopWatch = function () {
                            watcher.watch(rule.to, function (err, changes) {
                                !err && livereload.reload(changes.map(function (change) {
                                    return url.resolve(rule.from, path.relative(rule.to, change));
                                }));

                                loopWatch();
                            });
                        };

                    loopWatch();
                }
            }
        });

        app.all('*', function (req, res) {
            res.status(500).send();
        });

        app.listen(port, function () {
            logger.info('Detour is now listening to port ' + port);
        });
    }

    DetourProxy.prototype.getRequestHandler = function (url) {
        var that = this;

        if (url.substr(0, 4) === 'http') {
            return that.requestToHttp;
        } else {
            return that.requestToFileSystem;
        }
    }

    DetourProxy.prototype.handleRequestByRule = function (req, rule, callback) {
        var that = this,
            detourUrl = evaluate(req, rule);

        if (!detourUrl) { return callback(); }

        that.getRequestHandler(detourUrl).call(that, req, detourUrl, rule, 5, function (err, body, statusCode, headers) {
            if (err) {
                callback(err);
            } else if (statusCode === 200 && headers['content-type'] === 'text/html') {
                that.processServerSideInclude(req, body.toString(), function (err, body) {
                    callback(null, body, statusCode, headers);
                });
            } else {
                callback(null, body, statusCode, headers);
            }
        });
    }

    DetourProxy.prototype.handleRequestByAllRules = function (req, callback) {
        var that = this,
            resultErr, resultBody, resultStatusCode, resultHeaders;

        async.some(that.config.mappings, function (rule, next) {
            that.handleRequestByRule(req, rule, function (err, body, statusCode, headers) {
                if (err) {
                    resultErr = err;
                    next(1);
                } else if (statusCode) {
                    resultBody = body;
                    resultStatusCode = statusCode;
                    resultHeaders = headers;
                    next(1);
                } else {
                    next(0);
                }
            });
        }, function (handled) {
            if (resultErr) {
                callback(resultErr);
            } else if (handled) {
                callback(null, resultBody, resultStatusCode, resultHeaders);
            } else {
                callback(new Error('no rule to forward'));
            }
        });
    }

    DetourProxy.prototype.requestToFileSystem = function (req, detourUrl, options, redirectTtl, callback) {
        var that = this,
            path = detourUrl.split('?')[0],
            logLine = req.originalUrl + ' -> ' + path;

        fs.stat(path, function (err, stat) {
            if (err) {
                if (err.code === 'ENOENT' && options.skipOn404) {
                    that.logger.skip(logLine);
                    callback();
                } else {
                    that.logger.warn(logLine, err);
                    callback(err);
                }

                return;
            }

            if (stat.isFile()) {
                fs.readFile(path, function (err, data) {
                    if (err) {
                        that.logger.warn(logLine, err);

                        callback(err);
                    } else {
                        var contentType = mime.lookup(path);

                        that.logger.forward(logLine, { contentType: contentType });

                        callback(null, data, 200, { 'content-type': contentType });
                    }
                });
            } else if (stat.isDirectory()) {
                if (options.default === false) {
                    that.logger.skip(logLine);
                    callback();
                } else {
                    detourUrl = path.replace(/\/*$/, '/') + (options.default || 'index.html');
                    that.logger.follow(req.originalUrl + ' -> ' + detourUrl);

                    return that.requestToFileSystem(req, detourUrl, options, redirectTtl, callback);
                }
            } else {
                that.logger.warn(logLine, 'unknown file');
                callback();
            }
        });
    }

    DetourProxy.prototype.requestToHttp = function (req, detourUrl, options, redirectTtl, callback) {
        var that = this,
            contentLength = +req.headers['content-length'],
            requestOptions = parseUrl(detourUrl),
            headers = requestOptions.headers = req.headers,
            sreq,
            proxy = options.proxy || systemProxy;

        req.headers.host = requestOptions.host;
        delete req.headers['accept-encoding'];
        requestOptions.method = req.method;
        requestOptions.auth = req.auth;
        requestOptions.agent = false;

        if (proxy) {
            requestOptions.hostname = proxy.hostname;
            requestOptions.port = proxy.port;
            requestOptions.protocol = proxy.protocol || 'http:';
        }

        // Microsoft Edge will send "cookie" header with undefined content
        // It would fail with Error: "name" and "value" are required for setHeader().
        Object.getOwnPropertyNames(headers).forEach(function (name) {
            if (typeof headers[name] === 'undefined') {
                delete headers[name];
            }
        });

        sreq = http.request(requestOptions, function (sres) {
            var statusCode = sres.statusCode,
                logLine = req.originalUrl + ' -> ' + formatUrl(requestOptions);

            if (sres.statusCode === 404 && options.skipOn404) {
                that.logger.skip(logLine);

                callback && callback();
                callback = 0;

                return;
            } else if (sres.statusCode === 302) {
                if (redirectTtl === 0) {
                    that.logger.skip(req.originalUrl + ' has too many redirections');

                    callback && callback();
                    callback = 0;

                    return;
                } else {
                    detourUrl = sres.headers.location;
                    that.logger.follow(req.originalUrl + ' -> ' + sres.headers.location);

                    var cookies = parseCookie(options.cookie);

                    cookies = parseSetCookie(sres.headers['set-cookie'], cookies);
                    (req.headers || (req.headers = {})).cookie = serializeCookie(cookies);

                    return that.requestToHttp(req, detourUrl, options, redirectTtl - 1, callback);
                }
            }

            var sresHeaders = sres.headers;

            Object.getOwnPropertyNames(sresHeaders).forEach(function (name) {
                if (name === 'www-authenticate') {
                    var value = sresHeaders[name];

                    sresHeaders[name] = value.split(', ');
                    // sresHeaders[name] = 'NTLM';
                } else if (name.substr(0, 6) === 'proxy-') {
                    delete sresHeaders[name];
                }
            });

            if (hasContent(sres)) {
                readToEnd(sres, function (err, sbody) {
                    if (err) {
                        that.logger.warn(logLine, err);
                        callback && callback(err);
                        callback = 0;
                    } else {
                        that.logger.forward(logLine, { statusCode: sres.statusCode });

                        callback && callback(null, sbody, sres.statusCode, sres.headers);
                        callback = 0;
                    }
                });
            } else {
                that.logger.forward(logLine, { statusCode: sres.statusCode });
                callback && callback(null, null, sres.statusCode, sres.headers);
                callback = 0;
            }
        });

        sreq.on('error', function (err) {
            that.logger.error('Failed to forward request to ' + detourUrl + ' due to "' + err + '".');

            callback && callback(err);
            callback = 0;
        });

        // Some requests are fake
        req.on && req.on('error', function (err) {
            that.logger.error('Failed to receive request due to "' + err + '".');

            callback && callback(err);
            callback = 0;
        });

        if (contentLength) {
            req.pipe(sreq);
        } else {
            sreq.end();
        }
    }

    function readToEnd(stream, callback) {
        var buffers = [],
            numBytes = 0;

        stream.on('data', function (data) {
            buffers.push(data);
            numBytes += data.length;
        });

        stream.on('end', function () {
            callback && callback(null, Buffer.concat(buffers, numBytes));
            callback = null;
            buffers = null;
        });

        stream.on('close', function (err) {
            callback && callback(err);
            callback = null;
            buffers = null;
        });
    }

    DetourProxy.prototype.processServerSideInclude = function (req, body, callback) {
        // <!--#include virtual="../../../../eng/include/topnav.htm" -->

        var that = this,
            pattern = /<!--#include .*?virtual="([^"]*)".*?-->/g,
            match,
            lastIndex = 0,
            newBody = [];

        if ((req.ssi = ++req.ssi || 1) > 10) {
            return callback(new Error('too much server-side include directives'));
        }

        async.whilst(
            function () { return (match = pattern.exec(body)); },
            function (callback) {
                var ssiUrl = resolveUrl(req.originalUrl, match[1]),
                    reqHeaders = req.headers,
                    sreqHeaders = {
                        'accept-language': reqHeaders['accept-language'],
                        cookie: reqHeaders['cookie'],
                        'user-agent': reqHeaders['user-agent']
                    };

                newBody.push(body.substring(lastIndex, match.index));
                newBody.push('<!-- BEGIN SSI ' + ssiUrl + ' -->\n');

                that.handleRequestByAllRules({ headers: sreqHeaders, url: ssiUrl }, function (err, body, statusCode, contentType) {
                    if (err) {
                        newBody.push('<!-- SSI FAILED ' + err + ' -->');
                    } else if (statusCode !== 200) {
                        newBody.push('<!-- SERVER RETURN ' + statusCode + ' -->');
                    }

                    !err && body && newBody.push(body);

                    newBody.push('\n<!-- END SSI ' + ssiUrl + ' -->');
                    lastIndex = match.index + match[0].length;

                    callback();
                });
            },
            function (err) {
                !err && newBody.push(body.substr(lastIndex));

                callback && callback(err, err ? null : newBody.join(''));
            }
        );
    }

    function describe(err) {
        return typeof err !== 'undefined' && err !== null ? err.message || err.code || err + '' : err + '';
    }

    function readJsonFile(path, callback) {
        fs.readFile(path, 'utf8', function (err, json) {
            if (err) {
                callback(err);
            } else {
                try {
                    json = JSON.parse(json);
                } catch (ex) {
                    callback(ex);
                }

                callback(null, json);
            }
        });
    }

    function hasContent(res) {
        var statusCode = res.statusCode;

        if (+res.headers['content-length'] > 0) {
            return true;
        } else if (Math.floor(statusCode / 100) === 1) {
            return false;
        } else if (statusCode === 204) {
            return false;
        } else if (statusCode === 205) {
            return false;
        } else if (res.headers['content-length'] === '0') {
            return false;
        }

        return true;
    }

    function isArray(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    }
}(
    require('async'),
    require('express'),
    require('fs'),
    require('http'),
    require('https'),
    require('mime'),
    require('path'),
    require('url'),
    require('winston')
);