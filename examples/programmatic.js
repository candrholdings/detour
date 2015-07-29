!function () {
    'use strict';

    require('../server.js')({
        logLevel: 'follow',
        mappings: [{
            from: '/',
            to: 'html/',
            skipOn404: true
        }, {
            from: '/api/',
            to: 'http://api.example.com/'
        }]
    }, 12345);
}();