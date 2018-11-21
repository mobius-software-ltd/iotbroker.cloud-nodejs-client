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
var NET = require('./amqpnet');
var express = require('express');
var bodyParser = require('body-parser');
var amqp = require('./amqp');
var AMQPParser = require('./parser/AMQPParser');
var guid = require('./lib/guid');
var net = require('net');
var Datastore = require('nedb');
var TOKENS = require('./lib/Tokens');
var TIMERS = require('./lib/Timers');
var Timer = require('./lib/Timer');
var bus = require('servicebus').bus();

var amqp = require('./amqp.js')
var ENUM = require('./lib/enum')
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
    var tokens = {};
    var delivery = {};
    var connectTimeout = {};

    setTimeout(function () {

        bus.listen('amqp.connect', function (msg) {

            bus.send('amqp.newSocket', msg);
            db.loadDatabase();
            db.remove({ 'type': 'amqp.connection', 'connection.username': msg.params.connection.username }, { multi: true });

            // msg.params.type = 'amqp.connection';
            // db.insert(msg.params);

        });

        bus.subscribe('amqp.disconnect', function (msg) {

            if (typeof CLIENT[msg.unique] == 'undefined') return;
            CLIENT[msg.unique].id = msg.username;
            db.loadDatabase();
            db.remove({ 'type': 'amqp.connection', 'connection.unique': msg.unique }, { multi: true });
            CLIENT[msg.unique].Disconnect();
        });

        bus.subscribe('amqp.subscribe', function (msg) {
            if (typeof CLIENT[msg.unique] == 'undefined') return;
            // msg.params.token = tokens[msg.unique].getToken();
            // db.loadDatabase();
            // var result = 0;
            // db.find({
            //     type: 'amqp.subscribtion'
            // }, function (err, docs) {
            //     if (docs) {                    
            //         result += docs.length
            //     }

            for (var i = 0; i < msg.params.topics.length; i++) {
                //  if (!msg.params.topics[i].token) {
                msg.params.topics[i].token = tokens[msg.unique].getToken();
                // }
                msg.params.topics[i].qos = ENUM.QoS.AT_LEAST_ONCE;
            }
            CLIENT[msg.unique].Subscribe(msg.params.topics);
            //  });           
        });

        bus.subscribe('amqp.unsubscribe', function (msg) {
            if (typeof CLIENT[msg.unique] == 'undefined') return;

            db.loadDatabase();
            var result;
            db.find({
                type: 'amqp.subscribtion',
                'subscribtion.topic': msg.params[0].topic
            }, function (err, docs) {
                if (docs) {
                    result = docs
                }
            });
            if (result) {
                for (var i = 0; i < msg.params.length; i++) {
                    msg.params[i].token = result[0].subscribtion.token
                }
            }

            CLIENT[msg.unique].Unsubscribe(msg);
        });

        bus.subscribe('amqp.publish', function (msg) {
            if (typeof CLIENT[msg.unique] == 'undefined') return;
            msg.params.token = tokens[msg.unique].getToken();
            msg.params.deliveryId = delivery[msg.unique].getToken();
            msg.params.qos = ENUM.QoS.AT_LEAST_ONCE;

            CLIENT[msg.unique].id = msg.username;
            CLIENT[msg.unique].Publish(msg.params);


            //  });

        });

        bus.listen('amqp.socketOpened', function (msg) {
            CLIENT[msg.params.connection.unique] = new amqp();
            CLIENT[msg.params.connection.unique].id = msg.params.connection.username;
            CLIENT[msg.params.connection.unique].password = msg.params.connection.password;
            CLIENT[msg.params.connection.unique].keepalive = msg.params.connection.keepalive;
            CLIENT[msg.params.connection.unique].clientID = msg.params.connection.clientID;
            CLIENT[msg.params.connection.unique].unique = msg.params.connection.unique;
            CLIENT[msg.params.connection.unique].isClean = msg.params.connection.isClean;
            tokens[msg.params.connection.unique] = new TOKENS();
            delivery[msg.params.connection.unique] = new TOKENS();


            connectTimeout = setTimeout(function () {
                bus.publish('amqp.done', {
                    msg: 'amqp.disconnect',
                    username: this.id,
                    unique: msg.params.connection.unique
                });
                delete CLIENT[msg.params.connection.unique]
            }, msg.params.connection.keepalive * 1000);
            // if socket open - start send packet (protoheader)
            CLIENT[msg.params.connection.unique].on('amqpConnect', function (data) {
                bus.publish('amqp.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: 0,
                    parentEvent: 'amqpConnect',
                    unique: this.unique
                });
            });

            CLIENT[msg.params.connection.unique].on('amqp.saslinit', function (data) {

                // var data = msg.getInitialResponse()               
                if (!data) return;
                bus.publish('amqp.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: 1,
                    // packetID: msg.packetID,
                    parentEvent: 'amqp.saslinit',
                    unique: this.unique
                });
            });

            CLIENT[msg.params.connection.unique].on('amqp.protoheader', function (data) {

                // var data = msg.getInitialResponse()               
                if (!data) return;
                bus.publish('amqp.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: 1,
                    // packetID: msg.packetID,
                    parentEvent: 'amqp.protoheader',
                    unique: this.unique
                });
            });

            CLIENT[msg.params.connection.unique].on('amqp.open', function (data) {

                if (!data) return;
                bus.publish('amqp.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: 1,
                    // packetID: msg.packetID,
                    parentEvent: 'amqp.open',
                    unique: this.unique
                });
            });

            CLIENT[msg.params.connection.unique].on('amqp.begin', function (data) {

                if (!data) return;
                bus.publish('amqp.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: 1,
                    // packetID: msg.packetID,
                    parentEvent: 'amqp.begin',
                    unique: this.unique
                });

                db.loadDatabase();
                if (CLIENT[msg.params.connection.unique].isClean) {
                    db.remove({ 'type': 'amqp.subscribtion', 'subscribtion.connectionId': msg.params.connection.username, 'subscribtion.clientID': msg.params.connection.clientID }, { multi: true });
                }

                // db.insert(msg.params);

            });

            CLIENT[msg.params.connection.unique].on('amqp.beginIN', function (client) {
                if (!CLIENT[client.unique]) return;
                var id = this.id;
                clearInterval(connectTimeout)
                db.loadDatabase();
                db.remove({ type: 'amqp.connack' }, { multi: true }, function (err, docs) {
                    db.insert({
                        type: 'amqp.connack',
                        connectionId: id,
                        id: guid()
                    });
                });
                msg.params.type = 'amqp.connection';
                db.insert(msg.params);

                var topics = []
                var unique = this.unique
                db.find({
                    type: 'amqp.subscribtion',
                    'subscribtion.connectionId': client.username,
                    'subscribtion.clientID': client.clientID,
                }, function (err, docs) {
                    if (docs) {
                        for (var i = 0; i < docs.length; i++) {
                            if (docs[i]) {
                                docs[i].subscribtion.token = tokens[unique].getToken()
                                topics.push(docs[i].subscribtion)
                            }
                        }

                    }

                    if (topics.length)
                        CLIENT[unique].Subscribe(topics)
                });

                CLIENT[this.unique].Ping();
            });

            CLIENT[msg.params.connection.unique].on('amqp.pingreq', function (data) {

                if (!data) return;
                bus.publish('amqp.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: -1,
                    // packetID: msg.packetID,
                    parentEvent: 'amqp.pingreq',
                    unique: this.unique
                });
            });

            CLIENT[msg.params.connection.unique].on('amqp.end', function (data) {

                if (!data) return;
                bus.publish('amqp.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: 1,
                    // packetID: msg.packetID,
                    parentEvent: 'amqp.end',
                    unique: this.unique
                });
            });

            CLIENT[msg.params.connection.unique].on('amqp.close', function (data) {

                if (!data) return;
                bus.publish('amqp.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: 1,
                    // packetID: msg.packetID,
                    parentEvent: 'amqp.end',
                    unique: this.unique
                });
            });

            CLIENT[msg.params.connection.unique].on('amqp.closeIN', function (client) {

                if (!CLIENT[client.unique]) return;
                bus.publish('amqp.done', {
                    username: this.id,
                    parentEvent: 'amqp.disconnect',
                    unique: this.unique
                });
            });

            CLIENT[msg.params.connection.unique].on('amqp.subscribe', function (data) {

                bus.publish('amqp.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: 0,
                    parentEvent: 'amqp.subscribe',
                    unique: this.unique
                });
            });

            CLIENT[msg.params.connection.unique].on('amqp.suback', function (data, msg) {

                if (!data) return;
                bus.publish('amqp.done', {
                    payload: data,
                    username: this.id,
                    packetID: 0,
                    parentEvent: 'amqp.suback',
                    unique: this.unique
                });
                //var token = data.getHandle()
                var subscribtions = [];
                var clientID = this.clientID
                var username = this.id
                db.loadDatabase();
                // for (var i = 0; i < msg.length; i++) {

                var subscribeData = {
                    type: 'amqp.subscribtion',
                    subscribtion: {
                        topic: msg.topic,
                        qos: msg.qos,
                        connectionId: username,
                        clientID: clientID,
                        token: msg.token
                    },
                }
                subscribtions.push(subscribeData);
                db.remove({ 'type': 'amqp.subscribtion', 'subscribtion.topic': msg.topic }, { multi: true });
                // }
                db.insert(subscribtions);

            });

            CLIENT[msg.params.connection.unique].on('amqp.unsubscribe', function (data) {


                bus.publish('amqp.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: 0,
                    parentEvent: 'amqp.unsubscribe',
                    unique: this.unique
                });
            });

            CLIENT[msg.params.connection.unique].on('amqp.unsuback', function (token) {

                if (!token) return;
                bus.publish('amqp.done', {
                    username: this.id,
                    packetID: token,
                    parentEvent: 'amqp.unsuback',
                    unique: this.unique
                });
                db.loadDatabase();
                db.remove({ 'type': 'amqp.subscribtion', 'subscribtion.token': token }, { multi: true });
            });

            CLIENT[msg.params.connection.unique].on('amqp.publish', function (data, id) {

                if (!data) return;
                bus.publish('amqp.sendData', {
                    payload: data,
                    username: this.id,
                    packetID: id,
                    parentEvent: 'amqp.publish',
                    unique: this.unique
                });
                // db.loadDatabase();
                // db.remove({ 'type': 'amqp.subscribtion', 'subscribtion.token': token }, { multi: true });
            });

            CLIENT[msg.params.connection.unique].on('amqp.dispositionIN', function (data, token) {

                if (!data) return;
                bus.publish('amqp.done', {
                    username: this.id,
                    packetID: token,
                    parentEvent: 'amqp.dispositionIN',
                    unique: this.unique
                });
                db.loadDatabase();
                var outMessage = {
                    type: 'amqp.message',
                    message: {
                        topic: data.topic,
                        qos: data.qos,
                        content: data.content,
                        connectionId: this.id,
                        direction: 'out',
                        unique: this.unique,
                        clientID: this.clientID
                    },
                    id: guid(),
                    time: (new Date()).getTime()
                }
                db.insert(outMessage);
            });

            CLIENT[msg.params.connection.unique].on('amqp.dispositionOUT', function (data, transfer, qos, topic) {

                var content = transfer.getData().getData().toString();

                if (!data) return;
                bus.publish('amqp.sendData', {
                    payload: data,
                    username: this.id,
                    // packetID: data.token,
                    parentEvent: 'amqp.dispositionOUT',
                    unique: this.unique
                });
                var token = transfer.getHandle();

                var topicName = topic;
                var id = this.id;
                var unique = this.unique;
                var clientID = this.clientID;
                db.loadDatabase();
                db.find({
                    type: 'amqp.subscribtion', 'subscribtion.topic': topic
                }, function (err, docs) {
                    if (docs.length) {
                        topicName = docs[0].subscribtion.topic
                    }

                });
                db.find({
                    type: 'amqp.subscribtion', 'subscribtion.token': token
                }, function (err, docs) {
                    if (docs.length) {
                        topicName = docs[0].subscribtion.topic
                    }
                    var inMessage = {
                        type: 'amqp.message',
                        message: {
                            topic: topicName,
                            qos: qos,
                            content: content,
                            connectionId: id,
                            direction: 'in',
                            unique: unique,
                            clientID: clientID
                        },
                        id: guid(),
                        time: (new Date()).getTime()
                    }
                    db.insert(inMessage);
                });

            });

            CLIENT[msg.params.connection.unique].Connect(msg.params.connection);
            // Connect() - create packet, encode it, send 
        });

        bus.subscribe('amqp.dataReceived', function (msg) {
            if (typeof CLIENT[msg.unique] == 'undefined') return;
            var client = {
                username: CLIENT[msg.unique].id,
                password: CLIENT[msg.unique].password,
                keepalive: CLIENT[msg.unique].keepalive,
                clientID: CLIENT[msg.unique].clientID,
                isClean: CLIENT[msg.unique].isClean,
                unique: CLIENT[msg.unique].unique
            }
            CLIENT[msg.unique].onDataRecieved(Buffer.from(msg.payload), client);
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

var methods = {
    send: send,
    publish: publish,
    getData: getData
}

module.exports = methods;