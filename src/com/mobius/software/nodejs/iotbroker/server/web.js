/**
 * Mobius Software LTD
 * Copyright 2015-2016, Mobius Software LTD
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 */

'use strict';
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var app = express();



var mqttClient = require('../protocols/mqtt/mqttClient');
var snClient = require('../protocols/mqtt-sn/snClient');
var coapClient = require('../protocols/coap/coapClient');
var wsClient = require('../protocols/ws/wsClient');
var amqpClient = require('../protocols/amqp/amqpClient')
var guid = require('../protocols/mqtt/lib/guid');
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
var users = require('./routes/users');
var check = require('./routes/check')
var Datastore = require('nedb');
var db = new Datastore({ filename: 'userData' });
var forge = require('node-forge');
app.use(bodyParser.json());
app.use(cors());
app.use(function (err, req, res, next) {
    res.status(500).send('Something broke!');
});

if (cluster.isMaster) {
    var worker = [];

    for (var i = 0; i < numCPUs; i++) {
        worker[i] = cluster.fork();
    }

    cluster.on('message', function (evt, params) {
        for (var i = 0; i < worker.length; i++) {
            worker[i].send(params.unique);
        }

    });

    cluster.on('exit', function (deadWorker, code, signal) {
        var worker = cluster.fork();
    });



} else {
    app.listen('8888', function () {
        console.log('app is running on port 8888');
    });

    app.use('/users', users);

    app.use('/check', check);

    app.post('/connect', function onConnect(req, res) {
        db.loadDatabase();
	//db.remove({'clientID': req.body.clientID, 'type.name': req.body.type.name }, { multi: true })
       // db.insert(req.body);

        var currClient = req.body.type;
        currClient.name = currClient.name.toLowerCase();
        if (!req.body.host) {
            res.status(400).send('Invalid request! Parameter "host" mismatch.');
            return;
        }
        if (!req.body.port || !/^[1-9](\d?\d?\d?\d?)$/.test(req.body.port)) {
            res.status(400).send('Invalid request! Parameter "port" mismatch.');
            return;
        }
        //if (!req.body.username || !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(req.body.username)) {
        if (!req.body.username && (req.body.type.id == 1 || req.body.type.id == 5)) {
            res.status(400).send('Invalid request! Parameter "username" mismatch.');
            return;
        }
        if (!req.body.password && (req.body.type.id == 1 || req.body.type.id == 5)) {
            res.status(400).send('Invalid request! Parameter "password" mismatch.');
            return;
        }
        if (!req.body.clientID) {
            res.status(400).send('Invalid request! Parameter "clientID" mismatch.');
            return;
        }
        if (typeof req.body.isClean == 'undefined' && (req.body.type.id == 1 || req.body.type.id == 2 || req.body.type.id == 5)) {
            res.status(400).send('Invalid request! Parameter "isClean" mismatch.');
            return;
        }
        if (!req.body.keepalive && (req.body.type.id == 1 || req.body.type.id == 2 || req.body.type.id == 5)) {
            res.status(400).send('Invalid request! Parameter "keepalive" mismatch.');
            return;
        }
        if (req.body.keepalive > 65535 && (req.body.type.id == 1 || req.body.type.id == 2 || req.body.type.id == 5)) {
            res.status(400).send('Invalid request! Parameter "keepalive" limited to 65535.');
            return;
        }

        if(req.body.secure && req.body.certificate && req.body.certificate.indexOf('ENCRYPTED') != -1 && !req.body.privateKey) {           
            res.status(400).send('Invalid request! Add "password" to your certificate');
            return;
        }
        if(req.body.secure && req.body.certificate && req.body.certificate.indexOf('ENCRYPTED') != -1 && (req.body.type.id == 2 ||  req.body.type.id == 3)) {
            try {
                var privateKey = '';
                var arr = [];
                var arrStr = [];
                arr = req.body.certificate.split('-----BEGIN CERTIFICATE-----');
                arr.forEach(function (str, index) {
                    arrStr = str.split('-----END CERTIFICATE-----')
                    if(arrStr[1]) {
                        privateKey += arrStr[1]
                    }   
                })
            var pki = forge.pki;               
            var privateKeyPki = pki.decryptRsaPrivateKey(privateKey, req.body.privateKey);              
            var pem = pki.privateKeyToPem(privateKeyPki);
            privateKey = Buffer.from(pem, 'utf8') 
          } catch(e) {
            res.status(400).send('Invalid request! Bad "password" to your certificate');
            return;
          }
           
        }
        try {
            var connectionParams = {
                type: 'connection',
                connection: {
                    host: req.body.host,
                    port: parseInt(req.body.port),
                    username: req.body.username,
                    password: req.body.password,
                    clientID: req.body.clientID,
                    isClean: JSON.parse(req.body.isClean),
                    keepalive: parseInt(req.body.keepalive),
                    unique: req.body.unique,
                    secure: req.body.secure,
                    certificate: req.body.certificate,
                    privateKey: req.body.privateKey,
                    type: req.body.type
                },
                id: guid()
            };
        } catch (error) {
            res.status(400).send('Invalid request! Parameters mismatch.');
            return;
        }
        if (!!req.body.will && Object.keys(req.body.will).length > 1 && (req.body.type.id == 2 || req.body.type.id == 5)) {

            if (!(req.body.will.qos >= 0 && req.body.will.qos < 3) && (req.body.type.id != 2 && req.body.type.id != 5)) {
                res.status(400).send('Invalid request! Parameter "qos" in "will" mismatch.');
                return;
            }
            if (typeof req.body.will.retain == 'undefined') {
                res.status(400).send('Invalid request! Parameter "retain" in "will" mismatch.');
                return;
            }
            if (req.body.will.content.length > 1400 && req.body.type.id == 2) {
                res.status(400).send('Invalid request! Length of "content" in "will" limited to 1400.');
                return;
            }
            try {
                connectionParams.connection.will = {
                    topic: req.body.will.topic,
                    content: req.body.will.content,
                    qos: parseInt(req.body.will.qos),
                    retain: JSON.parse(req.body.will.retain)
                }
            } catch (error) {
                res.status(400).send('Invalid request! Parameters mismatch.');
                return;
            }
        }


        switch (currClient.id) {
            case 1:
                mqttClient.send(currClient.name + '.connect', {
                    msg: 'connect',
                    params: connectionParams,
                });

                var tryNum = 0;
                setTimeout(function () {
                    mqttClient.getData({ type: 'connack', unique: req.body.unique }, res);
                }, 3000);
                break;
            case 2:
                snClient.send(currClient.name + '.connect', {
                    params: connectionParams,
                });
                setTimeout(function () {
                    snClient.getData({ type: 'connack', unique: req.body.unique }, res);                   
                }, 3000);
                break;
            case 3:
                coapClient.send('coap.connect', {
                    msg: 'connect',
                    params: connectionParams,
                });
                setTimeout(function () {
                    coapClient.getData({ type: 'connack', unique: req.body.unique }, res);
                }, 3000);
                break;
            case 4:
                amqpClient.send(currClient.name + '.connect', {
                    msg: 'connect',
                    params: connectionParams,
                });
                var tryNum = 0;
                setTimeout(function () {
                    amqpClient.getData({ type: 'connack', unique: req.body.unique }, res);
                }, 3000);
                //  res.send('Testing ')
                break;
            case 5:
                wsClient.send('ws.connect', {
                    msg: 'connect',
                    params: connectionParams,
                });
                var tryNum = 0;
                setTimeout(function () {
                    wsClient.getData({ type: 'connack', unique: req.body.unique }, res);
                }, 3000);
                break;

        }

    });



    app.post('/disconnect', function onDisconnect(req, res) {
        var currClient = req.body.type;
        var unique = req.body.unique
        currClient.name = currClient.name.toLowerCase();
        // if (!req.body.username || !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(req.body.username)) {
        if (!req.body.username && (currClient.id == 1 || currClient.id == 5)) {
            res.status(400).send('Invalid request! Parameter "username" mismatch.');
            return;
        }

        switch (currClient.id) {
            case 1:               
                mqttClient.send(currClient.name + '.disconnect' + unique, {
                    msg: 'disconnect',
                    username: req.body.username,
                    unique: unique
                });
                res.send('disconnected');
                break;
            case 2:
                snClient.send(currClient.name + '.disconnect' + unique, {
                    msg: 'disconnect',
                    keepalive: req.body.keepalive,
                    clientID: req.body.clientID,
                    unique: unique
                });
                res.send('disconnected');
                break;
            case 3:
                coapClient.send(currClient.name + '.disconnect' + unique, {
                    msg: 'disconnect',
                    keepalive: req.body.keepalive,
                    clientID: req.body.clientID,
                    unique: unique
                });
                res.send('disconnected');
                break;
            case 4:
                amqpClient.send(currClient.name + '.disconnect' + unique, {
                    msg: 'disconnect',
                    username: req.body.username,
                    unique: unique
                });
                res.send('disconnected');
                break;
            case 5:
                wsClient.send('ws.disconnect' + unique, {
                    msg: 'disconnect',
                    username: req.body.username,
                    unique: unique
                });
                res.send('disconnected');
                break;
        }
    });

    app.post('/publish', function onPublish(req, res) { 
        var currClient = req.body.type;
        var unique = req.body.unique
        currClient.name = currClient.name.toLowerCase();
        // if (!req.body.username || !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(req.body.username)) {
        if (!req.body.username && (currClient.id == 1 || currClient.id == 5)) {
            res.status(400).send('Invalid request! Parameter "username" mismatch.');
            return;
        }
        if (!req.body.topic) {
            res.status(400).send('Invalid request! Parameter "topic" mismatch.');
            return;
        }
        if (!req.body.content) {
            res.status(400).send('Invalid request! Parameter "content" mismatch.');
            return;
        }
        if (req.body.content.length > 1400 && (currClient.id == 2 || currClient.id == 3)) {
            res.status(400).send('Invalid request! Length of "content" limited to 1400.');
            return;
        }
        if (!(req.body.qos >= 0 && req.body.qos < 3) && currClient.id != 3 && currClient.id != 4) {
            res.status(400).send('Invalid request! Parameter "qos" mismatch.');
            return;
        }
        if (typeof req.body.retain == 'undefined') {
            res.status(400).send('Invalid request! Parameter "retain" mismatch.');
            return;
        }
        if (typeof req.body.isDupe == 'undefined') {
            res.status(400).send('Invalid request! Parameter "isDupe" mismatch.');
            return;
        }
        try {
            var publishData = {
                topic: req.body.topic,
                qos: parseInt(req.body.qos),
                content: req.body.content,
                retain: JSON.parse(req.body.retain),
                isDupe: JSON.parse(req.body.isDupe),
                clientID: req.body.clientID,
                unique: req.body.unique
            };
        } catch (error) {
            res.status(400).send('Invalid request! Parameters mismatch.');
            return;
        }

        switch (currClient.id) {
            case 1:
                mqttClient.send('mqtt.publish' + unique, {
                    msg: 'publish',
                    params: publishData,
                    username: req.body.username,
                    unique: unique
                });
                break;

            case 2:
                snClient.send('sn.publish' + unique, {
                    msg: 'publish',
                    params: publishData,
                    clientID: req.body.clientID,
                    unique: unique
                });
                break;
            case 3:
                coapClient.send('coap.publish' + unique, {
                    msg: 'publish',
                    params: publishData,
                    clientID: req.body.clientID,
                    unique: unique
                });
                break;

            case 4:
                amqpClient.send('amqp.publish' + unique, {
                    msg: 'publish',
                    params: publishData,
                    username: req.body.username,
                    unique: unique
                });
                break;

            case 5:
                wsClient.send('ws.publish' + unique, {
                    msg: 'publish',
                    params: publishData,
                    username: req.body.username,
                    unique: unique
                });
                break;
        }


        res.send('publish received');
    });

    app.post('/subscribe', function onSubscribe(req, res) {
        var currentProtocol = req.body.type.id;
        var unique = req.body.unique
        //if (!req.body.username || !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(req.body.username)) {

        if (currentProtocol == 1) {
            if (!req.body.username) {
                res.status(400).send('Invalid request! Parameter "username" mismatch.');
                return;
            }
            try {
                mqttClient.send('mqtt.subscribe' + unique, {
                    msg: 'subscribe',
                    params: req.body,
                    username: req.body.username,
                    unique: unique
                });
            } catch (error) {
                res.status(400).send('Invalid request! Parameters mismatch.');
                return;
            }
            res.send('subscribe received');
        }
        if (currentProtocol == 2) {
            try {
                snClient.send('sn.subscribe' + unique, {
                    msg: 'subscribe',
                    params: req.body,
                });
            } catch (error) {
                res.status(400).send('Invalid request! Parameters mismatch.');
                return;
            }
            setTimeout(function () {
                snClient.getData({ type: 'snsubscribtion', 'subscribtion.unique': unique, 'subscribtion.topic': req.body.topics[0].topic }, res);
            }, 1000);
        }
        if (currentProtocol == 3) {
            try {
                coapClient.send('coap.subscribe'  + unique, {
                    msg: 'subscribe',
                    params: req.body,
                });
            } catch (error) {
                res.status(400).send('Invalid request! Parameters mismatch.');
                return;
            }
            res.send('subscribe received');
        }
        if (currentProtocol == 4) {
            if (!req.body.username) {
                res.status(400).send('Invalid request! Parameter "username" mismatch.');
                return;
            }
            try {
                amqpClient.send('amqp.subscribe' + unique, {
                    msg: 'subscribe',
                    params: req.body,
                    username: req.body.username,
                    unique: unique
                });
            } catch (error) {
                res.status(400).send('Invalid request! Parameters mismatch.');
                return;
            }
            res.send('subscribe received');
        }
        if (currentProtocol == 5) {
            if (!req.body.username) {
                res.status(400).send('Invalid request! Parameter "username" mismatch.');
                return;
            }
            try {
                wsClient.send('ws.subscribe' + unique, {
                    msg: 'subscribe',
                    params: req.body,
                    username: req.body.username,
                    unique: unique
                });
            } catch (error) {
                res.status(400).send('Invalid request! Parameters mismatch.');
                return;
            }
            res.send('subscribe received');
        }
        //res.send('subscribe received');
    });

    app.post('/unsubscribe', function onUnsubscribe(req, res) {
        var unique = req.body.unique
        var currentProtocol = req.body.type.id;
        req.body.unique = unique;
        // if (!req.body.username || !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(req.body.username)) {
        if (currentProtocol == 1) {
            if (!req.body.username) {
                res.status(400).send('Invalid request! Parameter "username" mismatch.');
                return;
            }
            try {
                mqttClient.send('mqtt.unsubscribe' + unique, {
                    msg: 'subscribe',
                    params: Array.from(req.body.topics),
                    username: req.body.username,
                    unique: unique
                });
            } catch (error) {
                res.status(400).send('Invalid request! Parameters mismatch.');
                return;
            }
        }
        if (currentProtocol == 2) {
            if (!req.body.clientID) {
                res.status(400).send('Invalid request! Parameter "clientID" mismatch.');
                return;
            }
            try {
                snClient.send('sn.unsubscribe' + unique, {
                    msg: 'subscribe',
                    params: Array.from(req.body.topics),
                    clientID: req.body.clientID,
                    topic: req.body.topic,
                    unique: unique
                });
            } catch (error) {
                res.status(400).send('Invalid request! Parameters mismatch.');
                return;
            }
        }
        if (currentProtocol == 3) {
            if (!req.body.clientID) {
                res.status(400).send('Invalid request! Parameter "clientID" mismatch.');
                return;
            }
            try {
                coapClient.send('coap.unsubscribe' + unique, {
                    msg: 'unsubscribe',
                    params: Array.from(req.body.topics),
                    clientID: req.body.clientID,
                    topic: req.body.topic,
                    unique: unique
                });
            } catch (error) {
                res.status(400).send('Invalid request! Parameters mismatch.');
                return;
            }
        }
        if (currentProtocol == 4) {
            if (!req.body.username) {
                res.status(400).send('Invalid request! Parameter "username" mismatch.');
                return;
            }
            try {
                amqpClient.send('amqp.unsubscribe' + unique, {
                    msg: 'subscribe',
                    params: req.body.topic,
                    username: req.body.username,
                    unique: unique
                });
            } catch (error) {
                res.status(400).send('Invalid request! Parameters mismatch.');
                return;
            }
        }
        if (currentProtocol == 5) {
            if (!req.body.username) {
                res.status(400).send('Invalid request! Parameter "username" mismatch.');
                return;
            }
            try {
                wsClient.send('ws.unsubscribe' + unique, {
                    msg: 'subscribe',
                    params: Array.from(req.body.topics),
                    username: req.body.username,
                    unique: unique
                });
            } catch (error) {
                res.status(400).send('Invalid request! Parameters mismatch.');
                return;
            }
        }
        res.send('unsubscribe received');
    });
    app.post('/getmessages', function onGetMessages(req, res) {
        var currentProtocol = req.body.type.id;
        if (currentProtocol == 1) {
            mqttClient.getData({
                type: 'message',
                'message.direction': { $in: req.body.directions },
                // 'message.topic': { $in: req.body.topics },
                'message.connectionId': req.body.username,
                'message.clientID': req.body.clientID
            }, res);
        }
        if (currentProtocol == 2) {
            snClient.getData({
                type: 'snmessage',
                'message.connectionId': req.body.clientID
            }, res);
        }
        if (currentProtocol == 3) {
            coapClient.getData({
                type: 'coapmessage',
                'message.connectionId': req.body.clientID    
            }, res);
        }
        if (currentProtocol == 4) {
            amqpClient.getData({
                type: 'amqp.message',              
                'message.connectionId': req.body.username,
                'message.clientID': req.body.clientID
            }, res);
        }
        if (currentProtocol == 5) {
            wsClient.getData({
                type: 'wsmessage',
                'message.direction': { $in: req.body.directions },
                // 'message.topic': { $in: req.body.topics },
                'message.connectionId': req.body.username,
                'message.clientID': req.body.clientID
            }, res);
        }
    });
    app.post('/gettopics', function onGetMessages(req, res) {
        var currentProtocol = req.body.type.id;
        if (currentProtocol == 1) {
            mqttClient.getData({
                type: 'subscribtion',
                'subscribtion.connectionId': req.body.username,
                'subscribtion.clientID': req.body.clientID,
            }, res);
        }
        if (currentProtocol == 2) {
            snClient.getData({
                type: 'snsubscribtion',
                'subscribtion.connectionId': req.body.clientID
            }, res);
        }
        if (currentProtocol == 3) {
            coapClient.getData({
                type: 'coapsubscribtion',
                'subscribtion.connectionId': req.body.clientID
            }, res);
        }
        if (currentProtocol == 4) {
            amqpClient.getData({
                type: 'amqp.subscribtion',
                'subscribtion.connectionId': req.body.username,
                'subscribtion.clientID': req.body.clientID,
            }, res);
        }
        if (currentProtocol == 5) {
            wsClient.getData({
                type: 'wssubscribtion',
                'subscribtion.connectionId': req.body.username,
                'subscribtion.clientID': req.body.clientID,
            }, res);
        }

    });    
}
