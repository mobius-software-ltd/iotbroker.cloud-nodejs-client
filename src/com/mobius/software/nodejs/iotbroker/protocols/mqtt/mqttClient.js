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
var NET = require('./net');
var express = require('express');
var bodyParser = require('body-parser');
var mqtt = require('./mqtt');
var MQParser = require('./MQParser');
var guid = require('./lib/guid');
var net = require('net');
var Datastore = require('nedb');
var TOKENS = require('./lib/Tokens');
var TIMERS = require('./lib/Timers');
var Timer = require('./lib/Timer');
var bus = require('servicebus').bus();

const cluster = require('cluster');
const numCPUs = args[0] || require('os').cpus().length;

var connectionParams = {};
var worker = [];
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
    var db = new Datastore({ filename: 'data' });
    var CLIENT = {};
    var tokens = {};
    var pingTimeout = {};
   
    setTimeout(function() {
      
        bus.listen('mqtt.connect', function(msg) {    
            bus.send('net.newSocket', msg);
            db.loadDatabase();
            db.remove({ 'type': 'connection', 'connection.username': msg.params.connection.username }, { multi: true });

            if(msg.params.connection.isClean) {
                db.remove({ 'type': 'subscribtion', 'subscribtion.connectionId': msg.params.connection.username, 'subscribtion.clientID': msg.params.connection.clientID }, { multi: true });
              //  db.remove({ 'type': 'message', 'message.connectionId': msg.params.connection.username, 'message.clientID': msg.params.connection.clientID }, { multi: true });
            }

            db.insert(msg.params);
        });

        bus.subscribe('mqtt.disconnect', function(msg) {
            if (typeof CLIENT[msg.unique] == 'undefined') return;
            CLIENT[msg.unique].id = msg.username;
            db.loadDatabase();
            db.remove({ 'type': 'connection', 'connection.username': msg.username }, { multi: true });
            CLIENT[msg.unique].Disconnect();
        });

        bus.subscribe('mqtt.publish', function(msg) {
            if (typeof CLIENT[msg.unique] == 'undefined') return;
            if (msg.params.qos != 0)
                msg.params.token = tokens[msg.unique].getToken();

            CLIENT[msg.unique].id = msg.username;
            CLIENT[msg.unique].Publish(msg.params);
        });

        bus.subscribe('mqtt.subscribe', function(msg) {
           if (typeof CLIENT[msg.unique] == 'undefined') return;
            msg.params.token = tokens[msg.unique].getToken();
            CLIENT[msg.unique].Subscribe(msg.params);
        });

        bus.subscribe('mqtt.unsubscribe', function(msg) {
            if (typeof CLIENT[msg.unique] == 'undefined') return;
            msg.params.token = tokens[msg.unique].getToken();
            CLIENT[msg.unique].Unsubscribe(msg.params);
        });

        bus.listen('mqtt.socketOpened', function(msg) {
            CLIENT[msg.params.connection.unique] = new mqtt();
            CLIENT[msg.params.connection.unique].id = msg.params.connection.username;
            CLIENT[msg.params.connection.unique].clientID = msg.params.connection.clientID;
            CLIENT[msg.params.connection.unique].unique = msg.params.connection.unique;
            tokens[msg.params.connection.unique] = new TOKENS();

            CLIENT[msg.params.connection.unique].on('mqttConnect', function(data) {
                bus.publish('net.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: 0,
                    parentEvent: 'mqttConnect',
                    unique: this.unique
                });
            });

            CLIENT[msg.params.connection.unique].on('mqttDisconnect', function(data) {
                bus.publish('net.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: 0,
                    parentEvent: 'mqttDisconnect',
                    unique: this.unique
                });
                bus.publish('net.done', {
                    packetID: 0,
                    username: this.id,
                    parentEvent: 'mqttDisconnect',
                    unique: this.unique
                });
                delete CLIENT[this.unique];
                delete tokens[this.unique];
            });

            CLIENT[msg.params.connection.unique].on('mqttConnack', function(data) {              
                var that = this;
                bus.publish('net.done', {
                    packetID: data.getPacketID(),
                    username: this.id,
                    parentEvent: 'mqttConnack',
                    unique: this.unique
                });               
                db.loadDatabase();
                if (data.getReturnCode() == 'ACCEPTED') {
                    db.remove({ type: 'connack' }, { multi: true }, function(err, docs) {
                        db.insert({
                            type: 'connack',
                            connectionId: that.id,
                            unique: that.unique,
                            id: guid()
                        });
                    });
                    // bus.send
                    CLIENT[this.unique].Ping();
                } else {
                    db.remove({ type: 'connack' }, { multi: true }, function(err, docs) {

                    });
                }
            });

            CLIENT[msg.params.connection.unique].on('mqttPing', function(data) {
               

                bus.publish('net.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: 0,
                    parentEvent: 'mqttPing',
                    unique: this.unique
                });
                pingTimeout = setTimeout(function() {
                    bus.publish('mqtt.disconnect', {
                        msg: 'disconnect',
                        username: this.id,
                        unique: this.unique
                    });
                }, msg.params.connection.keepalive * 2 * 1000);
            });

            CLIENT[msg.params.connection.unique].on('mqttPubrec', function(packetID) {
                bus.publish('net.done', {
                    packetID: packetID,
                    username: this.id,
                    parentEvent: 'mqttPubrec',
                    unique: this.unique
                });
            });

            CLIENT[msg.params.connection.unique].on('mqttPublish', function(data, msg, packetID) {
                bus.publish('net.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: packetID,
                    parentEvent: 'mqttPublish',
                    unique: this.unique
                });
                bus.publish('net.done', {
                    packetID: packetID,
                    username: this.id,
                    parentEvent: 'mqttPublish',
                    unique: this.unique
                });
                if (msg.qos == 0) {
                    var outMessage = {
                        type: 'message',
                        message: {
                            topic: msg.topic,
                            qos: msg.qos,
                            content: msg.content,
                            connectionId: this.id,
                            direction: 'out',
                            unique: this.unique,
                            clientID: this.clientID
                        },
                        id: guid(),
                        time: (new Date()).getTime()
                    }
                    db.loadDatabase();

                    db.insert(outMessage);
                }
            });

            CLIENT[msg.params.connection.unique].on('mqttPubrel', function(data, packetID) {
                bus.publish('net.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: packetID,
                    parentEvent: 'mqttPubrel',
                    unique: this.unique
                });
            });

            CLIENT[msg.params.connection.unique].on('mqttPuback', function(data, msg) {
                bus.publish('net.done', {
                    packetID: data.getPacketID(),
                    username: this.id,
                    parentEvent: 'mqttPuback',
                    unique: this.unique
                });
                tokens[this.unique].releaseToken(data.getPacketID());
                var outMessage = {
                    type: 'message',
                    message: {
                        topic: msg.topic,
                        qos: msg.qos,
                        content: msg.content,
                        connectionId: this.id,
                        direction: 'out',
                        unique: this.unique,
                        clientID: this.clientID
                    },
                    id: guid(),
                    time: (new Date()).getTime()
                }

                db.loadDatabase();
                db.insert(outMessage);
            });

            CLIENT[msg.params.connection.unique].on('mqttPubcomp', function(data, msg) {
                bus.publish('net.done', {
                    packetID: data.getPacketID(),
                    username: this.id,
                    parentEvent: 'mqttPubcomp',
                    unique: this.unique
                });
                tokens[this.unique].releaseToken(data.getPacketID());
                var outMessage = {
                    type: 'message',
                    message: {
                        topic: msg.topic,
                        qos: msg.qos,
                        content: msg.content,
                        connectionId: this.id,
                        direction: 'out',
                        unique: this.unique,
                        clientID: this.clientID
                    },
                    id: guid(),
                    time: (new Date()).getTime()
                }

                db.loadDatabase();
                db.insert(outMessage);
            });

            CLIENT[msg.params.connection.unique].on('mqttSubscribe', function(data, packetID) {
                bus.publish('net.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: packetID,
                    parentEvent: 'mqttSubscribe',
                    unique: this.unique
                });
            });

            CLIENT[msg.params.connection.unique].on('mqttSuback', function(data, msg) {
                bus.publish('net.done', {
                    packetID: data.getPacketID(),
                    username: this.id,
                    parentEvent: 'mqttSuback',
                    unique: this.unique
                });
                tokens[this.unique].releaseToken(data.getPacketID());
                var subscribtions = [];
                var clientID = this.clientID
                db.loadDatabase();
                for (var i = 0; i < msg.topics.length; i++) {
                    var subscribeData = {
                        type: 'subscribtion',
                        subscribtion: {
                            topic: msg.topics[i].topic,
                            qos: msg.topics[i].qos,
                            connectionId: msg.username,
                            clientID: clientID
                        },
                    }
                    subscribtions.push(subscribeData);
                    db.remove({ 'type': 'subscribtion', 'subscribtion.topic': msg.topics[i].topic }, { multi: true });
                }
                db.insert(subscribtions);
            });

            CLIENT[msg.params.connection.unique].on('mqttUnsubscribe', function(data, packetID) {
                bus.publish('net.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: packetID,
                    parentEvent: 'mqttUnsubscribe',
                    unique: this.unique
                });
            });

            CLIENT[msg.params.connection.unique].on('mqttUnsuback', function(data, msg) {
                bus.publish('net.done', {
                    packetID: data.getPacketID(),
                    username: this.id,
                    parentEvent: 'mqttUnsuback',
                    unique: this.unique
                });

                db.loadDatabase();
                tokens[this.unique].releaseToken(data.getPacketID());
                for (var i = 0; i < msg.length; i++) {
                    db.remove({ 'type': 'subscribtion', 'subscribtion.topic': msg[i] }, { multi: true });
                }
            });

            CLIENT[msg.params.connection.unique].on('mqttPublishIn', function(data) {
                if (!data) return;
                var inMessage = {
                    type: 'message',
                    message: {
                        topic: data.topic,
                        qos: data.qos,
                        content: data.content,
                        connectionId: this.id,
                        direction: 'in',
                        clientID: this.clientID
                    },
                    id: guid(),
                    time: (new Date()).getTime()
                }

                db.loadDatabase();
                db.insert(inMessage);
            });

            CLIENT[msg.params.connection.unique].on('mqttPubackOut', function(data, msg) {
                if (!data) return;
                bus.publish('net.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: msg.packetID,
                    parentEvent: 'mqttPubackOut',
                    unique: this.unique
                });
                var inMessage = {
                    type: 'message',
                    message: {
                        topic: msg.topic,
                        qos: msg.qos,
                        content: msg.content,
                        connectionId: this.id,
                        direction: 'in',
                        clientID: this.clientID
                    },
                    id: guid(),
                    time: (new Date()).getTime()
                }

                db.loadDatabase();
                db.insert(inMessage);
            });

            CLIENT[msg.params.connection.unique].on('mqttPubrecOut', function(data, msg) {
                if (!data) return;
                bus.publish('net.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: msg.packetID,
                    parentEvent: 'mqttPubrecOut',
                    unique: this.unique
                });
            });

            CLIENT[msg.params.connection.unique].on('mqttPubcompOut', function(data, id, msg) {               
                if (!data) return;
                bus.publish('net.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: id,
                    parentEvent: 'mqttPubcompOut',
                    unique: this.unique
                });
                if(msg) {
                    var inMessage = {
                        type: 'message',
                        message: {
                            topic: msg.topic,
                            qos: msg.qos,
                            content: msg.content,
                            connectionId: this.id,
                            direction: 'in',
                            clientID: this.clientID
                        },
                        id: guid(),
                        time: (new Date()).getTime()
                    }
    
                    db.loadDatabase();
                    db.insert(inMessage);  }
            });

            CLIENT[msg.params.connection.unique].on('mqttPingResp', function() {
                clearTimeout(pingTimeout);
                pingTimeout = setTimeout(function() {
                    bus.publish('mqtt.disconnect', {
                        msg: 'disconnect',
                        username: this.id,
                        unique: this.unique
                    });
                }, msg.params.connection.keepalive * 2 * 1000);
            });

            CLIENT[msg.params.connection.unique].Connect(msg.params.connection);
        });

        bus.subscribe('mqtt.dataReceived', function(msg) {
            if (typeof CLIENT[msg.unique] == 'undefined') return;
            CLIENT[msg.unique].onDataRecieved(Buffer.from(msg.payload));
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