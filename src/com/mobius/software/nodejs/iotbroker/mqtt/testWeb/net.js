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

var net = require('net');
var bus = require('servicebus').bus();
var cluster = require('cluster');
var numCPUs = args[0] || require('os').cpus().length;

var TOKENS = require('../client/lib/Tokens');
var TIMERS = require('../client/lib/Timers');
var Timer = require('../client/lib/Timer');


if (cluster.isMaster) {
    if (!module.parent) {
        for (var i = 0; i < numCPUs; i++) {
            worker[i] = cluster.fork();
        }
    }
} else {
    setTimeout(function() {

        var connections = {};
        var connectionParams = {};
        var timers = {};
        var tokens = {};

        bus.listen('net.newSocket', function(msg) {
            try {
                var socket = net.createConnection(msg.params.connection.port, msg.params.connection.host);
                socket.username = msg.params.connection.username;
                socket.connection = msg.params.connection;

                socket.on('data', function onDataReceived(data) {
                    bus.publish('mqtt.dataReceived', {
                        payload: data,
                        username: this.username
                    });
                });
            } catch (e) {
                console.log('Unable to establish connection to the server. Error: ', e);
                if (typeof timers[msg.params.connection.username] != 'undefined') {
                    timers[msg.params.connection.username].releaseTimer(msg.packetID);
                    delete timers[msg.params.connection.username];
                }
                if (typeof connections[msg.params.connection.username] != 'undefined') {
                    connections[msg.params.connection.username].end();
                    delete connections[msg.params.connection.username];
                }
                if (typeof connectionParams[msg.params.connection.username] != 'undefined')
                    delete connectionParams[msg.params.connection.username];
                return;
            }
            connectionParams[msg.params.connection.username] = msg;
            connections[msg.params.connection.username] = socket;
            timers[msg.params.connection.username] = new TIMERS();
            bus.send('mqtt.socketOpened', msg);
        });

        bus.subscribe('net.sendData', function(msg) {
            if (typeof connections[msg.username] == 'undefined') return;
            if (msg.parentEvent != 'mqttDisconnect' && msg.parentEvent != 'mqttPubackOut' && msg.parentEvent != 'mqttPubrecOut' && msg.parentEvent != 'mqttPubcompOut') {
                var newTimer = Timer({
                    callback: function() {
                        try {
                            connections[msg.username].write(Buffer.from(msg.payload));
                        } catch (e) {
                            console.log('Unable to establish connection to the server. Error: ', e);
                            if (typeof timers[msg.username] != 'undefined') {
                                timers[msg.username].releaseTimer(msg.packetID);
                                delete timers[msg.username];
                            }
                            if (typeof connections[msg.username] != 'undefined') {
                                connections[msg.username].end();
                                delete connections[msg.username];
                            }
                            if (typeof connectionParams[msg.username] != 'undefined')
                                delete connectionParams[msg.username];
                            return;
                        }
                    },
                    interval: connections[msg.username].connection.keepalive * 1000
                });
                timers[msg.username].setTimer(msg.packetID, newTimer);
            }
            try {
                connections[msg.username].write(Buffer.from(msg.payload));
            } catch (e) {
                console.log('Unable to establish connection to the server. Error: ', e);
                if (typeof timers[msg.username] != 'undefined') {
                    timers[msg.username].releaseTimer(msg.packetID);
                    delete timers[msg.username];
                }
                if (typeof connections[msg.username] != 'undefined') {
                    connections[msg.username].end();
                    delete connections[msg.username];
                }
                if (typeof connectionParams[msg.username] != 'undefined')
                    delete connectionParams[msg.username];
                return;
            }
            // connections[msg.username].write(Buffer.from(msg.payload));
        });

        bus.subscribe('net.done', function(msg) {
            if (typeof timers[msg.username] == 'undefined') return;
            timers[msg.username].releaseTimer(msg.packetID);

            if (msg.parentEvent == 'mqttDisconnect') {
                connections[msg.username].end();
                delete timers[msg.username];
                delete connections[msg.username];
                delete connectionParams[msg.username];
            }

        });
    }, 100 * (cluster.worker.id + 4));
}