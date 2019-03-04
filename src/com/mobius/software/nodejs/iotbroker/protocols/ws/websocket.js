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

var args = process.argv.slice(2);

var WebSocketClient = require('websocket').client;
var bus = require('servicebus').bus({
    queuesFile: `.queues.ws-ws.${process.pid}`
});
var cluster = require('cluster');
var numCPUs = args[0] || require('os').cpus().length;
var Datastore = require('nedb');
var db = new Datastore({ filename: 'data' });
var TOKENS = require('./lib/Tokens');
var TIMERS = require('./lib/Timers');
var Timer = require('./lib/Timer');
var unique;
var connections = {};
var connectionParams = {};
var timers = {};
var tokens = {};

if (cluster.isMaster) {
    if (!module.parent) {
        for (var i = 0; i < numCPUs; i++) {
            worker[i] = cluster.fork();
        }
    }
} else {
    setTimeout(function () {
        bus.listen('wss.newSocket', function (msg) {
            unique = msg.params.connection.unique;

            bus.listen('wss.sendData' + unique, function (msg) { sendData(msg) });
            bus.listen('wss.done' + unique, function (msg) { connectionDone(msg) });
            
            createSocket(msg);
        });

      
    }, 100 * (cluster.worker.id + 4));
}

function createSocket(msg) {
    try {
        if (msg.params.connection.secure) {
            var urlString = "wss://" + msg.params.connection.host + ":" + msg.params.connection.port + '/ws';
            if (msg.params.connection.certificate) {
                var socket = new WebSocketClient({
                    tlsOptions: {
                        key: msg.params.connection.certificate,
                        cert: msg.params.connection.certificate,
                        passphrase: msg.params.connection.privateKey
                    }
                });
            } else {
                var socket = new WebSocketClient()
            }
        } else {
            var urlString = "ws://" + msg.params.connection.host + ":" + msg.params.connection.port + '/ws';
            var socket = new WebSocketClient()
        }

        var oldUserName = socket.username;
        socket.username = msg.params.connection.username;
        socket.unique = msg.params.connection.unique;
        socket.connection = msg.params.connection;

        if (typeof oldUserName == 'undefined') {
            socket.on('connectFailed', function (error) {
                console.log('Connect Error: ' + error.toString());
            });

            socket.on('connect', function (connection) {
                connections[msg.params.connection.unique] = connection;
                connection.username = msg.params.connection.username;
                connection.unique = msg.params.connection.unique;
                connections[msg.params.connection.unique].connection = {};
                connections[msg.params.connection.unique].connection.keepalive = msg.params.connection.keepalive;
                connectionParams[msg.params.connection.unique] = msg;
                timers[msg.params.connection.unique] = new TIMERS();
                bus.send('ws.socketOpened' + unique, msg);
                connection.on('error', function (error) {
                    console.log("Connection Error: " + error.toString());
                });
                connection.on('close', function () {
                    bus.send('wss.done' + unique, {
                        // packetID: packetID,
                        username: socket.username,
                        parentEvent: 'wsDisconnect',
                        unique: socket.unique
                    });
                });

                connection.on('message', function (data) {
                    bus.send('ws.dataReceived' + unique, {
                        payload: data,
                        username: this.username,
                        unique: this.unique
                    });
                });

            });
            socket.connect(urlString);
        }

    } catch (e) {
        socketEndOnError(e, msg.params.connection.unique, msg.packetID);       
        return;
    }
}

function sendData(msg) {
    if (typeof connections[msg.unique] == 'undefined') return;
    if (msg.parentEvent != 'wsDisconnect' && msg.parentEvent != 'wsPubackOut' && msg.parentEvent != 'wsPubrecOut' && msg.parentEvent != 'wsPubcompOut' && msg.parentEvent != 'wsPublish0') {
        var newTimer = Timer({
            callback: function () {
                try {

                    if (typeof connections[msg.unique] == 'undefined') {
                        if (typeof msg.packetID != 'undefined' && typeof timers[msg.unique] != 'undefined') {
                            timers[msg.unique].releaseTimer(msg.packetID);
                        }

                        return
                    }
                    connections[msg.unique].send(msg.payload);

                } catch (e) {
                    socketEndOnError(e, msg.unique, msg.packetID);                   
                    return;
                }
            },
            interval: connections[msg.unique].connection.keepalive * 1000
        });
        if (msg.packetID) {

            timers[msg.unique].setTimer(msg.packetID, newTimer);
        }
    }
    try {
        if (JSON.parse(msg.payload).packet != 12) {
            if (connections[msg.unique])
                connections[msg.unique].send(msg.payload);
        }
    } catch (e) {
        socketEndOnError(e, msg.unique, msg.packetID);       
        return;
    }
}

function connectionDone(msg) {
    if (typeof timers[msg.unique] == 'undefined') return;
    if (msg.packetID)
        timers[msg.unique].releaseTimer(msg.packetID);

    if (msg.parentEvent == 'wsDisconnect') {
        db.loadDatabase();
        db.remove({ type: 'connack', unique: msg.unique })
        connections[msg.unique].close();
        delete timers[msg.unique];
        delete connections[msg.unique];
        delete connectionParams[msg.unique];
    }
}

function socketEndOnError(e, unique, packetID) {
    console.log('Unable to establish connection to the server. Error: ', e);
    db.loadDatabase();
    db.remove({ type: 'connack', unique: unique })
    if (typeof timers[unique] != 'undefined') {
        timers[unique].releaseTimer(packetID);
        delete timers[unique];
    }
    if (typeof connections[unique] != 'undefined') {
        connections[unique].end();
        delete connections[unique];
    }
    if (typeof connectionParams[unique] != 'undefined')
        delete connectionParams[unique];
}