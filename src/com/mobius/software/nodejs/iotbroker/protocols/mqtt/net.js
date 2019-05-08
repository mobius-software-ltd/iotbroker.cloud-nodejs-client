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
    queuesFile: `.queues.mqtt-net.${process.pid}`
});
var cluster = require('cluster');
var numCPUs = args[0] || require('os').cpus().length;

var TOKENS = require('./lib/Tokens');
var TIMERS = require('./lib/Timers');
var Timer = require('./lib/Timer');
var Datastore = require('nedb');
var db = new Datastore({ filename: 'data' });
var connections = {};
var connectionParams = {};
var timers = {};
var tokens = {};
var socket = {}
var unique;
if (cluster.isMaster) {
    if (!module.parent) {
        for (var i = 0; i < numCPUs; i++) {
            worker[i] = cluster.fork();
        }
    }
} else {
    setTimeout(function () {       

        bus.listen('net.newSocket', function (msg) { 
            
            unique = msg.params.connection.unique;
             bus.listen('net.sendData' + unique, function(msg) { sendData(msg) });
             bus.listen('net.done' + unique, function(msg) { connectionDone(msg) });

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
                connections[msg.params.connection.unique] = tls.connect(msg.params.connection.port, msg.params.connection.host, options);
            } else {
                connections[msg.params.connection.unique] = tls.connect(msg.params.connection.port, msg.params.connection.host);
            }
        } else {
            connections[msg.params.connection.unique] = net.createConnection(msg.params.connection.port, msg.params.connection.host);
          
            }

        connections[msg.params.connection.unique].username = msg.params.connection.username;
        connections[msg.params.connection.unique].unique = msg.params.connection.unique;
        connections[msg.params.connection.unique].connection = msg.params.connection;
         
        connections[msg.params.connection.unique].on('data', function onDataReceived(data) {
                bus.send('mqtt.dataReceived' + unique, {
                    payload: data,
                    username: connections[msg.params.connection.unique].username,
                    unique: connections[msg.params.connection.unique].unique
                });
            });
            connections[msg.params.connection.unique].on('error', function(e) {
                socketEndOnError(e, msg.params.connection.unique, msg.packetID);
               return;
            })
    } catch (e) {
        socketEndOnError(e, msg.params.connection.unique, msg.packetID);       
        return;
    }
    connectionParams[msg.params.connection.unique] = msg;
    timers[msg.params.connection.unique] = new TIMERS();
    bus.send('mqtt.socketOpened' + unique, msg);
};

function sendData(msg) {
    if (typeof connections[msg.unique] == 'undefined') return;          
    if (msg.parentEvent != 'mqttDisconnect' && msg.parentEvent != 'mqttPubackOut' && msg.parentEvent != 'mqttPubrecOut' && msg.parentEvent != 'mqttPubcompOut') {
        var newTimer = Timer({
            callback: function () {
                try {
                    if(connections[msg.unique])
                    	connections[msg.unique].write(Buffer.from(msg.payload));
		    else
                       newTimer.stopTimer();
                } catch (e) {
                    socketEndOnError(e, msg.unique, msg.packetID);                   
                    return;
                }
            },
            interval: connections[msg.unique].connection.keepalive * 1000
        });
        timers[msg.unique].setTimer(msg.packetID, newTimer);
    }
    try {
        if(connections[msg.unique] && typeof msg.payload != 'undefined')
        connections[msg.unique].write(Buffer.from(msg.payload));
    } catch (e) {
        socketEndOnError(e, msg.unique, msg.packetID);
        return;
    }
    // connections[msg.unique].write(Buffer.from(msg.payload));
};

function connectionDone(msg) {   
    if (typeof timers[msg.unique] == 'undefined') return;
    timers[msg.unique].releaseTimer(msg.packetID);

    if (msg.parentEvent == 'mqttDisconnect') {
        db.loadDatabase();
        db.remove({ type: 'connack', unique: msg.unique })
        connections[msg.unique].end();
        delete timers[msg.unique];
        delete connections[msg.unique];
        delete connectionParams[msg.unique];
    }

}

function socketEndOnError(e, unique, packetID) {
    console.log('Unable to establish connection to the server. Error: ', e);
    db.loadDatabase();
    db.remove({ type: 'connack', unique: unique });
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
