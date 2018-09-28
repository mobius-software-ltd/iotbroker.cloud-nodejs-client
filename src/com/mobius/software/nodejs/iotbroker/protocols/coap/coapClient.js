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
var bus = require('servicebus').bus();
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
   
    var connections = {};
    var timers = {};
    var tokens = {};
    var db = new Datastore({ filename: 'data' });
    var dbUsers = new Datastore({ filename: 'users' });
    var CLIENT = {};
   
    setTimeout(function () {

        bus.subscribe('coap.subscribe', function (msg) {          
            
            if (typeof CLIENT[msg.params.unique] == 'undefined') return;              
            msg.params.token = tokens[msg.params.unique].getToken(); 
            CLIENT[msg.params.unique].subscribtion = {};
            CLIENT[msg.params.unique].subscribtion[msg.params.token] = msg.params;                               
            CLIENT[msg.params.unique].Subscribe(msg.params);
        });

        bus.subscribe('coap.unsubscribe', function (msg) {
            if (typeof CLIENT[msg.unique] == 'undefined') return;
           
            msg.token = tokens[msg.unique].getToken();
            CLIENT[msg.unique].Unsubscribe(msg);
        });

        bus.subscribe('coap.publish', function (msg) { 
            if (typeof CLIENT[msg.unique] == 'undefined') return;
            msg.params.token = tokens[msg.unique].getToken();
            msg.params.clientID = msg.clientID;
            msg.params.unique = msg.unique;
            msg.params.qos = msg.params.qos;
            CLIENT[msg.unique].publish = {}
            CLIENT[msg.unique].publish[msg.params.token] = msg.params;
            CLIENT[msg.unique].Publish(msg.params);
        });


        bus.subscribe('coap.disconnect', function (msg) {
            if (typeof CLIENT[msg.unique] == 'undefined') return;
            db.loadDatabase();
            db.remove({ 'type': 'connection', 'connection.username': msg.clientID }, { multi: true });
            bus.publish('coapudp.done', {
                clientID: msg.clientID,
                unique: msg.unique,
                parentEvent: 'coap.disconnect'
            });
        });

        bus.subscribe('coap.datareceived', function (msg) {                
            if (typeof CLIENT[msg.unique] == 'undefined') return;            
            CLIENT[msg.unique].onDataRecieved(Buffer.from(msg.payload));
        });      
        
        bus.subscribe('coap.startping', function (msg) {                
            if (typeof CLIENT[msg.unique] == 'undefined') return;      
            CLIENT[msg.unique].Ping(CLIENT[msg.unique].id);   
        }); 

        bus.listen('coap.connect', function (msg) {           
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

            // CLIENT[msg.params.connection.unique].Ping(CLIENT[msg.params.connection.unique].id);
           
            CLIENT[msg.params.connection.unique].on('coappingreq', function (data) {
                bus.publish('coapudp.senddata', {
                    payload: data,
                    clientID: this.id,
                    unique: this.unique,
                    parentEvent: 'coappingreq'                   
                });
            });

            CLIENT[msg.params.connection.unique].on('coapsubscribe', function (data, token) {
                bus.publish('coapudp.senddata', {
                    token: token,
                    payload: data,
                    clientID: CLIENT[msg.params.connection.unique].id,
                    unique: CLIENT[msg.params.connection.unique].unique,
                    parentEvent: 'coapsubscribe'
                });
            });

            CLIENT[msg.params.connection.unique].on('coapunsubscribe', function (data, token) {
                  bus.publish('coapudp.senddata', {
                    token: token,
                    payload: data,
                    clientID: CLIENT[msg.params.connection.unique].id,
                    unique: CLIENT[msg.params.connection.unique].unique,
                    parentEvent: 'coapunsubscribe'
                });
            });

            CLIENT[msg.params.connection.unique].on('coappublish', function (data, token) {
                bus.publish('coapudp.senddata', {
                    payload: data,
                    clientID: CLIENT[msg.params.connection.unique].id,
                    unique: CLIENT[msg.params.connection.unique].unique,
                    parentEvent: 'coappublish',
                    token: token
                });
            });

            CLIENT[msg.params.connection.unique].on('coappublishreceived', function (data) {
                db.loadDatabase();
                var inMessage = {
                    type: 'coapmessage',
                    message: {    
                        qos: Buffer.from(data.getOptionValue(ENUM.CoapOptionDefinitions.COAP_ACCEPT_OPTION), 'utf8').readUInt16BE(0),                
                        topic: data.getOptionValue(ENUM.CoapOptionDefinitions.COAP_URI_PATH_OPTION),
                      //  topicID: CLIENT[id].topic.topic,
                        content: data.getPayload().toString(),
                        connectionId: CLIENT[msg.params.connection.unique].id,
                        direction: 'in',
                        unique: CLIENT[msg.params.connection.unique].unique,

                    },
                    id: guid(),
                    time: (new Date()).getTime()
                }
                db.insert(inMessage);
            });

            CLIENT[msg.params.connection.unique].on('coapsubackreceived', function (data, token) { 
                if(!token) return 
                db.loadDatabase();               
                    var subscribeData = {
                        type: 'coapsubscribtion',
                        subscribtion: {
                            token: token,
                            qos: CLIENT[msg.params.connection.unique].subscribtion[token].qos,
                            topic: CLIENT[msg.params.connection.unique].subscribtion[token].topics[0].topic,
                            connectionId: CLIENT[msg.params.connection.unique].id,
                            unique: CLIENT[msg.params.connection.unique].unique,
                            //topicID: data.getTopicID()
                        },
                    }
                db.insert(subscribeData);               
            });

            CLIENT[msg.params.connection.unique].on('coapunsubackreceived', function (data, token) {    
                db.loadDatabase();
                db.remove({ 'type': 'coapsubscribtion', 'subscribtion.token': token }, { multi: true });  
            });

            CLIENT[msg.params.connection.unique].on('coappubackreceived', function (token) {  
                if(!token) return 
                db.loadDatabase();                   
                    var outMessage = {
                        type: 'coapmessage',
                        message: {
                            qos: CLIENT[msg.params.connection.unique].publish[token].qos,
                            token: token,
                            topic: CLIENT[msg.params.connection.unique].publish[token].topic,
                            content: CLIENT[msg.params.connection.unique].publish[token].content,
                            connectionId:  CLIENT[msg.params.connection.unique].id,
                            unique: CLIENT[msg.params.connection.unique].unique,
                            direction: 'out'
                        },
                        id: guid(),
                        time: (new Date()).getTime()
                    }           
                    db.insert(outMessage);
            });

            CLIENT[msg.params.connection.unique].on('coapsendresponse', function (data, parentEvent) {
                bus.publish('coapudp.senddata', {
                    payload: data,
                    clientID: CLIENT[msg.params.connection.unique].id,
                    unique: CLIENT[msg.params.connection.unique].unique,
                    parentEvent: parentEvent
                });
            });

            CLIENT[msg.params.connection.unique].on('coapackreceived', function (data) {
                bus.publish('coapudp.done', {
                    // payload: data,
                    clientID: CLIENT[msg.params.connection.unique].id,
                    unique: CLIENT[msg.params.connection.unique].unique,
                    parentEvent: 'coapackreceived',
                    token: data.getToken()
                });
            });



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

var methods = {
    send: send,
    publish: publish,
    getData: getData
}

module.exports = methods;