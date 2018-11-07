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
    var disconnect = {
        packet: 14
    }
    this.emit('wsDisconnect', JSON.stringify(disconnect), params);
}

function subscribe(params) {    
    var topics = [];
    for (var i = 0; i < params.topics.length; i++) {
       topics.push({name: params.topics[i].topic,
                    qos: params.topics[i].qos, })  
    }    

    var subscribe = {
        packet: 8,
        packetID: params.token,
        topics: topics
     }
    subscribtions.pushMessage(params.token, params)
    this.emit('wsSubscribe', JSON.stringify(subscribe), params.token)
}

function unsubscribe(topic, token) {  
   
    var unsuback = {
        packet:10,
        packetID: token,
        topics: topic
    }
    
    unsubscribtions.pushMessage(token, topic[0]);
    this.emit('wsUnsubscribe', JSON.stringify(unsuback), token);
}

function publish(params) {  
    var parentEvent = 'wsPublish'
    if (params.params.qos == 0) {
        params.params.token = null;
        parentEvent = 'wsPublish0'
    }

    var publish = {
        packet:3,
        packetID:params.params.token,
        topic:{
           name:params.params.topic,
           qos:params.params.qos
        },
        content: Buffer.from(params.params.content).toString('base64'),
        retain:params.params.retain,
        dup:params.params.isDupe
     }
    messages.pushMessage(params.token, params);
    this.emit('wsPublish', JSON.stringify(publish), params.params, params.params.token, parentEvent);
}

function connect(params) {
    conntectionParams = params;
   var connect = {
    packet:1,
    protocolLevel:4,
    protocolName:"MQTT",
    username: params.username,
    password: params.password,
    clientID: params.clientID,
    cleanSession: params.isClean,
    keepalive: params.keepalive,
    willFlag:true,
    usernameFlag:true,
    passwordFlag:true,
    will:null
   }
    if(params.will)
    if(params.will.topic && params.will.content) {
        connect.will = {
            topic: {
                name: params.will.topic,
                qos: params.will.qos
            },
            content: Buffer.from(params.will.content).toString('base64'),
            retain:params.will.retain}
    }

   
    var strConnect = JSON.stringify(connect)
    
   this.emit('wsConnect', strConnect);

}

function onDataRecieved(data) {
    var that = this;
    var decoded = {};
  
    var resp = data;
        resp.payload.data = JSON.parse(data.payload.utf8Data);
    var packet = resp.payload.data.packet
  
    console.log("Packet: ");
    console.log(packet);
   

    if (packet == ENUM.MessageType.CONNACK) {      
        this.emit('wsConnack', resp);
    }

    if (packet == ENUM.MessageType.PINGRESP) {
       // connectionStatus = ENUM.PingStatus.RECEIVED;
        this.emit('wsPingResp', resp);
    }

    if (packet == ENUM.MessageType.PUBACK) {     
        var id = resp.payload.data.packetID;
        this.emit('wsPuback', resp, id);
    }

    if (packet == ENUM.MessageType.PUBREC) {
        var id = resp.payload.data.packetID;
        var pubrel = {
            packet: 6,
            packetID: id,
         }
        this.emit('wsPubrel', JSON.stringify(pubrel), id);       
    }

    if (packet == ENUM.MessageType.PUBCOMP) {
        var id = resp.payload.data.packetID;
        this.emit('wsPubcomp', id, messages.pullMessage(id));
    }

    if (packet == ENUM.MessageType.SUBACK) {  
        var id =  resp.payload.data.packetID;         
        this.emit('wsSuback', resp, subscribtions.pullMessage(id));
    }

    if (packet == ENUM.MessageType.UNSUBACK) {
        var id = resp.payload.data.packetID;
        this.emit('wsUnsuback', id, unsubscribtions.pullMessage(id));
    }

    if (packet == ENUM.MessageType.PUBREL) {
        var id = resp.payload.data.packetID;
        var pubcomp = {
            packet: 7,
            packetID: id
        }
        this.emit('wsPubcompOut', JSON.stringify(pubcomp), id, messages.pullMessage(id));
    }

    if (packet == ENUM.MessageType.PUBLISH) {
        var id = resp.payload.data.packetID;  
        var publishTopic = resp.payload.data.topic.name;
        var publishQos = resp.payload.data.topic.qos;
        var publishContent =  Buffer.from(resp.payload.data.content, 'base64').toString('ascii');
        console.log("Publish received!. id:", id);
        console.log("Publish qos:", publishQos);
        console.log("Publish topic:", publishTopic);
        console.log("Publish content:", publishContent);
        var message = {
            packetID: id,
            topic: publishTopic,
            qos: publishQos,
            content: publishContent
        }       
        switch (publishQos) {
            case 0:
                this.emit('wsPublishIn', message);
                break;
            case 1:              
                var puback = {
                    packet: 4,
                    packetID: id
                }
                this.emit('wsPubackOut', JSON.stringify(puback), message);
                break;
            case 2:
                var pubrec = {
                    packet: 5,
                    packetID: id
                }
                this.emit('wsPubrecOut', JSON.stringify(pubrec), message);
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
    this.emit('wsPing', JSON.stringify(data));
}