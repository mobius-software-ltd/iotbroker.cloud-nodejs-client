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
    queuesFile: `.queues.mqtt.${process.pid}`
});

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
    var unique;
    var username;
    var thisClientID;

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
            
            unique = msg.params.connection.unique;
            if(unique) {            
                bus.listen('mqtt.disconnect' + unique, function(msg) { 
                    if (typeof CLIENT[msg.unique] == 'undefined') return;
                    CLIENT[msg.unique].id = msg.username;
                    db.loadDatabase();
                    db.remove({ 'type': 'connection', 'connection.username': msg.username }, { multi: true });
                    CLIENT[msg.unique].Disconnect();
                });

                bus.listen('mqtt.publish' + unique, function(msg) {
                    if (typeof CLIENT[msg.unique] == 'undefined') return;
                    if (msg.params.qos != 0)
                        msg.params.token = tokens[msg.unique].getToken();
        
                    CLIENT[msg.unique].id = msg.username;
                    CLIENT[msg.unique].Publish(msg.params);
                });

                bus.listen('mqtt.subscribe' + unique, function(msg) {                    
                    if (typeof CLIENT[msg.unique] == 'undefined') return;
                    msg.params.token = tokens[msg.unique].getToken();
                    CLIENT[msg.unique].Subscribe(msg.params);
                });

                
                bus.listen('mqtt.unsubscribe' + unique, function(msg) {
                    if (typeof CLIENT[msg.unique] == 'undefined') return;
                    msg.params.token = tokens[msg.unique].getToken();
                    CLIENT[msg.unique].Unsubscribe(msg.params);
                });

                bus.listen('mqtt.socketOpened' + unique, function(msg) {
                    CLIENT[msg.params.connection.unique] = new mqtt();
                    CLIENT[msg.params.connection.unique].id = msg.params.connection.username;
                    username = msg.params.connection.username;
                    CLIENT[msg.params.connection.unique].clientID = msg.params.connection.clientID;
                    thisClientID = msg.params.connection.clientID 
                    CLIENT[msg.params.connection.unique].unique = msg.params.connection.unique;
                    unique = msg.params.connection.unique;
                    tokens[msg.params.connection.unique] = new TOKENS();
        
                    CLIENT[msg.params.connection.unique].on('mqttConnect', function(data) {
                         sendData(data, 0, 'mqttConnect'); });
        
                    CLIENT[msg.params.connection.unique].on('mqttDisconnect', function(data) {               
                        sendData(data, 0, 'mqttDisconnect');
                        connectionDone(0, 'mqttDisconnect');
        
                        delete CLIENT[this.unique];
                        delete tokens[this.unique];
                    });
        
                    CLIENT[msg.params.connection.unique].on('mqttConnack', function(data) {              
                        var that = this;
                        connectionDone(data.getPacketID(), 'mqttConnack');  
        
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
                         sendData(data, 0, 'mqttPing');
        
                        pingTimeout = setTimeout(function() {
                            publishDisconnect();
                        }, msg.params.connection.keepalive * 2 * 1000);
                    });
        
                    CLIENT[msg.params.connection.unique].on('mqttPubrec', function(packetID) {
                        connectionDone(packetID, 'mqttPubrec');  
                    });
        
                    CLIENT[msg.params.connection.unique].on('mqttPublish', function(data, msg, packetID) {
                        sendData(data, packetID, 'mqttPublish');
                        connectionDone(packetID, 'mqttPublish');  
                       
                        if (msg.qos == 0) {
                            msg.direction = 'out';
                            saveMessage(msg);                   
                        }
                    });
        
                    CLIENT[msg.params.connection.unique].on('mqttPubrel', function(data, packetID) {
                        sendData(data, packetID, 'mqttPubrel');               
                    });
        
                    CLIENT[msg.params.connection.unique].on('mqttPuback', function(data, msg) {
                        connectionDone(data.getPacketID(), 'mqttPuback'); 
                        tokens[this.unique].releaseToken(data.getPacketID());
                        msg.direction = 'out';
                        saveMessage(msg);
                        
                    });
        
                    CLIENT[msg.params.connection.unique].on('mqttPubcomp', function(data, msg) {
                        connectionDone(data.getPacketID(), 'mqttPubcomp');                
                        tokens[this.unique].releaseToken(data.getPacketID());
                        msg.direction = 'out';
                        saveMessage(msg);              
                    });
        
                    CLIENT[msg.params.connection.unique].on('mqttSubscribe', function(data, packetID) {
                        sendData(data, packetID, 'mqttSubscribe');               
                    });
        
                    CLIENT[msg.params.connection.unique].on('mqttSuback', function(data, msg) {
                        connectionDone(data.getPacketID(), 'mqttSuback'); 
                       
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
                        sendData(data, packetID, 'mqttUnsubscribe');                
                    });
        
                    CLIENT[msg.params.connection.unique].on('mqttUnsuback', function(data, msg) {
                        connectionDone(data.getPacketID(), 'mqttUnsuback');
                       
                        db.loadDatabase();
                        tokens[this.unique].releaseToken(data.getPacketID());
                        for (var i = 0; i < msg.length; i++) {
                            db.remove({ 'type': 'subscribtion', 'subscribtion.topic': msg[i] }, { multi: true });
                        }
                    });
        
                    CLIENT[msg.params.connection.unique].on('mqttPublishIn', function(msg) {
                        if (!msg) return;
        
                        msg.direction = 'in';
                        saveMessage(msg);               
                    });
        
                    CLIENT[msg.params.connection.unique].on('mqttPubackOut', function(data, msg) {
                        if (!data) return;
        
                        sendData(data, msg.packetID, 'mqttPubackOut'); 
        
                        msg.direction = 'in';
                        saveMessage(msg);  
                    });
        
                    CLIENT[msg.params.connection.unique].on('mqttPubrecOut', function(data, msg) {
                        if (!data) return;
                        sendData(data, msg.packetID, 'mqttPubrecOut');  
                    });
        
                    CLIENT[msg.params.connection.unique].on('mqttPubcompOut', function(data, id, msg) {               
                        if (!data) return;
                        sendData(data, id, 'mqttPubcompOut'); 
                        if(msg) {
                            msg.direction = 'in';
                            saveMessage(msg); 
                        }                    
                    });
        
                    CLIENT[msg.params.connection.unique].on('mqttPingResp', function() {
                        clearTimeout(pingTimeout);
                        pingTimeout = setTimeout(function() {
                            publishDisconnect()                   
                        }, msg.params.connection.keepalive * 2 * 1000);
                    });
        
                    CLIENT[msg.params.connection.unique].Connect(msg.params.connection);
                });
        
                bus.listen('mqtt.dataReceived' + unique, function(msg) {
                    if (typeof CLIENT[msg.unique] == 'undefined') return;
                    CLIENT[msg.unique].onDataRecieved(Buffer.from(msg.payload));
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
    db.find(req, function(err, docs) {
        if (!!err)
            res.send({ 'Error:': err });
        res.send(JSON.stringify(docs));
    });
}

function sendData(payload, packetID, parentEvent) {       
    bus.send('net.sendData' + unique, {
        payload: payload,
        username: username,
        packetID: packetID,
        parentEvent: parentEvent,
        unique: unique
    });    
}

function connectionDone(packetID, parentEvent) {
    bus.send('net.done' + unique, {
        packetID: packetID,
        username: username,
        parentEvent: parentEvent,
        unique: unique
    });
}

function saveMessage(msg) {
    var message = {
        type: 'message',
        message: {
            topic: msg.topic,
            qos: msg.qos,
            content: msg.content,
            connectionId: username,
            direction: msg.direction,
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
    bus.send('mqtt.disconnect' + unique, {
        msg: 'disconnect',
        username: username,
        unique: unique
    });
}
var methods = {
    send: send,
    publish: publish,
    getData: getData
}

module.exports = methods;