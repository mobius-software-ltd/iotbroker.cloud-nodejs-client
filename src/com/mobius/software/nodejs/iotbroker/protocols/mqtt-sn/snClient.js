


"use strict";
var args = process.argv.slice(2);
var express = require('express');
var UDP = require('./udp');
var bodyParser = require('body-parser');
var sn = require('./sn');
var SNParser = require('./SNParser');
var guid = require('./lib/guid');
var Datastore = require('nedb');
var TOKENS = require('./lib/Tokens');
var TIMERS = require('./lib/Timers');
var Timer = require('./lib/Timer');
var FullTopic = require('./lib/topics/fulltopic');
var bus = require('servicebus').bus({
    queuesFile: `.queues.sn.${process.pid}`
});
const cluster = require('cluster');
const numCPUs = args[0] || require('os').cpus().length;
var SNwilltopic = require('./lib/SNwilltopic');
var parser = require('./SNParser');
var SNwillmsg = require('./lib/SNwillmsg');
var ENUM = require('./lib/enum');
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
    var tokens = {};
    var pingTimeout = {};
    var unique;
    var thisClientID;

    setTimeout(function () {
        bus.listen('sn.connect', function (msg) { processConnect(msg)
            unique = msg.params.connection.unique;
            if(unique){
                bus.listen('sn.publish' + unique, function (msg) { processPublish(msg) });
                bus.listen('sn.subscribe' + unique, function (msg) { processSubscribe(msg) });
                bus.listen('sn.unsubscribe' + unique, function (msg) { processUnsubscribe(msg) });
                bus.listen('sn.disconnect' + unique, function (msg) { processDisconnect(msg) });
                bus.listen('sn.datareceived' + unique, function (msg) { processDataReceived(msg) });
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
        if (!!err) {
            res.send({ 'Error:': err });
        }
        res.send(JSON.stringify(docs));
    });
}

function processConnect(msg) {
    bus.send('udp.newSocket', msg);
    db.loadDatabase();
    db.remove({ 'type': 'connection', 'connection.clientID': msg.params.connection.clientID }, { multi: true });
    db.insert(msg.params);
    CLIENT[msg.params.connection.unique] = new sn();
    CLIENT[msg.params.connection.unique].id = msg.params.connection.clientID;
    thisClientID = msg.params.connection.clientID;

    CLIENT[msg.params.connection.unique].unique = msg.params.connection.unique;
    tokens[msg.params.connection.unique] = new TOKENS();
    if (msg.params.connection.will) {
        CLIENT[msg.params.connection.unique].flags = msg.params.connection.will.topic && msg.params.connection.will.content ? 1 : 0;
        CLIENT[msg.params.connection.unique].topic = msg.params.connection.will.topic;
        CLIENT[msg.params.connection.unique].qos = msg.params.connection.will.qos;
        CLIENT[msg.params.connection.unique].message = msg.params.connection.will.content;
        CLIENT[msg.params.connection.unique].retain = msg.params.connection.will.retain;
    } else {
        CLIENT[msg.params.connection.unique].flags = 0;
    }
    CLIENT[msg.params.connection.unique].keepalive = msg.params.connection.keepalive;
}

function processPublish(msg) {
    if (typeof CLIENT[msg.unique] == 'undefined') return;
    msg.params.token = tokens[msg.unique].getToken();


    CLIENT[msg.unique].publish = msg;

    db.loadDatabase();
    db.find({
        type: 'snregack',
        'message.topic': msg.params.topic
    }, function (err, docs) {
        if (docs.length) {
            var pub = CLIENT[msg.unique].publish.params
            pub.packetID = docs[0].message.packetID;
            pub.topicID = docs[0].message.topicID;
            CLIENT[msg.unique].Publish(pub);
        } else {
            CLIENT[msg.unique].Register(msg);
        }
    });   
}

function  processSubscribe(msg) {
    if (typeof CLIENT[msg.params.unique] == 'undefined') return;
    msg.params.token = tokens[msg.params.unique].getToken();
    CLIENT[msg.params.unique].Subscribe(msg.params);
}

function  processUnsubscribe(msg) {
    if (typeof CLIENT[msg.unique] == 'undefined') return;
    msg.token = tokens[msg.unique].getToken();
    CLIENT[msg.unique].Unsubscribe(msg);
}

function processDisconnect(msg) {
    if (typeof CLIENT[msg.unique] == 'undefined') return;
    CLIENT[msg.unique].keepalive = msg.keepalive;
    db.loadDatabase();
    db.remove({ 'type': 'connection', 'connection.username': msg.clientID }, { multi: true });
    CLIENT[msg.unique].Disconnect(msg.keepalive);
}

function processDataReceived(msg) {
    if (typeof CLIENT[msg.unique] == 'undefined') return;
    CLIENT[msg.unique].onDataRecieved(Buffer.from(msg.payload), unique, thisClientID, tokens[msg.unique]);
}
var methods = {
    send: send,
    publish: publish,
    getData: getData
}

module.exports = methods;