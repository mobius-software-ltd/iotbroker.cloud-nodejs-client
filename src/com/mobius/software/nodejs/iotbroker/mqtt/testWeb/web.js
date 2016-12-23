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
var guid = require('../client/lib/guid');
var mqttClient = require('./mqttClient');

var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

app.use(bodyParser.json());
app.use(cors());
app.use(function(err, req, res, next) {
    res.status(500).send('Something broke!');
});

if (cluster.isMaster) {
    var worker = [];

    for (var i = 0; i < numCPUs; i++) {
        worker[i] = cluster.fork();
    }

    cluster.on('exit', function(deadWorker, code, signal) {
        var worker = cluster.fork();
    });
} else {
    app.listen('8888', function() {
        console.log('app is running on port 8888');
    });

    app.get('/test', function(req, res) {
        mqttClient.send('mqtt.connect', {
            msg: 'connect',
            workerId: cluster.worker.id
        });
        res.send(cluster.worker.id.toString());
    });

    app.post('/connect', function onConnect(req, res) {
        //VALIDATION
        if (!req.body.host || !/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(req.body.host)) {
            res.status(400).send('Invalid request! Parameter "host" mismatch.');
            return;
        }
        if (!req.body.port || !/^[1-9](\d?\d?\d?\d?)$/.test(req.body.port)) {
            res.status(400).send('Invalid request! Parameter "port" mismatch.');
            return;
        }
        if (!req.body.username || !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(req.body.username)) {
            res.status(400).send('Invalid request! Parameter "username" mismatch.');
            return;
        }
        if (!req.body.password) {
            res.status(400).send('Invalid request! Parameter "password" mismatch.');
            return;
        }
        if (!req.body.clientID) {
            res.status(400).send('Invalid request! Parameter "clientID" mismatch.');
            return;
        }
        if (typeof req.body.isClean == 'undefined') {
            res.status(400).send('Invalid request! Parameter "isClean" mismatch.');
            return;
        }
        if (!req.body.keepalive) {
            res.status(400).send('Invalid request! Parameter "keepalive" mismatch.');
            return;
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
                },
                id: guid()
            };
        } catch (error) {
            res.status(400).send('Invalid request! Parameters mismatch.');
            return;
        }
        if (!!req.body.will && Object.keys(req.body.will).length > 1) {
            if (!req.body.will.topic) {
                res.status(400).send('Invalid request! Parameter "topic" in "will" mismatch.');
                return;
            }
            if (!req.body.will.content) {
                res.status(400).send('Invalid request! Parameter "content" in "will" mismatch.');
                return;
            }
            if (!(req.body.will.qos >= 0 && req.body.will.qos < 3)) {
                res.status(400).send('Invalid request! Parameter "qos" in "will" mismatch.');
                return;
            }
            if (typeof req.body.will.retain == 'undefined') {
                res.status(400).send('Invalid request! Parameter "retain" in "will" mismatch.');
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
        mqttClient.send('mqtt.connect', {
            msg: 'connect',
            params: connectionParams,
        });

        var tryNum = 0;
        setTimeout(function() {
            mqttClient.getData({ type: 'connack', connectionId: req.body.username }, res);
        }, 500);
    });

    app.post('/disconnect', function onDisconnect(req, res) {
        if (!req.body.username || !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(req.body.username)) {
            res.status(400).send('Invalid request! Parameter "username" mismatch.');
            return;
        }
        mqttClient.publish('mqtt.disconnect', {
            msg: 'disconnect',
            username: req.body.username,
        });
        res.send('disconnected');
    });

    app.post('/publish', function onPublish(req, res) {
        if (!req.body.username || !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(req.body.username)) {
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
        if (!(req.body.qos >= 0 && req.body.qos < 3)) {
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
                isDupe: JSON.parse(req.body.isDupe)
            };
        } catch (error) {
            res.status(400).send('Invalid request! Parameters mismatch.');
            return;
        }

        mqttClient.publish('mqtt.publish', {
            msg: 'publish',
            params: publishData,
            username: req.body.username,
        });

        res.send('publish received');
    });

    app.post('/subscribe', function onSubscribe(req, res) {
        if (!req.body.username || !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(req.body.username)) {
            res.status(400).send('Invalid request! Parameter "username" mismatch.');
            return;
        }
        try {
            mqttClient.publish('mqtt.subscribe', {
                msg: 'subscribe',
                params: req.body,
                username: req.body.username,
            });
        } catch (error) {
            res.status(400).send('Invalid request! Parameters mismatch.');
            return;
        }
        res.send('subscribe received');
    });

    app.post('/unsubscribe', function onUnsubscribe(req, res) {
        if (!req.body.username || !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(req.body.username)) {
            res.status(400).send('Invalid request! Parameter "username" mismatch.');
            return;
        }
        try {
            mqttClient.publish('mqtt.unsubscribe', {
                msg: 'subscribe',
                params: Array.from(req.body.topics),
                username: req.body.username,
            });
        } catch (error) {
            res.status(400).send('Invalid request! Parameters mismatch.');
            return;
        }

        res.send('unsubscribe received');
    });
    app.post('/getmessages', function onGetMessages(req, res) {
        mqttClient.getData({
            type: 'message',
            'message.direction': { $in: req.body.directions },
            'message.topic': { $in: req.body.topics },
            'message.connectionId': req.body.username
        }, res);
    });
    app.post('/gettopics', function onGetMessages(req, res) {
        mqttClient.getData({
            type: 'subscribtion',
            'subscribtion.connectionId': req.body.username
        }, res);
    });
}