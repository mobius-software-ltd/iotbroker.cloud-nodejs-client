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
var MQParser = require('./MQParser');
var Timer = require('./lib/Timer');
var TOKENS = require('./lib/Tokens');
var TIMERS = require('./lib/Timers');

var Datastore = require('nedb');
var db = new Datastore({ filename: 'data' });
var dbUser = new Datastore({ filename: 'userData' });
var bus = require('servicebus').bus({
    queuesFile: `.queues.mqtt.${process.pid}`
});
var guid = require('./lib/guid');
var CLIENT = {};
var tokens = {};
var pingTimeout = {};
var unique;
var username;
var thisClientID;
var keepalive;


function MqttClient() {
    this.ENUM = ENUM;
    Events.EventEmitter.call(this);
}
util.inherits(MqttClient, Events.EventEmitter);


MqttClient.prototype.Connect = connect;
MqttClient.prototype.Disconnect = disconnect;
MqttClient.prototype.Publish = publish;
MqttClient.prototype.Subscribe = subscribe;
MqttClient.prototype.Unsubscribe = unsubscribe;
MqttClient.prototype.Ping = ping;
MqttClient.prototype.onDataRecieved = onDataRecieved;


module.exports = MqttClient;

var parser = MQParser;
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
    var disconnect = Disconnect()
    try {
        var encDisconnect = parser.encode(disconnect)
    } catch (e) {
        console.log('Parser can`t encode provided params.');
    }
    processDisconnect(encDisconnect, 0, 'mqttDisconnect')
}

function subscribe(params) {
    var topics = [];
    var token = tokens[unique].getToken();
    for (var i = 0; i < params.topics.length; i++) {
        topics.push(Topic(params.topics[i].topic, params.topics[i].qos));
    }
    var subscribe = Subscribe(token, topics);

    try {
        var encSubscribe = parser.encode(subscribe);
    } catch (e) {
        console.log('Parser can`t encode provided params.');
    }
    subscribtions.pushMessage(token, params)
    sendData(encSubscribe, token, 'mqttSubscribe');   
}

function unsubscribe(params) {
    var topics = params || [];
    var token = tokens[unique].getToken();
    var unsubscribe = Unsubscribe(token, topics);

    try {
        var encUnsubscribe = parser.encode(unsubscribe);
    } catch (e) {
        console.log('Parser can`t encode provided params.');
    }
    unsubscribtions.pushMessage(token, topics);
    sendData(encUnsubscribe, token, 'mqttUnsubscribe');  
}

function publish(params) {
    var token = null;
    if (params.qos != 0) {
        token = tokens[unique].getToken();
    }
    try {
        var publish = Publish(token, Topic(Text(params.topic), params.qos), new Buffer.from(params.content), params.retain, params.isDupe);      
        var encPublish = parser.encode(publish);
    } catch (error) {
        console.log('Parser can`t encode provided params.');
    }   
    messages.pushMessage(token, params);
    processPublish(encPublish, params, token)
}

function connect(params) {
    conntectionParams = params;
    keepalive = params.keepalive;
    unique = params.unique;
    username = params.username;
    thisClientID = params.clientID 
    tokens[unique] = new TOKENS();
    var connect = Connect({
        username: params.username,
        password: params.password,
        clientID: params.clientID || 'MQTT-' + Math.random().toString(18).substr(2, 16),
        isClean: params.isClean,
        keepalive: params.keepalive,
    });

    if(params.isClean) {
        db.loadDatabase()
        db.remove({ 'type': 'subscribtion', 'subscribtion.clientID': params.clientID }, { multi: true });
    }
    
    if (!!params.will) {
        connect.will = Will(Topic(Text(params.will.topic), params.will.qos), Buffer.from(params.will.content), params.will.retain);
    }

    try {
        var encConnect = parser.encode(connect);
    } catch (error) {
        console.log('Parser can`t encode provided params.');
    }
   
    processConnect(encConnect, 0, 'mqttConnect', unique, username)
}

function onDataRecieved(data) {
    var that = this;
    var decoded = {};
   
    try {
        decoded = parser.decode(data);
    } catch (error) {
        console.log('Parser unadble to decode received data.');
    }

    if (decoded.getType() == ENUM.MessageType.CONNACK) {      
       processConnack(decoded, unique, username, this)
    }

    if (decoded.getType() == ENUM.MessageType.PINGRESP) {
        connectionStatus = ENUM.PingStatus.RECEIVED;
       clearTimeout(pingTimeout);
     
    }

    if (decoded.getType() == ENUM.MessageType.PUBACK) {
        var id = decoded.getPacketID();
        processPuback(decoded, messages.pullMessage(id))
    }

    if (decoded.getType() == ENUM.MessageType.PUBREC) {
        var id = decoded.getPacketID();
        connectionDone(id, 'mqttPubrec');
        try {
            var pubrel = Pubrel(id);
            var encPubrel = parser.encode(pubrel);
            sendData(encPubrel, id, 'mqttPubrel'); 
        } catch (error) {
            console.log('Parser can`t encode provided params.');
        }
    }

    if (decoded.getType() == ENUM.MessageType.PUBCOMP) {
        var id = decoded.getPacketID();
        processPubcomp(decoded, messages.pullMessage(id))
    }

    if (decoded.getType() == ENUM.MessageType.SUBACK) {
        var id = decoded.getPacketID();
        var codes = decoded.getReturnCodes();
        processSuback( decoded, subscribtions.pullMessage(id))
    }

    if (decoded.getType() == ENUM.MessageType.UNSUBACK) {
        var id = decoded.getPacketID();
        processUnsuback(decoded, unsubscribtions.pullMessage(id));
    }

    if (decoded.getType() == ENUM.MessageType.PUBREL) {
        var id = decoded.getPacketID();
        var encPubrelPubcomp = parser.encode(Pubcomp(id));
       processPubcompOut(encPubrelPubcomp, id, messages.pullMessage(id))
    }

    if (decoded.getType() == ENUM.MessageType.PUBLISH) {
        var id = decoded.getPacketID();
        var publishTopic = decoded.getTopic().toString();
        var publishQos = decoded.getTopic().getQos();
        var publishContent = decoded.getContent().toString('utf8');
        var message = {
            packetID: id,
            topic: publishTopic.substring(0, publishTopic.indexOf(":")),
            qos: ENUM.QoS[publishQos],
            content: publishContent
        }
        switch (ENUM.QoS[publishQos]) {
            case 0:
                if (!message) return;

                message.direction = 'in';
                saveMessage(message);
                break;
            case 1:
                var encPublishPuback = parser.encode(Puback(id));
                processPubackOut(encPublishPuback, message)
                break;
            case 2:
                var encPublishPubrec = parser.encode(Pubrec(id));
                messages.pushMessage(id, message)
                if (encPublishPubrec)
                    sendData(encPublishPubrec, message, 'mqttPubrecOut'); 
                break;
            default:
                break;
        }
    }
}

