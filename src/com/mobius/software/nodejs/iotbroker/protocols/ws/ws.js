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

var Events = require('events');
var util = require('util');
var net = require('net');

var ENUM = require('./lib/enum');
var Connack = require('./lib/Connack');
var Connect = require('./lib/Connect');
var Disconnect = require('./lib/Disconnect');
var LengthDetails = require('./lib/LengthDetails');
var Pingreq = require('./lib/Pingreq');
var Pingresp = require('./lib/Pingresp');
var Puback = require('./lib/Puback');
var Pubcomp = require('./lib/Pubcomp');
var Publish = require('./lib/Publish');
var Pubrec = require('./lib/Pubrec');
var Pubrel = require('./lib/Pubrel');
var Suback = require('./lib/Suback');
var Subscribe = require('./lib/Subscribe');
var Text = require('./lib/Text');
var Topic = require('./lib/Topic');
var Unsuback = require('./lib/Unsuback');
var Unsubscribe = require('./lib/Unsubscribe');
var Will = require('./lib/Will');
var Timer = require('./lib/Timer');
var TOKENS = require('./lib/Tokens');
var TIMERS = require('./lib/Timers');

var Datastore = require('nedb');
var db = new Datastore({ filename: 'data' });
var bus = require('servicebus').bus({
    queuesFile: `.queues.ws.${process.pid}`
});
var guid = require('./lib/guid');
var tokens = {};
var pingTimeout = {};
var unique;
var username;
var thisClientID;
var keepalive;

function WsClient() {
    this.ENUM = ENUM;
    Events.EventEmitter.call(this);
}
util.inherits(WsClient, Events.EventEmitter);


WsClient.prototype.Connect = connect;
WsClient.prototype.Disconnect = disconnect;
WsClient.prototype.Publish = publish;
WsClient.prototype.Subscribe = subscribe;
WsClient.prototype.Unsubscribe = unsubscribe;
WsClient.prototype.Ping = ping;
WsClient.prototype.onDataRecieved = onDataRecieved;


module.exports = WsClient;

var connection = {}; //new net.Socket();
var conntectionParams;
var connectionStatus = ENUM.PingStatus.NEW;
var isMaster = false;
var Store = function Store() {
    var storage = [];

    function pushMessage(id, message) {
        storage[id] = message;
    }

    function pullMessage(id) {
        var tmp = storage[id];
        delete storage[id];
        return tmp;
    }
    return {
        pullMessage: pullMessage,
        pushMessage: pushMessage
    }
};
var messages = Store();
var subscribtions = Store();
var unsubscribtions = Store();

function disconnect(params) {
    var packetID = tokens[params].getToken();
    var disconnect = {
        packet: 14
    }
    processDisconnect(JSON.stringify(disconnect), packetID)
}

function subscribe(params) {
    var token = tokens[unique].getToken();
    var topics = [];
    for (var i = 0; i < params.topics.length; i++) {
        topics.push({
            name: params.topics[i].topic,
            qos: params.topics[i].qos,
        })
    }

    var subscribe = {
        packet: 8,
        packetID: token,
        topics: topics
    }
    subscribtions.pushMessage(token, params);
    sendData(JSON.stringify(subscribe), token, 'wsSubscribe');
}

function unsubscribe(topic) {
    var token = tokens[unique].getToken();
    var unsuback = {
        packet: 10,
        packetID: token,
        topics: topic
    }
    unsubscribtions.pushMessage(token, topic[0]);   
    sendData(JSON.stringify(unsuback), token, 'wsUnsubscribe');
}

function publish(params) {
    var parentEvent = 'wsPublish'
    var token = null;
    if (params.params.qos != 0) {
        token = tokens[unique].getToken();
    }
    if (params.params.qos == 0) {
        parentEvent = 'wsPublish0'
    }

    var publish = {
        packet: 3,
        packetID: token,
        topic: {
            name: params.params.topic,
            qos: params.params.qos
        },
        content: Buffer.from(params.params.content).toString('base64'),
        retain: params.params.retain,
        dup: params.params.isDupe
    }
    messages.pushMessage(token, params);
    processPublish(JSON.stringify(publish), params.params, token, parentEvent)
}

