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
var tls = require('tls');
var bus = require('servicebus').bus();
var cluster = require('cluster');
var numCPUs = args[0] || require('os').cpus().length;

var TOKENS = require('./lib/Tokens');
var TIMERS = require('./lib/Timers');
var Timer = require('./lib/Timer');


if (cluster.isMaster) {
    if (!module.parent) {
        for (var i = 0; i < numCPUs; i++) {
            worker[i] = cluster.fork();
        }
    }
} else {
    setTimeout(function () {

        var connections = {};
        var connectionParams = {};
        var timers = {};
        var tokens = {};

        bus.listen('amqp.newSocket', function (msg) {
            try {
                if (msg.params.connection.secure) {
                    if (msg.params.connection.certificate) {
                        const options = {
                            key: msg.params.connection.certificate,
                            cert: msg.params.connection.certificate,
                            passphrase: msg.params.connection.privateKey
                        };                        
                        var socket = tls.connect(msg.params.connection.port, msg.params.connection.host, options);
                    } else {
                        var socket = tls.connect(msg.params.connection.port, msg.params.connection.host);
                    }
                } else {
                    var socket = net.createConnection(msg.params.connection.port, msg.params.connection.host);
                }

                var oldUserName = socket.username;
                socket.username = msg.params.connection.username;
                socket.unique = msg.params.connection.unique;
                socket.connection = msg.params.connection;

                if (typeof oldUserName == 'undefined') {
                    socket.on('data', function onDataReceived(data) {
                        bus.publish('amqp.dataReceived', {
                            payload: data,
                            username: this.username,
                            unique: this.unique
                        });
                    });
                }
            } catch (e) {
                console.log('Unable to establish connection to the server. Error: ', e);
                if (typeof timers[msg.params.connection.unique] != 'undefined') {
                    timers[msg.params.connection.unique].releaseTimer(msg.packetID);
                    delete timers[msg.params.connection.unique];
                }
                if (typeof connections[msg.params.connection.unique] != 'undefined') {
                    connections[msg.params.connection.unique].end();
                    delete connections[msg.params.connection.unique];
                }
                if (typeof connectionParams[msg.params.connection.unique] != 'undefined')
                    delete connectionParams[msg.params.connection.unique];
                return;
            }
            connectionParams[msg.params.connection.unique] = msg;
            connections[msg.params.connection.unique] = socket;
            timers[msg.params.connection.unique] = new TIMERS();
            bus.send('amqp.socketOpened', msg);
        });

        bus.subscribe('amqp.sendData', function (msg) {

            if (typeof connections[msg.unique] == 'undefined') return;
            if (msg.parentEvent == 'amqp.publish' || msg.parentEvent == 'amqp.pingreq') {
                var newTimer = Timer({
                    callback: function () {
                        try {
                            if (!connections[msg.unique]) return;

                            connections[msg.unique].write(Buffer.from(msg.payload));
                        } catch (e) {
                            console.log('Unable to establish connection to the server. Error: ', e);
                            if (typeof timers[msg.unique] != 'undefined') {
                                timers[msg.unique].releaseTimer(msg.packetID);
                                delete timers[msg.unique];
                            }
                            if (typeof connections[msg.unique] != 'undefined') {
                                connections[msg.unique].end();
                                delete connections[msg.unique];
                            }
                            if (typeof connectionParams[msg.unique] != 'undefined')
                                delete connectionParams[msg.unique];
                            return;
                        }
                    },
                    interval: connections[msg.unique].connection.keepalive * 1000
                });

                timers[msg.unique].setTimer(msg.packetID, newTimer);
            }
            try {
                connections[msg.unique].write(Buffer.from(msg.payload));
            } catch (e) {
                console.log('Unable to establish connection to the server. Error: ', e);
                if (typeof timers[msg.unique] != 'undefined') {
                    timers[msg.unique].releaseTimer(msg.packetID);
                    delete timers[msg.unique];
                }
                if (typeof connections[msg.unique] != 'undefined') {
                    connections[msg.unique].end();
                    delete connections[msg.unique];
                }
                if (typeof connectionParams[msg.unique] != 'undefined')
                    delete connectionParams[msg.unique];
                return;
            }
            // connections[msg.unique].write(Buffer.from(msg.payload));
        });

        bus.subscribe('amqp.done', function (msg) {

            if (typeof timers[msg.unique] == 'undefined') return;
            timers[msg.unique].releaseTimer(msg.packetID);

            if (msg.parentEvent == 'amqp.disconnect') {
                console.log('DELETE ALL')
                connections[msg.unique].end();
                delete connections[msg.unique];
                delete timers[msg.unique];
                delete connectionParams[msg.unique];
                console.log('STOP!')
            }

        });
    }, 100 * (cluster.worker.id + 4));
}