function ping() {
    var pingreq = Pingreq();
    var encPing = parser.encode(pingreq);
    processPing(encPing, '01', 'mqttPing')
}


function sendData(payload, packetID, parentEvent) { 
    bus.send('net.sendData' + unique, {
        payload: payload,
        username: username,
        packetID: packetID,
        parentEvent: parentEvent,
        unique: unique
    });    
}

function connectionDone(packetID, parentEvent) {
    bus.send('net.done' + unique, {
        packetID: packetID,
        username: username,
        parentEvent: parentEvent,
        unique: unique
    });
}

function saveMessage(msg) {  
    var message = {
        type: 'message',
        message: {
            topic: msg.topic,
            qos: msg.qos,
            content: msg.content,
            connectionId:  msg.username || username,
            direction: msg.direction,
            unique: unique,
            clientID: msg.clientID || thisClientID
        },
        id: guid(),
        time: (new Date()).getTime()
    }
    db.loadDatabase();
    db.insert(message);
}

function publishDisconnect() {
    bus.send('mqtt.disconnect' + unique, {
        msg: 'disconnect',
        username: username,
        unique: unique
    });
}

function processConnack(data, unique, username, client) {
    var that = this;
        connectionDone(data.getPacketID(), 'mqttConnack');  

        db.loadDatabase();
        if (data.getReturnCode() == 'ACCEPTED') {           
                db.insert({
                    type: 'connack',
                    connectionId: username,
                    unique:unique,
                    id: guid()
                });
                dbUser.loadDatabase();
                dbUser.insert(client.userInfo);
            ping();
        } 
}
function processConnect(payload, packetID, parentEvent) {
    
    sendData(payload, packetID, parentEvent); 
}

function processDisconnect(payload, packetID, parentEvent) {   
        sendData(payload, packetID, parentEvent);
        connectionDone(packetID, parentEvent);
       
        delete CLIENT[unique];
        delete tokens[unique];
}

function processPing(payload, packetID, parentEvent) {
    sendData(payload, packetID, parentEvent);
    pingTimeout = setTimeout(function() {
        publishDisconnect();
    }, keepalive * 2 * 1000);
}

function processPublish(data, msg, packetID) {
    sendData(data, packetID, 'mqttPublish');
    connectionDone(packetID, 'mqttPublish');  
       
        if (msg.qos == 0) {
            msg.direction = 'out';
            saveMessage(msg);                   
        }
}

function processPuback(data, msg) {
    connectionDone(data.getPacketID(), 'mqttPuback');   
        msg.direction = 'out';
        saveMessage(msg);
}

function processPubcomp(data, msg) {
    connectionDone(data.getPacketID(), 'mqttPubcomp');   
    msg.direction = 'out';
    saveMessage(msg);  
}

function  processSuback(data, msg) {
    connectionDone(data.getPacketID(), 'mqttSuback'); 
  
    var subscribtions = [];
    db.loadDatabase();
    for (var i = 0; i < msg.topics.length; i++) {
        var subscribeData = {
            type: 'subscribtion',
            subscribtion: {
                topic: msg.topics[i].topic,
                qos: msg.topics[i].qos,
                connectionId: msg.username,
                clientID: msg.clientID
            },
        }
        subscribtions.push(subscribeData);
        db.remove({ 'type': 'subscribtion', 'subscribtion.topic': msg.topics[i].topic, 'connectionId': msg.username }, { multi: true });
    }
    db.insert(subscribtions);
}

function processUnsuback(data, msg) {
    connectionDone(data.getPacketID(), 'mqttUnsuback');
       
    db.loadDatabase();
    for (var i = 0; i < msg.length; i++) {
        db.remove({ 'type': 'subscribtion', 'subscribtion.topic': msg[i] }, { multi: true });
    }
}

function processPubackOut(data, msg) {
    if (!data) return;

    sendData(data, msg.packetID, 'mqttPubackOut'); 

    msg.direction = 'in';
    saveMessage(msg);  
}

function processPubcompOut(data, id, msg) {
    if (!data) return;
        sendData(data, id, 'mqttPubcompOut'); 
        if(msg) {
            msg.direction = 'in';
            saveMessage(msg); 
        }                    
}