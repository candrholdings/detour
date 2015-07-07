!function (assert, serializeCookie, vows) {
    'use strict';

    vows.describe('Serialize a map into cookie string', {
        'a single cookie': {
            topic: serializeCookie({ name: 'value' }),

            'return a string with one cookie': function (topic) {
                assert.equal(topic, 'name=value');
            }
        },
        'two cookies': {
            topic: serializeCookie({ name1: 'value1', name2: 'value2' }),

            'return a string with two cookies': function (topic) {
                assert.equal(topic, 'name1=value1; name2=value2');
            }
        }
    }).export(module);
}(
    require('assert'),
    require('../cookieparser').serializeCookie,
    require('vows')
);