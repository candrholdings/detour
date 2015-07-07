!function (fs, linq, path, winston) {
    'use strict';

    var livereloadJSPath = path.resolve(require.resolve('livereload-js'), '../../dist/livereload.js'),
        logger = new (winston.Logger)({
            levels: {
                error: 0,
                warn: 1,
                info: 2,
                livereload: 5
            },
            transports: [new (winston.transports.Console)({ colorize: true })]
        });

    winston.addColors({
        error: 'bold red',
        warn: 'bold yellow',
        info: 'bold green',
        livereload: 'bold green'
    });

    function LiveReloadServer(options) {
        this._options = options || {};
    }

    LiveReloadServer.prototype.listen = function (callback) {
        var that = this,
            connections = that._connections = {},
            LRWebSocketServer = require('livereload-server'),
            server = new LRWebSocketServer({ id: 'com.candrholdings.detour', name: 'Detour', version: '1.0', protocols: { monitoring: 7, saving: 1 }});

        server.on('connected', function (connection) {
            var supportMonitoring = linq(connection.parser.negotiatedProtocolDefinitions).any(function (def) { return def.version === 7; }).run();

            if (supportMonitoring) {
                connections[connection.id] = connection;
            }
        }).on('disconnected', function (connection) {
            delete connections[connection.id];
        // }).on('command', function (connection, message) {
        //     console.log(message);
        }).on('error', function (err, connection) {
            logger.warn('Failed to communicate with browser "' + connection.id + '" due to "' + err + '"');
            delete connections[connection.id];
        }).on('livereload.js', function (req, res) {
            fs.readFile(livereloadJSPath, function (err, data) {
                if (err) {
                    logger.warn('Failed to read "livereload.js" due to "' + err + '"');
                    res.writeHead(500);
                    res.end();
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/javascript' });
                    res.end(data);
                }
            });
        }).on('httprequest', function (req, res) {
            res.writeHead(404).end();
        }).listen(function (err) {
            err ? logger.warn('Server failed to start due to "' + err + '"') : logger.livereload('LiveReload server now listening');
            callback && callback(err);
        });

        return that;
    }

    LiveReloadServer.prototype.reload = function (urls) {
        var that = this;

        if (typeof urls === 'string') {
            urls = [urls];
        } else if (!urls.length) {
            return;
        }

        var displayableUrls = linq(urls).take(5).run(),
            connections = that._connections;

        connections = Object.getOwnPropertyNames(connections).map(function (id) { return connections[id]; });

        if (!urls.length || !connections.length) {
            return;
        }

        logger.livereload([
            'Pushing ',
            urls.length,
            ' update(s) to ',
            connections.length,
            ' browser(s), including ',
            displayableUrls.join(', '),
            (urls.length === displayableUrls.length ? '' : '\u2026')
        ].join(''));

        connections.forEach(function (connection) {
            urls.forEach(function (url) {
                connection.send({
                    command: 'reload',
                    path: '/' + url,
                    liveCSS: true
                });
            });
        });
    };

    module.exports = function (options) {
        return new LiveReloadServer(options || {});
    };
}(require('fs'), require('async-linq'), require('path'), require('winston'));