function connect(params) {
    conntectionParams = params;
    keepalive = params.keepalive;
    unique = params.unique;
    username = params.username;
    thisClientID = params.clientID;
    tokens[unique] = new TOKENS();
    var connect = {
        packet: 1,
        protocolLevel: 4,
        protocolName: "MQTT",
        username: params.username,
        password: params.password,
        clientID: params.clientID,
        cleanSession: params.isClean,
        keepalive: params.keepalive,
        willFlag: true,
        usernameFlag: true,
        passwordFlag: true,
        will: null
    }
    if (params.will)
        if (params.will.topic && params.will.content) {
            connect.will = {
                topic: {
                    name: params.will.topic,
                    qos: params.will.qos
                },
                content: Buffer.from(params.will.content).toString('base64'),
                retain: params.will.retain
            }
        }


    var strConnect = JSON.stringify(connect);
    sendData(strConnect, 1, 'wsConnect');

}

function onDataRecieved(data) {
    var that = this;
    var decoded = {};

    var resp = data;
    resp.payload.data = JSON.parse(data.payload.utf8Data);
    var packet = resp.payload.data.packet;

    if (packet == ENUM.MessageType.CONNACK) {
        //this.emit('wsConnack', resp);
        processConnack(resp)
    }

    if (packet == ENUM.MessageType.PINGRESP) {
        clearTimeout(pingTimeout);
        pingTimeout = setTimeout(function () {
            publishDisconnect();
        }, keepalive * 2 * 1000);
    }

    if (packet == ENUM.MessageType.PUBACK) {
        var id = resp.payload.data.packetID;
        processPuback(id, messages.pullMessage(id));
    }

    if (packet == ENUM.MessageType.PUBREC) {
        var id = resp.payload.data.packetID;
        var pubrel = {
            packet: 6,
            packetID: id,
        }
        sendData(JSON.stringify(pubrel), id, 'wsPubrel');
    }

    if (packet == ENUM.MessageType.PUBCOMP) {
        var id = resp.payload.data.packetID;
        processPubcomp(id, messages.pullMessage(id))
    }

    if (packet == ENUM.MessageType.SUBACK) {
        var id = resp.payload.data.packetID;
        processSuback(resp, subscribtions.pullMessage(id))
    }

    if (packet == ENUM.MessageType.UNSUBACK) {
        var id = resp.payload.data.packetID;
        processUnsuback(id, unsubscribtions.pullMessage(id))
    }

    if (packet == ENUM.MessageType.PUBREL) {
        var id = resp.payload.data.packetID;
        var pubcomp = {
            packet: 7,
            packetID: id
        }
        processPubcompOut(JSON.stringify(pubcomp), id, messages.pullMessage(id))
    }

    if (packet == ENUM.MessageType.PUBLISH) {
        var id = resp.payload.data.packetID;
        var publishTopic = resp.payload.data.topic.name;
        var publishQos = resp.payload.data.topic.qos;
        var publishContent = Buffer.from(resp.payload.data.content, 'base64').toString('ascii');
        var message = {
            packetID: id,
            topic: publishTopic,
            qos: publishQos,
            content: publishContent
        }
        switch (publishQos) {
            case 0:
                if (message)
                    saveMessage(message);
                break;
            case 1:
                var puback = {
                    packet: 4,
                    packetID: id
                }
                processPubackout(JSON.stringify(puback), message);
                break;
            case 2:
                var pubrec = {
                    packet: 5,
                    packetID: id
                }
                if (JSON.stringify(pubrec))
                    sendData(JSON.stringify(pubrec), message.packetID, 'wsPubrecOut');

                messages.pushMessage(id, message)
                break;
            default:
                break;
        }
    }
}

