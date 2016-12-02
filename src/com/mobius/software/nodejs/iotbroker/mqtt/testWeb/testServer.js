"use strict";

var express = require('express');
var bodyParser = require('body-parser');
var mqtt = require('../client/mqtt');
var MQParser = require('../client/MQParser');
var net = require('net');
var Datastore = require('nedb');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

// if (!!cluster.worker)
//     console.log(cluster.worker.id);
var worker = [];
cluster.on('message', function(worker, msg) {
    if (msg.msg == 'connect') {
        console.log('cluster socket event received');
        Object.keys(cluster.workers).forEach(function(id) {
            cluster.workers[id].send(msg);
        });
    }
});

if (cluster.isMaster) {
    // Fork workers.
    for (var i = 0; i < numCPUs; i++) {
        worker[i] = cluster.fork();
    }

    cluster.on('exit', function(worker, code, signal) {
        console.log(`worker ${worker.process.pid} died`);
    });
} else {
    var db = new Datastore({ filename: 'mqttData' });
    var app = express();
    app.use(bodyParser.json());
    process.on('message', function(msg) {
        if (msg.msg == 'connect') {
            CLIENT.NewSocket({
                host: '172.21.0.252',
                port: 1883,
                id: cluster.worker.id
            });
            // console.log('message from master to:', cluster.worker.id);
        }
    });

    app.listen('8888', function() {
        console.log('app is running on port 8888');
    });

    var CLIENT = new mqtt();

    app.get('/test', function(req, res) {
        // console.log(cluster.worker.id);
        res.send(cluster.worker.id.toString());
    });

    // CLIENT.on('ping', function() {
    //     db.loadDatabase();
    //     db.find({ type: 'state' }, function(err, docs) {
    //         console.log(cluster.worker.id.toString());
    //         db.remove({ type: 'state' }, {});
    //         db.insert({
    //             type: 'state',
    //             state: 'ok'
    //         });
    //     });
    //     console.log('ping event emitted');
    // });

    CLIENT.on('publish', function onPublisReceived() {
        console.log('Publish event ClusterWorkerID', cluster.worker.id);
    })

    app.post('/connect', function onConnect(req, res) {
        process.send({ msg: 'connect' });
        db.loadDatabase();

        CLIENT.on('connected', function() {
            res.send('Connected');
        });

        db.insert({
            type: 'connection',
            connection: {
                host: '172.21.0.252',
                port: 1883,
                username: "firstTestAccount@foo.bar",
                password: "firstTestAccountPassword",
                clientID: "_123456780",
                isClean: true,
                keepalive: 30,
                will: {
                    topic: "lookup",
                    content: "John: i'll be back",
                    qos: CLIENT.ENUM.QoS.AT_LEAST_ONCE,
                    retain: true
                }
            }
        });
        db.find({ type: 'connection' }, function(err, docs) {
            // console.log(cluster.worker.id);
            // console.log(cluster.worker.id, docs[docs.length - 1].connection);
            // res.send(docs);
            db.remove({ type: 'connection' }, {});
        });
        // console.log(CLIENT);
        var connect = CLIENT.Connect({
            host: '172.21.0.252',
            port: 1883,
            username: "firstTestAccount@foo.bar",
            password: "firstTestAccountPassword",
            clientID: "_123456780",
            isClean: true,
            keepalive: 10,
            will: {
                topic: "lookup",
                content: "John: i'll be back",
                qos: CLIENT.ENUM.QoS.AT_LEAST_ONCE,
                retain: true
            }
        });
    });

    app.post('/disconnect', function onDisconnect(req, res) {
        CLIENT.once('disconnect', function() {
            CLIENT.removeAllListeners();
            res.send('disconnect received');
        });
        CLIENT.Disconnect();
    });

    app.post('/subscribe', function onSubscribe(req, res) {
        console.log('Subscribe ClusterWorkerID', cluster.worker.id);

        console.log(req.body.topics);
        CLIENT.Subscribe({
            topics: req.body.topics,
        });
        CLIENT.once('suback', function() {
            res.send('suback received');
        });
    });


    app.post('/unsubscribe', function onSubscribe(req, res) {
        console.log(req.body);
        CLIENT.Unsubscribe({
            topics: Array.from(req.body.topics),
        });
        CLIENT.once('unsuback', function() {
            CLIENT.removeAllListeners();
            res.send('unsuback received');
        });
    });

    app.post('/publish', function onPublish(req, res) {
        // console.log('body:', req.body);
        CLIENT.once('pubrec', function() {
            CLIENT.removeAllListeners();
            res.send('pubrec received');
        });
        CLIENT.once('puback', function() {
            CLIENT.removeAllListeners();
            res.send('puback received');
        });
        CLIENT.once('pubcomp', function() {
            CLIENT.removeAllListeners();
            res.send('pubcomp received');
        });

        CLIENT.Publish({
            topic: req.body.topic,
            qos: parseInt(req.body.qos),
            content: req.body.content,
            retain: JSON.parse(req.body.retain),
            isDupe: JSON.parse(req.body.isDupe)
        })
    })

    // app.listen('8888', function() {
    //     console.log('app is running on port 8888');
    // })
}