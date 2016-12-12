"use strict";

var express = require('express');
var bodyParser = require('body-parser');
var mqtt = require('../client/mqtt');
var MQParser = require('../client/MQParser');
var guid = require('../client/lib/guid');
var net = require('net');
var Datastore = require('nedb');
var TOKENS = require('../client/lib/Tokens');
var TIMERS = require('../client/lib/Timers');
var Timer = require('../client/lib/Timer');
var bus = require('servicebus').bus();

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;


// if (!!cluster.worker)
//     console.log(cluster.worker.id);
var worker = [];
var connectionParams = {};

var Keys = function Keys() {
    var keys = [];
    var index = 0;
    var count = 0;
    this.getKey = function() {
        var i = index % count;
        index++;
        return keys[i];
    }
    this.setKeys = function(data) {
        keys = Object.keys(data);
        count = keys.length;
    }
}

var connections = {};
var timers = {};
var tokens = {};
var db = new Datastore({ filename: 'mqttData' });
db.loadDatabase();
if (cluster.isMaster) {
    // Fork workers.
    for (var i = 0; i < numCPUs; i++) {
        worker[i] = cluster.fork();
    }
    // var keys = Object.keys(cluster.workers);
    // console.log(typeof keys);
    // var keySet = new Keys();
    // keySet.setKeys(cluster.workers);
    // cluster.on('message', function(worker, msg) {
    //     // console.log(msg);
    //     if (msg.msg == 'connect') {
    //         if (typeof connections[msg.params.connection.clientID] == 'undefined') {
    //             var socket = net.createConnection(msg.params.connection.port, msg.params.connection.host);
    //             socket.clientID = msg.params.connection.clientID;
    //             socket.connection = msg.params.connection;

    //             socket.on('data', function onDataReceived(data) {
    //                 cluster.workers[keySet.getKey()].send({
    //                     msg: 'dataReceived',
    //                     payload: data,
    //                     clientID: this.clientID
    //                 });
    //             });

    //             connections[msg.params.connection.clientID] = socket;
    //             cluster.workers[msg.workerId].send(msg);
    //             timers[msg.params.connection.clientID] = new TIMERS();
    //             tokens[msg.params.connection.clientID] = new TOKENS();
    //             db.remove({ 'type': 'connection', 'connection.clientID': msg.params.connection.clientID }, { multi: true });
    //             db.insert(msg.params);
    //         } else {
    //             // cluster.workers[msg.workerId].send(msg);
    //         }
    //     }
    //     if (msg.msg == 'connack') {
    //         timers[msg.clientID].releaseTimer(0);
    //     }
    //     if (msg.msg == 'sendData') {
    //         // console.log(msg);
    //         var newTimer = Timer({
    //             callback: function() {
    //                 connections[msg.clientID].write(Buffer.from(msg.payload));
    //             },
    //             interval: connections[msg.clientID].connection.keepalive * 1000
    //         })
    //         if (msg.parentEvent == 'mqttConnect')
    //             timers[msg.clientID].setTimer(0, newTimer);
    //         else {
    //             var t = tokens.getToken();
    //             timers[msg.clientID].setTimer(t, newTimer);
    //         }

    //         connections[msg.clientID].write(Buffer.from(msg.payload));
    //     }
    // });
    cluster.on('exit', function(worker, code, signal) {
        console.log(`worker ${worker.process.pid} died`);
    });
} else {
    // var CLIENT = new mqtt();
    var CLIENT = {};

    console.log('MQTT sub worker runned id:', cluster.worker.id);


    // CLIENT[msg.params.connection.clientID].on('publish', function onPublishReceived(data) {
    //     // console.log('Publish data:', data);
    //     if (!data)
    //         return;
    //     var inMessage = {
    //         type: 'message',
    //         message: {
    //             topic: data.topic,
    //             qos: data.qos,
    //             content: data.content,
    //             connectionId: connectionParams.id,
    //             direction: 'in'
    //         },
    //         id: guid(),
    //     }
    //     db.insert(inMessage);
    //     // console.log('Publish event ClusterWorkerID', cluster.worker.id);
    // })

    // app.post('/connect', function onConnect(req, res) {
    //     // console.log(cluster.worker);
    //     connectionParams = {
    //         type: 'connection',
    //         connection: {
    //             host: req.body.host,
    //             port: parseInt(req.body.port),
    //             username: req.body.username,
    //             password: req.body.password,
    //             clientID: req.body.clientID,
    //             isClean: JSON.parse(req.body.isClean),
    //             keepalive: parseInt(30),
    //         },
    //         id: guid()
    //     };

    //     if (!!req.body.will) {
    //         connectionParams.connection.will = {
    //             topic: req.body.will.topic,
    //             content: req.body.will.content,
    //             qos: parseInt(req.body.will.qos),
    //             retain: JSON.parse(req.body.will.retain)
    //         }
    //     }
    //     process.send({
    //         msg: 'connect',
    //         params: connectionParams,
    //         workerId: cluster.worker.id
    //     });
    //     res.send('connect received');

    // });

    // app.post('/disconnect', function onDisconnect(req, res) {
    //     CLIENT[msg.params.connection.clientID].once('disconnected', function() {
    //         res.send('disconnected');
    //     });
    //     db.remove({ type: 'connection' }, { multi: true });
    //     CLIENT.Disconnect();
    // });

    // app.post('/subscribe', function onSubscribe(req, res) {
    //     // console.log('Subscribe ClusterWorkerID', cluster.worker.id);
    //     var remove = [];
    //     var subscribtions = [];
    //     for (var i = 0; i < req.body.topics.length; i++) {
    //         var subscribeData = {
    //             type: 'subscribtion',
    //             subscribtion: {
    //                 topic: req.body.topics[i].topic,
    //                 qos: req.body.topics[i].qos,
    //                 connectionId: connectionParams.id,
    //             },
    //         }
    //         subscribtions.push(subscribeData);
    //         db.remove({ 'type': 'subscribtion', 'subscribtion.topic': req.body.topics[i].topic }, { multi: true });
    //     }
    //     db.insert(subscribtions);

    //     CLIENT.Subscribe({
    //         topics: req.body.topics,
    //     });
    //     CLIENT[msg.params.connection.clientID].once('suback', function() {
    //         res.send('subscribed');
    //     });
    // });

    // app.post('/Unsubscribe', function onUnsubscribe(req, res) {
    //     console.log(req.body);
    //     CLIENT.Unsubscribe({
    //         topics: Array.from(req.body.topics),
    //     });
    //     for (var i = 0; i < req.body.topics.length; i++) {
    //         db.remove({ 'type': 'subscribtion', 'subscribtion.topic': req.body.topics[i] }, { multi: true });
    //     }

    //     CLIENT[msg.params.connection.clientID].once('unsuback', function() {
    //         res.send('Unsubscribed');
    //     });
    // });

    // app.post('/publish', function onPublish(req, res) {
    //     // console.log('body:', req.body);
    //     var publishData = {
    //         topic: req.body.topic,
    //         qos: parseInt(req.body.qos),
    //         content: req.body.content,
    //         retain: JSON.parse(req.body.retain),
    //         isDupe: JSON.parse(req.body.isDupe)
    //     };

    //     CLIENT[msg.params.connection.clientID].once('puback', function(data) {
    //         var outMessage = {
    //             type: 'message',
    //             message: {
    //                 topic: data.topic,
    //                 qos: data.qos,
    //                 content: data.content,
    //                 connectionId: connectionParams.id,
    //                 direction: 'out'
    //             },
    //             id: guid(),
    //         }
    //         db.insert(outMessage);
    //         res.send('published');
    //     });
    //     CLIENT[msg.params.connection.clientID].once('pubcomp', function(data) {
    //         var outMessage = {
    //             type: 'message',
    //             message: {
    //                 topic: data.topic,
    //                 qos: data.qos,
    //                 content: data.content,
    //                 connectionId: connectionParams.id,
    //                 direction: 'out'
    //             },
    //             id: guid(),
    //         }
    //         db.insert(outMessage);
    //         res.send('published');
    //     });
    //     if (publishData.qos === 0) {
    //         var outMessage = {
    //             type: 'message',
    //             message: {
    //                 topic: publishData.topic,
    //                 qos: publishData.qos,
    //                 content: publishData.content,
    //                 connectionId: connectionParams.id,
    //                 direction: 'out'
    //             },
    //             id: guid(),
    //         }
    //         db.insert(outMessage);
    //         res.send('published');
    //     }
    //     CLIENT.Publish(publishData)
    // })
    var tokens = {};
    var pingTimeout = {};

    bus.listen('mqtt.connect', function(msg) {
        // process.send(msg);
        bus.send('net.newSocket', msg);
        console.log('inner worker id:', cluster.worker.id);
    });

    bus.subscribe('mqtt.disconnect', function(msg) {
        if (typeof CLIENT[msg.clientID] == 'undefined') return;

        CLIENT[msg.clientID].id = msg.clientID;
        db.remove({ 'type': 'connection', 'connection.clientID': msg.clientID }, { multi: true });
        CLIENT[msg.clientID].Disconnect();
    });

    bus.subscribe('mqtt.publish', function(msg) {
        // console.log(msg);
        if (typeof CLIENT[msg.clientID] == 'undefined') return;
        if (msg.params.qos != 0)
            msg.params.token = tokens[msg.clientID].getToken();

        CLIENT[msg.clientID].id = msg.clientID;
        CLIENT[msg.clientID].Publish(msg.params);
    });

    bus.subscribe('mqtt.subscribe', function(msg) {
        if (typeof CLIENT[msg.clientID] == 'undefined') return;
        // console.log(msg);
        msg.params.token = tokens[msg.clientID].getToken();

        CLIENT[msg.clientID].Subscribe(msg.params);
    });

    bus.subscribe('mqtt.unsubscribe', function(msg) {
        if (typeof CLIENT[msg.clientID] == 'undefined') return;
        console.log(msg);
        msg.params.token = tokens[msg.clientID].getToken();
        CLIENT[msg.clientID].Unsubscribe(msg.params);
    });

    bus.listen('mqtt.socketOpened', function(msg) {

        CLIENT[msg.params.connection.clientID] = new mqtt();
        CLIENT[msg.params.connection.clientID].id = msg.params.connection.clientID;
        tokens[msg.params.connection.clientID] = new TOKENS();


        // console.log('socketOpened');
        CLIENT[msg.params.connection.clientID].on('mqttConnect', function(data) {
            // console.log('data:', data);
            bus.publish('net.sendData', {
                payload: data,
                clientID: this.id,
                packetID: 0,
                parentEvent: 'mqttConnect'
            });
        });
        CLIENT[msg.params.connection.clientID].on('mqttDisconnect', function(data) {
            bus.publish('net.sendData', {
                payload: data,
                clientID: this.id,
                packetID: 0,
                parentEvent: 'mqttDisconnect'
            });
            bus.publish('net.done', {
                packetID: 0,
                clientID: this.id,
                parentEvent: 'mqttDisconnect'
            });
            delete CLIENT[this.id];
            delete tokens[this.id];
        });

        CLIENT[msg.params.connection.clientID].on('mqttConnack', function(data) {
            bus.publish('net.done', {
                packetID: data.getPacketID(),
                clientID: this.id,
                parentEvent: 'mqttConnect'
            });
            CLIENT[this.id].Ping();
        });

        CLIENT[msg.params.connection.clientID].on('mqttPing', function(data) {
            bus.publish('net.sendData', {
                payload: data,
                clientID: this.id,
                packetID: 0,
                parentEvent: 'mqttPing'
            });
            pingTimeout = setTimeout(function() {
                bus.publish('mqtt.disconnect', {
                    msg: 'disconnect',
                    clientID: this.id,
                    // workerId: cluster.worker.id
                });
            }, msg.params.connection.keepalive * 2 * 1000);
        });

        CLIENT[msg.params.connection.clientID].on('mqttPubrec', function(packetID) {
            bus.publish('net.done', {
                packetID: packetID,
                clientID: this.id,
                parentEvent: 'mqttPubrec'
            });
        });

        CLIENT[msg.params.connection.clientID].on('mqttPublish', function(data, msg, packetID) {
            bus.publish('net.sendData', {
                payload: data,
                clientID: this.id,
                packetID: packetID,
                parentEvent: 'mqttPublish'
            });
            bus.publish('net.done', {
                packetID: packetID,
                clientID: this.id,
                parentEvent: 'mqttPublish'
            });
            if (msg.qos == 0) {
                var outMessage = {
                    type: 'message',
                    message: {
                        topic: msg.topic,
                        qos: msg.qos,
                        content: msg.content,
                        connectionId: this.id,
                        direction: 'out'
                    },
                    id: guid(),
                }
                db.insert(outMessage);
            }
        });

        CLIENT[msg.params.connection.clientID].on('mqttPubrel', function(data, packetID) {
            bus.publish('net.sendData', {
                payload: data,
                clientID: this.id,
                packetID: packetID,
                parentEvent: 'mqttPubrel'
            });
        });

        CLIENT[msg.params.connection.clientID].on('mqttPuback', function(data, msg) {
            // console.log(data, msg)
            bus.publish('net.done', {
                packetID: data.getPacketID(),
                clientID: this.id,
                parentEvent: 'mqttPuback'
            });
            tokens[this.id].releaseToken(data.getPacketID());
            var outMessage = {
                type: 'message',
                message: {
                    topic: msg.topic,
                    qos: msg.qos,
                    content: msg.content,
                    connectionId: this.id,
                    direction: 'out'
                },
                id: guid(),
            }
            db.insert(outMessage);
        });

        CLIENT[msg.params.connection.clientID].on('mqttPubcomp', function(data, msg) {
            // console.log('pubcomp:', msg)
            bus.publish('net.done', {
                packetID: data.getPacketID(),
                clientID: this.id,
                parentEvent: 'mqttPubcomp'
            });
            tokens[this.id].releaseToken(data.getPacketID());
            var outMessage = {
                type: 'message',
                message: {
                    topic: msg.topic,
                    qos: msg.qos,
                    content: msg.content,
                    connectionId: this.id,
                    direction: 'out'
                },
                id: guid(),
            }
            db.insert(outMessage);
        });

        CLIENT[msg.params.connection.clientID].on('mqttSubscribe', function(data, packetID) {
            bus.publish('net.sendData', {
                payload: data,
                clientID: this.id,
                packetID: packetID,
                parentEvent: 'mqttSubscribe'
            });
        });

        CLIENT[msg.params.connection.clientID].on('mqttSuback', function(data, msg) {
            // console.log('mqttSuback:', msg);
            bus.publish('net.done', {
                packetID: data.getPacketID(),
                clientID: this.id,
                parentEvent: 'mqttSuback'
            });
            tokens[this.id].releaseToken(data.getPacketID());
            var subscribtions = [];
            for (var i = 0; i < msg.topics.length; i++) {
                var subscribeData = {
                    type: 'subscribtion',
                    subscribtion: {
                        topic: msg.topics[i].topic,
                        qos: msg.topics[i].qos,
                        connectionId: msg.clientID,
                    },
                }
                subscribtions.push(subscribeData);
                db.remove({ 'type': 'subscribtion', 'subscribtion.topic': msg.topics[i].topic }, { multi: true });
            }
            // console.log(subscribtions);
            db.insert(subscribtions);
        });

        CLIENT[msg.params.connection.clientID].on('mqttUnsubscribe', function(data, packetID) {
            bus.publish('net.sendData', {
                payload: data,
                clientID: this.id,
                packetID: packetID,
                parentEvent: 'mqttUnsubscribe'
            });
        });

        CLIENT[msg.params.connection.clientID].on('mqttUnsuback', function(data, msg) {
            // console.log('mqttSuback:', msg);
            bus.publish('net.done', {
                packetID: data.getPacketID(),
                clientID: this.id,
                parentEvent: 'mqttUnsuback'
            });
            tokens[this.id].releaseToken(data.getPacketID());
            for (var i = 0; i < msg.length; i++) {
                db.remove({ 'type': 'subscribtion', 'subscribtion.topic': msg[i] }, { multi: true });
            }
        });

        CLIENT[msg.params.connection.clientID].on('mqttPublishIn', function(data) {
            if (!data) return;
            // console.log('mqttSuback:', msg);
            // bus.publish('net.done', {
            //     packetID: data.packetID,
            //     clientID: this.id,
            //     parentEvent: 'mqttUnsuback'
            // });
            var inMessage = {
                type: 'message',
                message: {
                    topic: data.topic,
                    qos: data.qos,
                    content: data.content,
                    connectionId: this.id,
                    direction: 'in'
                },
                id: guid(),
            }
            db.insert(inMessage);
        });

        CLIENT[msg.params.connection.clientID].on('mqttPubackOut', function(data, msg) {
            if (!data) return;
            console.log('mqttPubackOut:', msg);
            bus.publish('net.sendData', {
                payload: data,
                clientID: this.id,
                packetID: msg.packetID,
                parentEvent: 'mqttPubackOut'
            });
            var inMessage = {
                type: 'message',
                message: {
                    topic: msg.topic,
                    qos: msg.qos,
                    content: msg.content,
                    connectionId: this.id,
                    direction: 'in'
                },
                id: guid(),
            }
            db.insert(inMessage);
        });

        CLIENT[msg.params.connection.clientID].on('mqttPubrecOut', function(data, msg) {
            if (!data) return;
            // console.log('mqttPubrecOut:', msg);
            bus.publish('net.sendData', {
                payload: data,
                clientID: this.id,
                packetID: msg.packetID,
                parentEvent: 'mqttPubrecOut'
            });

        });

        CLIENT[msg.params.connection.clientID].on('mqttPubcompOut', function(data, msg) {
            if (!data) return;
            // console.log('mqttPubcompOut:', msg);
            bus.publish('net.sendData', {
                payload: data,
                clientID: this.id,
                packetID: msg.packetID,
                parentEvent: 'mqttPubcompOut'
            });
            var inMessage = {
                type: 'message',
                message: {
                    topic: msg.topic,
                    qos: msg.qos,
                    content: msg.content,
                    connectionId: this.id,
                    direction: 'in'
                },
                id: guid(),
            }
            db.insert(inMessage);
        });

        CLIENT[msg.params.connection.clientID].on('mqttPingResp', function() {
            // bus.publish('net.sendData', {
            //     payload: data,
            //     clientID: this.id,
            //     packetID: 0,
            //     parentEvent: 'mqttPingResp'
            // });
            // console.log('pingTimeout:', pingTimeout);
            clearTimeout(pingTimeout);
            pingTimeout = setTimeout(function() {
                bus.publish('mqtt.disconnect', {
                    msg: 'disconnect',
                    clientID: this.id,
                    // workerId: cluster.worker.id
                });
            }, msg.params.connection.keepalive * 2 * 1000);
        });

        CLIENT[msg.params.connection.clientID].Connect(msg.params.connection);
    });

    bus.subscribe('mqtt.dataReceived', function(msg) {
        if (typeof CLIENT[msg.clientID] == 'undefined') return;
        // console.log(msg)

        CLIENT[msg.clientID].id = msg.clientID;
        CLIENT[msg.clientID].onDataRecieved(Buffer.from(msg.payload));
    });


    // process.on('message', function(msg) {
    // if (msg.msg == 'connect') {
    //     console.log('message from master to:', cluster.worker.id);
    //     CLIENT[msg.params.connection.clientID].id = msg.params.connection.clientID;
    //     CLIENT.Connect(msg.params.connection);
    // }
    // if (msg.msg == 'dataReceived') {
    //     console.log('message from master to:', cluster.worker.id);
    //     CLIENT[msg.params.connection.clientID].id = msg.clientID;
    //     CLIENT[msg.params.connection.clientID].onDataRecieved(Buffer.from(msg.payload));
    //     db.insert(msg);
    // }
    // });
}

// module.exports = this;