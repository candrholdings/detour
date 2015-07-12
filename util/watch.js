!function (async, crawl, EventEmitter, fs, path, signal) {
    'use strict';

    function Watcher(options) {
        var that = this;

        EventEmitter.call(that);

        options = that.options = {
            basedir: options && typeof options.basedir === 'string' ? options.basedir : '.',
            fswatch: options && typeof options.fswatch === 'boolean' ? options.fswatch : true,
            interval: options && typeof options.interval === 'number' ? options.interval : 2000
        };

        that._signals = [];
    }

    require('util').inherits(Watcher, EventEmitter);

    Watcher.prototype._doOnce = function (watchToken, filenames, changed, initComplete) {
        var that = this;

        if (!filenames || !filenames.length) { return; }

        var changes, fswatchers, next, crawling;

        async.whilst(
            function () {
                return !changes && that._watchToken === watchToken;
            },
            function (callback) {
                crawling = 1;

                crawl(filenames, { basedir: that.options.basedir }, function (err, result) {
                    crawling = 0;

                    if (err) {
                        initComplete && initComplete(err);
                        initComplete = 0;

                        return callback(err);
                    }

                    changes = that._state && diff(that._state, result);

                    that._state = result;

                    if (typeof changes !== 'undefined') {
                        changes = Object.getOwnPropertyNames(changes).sort();
                    } else {
                        that.options.fswatch !== false && !fswatchers && watchAll(
                            filenames,
                            function () {
                                !crawling && next && next.trigger();
                            },
                            function (err, watchers) {
                                if (!err) {
                                    fswatchers = watchers;
                                }
                            }
                        );
                    }

                    initComplete && initComplete();
                    initComplete = 0;

                    if (changes) {
                        callback();
                    } else {
                        that._signals.push((next = signal(that.options.interval, function () {
                            var index = that._signals.indexOf(next);

                            ~index && that._signals.splice(index, 1);
                            next = 0;

                            callback();
                        })));
                    }
                });
            },
            function (err) {
                fswatchers && fswatchers.forEach(function (watcher) {
                    watcher.close();
                });

                if (!err && that._watchToken !== watchToken) {
                    err = new Error('Operation aborted');
                }

                changed(err, err ? null : changes);
            }
        );
    };

    Watcher.prototype.watch = function (filenames, changed, callback) {
        var that = this;

        that._watchToken = {};

        that._doOnce(
            that._watchToken,
            !filenames ? [] : {}.toString.call(filenames) === '[object Array]' ? filenames : [filenames],
            changed,
            callback
        );
    };

    Watcher.prototype.stop = function () {
        this._watchToken = 0;

        this._signals.forEach(function (signal) {
            signal.trigger();
        });
    };

    function watchAll(filenames, changed, callback) {
        var watchers = [],
            pendings = filenames.slice();

        async.whilst(
            function () { return pendings.length; },
            function (callback) {
                var currfilename = pendings.pop();

                fs.stat(currfilename, function (err, stat) {
                    if (stat.isDirectory() || stat.isFile()) {
                        watchers.push(fs.watch(currfilename, changed).on('error', changed));
                    }

                    if (stat.isDirectory()) {
                        fs.readdir(currfilename, function (err, filenames) {
                            !err && filenames.forEach(function (filename) {
                                pendings.push(path.join(currfilename, filename));
                            });

                            callback(err);
                        });
                    } else {
                        callback();
                    }
                });
            },
            function (err) {
                err && watchers.forEach(function (watcher) {
                    watcher.close();
                });

                callback(err, err ? null : watchers);
            }
        );
    }

    function deepEqual(x, y) {
        var tx = typeof x,
            ty = typeof y;

        if (tx !== ty) {
            return false;
        } else if (tx === 'boolean' || tx === 'number' || tx === 'string' || tx === 'function' || tx === 'undefined') {
            return x === y;
        } else if (x instanceof Date) {
            return y instanceof Date && x.getTime() === y.getTime();
        } else if ({}.toString.call(x) === '[object Array]') {
            if ({}.toString.call(x) !== '[object Array]' || x.length !== y.length) {
                return false;
            }

            return x.every(function (xx, index) {
                return deepEqual(xx, y[index]);
            });
        }

        var nx = Object.getOwnPropertyNames(x),
            ny = Object.getOwnPropertyNames(y);

        if (nx.length !== ny.length) { return false; }

        return nx.every(function (name) {
            return deepEqual(x[name], y[name]);
        });
    }

    function diff(x, y) {
        var tx = typeof x,
            ty = typeof y;

        if (tx !== ty) {
            return y;
        } else if (tx === 'boolean' || tx === 'number' || tx === 'string' || tx === 'function' || tx === 'undefined') {
            return x === y ? undefined : y;
        } else if (x instanceof Date) {
            return y instanceof Date && x.getTime() === y.getTime() ? undefined : y;
        } else if ({}.toString.call(x) === '[object Array]') {
            return deepEqual(x, y) ? undefined : y;
        }

        var nx = Object.getOwnPropertyNames(x),
            ny = Object.getOwnPropertyNames(y),
            changed,
            diff = {};

        nx.forEach(function (name) {
            if (!~ny.indexOf(name)) {
                diff[name] = undefined;
                changed = 1;
            }
        });

        ny.forEach(function (name) {
            var xx = x[name],
                yy = y[name];

            if (!xx || !deepEqual(xx, yy)) {
                diff[name] = yy;
                changed = 1;
            }
        });

        return changed ? diff : undefined;
    }

    module.exports = function (options) {
        return new Watcher(options);
    };

    module.exports._deepEqual = deepEqual;
    module.exports._diff = diff;
}(
    require('async'),
    require('./crawl'),
    require('events').EventEmitter,
    require('fs'),
    require('path'),
    require('./signal')
);