function ping() {
    var data = {
        packet: 12
    }
    sendData(JSON.stringify(data), 0, 'wsPing');
    pingTimeout = setTimeout(function () {
        publishDisconnect();
    }, keepalive * 10 * 1000);
}

function sendData(payload, packetID, parentEvent) {
    bus.send('wss.sendData' + unique, {
        payload: payload,
        username: username,
        packetID: packetID,
        parentEvent: parentEvent,
        unique: unique
    });
}

function connectionDone(packetID, parentEvent) {
    bus.send('wss.done' + unique, {
        packetID: packetID,
        username: username,
        parentEvent: parentEvent,
        unique: unique
    });
}

function saveMessage(msg) {
    var message = {
        type: 'wsmessage',
        message: {
            topic: msg.topic,
            qos: msg.qos,
            content: msg.content,
            connectionId: username,
            direction: msg.direction || 'in',
            unique: unique,
            clientID: thisClientID
        },
        id: guid(),
        time: (new Date()).getTime()
    }
    db.loadDatabase();
    db.insert(message);
}

function publishDisconnect() {
    bus.send('ws.disconnect' + unique, {
        msg: 'disconnect',
        username: username,
        unique: unique,
        parentEvent: 'wsDisconnect'
    });
}

function processDisconnect(data, id) {
    sendData(data, id, 'wsDisconnect');
    connectionDone(id, 'wsDisconnect');

    delete CLIENT[this.unique];
    delete tokens[unique];
}

function processConnack(data) {
    var that = this;

    connectionDone(1, 'wsConnack');
    db.loadDatabase();
    if (data.payload.data.returnCode == ENUM.ConnackCode.ACCEPTED) {
            db.insert({
                type: 'connack',
                connectionId: username,
                unique: unique,
                id: guid()
            });
        ping();
    } 
}

function processPublish(data, msg, packetID, parent) {
    sendData(data, packetID, parent);
    connectionDone(packetID, 'wsPublish');
    if (msg.qos == 0) {
        msg.direction = 'out';
        saveMessage(msg);
    }
}

function processPuback(id, msg) {
    connectionDone(id, 'wsPuback');
    tokens[unique].releaseToken(id);
    msg.params.direction = 'out';
    saveMessage(msg.params);
};

function processPubcomp(packetID, msg) {
    connectionDone(packetID, 'wsPubcomp');
    tokens[unique].releaseToken(packetID);
    msg.params.direction = 'out';
    saveMessage(msg.params);
}

function processSuback(data, msg) {
    connectionDone(data.payload.data.packetID, 'wsSuback');
    tokens[unique].releaseToken(data.payload.data.packetID);
    var subscribtions = [];
    db.loadDatabase();
    if (msg.topics)
        for (var i = 0; i < msg.topics.length; i++) {
            var subscribeData = {
                type: 'wssubscribtion',
                subscribtion: {
                    topic: msg.topics[i].topic ? msg.topics[i].topic : null,
                    qos: msg.topics[i].qos ? msg.topics[i].qos : null,
                    connectionId: msg.username,
                },
            }
            subscribtions.push(subscribeData);
            db.remove({ 'type': 'subscribtion', 'subscribtion.topic': msg.topics[i].topic }, { multi: true });
        }
    db.insert(subscribtions);
}

function processUnsuback(packetID, msg) {
    connectionDone(packetID, 'wsUnsuback');
    db.loadDatabase();
    tokens[unique].releaseToken(packetID);
    db.remove({ 'type': 'wssubscribtion', 'subscribtion.topic': msg }, { multi: true });
}

function processPubackout(data, msg) {
    if (!data) return;
    sendData(data, msg.packetID, 'wsPubackOut');
    saveMessage(msg);
}

function processPubcompOut(data, id, msg) {
    if (!data) return;
    sendData(data, id, 'wsPubcompOut');
    if (msg)
        saveMessage(msg);
}