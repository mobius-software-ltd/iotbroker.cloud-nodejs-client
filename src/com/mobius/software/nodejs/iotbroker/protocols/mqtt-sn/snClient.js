


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
        bus.listen('sn.connect', function (msg) {
            bus.send('udp.newSocket', msg);
            db.loadDatabase();
            db.remove({ 'type': 'connection', 'connection.clientID': msg.params.connection.clientID }, { multi: true });
            db.insert(msg.params);
            CLIENT[msg.params.connection.unique] = new sn();
            CLIENT[msg.params.connection.unique].id = msg.params.connection.clientID;
            thisClientID = msg.params.connection.clientID;
            unique = msg.params.connection.unique;
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

            if(unique){
                bus.listen('sn.publish' + unique, function (msg) {
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
        
                    // CLIENT[msg.clientID].Register(msg);
                    //CLIENT[msg.clientID].Publish(msg.params);
                });
        
        
                bus.listen('sn.subscribe' + unique, function (msg) {
                    if (typeof CLIENT[msg.params.unique] == 'undefined') return;
                    msg.params.token = tokens[msg.params.unique].getToken();
                    CLIENT[msg.params.unique].Subscribe(msg.params);
        
                });
        
                bus.listen('sn.unsubscribe' + unique, function (msg) {
                    if (typeof CLIENT[msg.unique] == 'undefined') return;
                    msg.token = tokens[msg.unique].getToken();
                    CLIENT[msg.unique].Unsubscribe(msg);
                });
        
                bus.listen('sn.disconnect' + unique, function (msg) {
                    if (typeof CLIENT[msg.unique] == 'undefined') return;
                    CLIENT[msg.unique].keepalive = msg.keepalive;
                    db.loadDatabase();
                    db.remove({ 'type': 'connection', 'connection.username': msg.clientID }, { multi: true });
                    CLIENT[msg.unique].Disconnect(msg.keepalive);
                });
                
                bus.listen('sn.datareceived' + unique, function (msg) {
                    if (typeof CLIENT[msg.unique] == 'undefined') return;
                    CLIENT[msg.unique].onDataRecieved(Buffer.from(msg.payload));
                });
            }


            CLIENT[msg.params.connection.unique].on('snwilltopic', function (data) {
                var willtopic = SNwilltopic(new FullTopic(CLIENT[msg.params.connection.unique].topic, CLIENT[msg.params.connection.unique].qos), CLIENT[msg.params.connection.unique].retain);
                var message = parser.encode(willtopic);
                sendData(message, null, 'snwilltopic');
            });

            CLIENT[msg.params.connection.unique].on('snwillmsg', function (data) {
                var willmessage = SNwillmsg(CLIENT[msg.params.connection.unique].message)
                var message = parser.encode(willmessage);
                sendData(message, null, 'snwillmsg');
            });

            CLIENT[msg.params.connection.unique].on('snconnack', function (data) {
                var that = this;
                connectionDone(null, 'snconnack');
                db.loadDatabase();
                if (data.getCode() == 'ACCEPTED') {
                    db.remove({ type: 'snconnack' }, { multi: true }, function (err, docs) {
                        db.insert({
                            type: 'snconnack',
                            connectionId: that.id,
                            id: guid()
                        });
                    });
                    CLIENT[this.unique].Ping(this.id);
                } else {
                    db.remove({ type: 'snconnack' }, { multi: true }, function (err, docs) {
                    });
                }
            });

            CLIENT[msg.params.connection.unique].on('snregister', function (data, packetID) {
                if (CLIENT[msg.params.connection.unique].publish.params.qos == 0) {
                    tokens[this.unique].releaseToken(packetID);
                }
                sendData(data, null, 'snregister');
            });

            CLIENT[msg.params.connection.unique].on('snregack', function (data) {
                var pub = CLIENT[this.unique].publish.params
                pub.packetID = data.getPacketID();
                pub.topicID = data.getTopicID()
                CLIENT[this.unique].Publish(pub);
                pub.direction = 'out'
                saveMessage(pub);
            });

            CLIENT[msg.params.connection.unique].on('snpublish', function (data, params) {
                var parentEvent = 'snpublish';
                if (CLIENT[msg.params.connection.unique].publish.params.qos == 0) {
                    parentEvent = 'snpublishQos0';
                }
                sendData(data, params.packetID, parentEvent);
                if (CLIENT[msg.params.connection.unique].publish.params.qos == 0) {
                    var msg = CLIENT[msg.params.connection.unique].publish.params;
                    msg.direction = 'out'
                    saveMessage(msg);
                    connectionDone(null, 'snpubcomp');
                }
            });

            CLIENT[msg.params.connection.unique].on('snpuback', function (data) {
                connectionDone(data.getPacketID(), 'snpuback');
                tokens[this.unique].releaseToken(data.getPacketID());
                if (data.getCode() == ENUM.ReturnCode.SN_ACCEPTED_RETURN_CODE) {
                    var msg = CLIENT[msg.params.connection.unique].publish.params;
                    msg.direction = 'out'
                    saveMessage(msg);
                }
            });

            CLIENT[msg.params.connection.unique].on('snpubrel', function (data, packetID) {
                sendData(data, packetID, 'snpubrel');
            });

            CLIENT[msg.params.connection.unique].on('snpubcomp', function (data) {
                connectionDone(data.getPacketID(), 'snpubcomp');
                tokens[this.unique].releaseToken(data.getPacketID());
                var msg = CLIENT[msg.params.connection.unique].publish.params;
                msg.direction = 'out'
                saveMessage(msg);
            });

            CLIENT[msg.params.connection.unique].on('snsubscribe', function (data, token) {
                sendData(data, token, 'snsubscribe');
            });

            CLIENT[msg.params.connection.unique].on('snsuback', function (data, msg) {
                connectionDone(data.getPacketID(), 'snsuback');
                tokens[this.unique].releaseToken(data.getPacketID());
                var subscribtions = [];
                db.loadDatabase();
                for (var i = 0; i < msg.topics.length; i++) {
                    var subscribeData = {
                        type: 'snsubscribtion',
                        subscribtion: {
                            topic: msg.topics[i].topic,
                            qos: msg.topics[i].qos,
                            connectionId: msg.clientID,
                            unique: this.unique,
                            topicID: data.getTopicID()
                        },
                    }
                    subscribtions.push(subscribeData);
                    db.remove({ 'type': 'subscribtion', 'subscribtion.topic': msg.topics[i].topic }, { multi: true });
                }
                db.insert(subscribtions);
            });

            CLIENT[msg.params.connection.unique].on('snunsubscribe', function (data, token) {
                sendData(data, token, 'snunsubscribe', data.topicID);
            });

            CLIENT[msg.params.connection.unique].on('snunsuback', function (data, msg) {
                connectionDone(data.getPacketID(), 'snunsuback');
                db.loadDatabase();
                tokens[this.unique].releaseToken(data.getPacketID());
                for (var i = 0; i < msg.length; i++) {
                    db.remove({ 'type': 'snsubscribtion', 'subscribtion.topic': msg[i].getTopic() }, { multi: true });
                }
            });

            CLIENT[msg.params.connection.unique].on('sn.disconnectin', function (data, msg) {
                connectionDone(null, 'sn.disconnectin');
            });



            CLIENT[msg.params.connection.unique].on('snpingreq', function (data) {
                sendData(data, 0, 'snpingreq');
                // pingTimeout = setTimeout(function () {
                //     bus.publish('sn.disconnect', {
                //         msg: 'disconnect',
                //         username: this.id,
                //         clientID: this.id,
                //         unique: this.unique,
                //     });
                // }, msg.params.connection.keepalive * 2 * 1000);
            });

            CLIENT[msg.params.connection.unique].on('sn.disconnect', function (data) {
                sendData(data, 0, 'sn.disconnect');
                delete CLIENT[this.unique];
                delete tokens[this.unique];
            });


            CLIENT[msg.params.connection.unique].on('snpublishin', function (data) {
                if (!data) return;
                if (data.qos == 0) {
                    db.loadDatabase();
                    db.find({
                        'subscribtion.topicID': parseInt(data.topic)
                    }, function (err, docs) {
                        data.topicID = data.topic;
                        data.topic = docs[0].subscribtion.topic
                        saveMessage(data);
                    });
                }
            });


            CLIENT[msg.params.connection.unique].on('snpubackout', function (data, msg) {
                if (!data) return;
                sendData(data, msg.packetID, 'snpubackout');
                var id = this.id;
                db.loadDatabase();
                db.find({
                    'subscribtion.topicID': parseInt(msg.topic)
                }, function (err, docs) {
                    msg.topic = docs[0].subscribtion.topic
                    saveMessage(msg);
                });

            });

            CLIENT[msg.params.connection.unique].on('snpubrec', function (data, msg) {
                connectionDone(data, 'snpubrec');
            });

            CLIENT[msg.params.connection.unique].on('snregackout', function (data, msg) {
                sendData(data, null, 'snregackout');
            });

            CLIENT[msg.params.connection.unique].on('snpubrecout', function (data, msg) {
                CLIENT[this.unique].topic = msg
                if (!data) return;
                sendData(data, msg.packetID, 'snpubrecout');
            });

            CLIENT[msg.params.connection.unique].on('snpubcompout', function (data, msg) {
                if (!data) return;
                var packetID = msg.getPacketID();
                sendData(data, msg.getPacketID(), 'snpubcompout');
                var id = this.id;
                db.loadDatabase();
                db.find({
                    'subscribtion.topicID': parseInt(CLIENT[this.unique].topic.topic)
                }, function (err, docs) {

                    if (docs.length) {
                        var packet = CLIENT[id].topic;
                        packet.topicID = CLIENT[id].topic.topic;
                        packet.topic = docs[0].subscribtion.topic
                        saveMessage(packet);
                    }

                });

            });

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

function sendData(payload, packetID, parentEvent, topicID) {    
    bus.send('udp.senddata' + unique, {
        payload: payload,
        clientID: thisClientID,
        packetID: packetID,
        parentEvent: parentEvent,
        unique: unique,
        topicID: topicID,
    });
}

function connectionDone(packetID, parentEvent) {
    bus.send('udp.done' + unique, {
        clientID: thisClientID,
        unique: unique,
        parentEvent: parentEvent,
        packetID: packetID
    });
}

function saveMessage(msg) {
    var message = {
        type: 'snmessage',
        message: {
            topicID: msg.topicID || '',
            topic: msg.topic || '',
            qos: msg.qos || '',
            content: msg.content || '',
            connectionId: thisClientID,
            direction: msg.direction || 'in',
            unique: unique,
            packetID: msg.packetID || '',
        },
        id: guid(),
        time: (new Date()).getTime()
    }

    db.loadDatabase();
    db.insert(message);
}
var methods = {
    send: send,
    publish: publish,
    getData: getData
}

module.exports = methods;