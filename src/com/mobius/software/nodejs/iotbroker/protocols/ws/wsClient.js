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
    queuesFile: `.queues.ws-cl.${process.pid}`
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
                bus.listen('ws.disconnect' + unique, function (msg) { processDisconnect(msg) });
                bus.listen('ws.publish' + unique, function (msg) { processPublish(msg) });
                bus.listen('ws.subscribe' + unique, function (msg) { processSubscribe(msg) });
                bus.listen('ws.unsubscribe' + unique, function (msg) { processUnsubscribe(msg) });
                bus.listen('ws.dataReceived' + unique, function (msg) { processDataReceived(msg) });
                bus.listen('ws.socketOpened' + unique, function (msg) { processSocketOpened(msg)  
                    CLIENT[msg.params.connection.unique].Connect(msg.params.connection);
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

var methods = {
    send: send,
    publish: publish,
    getData: getData
}

function processDisconnect(msg) {
    if (typeof CLIENT[msg.unique] == 'undefined') return;
    CLIENT[msg.unique].id = msg.username;
    db.loadDatabase();
    db.remove({ 'type': 'connection', 'connection.username': msg.username }, { multi: true });
    CLIENT[msg.unique].Disconnect(msg.unique);
}

function processPublish(msg) {
    if (typeof CLIENT[msg.unique] == 'undefined') return;  

    CLIENT[msg.unique].publish = msg;
    CLIENT[msg.unique].id = msg.username;
    CLIENT[msg.unique].Publish(msg);
}

function processSubscribe(msg) {
    if (typeof CLIENT[msg.unique] == 'undefined') return;

    CLIENT[msg.unique].Subscribe(msg.params);
}

function processUnsubscribe(msg) {
    if (typeof CLIENT[msg.unique] == 'undefined') return;

    CLIENT[msg.unique].Unsubscribe(msg.params);
}

function processSocketOpened(msg) {
    CLIENT[msg.params.connection.unique] = new ws();
    CLIENT[msg.params.connection.unique].id = msg.params.connection.username;
    username = msg.params.connection.username;
    thisClientID = msg.params.connection.clientID;
    CLIENT[msg.params.connection.unique].unique = msg.params.connection.unique;
    tokens[msg.params.connection.unique] = new TOKENS();
}

function  processDataReceived(msg) {
    if (typeof CLIENT[msg.unique] == 'undefined') return;
    CLIENT[msg.unique].onDataRecieved(msg);
}


module.exports = methods;