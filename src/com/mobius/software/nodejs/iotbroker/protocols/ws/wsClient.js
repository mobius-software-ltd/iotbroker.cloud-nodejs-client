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
var NET = require('./websocket');
var express = require('express');
var bodyParser = require('body-parser');
var ws = require('./ws');
var guid = require('./lib/guid');
var net = require('net');
var Datastore = require('nedb');
var TOKENS = require('./lib/Tokens');
var TIMERS = require('./lib/Timers');
var Timer = require('./lib/Timer');
var bus = require('servicebus').bus();
var ENUM = require('./lib/enum');

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
    var pingTimeout = {};
   
    setTimeout(function() {
      
        bus.listen('ws.connect', function(msg) {
            bus.send('wss.newSocket', msg);
            db.loadDatabase();
            db.remove({ 'type': 'connection', 'connection.username': msg.params.connection.username }, { multi: true });
            db.insert(msg.params);
        });

        bus.subscribe('ws.disconnect', function(msg) {
           
            if (typeof CLIENT[msg.unique] == 'undefined') return;
            CLIENT[msg.unique].id = msg.username;
            var packetID  = tokens[msg.unique].getToken();
            db.loadDatabase();
            db.remove({ 'type': 'connection', 'connection.username': msg.username }, { multi: true });
            CLIENT[msg.unique].Disconnect(packetID);
        });

        bus.subscribe('ws.publish', function(msg) {           
            if (typeof CLIENT[msg.unique] == 'undefined') return;
            if (msg.params.qos != 0)
                msg.params.token = tokens[msg.unique].getToken();

             CLIENT[msg.unique].publish = msg;
            CLIENT[msg.unique].id = msg.username;
            CLIENT[msg.unique].Publish(msg);
        });

        bus.subscribe('ws.subscribe', function(msg) {
               if (typeof CLIENT[msg.unique] == 'undefined') return;         
            msg.params.token = tokens[msg.unique].getToken();           
            CLIENT[msg.unique].Subscribe(msg.params);
        });

        bus.subscribe('ws.unsubscribe', function(msg) {
            if (typeof CLIENT[msg.unique] == 'undefined') return;
            var token = tokens[msg.unique].getToken();
            CLIENT[msg.unique].Unsubscribe(msg.params, token);
        });

        bus.listen('ws.socketOpened', function(msg) {
            CLIENT[msg.params.connection.unique] = new ws();
            CLIENT[msg.params.connection.unique].id = msg.params.connection.username;
            CLIENT[msg.params.connection.unique].unique = msg.params.connection.unique;
            tokens[msg.params.connection.unique] = new TOKENS();
            CLIENT[msg.params.connection.unique].on('wsConnect', function(data) {            
                bus.publish('wss.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: 1,
                    parentEvent: 'wsConnect',
                    unique: this.unique
                });
            });

            CLIENT[msg.params.connection.unique].on('wsDisconnect', function(data, id) {
                bus.publish('wss.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: id,
                    parentEvent: 'wsDisconnect',
                    unique: this.unique
                });
                bus.publish('wss.done', {
                    packetID: id,
                    username: this.id,
                    parentEvent: 'wsDisconnect',
                    unique: this.unique
                });
               
                delete CLIENT[this.unique];
                delete tokens[this.unique];
                delete timers[this.unique];
            });

            CLIENT[msg.params.connection.unique].on('wsConnack', function(data) {   
                var that = this;
                bus.publish('wss.done', {
                    packetID: 1,
                    username: data.username,
                    parentEvent: 'wsConnack',
                    unique: data.unique
                });
                db.loadDatabase();
                if (data.payload.data.returnCode == ENUM.ConnackCode.ACCEPTED) {
                    db.remove({ type: 'connack' }, { multi: true }, function(err, docs) {
                        db.insert({
                            type: 'connack',
                            connectionId: that.id,
                            unique: that.unique,
                            id: guid()
                        });
                    });
                    CLIENT[this.unique].Ping();                  
                } else {
                    db.remove({ type: 'connack' }, { multi: true }, function(err, docs) {

                    });
                }
            });

            CLIENT[msg.params.connection.unique].on('wsPing', function(data) {
                bus.publish('wss.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: 0,
                    parentEvent: 'wsPing',
                    unique: this.unique
                });
                pingTimeout = setTimeout(function() {                                      
                    bus.publish('ws.disconnect', {
                        msg: 'disconnect',
                        username: this.id,
                        unique: this.unique
                    });
                }, msg.params.connection.keepalive * 10 * 1000);
            });

            CLIENT[msg.params.connection.unique].on('wsPubrec', function(packetID) {
                bus.publish('wss.done', {
                    packetID: packetID,
                    username: this.id,
                    parentEvent: 'wsPubrec',
                    unique: this.unique
                });
            });

            CLIENT[msg.params.connection.unique].on('wsPublish', function(data, msg, packetID, parent) {             
                bus.publish('wss.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: packetID,
                    parentEvent: parent,
                    unique: this.unique
                });
                bus.publish('wss.done', {
                    packetID: packetID,
                    username: this.id,
                    parentEvent: 'wsPublish',
                    unique: this.unique
                });
                if (msg.qos == 0) {
                    var outMessage = {
                        type: 'wsmessage',
                        message: {
                            topic:  CLIENT[this.unique].publish.params.topic,
                            qos: CLIENT[this.unique].publish.params.qos,
                            content: CLIENT[this.unique].publish.params.content,
                            connectionId: this.id,
                            direction: 'out',
                            unique: this.unique
                        },
                        id: guid(),
                        time: (new Date()).getTime()
                    }
                    db.loadDatabase();
                    db.insert(outMessage);
                }
            });

            CLIENT[msg.params.connection.unique].on('wsPubrel', function(data, packetID) {
                bus.publish('wss.sendData', {
                    payload:  data,
                    username: this.id,
                    packetID: packetID,
                    parentEvent: 'wsPubrel',
                    unique: this.unique
                });
            });

            CLIENT[msg.params.connection.unique].on('wsPuback', function(data, id, msg) {
                bus.publish('wss.done', {
                    packetID: id,
                    username: this.id,
                    parentEvent: 'wsPuback',
                    unique: this.unique
                });
                tokens[this.unique].releaseToken(id);
                var outMessage = {
                    type: 'wsmessage',
                    message: {
                        topic:  CLIENT[this.unique].publish.params.topic,
                        qos: CLIENT[this.unique].publish.params.qos,
                        content: CLIENT[this.unique].publish.params.content,
                        connectionId: this.id,
                        direction: 'out',
                        unique: this.unique
                    },
                    id: guid(),
                    time: (new Date()).getTime()
                }
                db.loadDatabase();
                db.insert(outMessage);
            });

            CLIENT[msg.params.connection.unique].on('wsPubcomp', function(packetID, msg) {
                bus.publish('wss.done', {
                    packetID: packetID,
                    username: this.id,
                    parentEvent: 'wsPubcomp',
                    unique: this.unique
                });
                tokens[this.unique].releaseToken(packetID);
                var outMessage = {
                    type: 'wsmessage',
                    message: {
                        topic:  CLIENT[this.unique].publish.params.topic,
                        qos: CLIENT[this.unique].publish.params.qos,
                        content: CLIENT[this.unique].publish.params.content,
                        connectionId: this.id,
                        direction: 'out',
                        unique: this.unique
                    },
                    id: guid(),
                    time: (new Date()).getTime()
                }

                db.loadDatabase();
                db.insert(outMessage);
            });

            CLIENT[msg.params.connection.unique].on('wsSubscribe', function(data, packetID) {
                bus.publish('wss.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: packetID,
                    parentEvent: 'wsSubscribe',
                    unique: this.unique
                });
            });

            CLIENT[msg.params.connection.unique].on('wsSuback', function(data, msg) {               
                bus.publish('wss.done', {
                    packetID: data.payload.data.packetID,
                    username: this.id,
                    parentEvent: 'wsSuback',
                    unique: this.unique
                });
                tokens[this.unique].releaseToken(data.payload.data.packetID);
                var subscribtions = [];

                db.loadDatabase();
               // if(data.payload.data.returnCode)
               if(msg.topics)
                for (var i = 0; i < msg.topics.length; i++) {
                    var subscribeData = {
                        type: 'wssubscribtion',
                        subscribtion: {
                            topic: msg.topics[i].topic ? msg.topics[i].topic : null,
                            qos: msg.topics[i].qos ? msg.topics[i].qos : null,
                            connectionId: msg.username,
                        },
                    }
                    subscribtions.push(subscribeData);
                    db.remove({ 'type': 'subscribtion', 'subscribtion.topic': msg.topics[i].topic }, { multi: true });
                }
                db.insert(subscribtions);
            });

            CLIENT[msg.params.connection.unique].on('wsUnsubscribe', function(data, packetID) {
                bus.publish('wss.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: packetID,
                    parentEvent: 'wsUnsubscribe',
                    unique: this.unique
                });
            });

            CLIENT[msg.params.connection.unique].on('wsUnsuback', function(packetID, msg) {
                bus.publish('wss.done', {
                    packetID: packetID,
                    username: this.id,
                    parentEvent: 'wsUnsuback',
                    unique: this.unique
                });

                db.loadDatabase();
                tokens[this.unique].releaseToken(packetID);               
                db.remove({ 'type': 'wssubscribtion', 'subscribtion.topic': msg }, { multi: true });
                // for (var i = 0; i < msg.length; i++) {
                //     db.remove({ 'type': 'wssubscribtion', 'subscribtion.topic': msg[i] }, { multi: true });
                // }
            });

            CLIENT[msg.params.connection.unique].on('wsPublishIn', function(data) {
                if (!data) return;
                var inMessage = {
                    type: 'wsmessage',
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

            CLIENT[msg.params.connection.unique].on('wsPubackOut', function(data, msg) {
                if (!data) return;
                bus.publish('wss.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: msg.packetID,
                    parentEvent: 'wsPubackOut',
                    unique: this.unique
                });
                var inMessage = {
                    type: 'wsmessage',
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

            CLIENT[msg.params.connection.unique].on('wsPubrecOut', function(data, msg) {
                if (!data) return;
                bus.publish('wss.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: msg.packetID,
                    parentEvent: 'wsPubrecOut',
                    unique: this.unique
                });
            });

            CLIENT[msg.params.connection.unique].on('wsPubcompOut', function(data, id, msg) {
                if (!data) return;
                bus.publish('wss.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: id,
                    parentEvent: 'wsPubcompOut',
                    unique: this.unique
                });

                var inMessage = {
                    type: 'wsmessage',
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

            CLIENT[msg.params.connection.unique].on('wsPingResp', function(data) { 
                clearTimeout(pingTimeout);
                pingTimeout = setTimeout(function() {
                    bus.publish('ws.disconnect', {
                        msg: 'disconnect',
                        username: data.username,
                        unique: data.unique,
                        parentEvent: 'wsDisconnect'
                    });
                }, msg.params.connection.keepalive * 2 * 1000);
            });

            CLIENT[msg.params.connection.unique].Connect(msg.params.connection);
        });

        bus.subscribe('ws.dataReceived', function(msg) {             
            if (typeof CLIENT[msg.unique] == 'undefined') return;
            CLIENT[msg.unique].onDataRecieved(msg);
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