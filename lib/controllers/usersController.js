"use strict";

var bcrypt = require('bcrypt');

exports.create = function(req, res, container) {

    var data = req.data;

    // PK 체크
    container.getService('MONGODB').then(function(service) {

        service.send('findOne', {collectionName : req.session.appid, query : {where : {username : data.username}}}, function(err, doc) {

            if(err)
                return res.error(err);

            if(doc.data) {

                return res.error(409, new Error("Duplicated unique property error"));
            }

            data.sessionToken = generateRandomString(16);
            data._className = '_Users';

            var salt = bcrypt.genSaltSync(10);
            data.password = bcrypt.hashSync(data.password, salt);

            service.send('insert', {collectionName : req.session.appid, data : data}, function(err, doc) {

                if(err)
                    return res.error(err);

                res.send(201, {
                    createdAt : doc.data.createdAt,
                    objectId : doc.data.objectId,
                    sessionToken : doc.data.sessionToken
                });
            });
        });
    }).fail(function(err) {

        res.error(err);
    });
};

exports.login = function(req, res, container) {

    container.getService('MONGODB').then(function(service) {

        service.send('findOne', {collectionName : req.session.appid, query : {where : {_className : '_Users', username : req.params.username}}}, function(err, doc) {

            if(err)
                return res.error(err);

            if(!doc.data)
                return res.error(new Error('Not Authorized Error'));

            if(!bcrypt.compareSync(req.params.password, doc.data.password))
                return res.error(new Error('Not Authorized Error'));

            delete doc.data.password;

            res.send(200, doc.data);
        });
    }).fail(function(err) {

        res.error(err);
    });
};

exports.read = function(req, res, container) {

    container.getService('MONGODB').then(function(service) {

        service.send('findOne', {collectionName : req.session.appid, query : {where : {objectId : req.params._objectId}}}, function(err, doc) {

            if(err)
                return res.error(err);

            if(doc.data) {

                delete doc.data.password;
                delete doc.data.sessionToken;
            }

            res.send(200, doc.data);
        });
    }).fail(function(err) {

        res.error(err);
    });
};

exports.readMe = function(req, res, container) {

    container.getService('MONGODB').then(function(service) {

        service.send('findOne', {collectionName : req.session.appid, query : {where : {username : req.session.username}}}, function(err, doc) {

            if(err)
                return res.error(err);

            if(!doc.data)
                return res.error(404, new Error('not found'));

            delete doc.data.password;
            delete doc.data.sessionToken;

            res.send(200, doc.data);
        });
    }).fail(function(err) {

        res.error(err);
    });
};

exports.update = function(req, res, container) {

    var data = req.data;

    if(!data)
        return res.error(new Error('RequestBodyNotFound'));

    if(data.password) {

        var salt = bcrypt.genSaltSync(10);
        data.password = bcrypt.hashSync(data.password, salt);
    }

    container.getService('MONGODB').then(function(service) {

        service.send('update', {collectionName : req.session.appid, query : {where : {objectId : req.params._objectId}}, data : data}, function(err, doc) {

            if(err) {

                if(err.code === 10147)
                    return new Error(404, 'ResourceNotFound');

                return res.error(err);
            }


            res.send(200, {
                updatedAt : doc.data.updatedAt
            });

        });
    }).fail(function(err) {

        res.error(err);
    });
};

exports.find = function(req, res, container) {

    container.getService('MONGODB').then(function (service) {

        if(!req.query.where)
            req.query.where = {};
        req.query.where._className = '_Users';

        service.send('find', {collectionName : req.session.appid, query: req.query}, function (err, docs) {

            if (err)
                return res.error(err);

            for(var i= 0, cnt= docs.data.length; i<cnt; i++) {

                delete docs.data[i].password;
                delete docs.data[i].sessionToken;
            }

            if (typeof(docs.data) === 'number') {

                res.send(200, {results: [], count: docs.data});
            } else {

                res.send(200, {results: docs.data});
            }
        });
    }).fail(function (err) {

        res.error(err);
    });
};

exports.destroy = function(req, res, container) {

    container.getService('MONGODB').then(function(service) {

        service.send('remove', {collectionName : req.session.appid, query : {where : {objectId : req.params._objectId}}}, function(err, doc) {

            if(err)
                return res.error(err);

            res.send(200, {});
        });
    }).fail(function(err) {

        res.error(err);
    });
};

exports.destroyAll = function(req, res, container) {

    // 테스트에서만 사용
    if(process.env.NODE_ENV !== 'test') {

        return new Error("cannot access");
    }

    container.getService('MONGODB').then(function(service) {

        service.send('remove', {collectionName : req.session.appid, query : {_className : '_Users'}}, function(err, doc) {

            if(err)
                return res.error(err);

            res.send(200, {});
        });
    }).fail(function(err) {

        res.error(err);
    });
};

exports.resetPassword = function(req, res, container) {

    // Todo: 메일로 새로운 패스워드를 보낸다.

    res.send(200, {});
};

function generateRandomString(length) {

    length = length ? length : 32;

    var rdmString = "";

    for( ; rdmString.length < length; rdmString  += Math.random().toString(36).substr(2));

    return  rdmString.substr(0, length);
}
