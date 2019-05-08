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
var bus = require('servicebus').bus({
    queuesFile: `.queues.mqtt-cl.${process.pid}`
});

const cluster = require('cluster');
const numCPUs = args[0] || require('os').cpus().length;

var connectionParams = {};
var worker = [];

var connections = {};
var timers = {};
var tokens = {};
var db = new Datastore({ filename: 'data' });
var CLIENT = {};
var pingTimeout = {};

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
    setTimeout(function() {      
        bus.listen('mqtt.connect', function(msg) { connectProcess(msg)
            var unique = msg.params.connection.unique;
            if(unique) {    
                bus.listen('mqtt.socketOpened' + unique, function(msg) { socketOpenedprocess(msg); });        
                bus.listen('mqtt.disconnect' + unique, function(msg) {  disconnectProcess(msg); });
                bus.listen('mqtt.publish' + unique, function(msg) { publishProcess(msg); });
                bus.listen('mqtt.subscribe' + unique, function(msg) { subscribeProcess(msg); });                
                bus.listen('mqtt.unsubscribe' + unique, function(msg) { unsubscribeProcess(msg); });
                bus.listen('mqtt.dataReceived' + unique, function(msg) { dataReceivedProcess(msg); });
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
    db.find(req, function(err, docs) {
        if (!!err) 
            res.send({ 'Error:': err });                     
        res.send(JSON.stringify(docs));
    });
}

function connectProcess(msg) {
    bus.send('net.newSocket', msg);
    db.loadDatabase();
    db.remove({ 'type': 'connection', 'connection.username': msg.params.connection.username }, { multi: true });

    if(msg.params.connection.isClean) {
        db.remove({ 'type': 'subscribtion', 'subscribtion.connectionId': msg.params.connection.username, 'subscribtion.clientID': msg.params.connection.clientID }, { multi: true });
      //  db.remove({ 'type': 'message', 'message.connectionId': msg.params.connection.username, 'message.clientID': msg.params.connection.clientID }, { multi: true });
    }

    db.insert(msg.params);
}

function disconnectProcess(msg) {
    if (typeof CLIENT[msg.unique] == 'undefined') return;
    CLIENT[msg.unique].id = msg.username;
    db.loadDatabase();
    db.remove({ 'type': 'connection', 'connection.username': msg.username }, { multi: true });
    CLIENT[msg.unique].Disconnect();
}

function publishProcess(msg) {
    if (typeof CLIENT[msg.unique] == 'undefined') return;
  
    CLIENT[msg.unique].id = msg.username;
    CLIENT[msg.unique].Publish(msg.params);
}

function  subscribeProcess(msg) {
    if (typeof CLIENT[msg.unique] == 'undefined') return;
    CLIENT[msg.unique].Subscribe(msg.params);
}     

function unsubscribeProcess(msg) {
    if (typeof CLIENT[msg.unique] == 'undefined') return;
    CLIENT[msg.unique].Unsubscribe(msg.params);
}

function dataReceivedProcess(msg) {
    if (typeof CLIENT[msg.unique] == 'undefined') return;
    CLIENT[msg.unique].onDataRecieved(Buffer.from(msg.payload));
}

function socketOpenedprocess(msg) {

    CLIENT[msg.params.connection.unique] = new mqtt();
    CLIENT[msg.params.connection.unique].id = msg.params.connection.username;
    CLIENT[msg.params.connection.unique].clientID = msg.params.connection.clientID;
    CLIENT[msg.params.connection.unique].unique = msg.params.connection.unique;  
    tokens[msg.params.connection.unique] = new TOKENS();
    CLIENT[msg.params.connection.unique].userInfo = msg.params.connection; 
    CLIENT[msg.params.connection.unique].Connect(msg.params.connection);
}
var methods = {
    send: send,
    publish: publish,
    getData: getData
}

module.exports = methods;
