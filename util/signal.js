!function () {
    'use strict';

    function Signal(interval, callback) {
        var that = this;

        that._callback = callback;
        that._timeout = setTimeout(function () {
            that.triggered = 1;
            that._callback && that._callback('timeout');
            that._timeout = 0;
        }, interval);
    }

    Signal.prototype.trigger = function () {
        var that = this;

        if (that.triggered) {
            throw new Error('already triggered');
        }

        clearTimeout(that._timeout);
        that._callback('trigger');
    };

    module.exports = function (interval, callback) {
        return new Signal(interval, callback);
    };
}();