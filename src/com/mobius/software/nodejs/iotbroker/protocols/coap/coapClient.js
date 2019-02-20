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
'use strict';
var args = process.argv.slice(2);
var coap = require('./coap');
var UDP = require('./coapudp');
var bus = require('servicebus').bus({
    queuesFile: `.queues.coap.${process.pid}`
});
var guid = require('./lib/guid');
var Datastore = require('nedb');
const cluster = require('cluster');
const numCPUs = args[0] || require('os').cpus().length;
var parser = require('./COAPParser');
var ENUM = require('./lib/enum');
var TOKENS = require('./lib/Tokens');
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
   
    var unique;
    var thisClientID;
    var connections = {};
    var timers = {};
    var tokens = {};
    var db = new Datastore({ filename: 'data' });
    var dbUsers = new Datastore({ filename: 'users' });
    var CLIENT = {};
   
    setTimeout(function () {

      
        bus.listen('coap.connect', function (msg) { processConnect(msg)        
            unique = msg.params.connection.unique;
            if(unique){
                bus.listen('coap.subscribe' + unique, function (msg) { processSubscribe(msg) });
                bus.listen('coap.unsubscribe' + unique, function (msg) { processUnsubscribe(msg) });
                bus.listen('coap.publish' + unique, function (msg) { processPublish(msg) });
                bus.listen('coap.disconnect' + unique, function (msg) { processDisconnect(msg) });
                bus.listen('coap.datareceived' + unique, function (msg) { processDataReceived(msg) });
                bus.listen('coap.startping' + unique, function (msg) { processPing(msg) }); 
            }
        })
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

function connectionDone(packetID, parentEvent, token) {
    bus.send('coapudp.done' + unique, {
        clientID: thisClientID,
        unique: unique,
        parentEvent: parentEvent,
        packetID: packetID,
        token: token
    });
}

function processConnect(msg) {
    dbUsers.loadDatabase();
    dbUsers.find({
        clientID: msg.params.connection.clientID,
        port: msg.params.connection.port,
        host: msg.params.connection.host,
    }, function (err, docs) {               
        if(docs.length) {
            for(var i=0; i<docs.length; i++) {
                process.send(docs[i]);
                dbUsers.remove({ 'unique': docs[i].unique }, { multi: true });                      
            }                 
        }
    });           
  
    bus.send('coapudp.newSocket', msg);
    db.loadDatabase();
    db.remove({ 'type': 'connection', 'connection.clientID': msg.params.connection.clientID }, { multi: true });
    db.insert(msg.params);

    CLIENT[msg.params.connection.unique] = new coap();
    CLIENT[msg.params.connection.unique].id = msg.params.connection.clientID;
    CLIENT[msg.params.connection.unique].unique = msg.params.connection.unique;
    CLIENT[msg.params.connection.unique].keepalive = msg.params.connection.keepalive;
    CLIENT[msg.params.connection.unique].qos = msg.params.connection.qos;
    tokens[msg.params.connection.unique] = new TOKENS();
    thisClientID = msg.params.connection.clientID;
   
    dbUsers.loadDatabase();
    var user = {
        type: 'coap',
        worker: cluster.worker.process.pid,
        unique: msg.params.connection.unique,
        clientID: msg.params.connection.clientID,
        port: msg.params.connection.port,
        host: msg.params.connection.host,
    }
    dbUsers.insert(user);
} 

function processSubscribe(msg) {    
    if (typeof CLIENT[msg.params.unique] == 'undefined') return;              
    msg.params.token = tokens[msg.params.unique].getToken(); 
    CLIENT[msg.params.unique].subscribtion = {};
    CLIENT[msg.params.unique].subscribtion[msg.params.token] = msg.params;                               
    CLIENT[msg.params.unique].Subscribe(msg.params);
}

function processUnsubscribe(msg) {
    if (typeof CLIENT[msg.unique] == 'undefined') return;
                   
    msg.token = tokens[msg.unique].getToken();
    CLIENT[msg.unique].Unsubscribe(msg);
}

function processPublish(msg) {
    if (typeof CLIENT[msg.unique] == 'undefined') return;
    msg.params.token = tokens[msg.unique].getToken();
    msg.params.clientID = msg.clientID;
    msg.params.unique = msg.unique;
    msg.params.qos = msg.params.qos;
    CLIENT[msg.unique].publish = {}
    CLIENT[msg.unique].publish[msg.params.token] = msg.params;
    CLIENT[msg.unique].Publish(msg.params);
}

function processDisconnect(msg) {
    if (typeof CLIENT[msg.unique] == 'undefined') return;
    db.loadDatabase();
    db.remove({ 'type': 'connection', 'connection.username': msg.clientID }, { multi: true });
    connectionDone(null, 'coap.disconnect');    
}

function processDataReceived(msg) {
    if (typeof CLIENT[msg.unique] == 'undefined') return;            
    CLIENT[msg.unique].onDataRecieved(Buffer.from(msg.payload));
}

function processPing(msg) {
    if (typeof CLIENT[msg.unique] == 'undefined') return;      
    CLIENT[msg.unique].Ping(CLIENT[msg.unique].id, msg.unique); 
}     

var methods = {
    send: send,
    publish: publish,
    getData: getData
}

module.exports = methods;