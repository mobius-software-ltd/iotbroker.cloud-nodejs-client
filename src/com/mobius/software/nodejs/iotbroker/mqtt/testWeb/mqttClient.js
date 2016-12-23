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

"use strict";
var args = process.argv.slice(2);
var NET = require('./net.js');
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
const numCPUs = args[0] || require('os').cpus().length;

var connectionParams = {};
var worker = [];;
if (cluster.isMaster) {
    if (!module.parent) {
        for (var i = 0; i < numCPUs; i++) {
            worker[i] = cluster.fork();
        }
    }
    cluster.on('exit', function(worker, code, signal) {
        console.log(`worker ${worker.process.pid} died`);
    });
} else {
    var connections = {};
    var timers = {};
    var tokens = {};
    var db = new Datastore({ filename: 'mqttData' });
    var CLIENT = {};
    var tokens = {};
    var pingTimeout = {};

    setTimeout(function() {

        bus.listen('mqtt.connect', function(msg) {
            bus.send('net.newSocket', msg);
            db.loadDatabase();
            db.remove({ 'type': 'connection', 'connection.username': msg.params.connection.username }, { multi: true });
            db.insert(msg.params);
        });

        bus.subscribe('mqtt.disconnect', function(msg) {
            if (typeof CLIENT[msg.username] == 'undefined') return;
            CLIENT[msg.username].id = msg.username;
            db.loadDatabase();
            db.remove({ 'type': 'connection', 'connection.username': msg.username }, { multi: true });
            CLIENT[msg.username].Disconnect();
        });

        bus.subscribe('mqtt.publish', function(msg) {
            if (typeof CLIENT[msg.username] == 'undefined') return;
            if (msg.params.qos != 0)
                msg.params.token = tokens[msg.username].getToken();

            CLIENT[msg.username].id = msg.username;
            CLIENT[msg.username].Publish(msg.params);
        });

        bus.subscribe('mqtt.subscribe', function(msg) {
            if (typeof CLIENT[msg.username] == 'undefined') return;
            msg.params.token = tokens[msg.username].getToken();
            CLIENT[msg.username].Subscribe(msg.params);
        });

        bus.subscribe('mqtt.unsubscribe', function(msg) {
            if (typeof CLIENT[msg.username] == 'undefined') return;
            msg.params.token = tokens[msg.username].getToken();
            CLIENT[msg.username].Unsubscribe(msg.params);
        });

        bus.listen('mqtt.socketOpened', function(msg) {
            CLIENT[msg.params.connection.username] = new mqtt();
            CLIENT[msg.params.connection.username].id = msg.params.connection.username;
            tokens[msg.params.connection.username] = new TOKENS();

            CLIENT[msg.params.connection.username].on('mqttConnect', function(data) {
                bus.publish('net.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: 0,
                    parentEvent: 'mqttConnect'
                });
            });

            CLIENT[msg.params.connection.username].on('mqttDisconnect', function(data) {
                bus.publish('net.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: 0,
                    parentEvent: 'mqttDisconnect'
                });
                bus.publish('net.done', {
                    packetID: 0,
                    username: this.id,
                    parentEvent: 'mqttDisconnect'
                });
                delete CLIENT[this.id];
                delete tokens[this.id];
            });

            CLIENT[msg.params.connection.username].on('mqttConnack', function(data) {
                var that = this;
                bus.publish('net.done', {
                    packetID: data.getPacketID(),
                    username: this.id,
                    parentEvent: 'mqttConnack'
                });
                db.loadDatabase();
                if (data.getReturnCode() == 'ACCEPTED') {
                    db.remove({ type: 'connack' }, { multi: true }, function(err, docs) {
                        db.insert({
                            type: 'connack',
                            connectionId: that.id,
                            id: guid()
                        });
                    });
                    // bus.send
                    CLIENT[this.id].Ping();
                } else {
                    db.remove({ type: 'connack' }, { multi: true }, function(err, docs) {

                    });
                }
            });

            CLIENT[msg.params.connection.username].on('mqttPing', function(data) {
                bus.publish('net.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: 0,
                    parentEvent: 'mqttPing'
                });
                pingTimeout = setTimeout(function() {
                    bus.publish('mqtt.disconnect', {
                        msg: 'disconnect',
                        username: this.id,
                    });
                }, msg.params.connection.keepalive * 2 * 1000);
            });

            CLIENT[msg.params.connection.username].on('mqttPubrec', function(packetID) {
                bus.publish('net.done', {
                    packetID: packetID,
                    username: this.id,
                    parentEvent: 'mqttPubrec'
                });
            });

            CLIENT[msg.params.connection.username].on('mqttPublish', function(data, msg, packetID) {
                bus.publish('net.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: packetID,
                    parentEvent: 'mqttPublish'
                });
                bus.publish('net.done', {
                    packetID: packetID,
                    username: this.id,
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
                        time: (new Date()).getTime()
                    }
                    db.loadDatabase();

                    db.insert(outMessage);
                }
            });

            CLIENT[msg.params.connection.username].on('mqttPubrel', function(data, packetID) {
                bus.publish('net.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: packetID,
                    parentEvent: 'mqttPubrel'
                });
            });

            CLIENT[msg.params.connection.username].on('mqttPuback', function(data, msg) {
                bus.publish('net.done', {
                    packetID: data.getPacketID(),
                    username: this.id,
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
                    time: (new Date()).getTime()
                }

                db.loadDatabase();
                db.insert(outMessage);
            });

            CLIENT[msg.params.connection.username].on('mqttPubcomp', function(data, msg) {
                bus.publish('net.done', {
                    packetID: data.getPacketID(),
                    username: this.id,
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
                    time: (new Date()).getTime()
                }

                db.loadDatabase();
                db.insert(outMessage);
            });

            CLIENT[msg.params.connection.username].on('mqttSubscribe', function(data, packetID) {
                bus.publish('net.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: packetID,
                    parentEvent: 'mqttSubscribe'
                });
            });

            CLIENT[msg.params.connection.username].on('mqttSuback', function(data, msg) {
                bus.publish('net.done', {
                    packetID: data.getPacketID(),
                    username: this.id,
                    parentEvent: 'mqttSuback'
                });
                tokens[this.id].releaseToken(data.getPacketID());
                var subscribtions = [];

                db.loadDatabase();
                for (var i = 0; i < msg.topics.length; i++) {
                    var subscribeData = {
                        type: 'subscribtion',
                        subscribtion: {
                            topic: msg.topics[i].topic,
                            qos: msg.topics[i].qos,
                            connectionId: msg.username,
                        },
                    }
                    subscribtions.push(subscribeData);
                    db.remove({ 'type': 'subscribtion', 'subscribtion.topic': msg.topics[i].topic }, { multi: true });
                }
                db.insert(subscribtions);
            });

            CLIENT[msg.params.connection.username].on('mqttUnsubscribe', function(data, packetID) {
                bus.publish('net.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: packetID,
                    parentEvent: 'mqttUnsubscribe'
                });
            });

            CLIENT[msg.params.connection.username].on('mqttUnsuback', function(data, msg) {
                bus.publish('net.done', {
                    packetID: data.getPacketID(),
                    username: this.id,
                    parentEvent: 'mqttUnsuback'
                });

                db.loadDatabase();
                tokens[this.id].releaseToken(data.getPacketID());
                for (var i = 0; i < msg.length; i++) {
                    db.remove({ 'type': 'subscribtion', 'subscribtion.topic': msg[i] }, { multi: true });
                }
            });

            CLIENT[msg.params.connection.username].on('mqttPublishIn', function(data) {
                if (!data) return;
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
                    time: (new Date()).getTime()
                }

                db.loadDatabase();
                db.insert(inMessage);
            });

            CLIENT[msg.params.connection.username].on('mqttPubackOut', function(data, msg) {
                if (!data) return;
                bus.publish('net.sendData', {
                    payload: data,
                    username: this.id,
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
                    time: (new Date()).getTime()
                }

                db.loadDatabase();
                db.insert(inMessage);
            });

            CLIENT[msg.params.connection.username].on('mqttPubrecOut', function(data, msg) {
                if (!data) return;
                bus.publish('net.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: msg.packetID,
                    parentEvent: 'mqttPubrecOut'
                });
            });

            CLIENT[msg.params.connection.username].on('mqttPubcompOut', function(data, msg) {
                if (!data) return;
                bus.publish('net.sendData', {
                    payload: data,
                    username: this.id,
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
                    time: (new Date()).getTime()
                }

                db.loadDatabase();
                db.insert(inMessage);
            });

            CLIENT[msg.params.connection.username].on('mqttPingResp', function() {
                clearTimeout(pingTimeout);
                pingTimeout = setTimeout(function() {
                    bus.publish('mqtt.disconnect', {
                        msg: 'disconnect',
                        username: this.id,
                    });
                }, msg.params.connection.keepalive * 2 * 1000);
            });

            CLIENT[msg.params.connection.username].Connect(msg.params.connection);
        });

        bus.subscribe('mqtt.dataReceived', function(msg) {
            if (typeof CLIENT[msg.username] == 'undefined') return;

            CLIENT[msg.username].id = msg.username;
            CLIENT[msg.username].onDataRecieved(Buffer.from(msg.payload));
        });

    }, 100 * cluster.worker.id);
}

function send(a, b) {
    bus.send(a, b);
}

function publish(a, b) {
    bus.publish(a, b);
}

function getData(req, res) {
    db.loadDatabase();
    db.find(req, function(err, docs) {
        if (!!err)
            res.send({ 'Error:': err });
        res.send(JSON.stringify(docs));
    });
}

var methods = {
    send: send,
    publish: publish,
    getData: getData
}

module.exports = methods;