!function (assert, parseCookie, vows) {
    'use strict';

    vows.describe('Set-Cookie Parser').addBatch({
        'when parse a single cookie': {
            topic: parseCookie('name=value'),

            'we get a map with only one item': function (topic) {
                assert.deepEqual(topic, { name: 'value' });
            }
        },
        'when parse a cookie with two items': {
            topic: parseCookie('name1=value1; name2=value2'),

            'we get a map with two items': function (topic) {
                assert.deepEqual(topic, { name1: 'value1', name2: 'value2' });
            }
        },
        'when parse a cookie with trailing semi-colon': {
            topic: parseCookie('name=value; '),

            'we get a map with only one item': function (topic) {
                assert.deepEqual(topic, { name: 'value' });
            }
        },
        'when parse a cookie with leading whitespaces': {
            topic: parseCookie(' name=value'),

            'we get a map with only one item': function (topic) {
                assert.deepEqual(topic, { name: 'value' });
            }
        }
    }).export(module);
}(
    require('assert'),
    require('../cookieparser').parseCookie,
    require('vows')
);