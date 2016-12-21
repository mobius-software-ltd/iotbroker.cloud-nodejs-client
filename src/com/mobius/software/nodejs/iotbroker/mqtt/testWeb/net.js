// "use strict";
var args = process.argv.slice(2);

var net = require('net');
// var bus = require('servicebus').bus();
const cluster = require('cluster');
const numCPUs = args[0] || require('os').cpus().length;

var TOKENS = require('../client/lib/Tokens');
var TIMERS = require('../client/lib/Timers');
var Timer = require('../client/lib/Timer');
var bus = require('../client/lib/bus');

// console.log('PID: ', process.pid);

if (cluster.isMaster) {
    if (!module.parent) {
        for (var i = 0; i < numCPUs; i++) {
            worker[i] = cluster.fork();
        }
    }
} else {
    setTimeout(function() {

        // }, timeout);
        // console.log('NET sub worker runned id:', cluster.worker.id);

        var connections = {};
        var timers = {};
        var tokens = {};

        // console.log(bus)
        bus.listen('net.newSocket', function(msg) {
            // console.log('NEW SOCKET CALLBACK');
            try {
                var socket = net.createConnection(msg.params.connection.port, msg.params.connection.host);
            } catch (e) {
                console.log('Unable to establish connection to the server. Error: ', e);
            }
            socket.username = msg.params.connection.username;
            socket.connection = msg.params.connection;

            socket.on('data', function onDataReceived(data) {
                bus.publish('mqtt.dataReceived', {
                    payload: data,
                    username: this.username
                })
            });
            connections[msg.params.connection.username] = socket;
            timers[msg.params.connection.username] = new TIMERS();
            bus.send('mqtt.socketOpened', msg);
        });

        bus.subscribe('net.sendData', function(msg) {
            if (typeof connections[msg.username] == 'undefined') return;
            if (msg.parentEvent != 'mqttDisconnect' && msg.parentEvent != 'mqttPubackOut' && msg.parentEvent != 'mqttPubrecOut' && msg.parentEvent != 'mqttPubcompOut') {
                var newTimer = Timer({
                    callback: function() {
                        connections[msg.username].write(Buffer.from(msg.payload));
                    },
                    interval: connections[msg.username].connection.keepalive * 1000
                });
                timers[msg.username].setTimer(msg.packetID, newTimer);
            }

            connections[msg.username].write(Buffer.from(msg.payload));
        })

        bus.subscribe('net.done', function(msg) {
            if (typeof timers[msg.username] == 'undefined') return;

            timers[msg.username].releaseTimer(msg.packetID);
            if (msg.parentEvent == 'mqttDisconnect') {
                connections[msg.username].end();
                delete timers[msg.packetID];
                delete connections[msg.packetID];
            }

        });
    }, 100 * (cluster.worker.id + 4));

}