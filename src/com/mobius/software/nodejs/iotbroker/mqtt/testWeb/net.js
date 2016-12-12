"use strict";
var net = require('net');
var bus = require('servicebus').bus();
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
var TOKENS = require('../client/lib/Tokens');
var TIMERS = require('../client/lib/Timers');
var Timer = require('../client/lib/Timer');


if (cluster.isMaster) {
    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
} else {
    console.log('NET sub worker runned id:', cluster.worker.id);

    var connections = {};
    var timers = {};
    var tokens = {};


    bus.listen('net.newSocket', function(msg) {
        try {
            var socket = net.createConnection(msg.params.connection.port, msg.params.connection.host);
        } catch (e) {
            console.log('Unable to establish connection to the server. Error: ', e);
        }
        socket.clientID = msg.params.connection.clientID;
        socket.connection = msg.params.connection;

        socket.on('data', function onDataReceived(data) {
            bus.publish('mqtt.dataReceived', {
                payload: data,
                clientID: this.clientID
            })
        });
        connections[msg.params.connection.clientID] = socket;
        timers[msg.params.connection.clientID] = new TIMERS();
        // tokens[msg.params.connection.clientID] = new TOKENS();

        bus.send('mqtt.socketOpened', msg);
    });

    bus.subscribe('net.sendData', function(msg) {

        if (typeof connections[msg.clientID] == 'undefined') return;
        // console.log('!!!connections:', connections);

        if (msg.parentEvent != 'mqttDisconnect' && msg.parentEvent != 'mqttPubackOut' && msg.parentEvent != 'mqttPubrecOut' && msg.parentEvent != 'mqttPubcompOut') {
            var newTimer = Timer({
                callback: function() {
                    connections[msg.clientID].write(Buffer.from(msg.payload));
                },
                interval: connections[msg.clientID].connection.keepalive * 1000
            });
            // var t = tokens[msg.clientID].getToken();
            timers[msg.clientID].setTimer(msg.packetID, newTimer);
        }

        connections[msg.clientID].write(Buffer.from(msg.payload));
    })

    bus.subscribe('net.done', function(msg) {
        if (typeof timers[msg.clientID] == 'undefined') return;
        // console.log(timers);

        timers[msg.clientID].releaseTimer(msg.packetID);
        if (msg.parentEvent == 'mqttDisconnect') {
            connections[msg.clientID].end();
            delete timers[msg.packetID];
            delete connections[msg.packetID];
        }

    });
}