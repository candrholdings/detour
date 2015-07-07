!function (async, fs, linq, path) {
    'use strict';

    function crawl(initialdir, options, callback) {
        if (arguments.length === 2) {
            callback = arguments[1];
            options = null;
        }

        options || (options = {});

        var that = this,
            basedir = options.basedir || '.',
            pendings = {}.toString.call(initialdir) === '[object Array]' ? initialdir.slice() : [initialdir],
            result = {};

        async.whilst(
            function () { return pendings.length; },
            function (callback) {
                var curr = pendings.pop(),
                    fullname = path.resolve(basedir, curr);

                fs.stat(fullname, function (err, stat) {
                    if (err) {
                        return callback(err);
                    } else if (stat.isDirectory()) {
                        fs.readdir(fullname, function (err, filenames) {
                            !err && filenames.forEach(function (filename) {
                                pendings.push(path.join(curr, filename));
                            });

                            callback(err);
                        });
                    } else if (stat.isFile()) {
                        result[curr.replace(/\\/g, '/')] = {
                            mtime: stat.mtime.getTime(),
                            size: stat.size
                        };

                        callback();
                    }
                });
            },
            function (err) {
                callback(err, err ? null : result);
            }
        );
    };

    module.exports = crawl;
}(
    require('async'),
    require('fs'),
    require('async-linq'),
    require('path')
);