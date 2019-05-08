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
var bus = require('servicebus').bus({
    queuesFile: `.queues.amqp-net.${process.pid}`
});
var cluster = require('cluster');
var numCPUs = args[0] || require('os').cpus().length;

var TIMERS = require('./lib/Timers');
var Timer = require('./lib/Timer');

var Datastore = require('nedb');
var db = new Datastore({ filename: 'data' });
var vm = this;

if (cluster.isMaster) {
    if (!module.parent) {
        for (var i = 0; i < numCPUs; i++) {
            worker[i] = cluster.fork();
        }
    }
} else {
    vm.connections = {};
    vm.connectionParams = {};
    vm.timers = {};

    setTimeout(function () {

        bus.listen('amqp.newSocket', function (msg) {
            vm.unique = msg.params.connection.unique;

            bus.listen('amqp.sendData' + vm.unique, function (msg) { sendData(msg) });
            bus.listen('amqp.done' + vm.unique, function (msg) { connectionDone(msg) });

            createSocket(msg);
        });


    }, 100 * (cluster.worker.id + 4));
}

function createSocket(msg) {
    try {
        if (msg.params.connection.secure) {
            if (msg.params.connection.certificate) {
                const options = {
                    key: msg.params.connection.certificate,
                    cert: msg.params.connection.certificate,
                    passphrase: msg.params.connection.privateKey
                };
                vm.connections[msg.params.connection.unique] = tls.connect(msg.params.connection.port, msg.params.connection.host, options);
            } else {
                vm.connections[msg.params.connection.unique] = tls.connect(msg.params.connection.port, msg.params.connection.host);
            }
        } else {
            vm.connections[msg.params.connection.unique] = net.createConnection(msg.params.connection.port, msg.params.connection.host);
        }

        vm.connections[msg.params.connection.unique].username = msg.params.connection.username;
        vm.connections[msg.params.connection.unique].unique = msg.params.connection.unique;
        vm.connections[msg.params.connection.unique].connection = msg.params.connection;

        vm.connections[msg.params.connection.unique].on('data', function onDataReceived(data) {
                bus.send('amqp.dataReceived' + vm.unique, {
                    payload: data,
                    username: this.username,
                    unique: this.unique
                });
            });
            vm.connections[msg.params.connection.unique].on('error', function(e) {
               socketEndOnError(e, msg.params.connection.unique, msg.packetID);
               return;
            })        
    } catch (e) {
        socketEndOnError(e, msg.params.connection.unique, msg.packetID);       
        return;
    }
    vm.connectionParams[msg.params.connection.unique] = msg;
    vm.timers[msg.params.connection.unique] = new TIMERS();
    bus.send('amqp.socketOpened' + vm.unique, msg);
}

function sendData(msg) {
    if (typeof vm.connections[msg.unique] == 'undefined') return;
    if (msg.parentEvent == 'amqp.publish' || msg.parentEvent == 'amqp.pingreq') {
        var newTimer = Timer({
            callback: function () {
                try {
                    if (!vm.connections[msg.unique]) return;
                    vm.connections[msg.unique].write(Buffer.from(msg.payload));
                } catch (e) {
                    socketEndOnError(e, msg.unique, msg.packetID);                    
                    return;
                }
            },
            interval: vm.connections[msg.unique].connection.keepalive * 1000
        });

        vm.timers[msg.unique].setTimer(msg.packetID, newTimer);
    }
    try {
        vm.connections[msg.unique].write(Buffer.from(msg.payload));
    } catch (e) {
        socketEndOnError(e, msg.unique, msg.packetID);        
        return;
    }
}

function connectionDone(msg) {
    if (typeof vm.timers[msg.unique] == 'undefined') return;
    vm.timers[msg.unique].releaseTimer(msg.packetID);

    if (msg.parentEvent == 'amqp.disconnect') {
        db.loadDatabase();
        db.remove({ type: 'connack', unique: msg.unique })
        vm.connections[msg.unique].end();
        delete vm.connections[msg.unique];
        delete vm.timers[msg.unique];
        delete vm.connectionParams[msg.unique];
    }
}

function socketEndOnError(e, unique, packetID) {
    console.log('Unable to establish connection to the server. Error: ', e);
    db.loadDatabase();
    db.remove({ type: 'connack', unique: unique })
    if (typeof vm.timers[unique] != 'undefined') {
        vm.timers[unique].releaseTimer(packetID);
        delete vm.timers[unique];
    }
    if (typeof vm.connections[unique] != 'undefined') {
        vm.connections[unique].end();
        delete vm.connections[unique];
    }
    if (typeof vm.connectionParams[unique] != 'undefined')
        delete vm.connectionParams[unique];
}
