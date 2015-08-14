/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, evil:false, bitwise:false, strict:true, undef:true, curly:true, devel:true, indent:4, maxerr:50, expr:true, loopfunc:true, onevar:false, multistr:true, node:true */

!function () {
    'use strict';

    var assert = require('assert'),
        evaluate = require('../rule-evaluator');

    require('vows').describe('Rule Evaluator').addBatch({
        'when evaluating http://www.example.com/index.html against rule / -> publish/': {
            topic: evaluate({ url: 'http://www.example.com/index.html' }, { from: '/', to: 'publish/' }),
            'should return publish/index.html': function (topic) {
                assert.equal(topic, 'publish/index.html');
            }
        },

        'when evaluating http://www.example.com/eng/index.html against rule / -> publish/': {
            topic: evaluate({ url: 'http://www.example.com/eng/index.html' }, { from: '/', to: 'publish/' }),
            'should return publish/eng/index.html': function (topic) {
                assert.equal(topic, 'publish/eng/index.html');
            }
        },

        'when evaluating http://www.example.com/eng/index.html?abc=123&def=456&xyz=789 against rule / -> publish/': {
            topic: evaluate({ url: 'http://www.example.com/eng/index.html?abc=123&def=456&xyz=789' }, { from: '/', to: 'publish/' }),
            'should return publish/eng/index.html?abc=123&def=456&xyz=789': function (topic) {
                assert.equal(topic, 'publish/eng/index.html?abc=123&def=456&xyz=789');
            }
        },

        'when evaluating http://www.example.com/eng/index.html against / -> http://redirect.example.com/_r/': {
            topic: evaluate({ url: 'http://www.example.com/eng/index.html' }, { from: '/', to: 'http://redirect.example.com/_r/' }),
            'should return http://redirect.example.com/_r/eng/index.html': function (topic) {
                assert.equal(topic, 'http://redirect.example.com/_r/eng/index.html');
            }
        },

        'when evaluating http://www.example.com/eng/index.html?abc=123&def=456&xyz=789 against / -> http://redirect.example.com/_r/': {
            topic: evaluate({ url: 'http://www.example.com/eng/index.html?abc=123&def=456&xyz=789' }, { from: '/', to: 'http://redirect.example.com/_r/' }),
            'should return http://redirect.example.com/_r/eng/index.html?abc=123&def=456&xyz=789': function (topic) {
                assert.equal(topic, 'http://redirect.example.com/_r/eng/index.html?abc=123&def=456&xyz=789');
            }
        },

        'when evaluating http://www.example.com/ against / -> publish/index.html': {
            topic: evaluate({ url: 'http://www.example.com/' }, { from: '/', to: 'publish/index.html' }),
            'should return publish/index.html': function (topic) {
                assert.equal(topic, 'publish/index.html');
            }
        },

        'when evaluating http://www.example.com/?abc=123&def=456&xyz=789 against / -> publish/index.html': {
            topic: evaluate({ url: 'http://www.example.com/?abc=123&def=456&xyz=789' }, { from: '/', to: 'publish/index.html' }),
            'should return publish/index.html?abc=123&def=456&xyz=789': function (topic) {
                assert.equal(topic, 'publish/index.html?abc=123&def=456&xyz=789');
            }
        },

        'when evaluating http://www.example.com/abc.html against / -> publish/index.html': {
            topic: evaluate({ url: 'http://www.example.com/abc.html' }, { from: '/', to: 'publish/index.html' }),
            'should return undefined': function (topic) {
                assert.equal(typeof topic, 'undefined');
            }
        },

        'when evaluating http://www.example.com/index.html against /index.html -> publish/index.html': {
            topic: evaluate({ url: 'http://www.example.com/index.html' }, { from: '/index.html', to: 'publish/index.html' }),
            'should return publish/index.html': function (topic) {
                assert.equal(topic, 'publish/index.html');
            }
        },

        'when evaluating http://www.example.com/index.html?abc=123&def=456&xyz=789 against /index.html -> publish/index.html': {
            topic: evaluate({ url: 'http://www.example.com/index.html?abc=123&def=456&xyz=789' }, { from: '/index.html', to: 'publish/index.html' }),
            'should return publish/index.html?abc=123&def=456&xyz=789': function (topic) {
                assert.equal(topic, 'publish/index.html?abc=123&def=456&xyz=789');
            }
        },

        'when evaluating http://www.example.com/abc.html against /index.html -> publish/index.html': {
            topic: evaluate({ url: 'http://www.example.com/abc.html' }, { from: '/index.html', to: 'publish/index.html' }),
            'should return undefined': function (topic) {
                assert.equal(typeof topic, 'undefined');
            }
        },

        'when evaluating http://www.example.com/index.html against /index.html -> publish/': {
            topic: evaluate({ url: 'http://www.example.com/index.html' }, { from: '/index.html', to: 'publish/' }),
            'should return publish/index.html': function (topic) {
                assert.equal(topic, 'publish/index.html');
            }
        },

        'when evaluating http://www.example.com/index.html?abc=123&def=456&xyz=789 against /index.html -> publish/': {
            topic: evaluate({ url: 'http://www.example.com/index.html?abc=123&def=456&xyz=789' }, { from: '/index.html', to: 'publish/' }),
            'should return publish/index.html?abc=123&def=456&xyz=789': function (topic) {
                assert.equal(topic, 'publish/index.html?abc=123&def=456&xyz=789');
            }
        },

        'when evaluating http://www.example.com/eng/index.html against /eng/index.html -> publish/': {
            topic: evaluate({ url: 'http://www.example.com/eng/index.html' }, { from: '/eng/index.html', to: 'publish/' }),
            'should return publish/index.html': function (topic) {
                assert.equal(topic, 'publish/index.html');
            }
        },

        'when evaluating http://www.example.com/eng/index.html?abc=123&def=456&xyz=789 against /eng/index.html -> publish/': {
            topic: evaluate({ url: 'http://www.example.com/eng/index.html?abc=123&def=456&xyz=789' }, { from: '/eng/index.html', to: 'publish/' }),
            'should return publish/index.html?abc=123&def=456&xyz=789': function (topic) {
                assert.equal(topic, 'publish/index.html?abc=123&def=456&xyz=789');
            }
        },

        'when evaluating http://www.example.com/abc/index.html against /def/ -> xyz/': {
            topic: evaluate({ url: 'http://www.example.com/abc/index.html' }, { from: '/def/', to: 'xyz/' }),
            'should return not found': function (topic) {
                assert(!topic);
            }
        },

        'when evaluating http://www.example.com/abc/index.html against /def/ -> xyz/123.html': {
            topic: evaluate({ url: 'http://www.example.com/abc/index.html' }, { from: '/def/', to: 'xyz/123.html' }),
            'should return not found': function (topic) {
                assert(!topic);
            }
        }
    }).export(module);
}();