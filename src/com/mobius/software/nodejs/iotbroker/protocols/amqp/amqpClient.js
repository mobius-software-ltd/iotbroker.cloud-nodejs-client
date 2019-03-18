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
var bus = require('servicebus').bus({
    queuesFile: `.queues.amqp-client.${process.pid}`
});
var vm = this;
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
    var db = new Datastore({ filename: 'data' });
    var CLIENT = {};
    var tokens = {};
    var delivery = {};
    var connectTimeout = {};
    var unique;
    var username;

    setTimeout(function () {

        bus.listen('amqp.connect', function (msg) {
            bus.send('amqp.newSocket', msg);
            db.loadDatabase();
            db.remove({ 'type': 'amqp.connection', 'connection.username': msg.params.connection.username }, { multi: true });

            unique = msg.params.connection.unique;
            if(unique) {
                bus.listen('amqp.disconnect' + unique, function (msg) { processDisconnect(msg) });
                bus.listen('amqp.subscribe' + unique, function (msg) { processSubscribe(msg) });
                bus.listen('amqp.unsubscribe' + unique, function (msg) { processUnsubscribe(msg) });
                bus.listen('amqp.publish' + unique, function (msg) { processPublish(msg) });
                bus.listen('amqp.socketOpened'  + unique, function (msg) { processSocketopened(msg)     

                  CLIENT[msg.params.connection.unique].Connect(msg.params.connection, connectTimeout);
                    
                });
        
                bus.listen('amqp.dataReceived' + unique, function (msg) { processOnDataReceived(msg)  });
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

function connectionDone(packetID, parentEvent, payload) {
    bus.send('amqp.done' + unique, {       
        packetID: packetID,
        username: username,
        parentEvent: parentEvent,
        unique: unique,
        payload: payload
    });
}

var methods = {
    send: send,
    publish: publish,
    getData: getData
}

function processDisconnect(msg) {
    if (typeof CLIENT[msg.unique] == 'undefined') return;
    CLIENT[msg.unique].id = msg.username;
    db.loadDatabase();
    db.remove({ 'type': 'amqp.connection', 'connection.unique': msg.unique }, { multi: true });
    CLIENT[msg.unique].Disconnect();
}

function processSubscribe(msg) {
    if (typeof CLIENT[msg.unique] == 'undefined') return;
    
    for (var i = 0; i < msg.params.topics.length; i++) {
        msg.params.topics[i].qos = ENUM.QoS.AT_LEAST_ONCE;
        msg.params.topics[i].clientID = msg.params.clientID,
        msg.params.topics[i].username = msg.username
    }
    CLIENT[msg.unique].Subscribe(msg.params.topics);
}

function processUnsubscribe(msg) {
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
}

function processPublish(msg) {
    if (typeof CLIENT[msg.unique] == 'undefined') return;
    msg.params.deliveryId = delivery[msg.unique].getToken();
    msg.params.qos = ENUM.QoS.AT_LEAST_ONCE;
    msg.params.username = msg.username;

    CLIENT[msg.unique].id = msg.username;
    CLIENT[msg.unique].Publish(msg.params);
}

function processSocketopened(msg) {
    CLIENT[msg.params.connection.unique] = new amqp();
    CLIENT[msg.params.connection.unique].id = msg.params.connection.username;
    CLIENT[msg.params.connection.unique].password = msg.params.connection.password;
    CLIENT[msg.params.connection.unique].keepalive = msg.params.connection.keepalive;
    CLIENT[msg.params.connection.unique].clientID = msg.params.connection.clientID;
    username = msg.params.connection.clientID;
    unique = msg.params.connection.unique;
    CLIENT[msg.params.connection.unique].userInfo = msg.params.connection;
    CLIENT[msg.params.connection.unique].unique = msg.params.connection.unique;
    CLIENT[msg.params.connection.unique].isClean = msg.params.connection.isClean;
    CLIENT[msg.params.connection.unique].params = msg.params;
    delivery[msg.params.connection.unique] = new TOKENS();


    connectTimeout = setTimeout(function () {
        connectionDone(null, 'amqp.disconnect', null)
    }, msg.params.connection.keepalive * 1000);
}

function processOnDataReceived(msg) {
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
}

module.exports = methods;