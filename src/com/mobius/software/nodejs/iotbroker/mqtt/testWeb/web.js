'use strict'
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var guid = require('../client/lib/guid');
var bus = require('servicebus').bus();
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
// require('./testServer');


if (cluster.isMaster) {
    var exec = require('child_process').fork('./testWeb/testServer.js');
    var exec = require('child_process').fork('./testWeb/net.js');
    var worker = [];

    for (var i = 0; i < numCPUs; i++) {
        worker[i] = cluster.fork();
    }
} else {
    app.use(bodyParser.json());
    app.listen('8888', function() {
        console.log('app is running on port 8888');
    });

    // //sudo siege -c100 -t1M http://localhost:8888/test
    app.get('/test', function(req, res) {
        bus.send('mqtt.connect', {
            msg: 'connect',
            workerId: cluster.worker.id
        });
        res.send(cluster.worker.id.toString());
    });

    app.post('/connect', function onConnect(req, res) {
        var connectionParams = {
            type: 'connection',
            connection: {
                host: req.body.host,
                port: parseInt(req.body.port),
                username: req.body.username,
                password: req.body.password,
                clientID: req.body.clientID,
                isClean: JSON.parse(req.body.isClean),
                keepalive: parseInt(30),
            },
            id: guid()
        };

        if (!!req.body.will) {
            connectionParams.connection.will = {
                topic: req.body.will.topic,
                content: req.body.will.content,
                qos: parseInt(req.body.will.qos),
                retain: JSON.parse(req.body.will.retain)
            }
        }
        bus.send('mqtt.connect', {
            msg: 'connect',
            params: connectionParams,
            // workerId: cluster.worker.id
        });

        res.send('connect received');
    });

    app.post('/disconnect', function onDisconnect(req, res) {
        bus.publish('mqtt.disconnect', {
            msg: 'disconnect',
            clientID: req.body.clientID,
            // workerId: cluster.worker.id
        });
        res.send('disconnected');
    });

    app.post('/publish', function onPublish(req, res) {
        var publishData = {
            topic: req.body.topic,
            qos: parseInt(req.body.qos),
            content: req.body.content,
            retain: JSON.parse(req.body.retain),
            isDupe: JSON.parse(req.body.isDupe)
        };

        bus.publish('mqtt.publish', {
            msg: 'publish',
            params: publishData,
            clientID: req.body.clientID,
        });

        res.send('publish received');
    });

    app.post('/subscribe', function onSubscribe(req, res) {
        bus.publish('mqtt.subscribe', {
            msg: 'subscribe',
            params: req.body,
            clientID: req.body.clientID,
        });
        res.send('subscribe received');
    });

    app.post('/unsubscribe', function onUnsubscribe(req, res) {
        bus.publish('mqtt.unsubscribe', {
            msg: 'subscribe',
            params: Array.from(req.body.topics),
            clientID: req.body.clientID,
        });

        res.send('unsubscribe received');
    });

}