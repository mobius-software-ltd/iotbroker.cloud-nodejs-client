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
var bus = require('servicebus').bus({
    queuesFile: `.queues.ws-wss.${process.pid}`
});
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
    cluster.on('exit', function (worker, code, signal) {
        console.log(`worker ${worker.process.pid} died`);
    });
} else {
    var connections = {};
    var timers = {};
    var tokens = {};
    var db = new Datastore({ filename: 'data' });
    var CLIENT = {};
    var pingTimeout = {};
    var unique;
    var username;
    var thisClientID;
    setTimeout(function () {

        bus.listen('ws.connect', function (msg) {
            bus.send('wss.newSocket', msg);
            db.loadDatabase();
            db.remove({ 'type': 'connection', 'connection.username': msg.params.connection.username }, { multi: true });
            db.insert(msg.params);

            unique = msg.params.connection.unique;
            if (unique) {
                bus.listen('ws.disconnect' + unique, function (msg) {
                    if (typeof CLIENT[msg.unique] == 'undefined') return;
                    CLIENT[msg.unique].id = msg.username;
                    var packetID = tokens[msg.unique].getToken();
                    db.loadDatabase();
                    db.remove({ 'type': 'connection', 'connection.username': msg.username }, { multi: true });
                    CLIENT[msg.unique].Disconnect(packetID);
                });

                bus.listen('ws.publish' + unique, function (msg) {
                    if (typeof CLIENT[msg.unique] == 'undefined') return;
                    if (msg.params.qos != 0)
                        msg.params.token = tokens[msg.unique].getToken();

                    CLIENT[msg.unique].publish = msg;
                    CLIENT[msg.unique].id = msg.username;
                    CLIENT[msg.unique].Publish(msg);
                });

                bus.listen('ws.subscribe' + unique, function (msg) {
                    if (typeof CLIENT[msg.unique] == 'undefined') return;
                    msg.params.token = tokens[msg.unique].getToken();
                    CLIENT[msg.unique].Subscribe(msg.params);
                });

                bus.listen('ws.unsubscribe' + unique, function (msg) {
                    if (typeof CLIENT[msg.unique] == 'undefined') return;
                    var token = tokens[msg.unique].getToken();
                    CLIENT[msg.unique].Unsubscribe(msg.params, token);
                });

                bus.listen('ws.socketOpened' + unique, function (msg) {
                    CLIENT[msg.params.connection.unique] = new ws();
                    CLIENT[msg.params.connection.unique].id = msg.params.connection.username;
                    username = msg.params.connection.username;
                    thisClientID = msg.params.connection.clientID;
                    CLIENT[msg.params.connection.unique].unique = msg.params.connection.unique;
                    tokens[msg.params.connection.unique] = new TOKENS();
                    CLIENT[msg.params.connection.unique].on('wsConnect', function (data) {
                        sendData(data, 1, 'wsConnect');
                    });

                    CLIENT[msg.params.connection.unique].on('wsDisconnect', function (data, id) {
                        sendData(data, id, 'wsDisconnect');
                        connectionDone(id, 'wsDisconnect');

                        delete CLIENT[this.unique];
                        delete tokens[this.unique];
                        delete timers[this.unique];
                    });

                    CLIENT[msg.params.connection.unique].on('wsConnack', function (data) {
                        var that = this;
                        connectionDone(1, 'wsConnack');
                        db.loadDatabase();
                        if (data.payload.data.returnCode == ENUM.ConnackCode.ACCEPTED) {
                            db.remove({ type: 'connack' }, { multi: true }, function (err, docs) {
                                db.insert({
                                    type: 'connack',
                                    connectionId: that.id,
                                    unique: that.unique,
                                    id: guid()
                                });
                            });
                            CLIENT[this.unique].Ping();
                        } else {
                            db.remove({ type: 'connack' }, { multi: true }, function (err, docs) { });
                        }
                    });

                    CLIENT[msg.params.connection.unique].on('wsPing', function (data) {
                        sendData(data, 0, 'wsPing');
                        pingTimeout = setTimeout(function () {
                            publishDisconnect();
                        }, msg.params.connection.keepalive * 10 * 1000);
                    });

                    CLIENT[msg.params.connection.unique].on('wsPubrec', function (packetID) {
                        connectionDone(packetID, 'wsPubrec');
                    });

                    CLIENT[msg.params.connection.unique].on('wsPublish', function (data, msg, packetID, parent) {
                        sendData(data, packetID, parent);
                        connectionDone(packetID, 'wsPublish');
                        if (msg.qos == 0) {
                            var msgObj = CLIENT[this.unique].publish.params;
                            msgObj.direction = 'out',
                                saveMessage(msgObj);
                        }
                    });

                    CLIENT[msg.params.connection.unique].on('wsPubrel', function (data, packetID) {
                        sendData(data, packetID, 'wsPubrel');
                    });

                    CLIENT[msg.params.connection.unique].on('wsPuback', function (data, id, msg) {
                        connectionDone(id, 'wsPuback');
                        tokens[this.unique].releaseToken(id);
                        var msgObj = CLIENT[this.unique].publish.params;
                        msgObj.direction = 'out',
                            saveMessage(msgObj);
                    });

                    CLIENT[msg.params.connection.unique].on('wsPubcomp', function (packetID, msg) {
                        connectionDone(packetID, 'wsPubcomp');
                        tokens[this.unique].releaseToken(packetID);
                        var msgObj = CLIENT[this.unique].publish.params;
                        msgObj.direction = 'out',
                            saveMessage(msgObj);
                    });

                    CLIENT[msg.params.connection.unique].on('wsSubscribe', function (data, packetID) {
                        sendData(data, packetID, 'wsSubscribe');
                    });

                    CLIENT[msg.params.connection.unique].on('wsSuback', function (data, msg) {
                        connectionDone(data.payload.data.packetID, 'wsSuback');
                        tokens[this.unique].releaseToken(data.payload.data.packetID);
                        var subscribtions = [];

                        db.loadDatabase();
                        // if(data.payload.data.returnCode)
                        if (msg.topics)
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

                    CLIENT[msg.params.connection.unique].on('wsUnsubscribe', function (data, packetID) {
                        sendData(data, packetID, 'wsUnsubscribe');
                    });

                    CLIENT[msg.params.connection.unique].on('wsUnsuback', function (packetID, msg) {
                        connectionDone(packetID, 'wsUnsuback');
                        db.loadDatabase();
                        tokens[this.unique].releaseToken(packetID);
                        db.remove({ 'type': 'wssubscribtion', 'subscribtion.topic': msg }, { multi: true });
                    });

                    CLIENT[msg.params.connection.unique].on('wsPublishIn', function (data) {
                        if (!data) return;
                        saveMessage(data);
                    });

                    CLIENT[msg.params.connection.unique].on('wsPubackOut', function (data, msg) {
                        if (!data) return;
                        sendData(data, msg.packetID, 'wsPubackOut');
                        saveMessage(msg);
                    });

                    CLIENT[msg.params.connection.unique].on('wsPubrecOut', function (data, msg) {
                        if (!data) return;
                        sendData(data, msg.packetID, 'wsPubrecOut');
                    });

                    CLIENT[msg.params.connection.unique].on('wsPubcompOut', function (data, id, msg) {
                        if (!data) return;
                        sendData(data, id, 'wsPubcompOut');
                        saveMessage(msg);
                    });

                    CLIENT[msg.params.connection.unique].on('wsPingResp', function (data) {
                        clearTimeout(pingTimeout);
                        pingTimeout = setTimeout(function () {
                            publishDisconnect();
                        }, msg.params.connection.keepalive * 2 * 1000);
                    });

                    CLIENT[msg.params.connection.unique].Connect(msg.params.connection);
                });

                bus.listen('ws.dataReceived' + unique, function (msg) {
                    if (typeof CLIENT[msg.unique] == 'undefined') return;
                    CLIENT[msg.unique].onDataRecieved(msg);
                });
            }
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
    db.find(req, function (err, docs) {
        if (!!err)
            res.send({ 'Error:': err });
        res.send(JSON.stringify(docs));
    });
}

function sendData(payload, packetID, parentEvent) {
    bus.send('wss.sendData' + unique, {
        payload: payload,
        username: username,
        packetID: packetID,
        parentEvent: parentEvent,
        unique: unique
    });
}

function connectionDone(packetID, parentEvent) {
    bus.send('wss.done' + unique, {
        packetID: packetID,
        username: username,
        parentEvent: parentEvent,
        unique: unique
    });
}

function saveMessage(msg) {
    var message = {
        type: 'wsmessage',
        message: {
            topic: msg.topic,
            qos: msg.qos,
            content: msg.content,
            connectionId: username,
            direction: msg.direction || 'in',
            unique: unique,
            clientID: thisClientID
        },
        id: guid(),
        time: (new Date()).getTime()
    }
    db.loadDatabase();
    db.insert(message);
}

function publishDisconnect() {
    bus.send('ws.disconnect' + unique, {
        msg: 'disconnect',
        username: username,
        unique: unique,
        parentEvent: 'wsDisconnect'
    });
}

var methods = {
    send: send,
    publish: publish,
    getData: getData
}

module.exports = methods;