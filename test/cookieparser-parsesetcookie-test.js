!function (assert, parseSetCookie, vows) {
    'use strict';

    vows.describe('Set-Cookie Parser').addBatch({
        'when parse a single set-cookie': {
            topic: parseSetCookie('name=value; Path=/; HttpOnly'),

            'we get a map with only one item': function (topic) {
                assert.deepEqual(topic, { name: 'value' });
            }
        },
        'when parse a set-cookie array with two items': {
            topic: parseSetCookie([
                'name1=value1; Path=/; HttpOnly',
                'name2=value2; Path=/; HttpOnly'
            ]),

            'we get a map with two items': function (topic) {
                assert.deepEqual(topic, { name1: 'value1', name2: 'value2' });
            }
        },
        'when parse a single set-cookie into an existing cookie collection': {
            topic: parseSetCookie('name1=value1; Path=/; HttpOnly', { name2: 'value2' }),

            'we get a map with an additional item': function (topic) {
                assert.deepEqual(topic, { name1: 'value1', name2: 'value2' });
            }
        },
        'when parse a single set-cookie into an existing cookie collection with same name': {
            topic: parseSetCookie('name=value2; Path=/; HttpOnly', { name: 'value1' }),

            'we get a map with replaced item': function (topic) {
                assert.deepEqual(topic, { name: 'value2' });
            }
        },
        'when parse a single set-cookie with leading whitespaces': {
            topic: parseSetCookie(' name=value; Path=/; HttpOnly'),

            'we get a map with only one item': function (topic) {
                assert.deepEqual(topic, { name: 'value' });
            }
        }
    }).export(module);
}(
    require('assert'),
    require('../cookieparser').parseSetCookie,
    require('vows')
);