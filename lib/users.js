"use strict";

var _ = require('lodash');

exports.container = null;

exports.init = function(container, callback) {

    exports.container = container;

    container.addListener('request', onRequest);

    callback(null);
};

exports.close = function(callback) {

    callback(null);
};

exports.request = onRequest;


function onRequest(req, res) {

    var controller = require('./controllers/usersController');

    req.data.params._objectId = req.data.params._query1;

    var checklist = ['APIAUTH'];

    var dest = getRouteDestination(req.data);

    if(!dest) {

        return res.error(new Error('ResourceNotFound'))
    }

    if(dest === 'readMe' || dest === 'update' || dest === 'destroy')
        checklist.push('SESSION');

    exports.container.getService('AUTH').then(function(service) {

        var reqData = {checklist : checklist};

        var deep = function(a, b) {
            return _.isObject(a) && _.isObject(b) ? _.assign(a, b, deep) : b;
        };

        service.send('check', _.assign(reqData, req.data, deep), function(err, response) {

            if(err) {

                return res.error(err);
            }

            req.data.session = response.data.session;

            controller[dest](req.data, res, exports.container);
        });

    }).fail(function(err) {

        res.error(new Error('auth service not found'));
    });
}

function getRouteDestination(reqData) {

    var dest = '';

    switch(reqData.method) {

        case 'GET' :
            if(reqData.params._module === 'login')
                dest = 'login';
            else if(reqData.params._objectId) {
                if(reqData.params._objectId === 'me')
                    dest = 'readMe';
                else
                    dest = 'read';
            }
            else
                dest = 'find';
            break;

        case 'POST' :
            if(reqData.params._module === 'requestPasswordReset')
                dest = 'resetPassword';
            else
                dest = 'create';
            break;

        case 'PUT' :
            dest = 'update';
            break;

        case 'DELETE' :
            if(reqData.params._objectId)
                dest = 'destroy';
            else
                dest = 'destroyAll';
            break;
    }

    return dest;
}