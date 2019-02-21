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
var Connack = require('./lib/SNconnack');
var SNconnect = require('./lib/SNconnect');
var SNdisconnect = require('./lib/SNdisconnect');
var LengthDetails = require('./lib/LengthDetails');
var SNpingreq = require('./lib/SNpingreq');
var SNpingresp = require('./lib/SNpingresp');
var SNpuback = require('./lib/SNpuback');
var SNpubcomp = require('./lib/SNpubcomp');
var SNpublish = require('./lib/SNpublish');
var SNpubrec = require('./lib/SNpubrec');
var SNpubrel = require('./lib/SNpubrel');
var Suback = require('./lib/SNsuback');
var SNsubscribe = require('./lib/SNsubscribe');
var Text = require('./lib/Text');
var Topic = require('./lib/Topic');
var Unsuback = require('./lib/SNunsuback');
var SNunsubscribe = require('./lib/SNunsubscribe');
var Willmsg = require('./lib/SNwillmsg');
var SNParser = require('./SNParser');
var Timer = require('./lib/Timer');
var TOKENS = require('./lib/Tokens');
var TIMERS = require('./lib/Timers');

var Advertised = require('./lib/SNadvertise');
var Encapsulated = require('./lib/SNencapsulated');
var GWInfo = require('./lib/SNgwinfo');
var SNregack = require('./lib/SNregack');
var SNregister = require('./lib/SNregister');
var SearchGW = require('./lib/SNsearchGW');
var Willmsg = require('./lib/SNwillmsg');
var Willmsgreq = require('./lib/SNwillmsgreq');
var Willmsgresp = require('./lib/SNwillmsgresp');
var Willmsgupd = require('./lib/SNwillmsgupd');
var SNwilltopic = require('./lib/SNwilltopic');
var Willtopicreq = require('./lib/SNwilltopicreq');
var Willtopicresp = require('./lib/SNwilltopicresp');
var Willtopicupd = require('./lib/SNwilltopicupd');

var bus = require('servicebus').bus({
    queuesFile: `.queues.sn.${process.pid}`
});
var vm = this;
// var unique;
// var thisClientID;
var guid = require('./lib/guid');
var Datastore = require('nedb');
var connections = {};
var timers = {};
var tokens = {};
var db = new Datastore({ filename: 'data' });
var CLIENT = {};
var tokens = {};
var pingTimeout = {};

var FullTopic = require('./lib/topics/fulltopic');
var IdTopic = require('./lib/topics/idtopic');
function SnClient() {
    this.ENUM = ENUM;
    Events.EventEmitter.call(this);
}
util.inherits(SnClient, Events.EventEmitter);

SnClient.prototype.Connect = connect;
SnClient.prototype.Disconnect = disconnect;
SnClient.prototype.Publish = publish;
SnClient.prototype.Subscribe = subscribe;
SnClient.prototype.Unsubscribe = unsubscribe;
SnClient.prototype.Ping = ping;
SnClient.prototype.onDataRecieved = onDataRecieved;
SnClient.prototype.topicUpdate = topicUpdate;
SnClient.prototype.msgUpdate = msgUpdate;
SnClient.prototype.Register = register;


module.exports = SnClient;

var parser = SNParser;
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
    var disconnect = SNdisconnect(params)
    try {
        var encDisconnect = parser.encode(disconnect)
    } catch (e) {
        console.log('Parser can`t encode provided params.');
    }
    sendData(encDisconnect, 0, 'sn.disconnect');
}

function subscribe(params) {   
    var topics = [];
    for (var i = 0; i < params.topics.length; i++) {
        topics.push(new FullTopic(params.topics[i].topic, params.topics[i].qos));

        ///topics.push(SNwilltopic(new FullTopic(params.topics[i].topic, params.topics[i].qos),false));
    }
    var subscribe = SNsubscribe(params.token, topics[0]);
    try {
        var encSubscribe = parser.encode(subscribe);
    } catch (e) {
        console.log('Parser can`t encode provided params.');
    }
    subscribtions.pushMessage(params.token, params);
    // this.emit('snsubscribe', encSubscribe, params.token);
    sendData(encSubscribe, params.token, 'snsubscribe');
}

function unsubscribe(params) {
    var topics = [];
    for (var i = 0; i < params.topic.length; i++) {
        topics.push(new FullTopic(params.topic[i].topic, params.topic[i].qos));

    }
    var unsubscribe = SNunsubscribe(params.token, topics[0]);
    try {
        var encUnsubscribe = parser.encode(unsubscribe);
    } catch (e) {
        console.log('Parser can`t encode provided params.');
    }
    unsubscribtions.pushMessage(params.token, topics);
    sendData(encUnsubscribe, params.token, 'snunsubscribe', encUnsubscribe.topicID);
}



function register(params) {
    try {
        var register = SNregister({
            topicID: 0,
            packetID: params.params.token,
            topicName: params.params.topic
        })
        var encRegister = parser.encode(register);
        var packetID = params.params.token

    } catch (error) {
        console.log('Parser can`t encode provided params.');
    }
    processRegister(encRegister, packetID, this)
}



function publish(params) {
    if (params.qos == 0) {
        params.token = null;
    }
    try {
        var publish = SNpublish(params.packetID, new IdTopic(params.topicID, params.qos), params.content, params.retain, params.isDupe);
        var encPublish = parser.encode(publish);
    } catch (error) {
        console.log('Parser can`t encode provided params.');
    }
    messages.pushMessage(params.token, params);
    // this.emit('snpublish', encPublish, params, params.token);
    processPublish(encPublish, params, this)
}

function connect(params) {
    conntectionParams = params;
    var connect = SNconnect({
        clientID: params.clientID || 'SN-' + Math.random().toString(18).substr(2, 16),
        isClean: params.isClean,
        keepalive: params.keepalive,
    });

    if (!!params.will) {
        connect.will = Will(Topic(Text(params.will.topic), params.will.qos), Buffer.from(params.will.content), params.will.retain);
    }

    try {
        var encConnect = parser.encode(connect);
    } catch (error) {
        console.log('Parser can`t encode provided params.');
    }
}

function topicUpdate(params) {
    try {
        var topicUpd = topicUpdate(params.token, Willtopic(Text(params.topic), params.retain));
        var enctopicUpd = parser.encode(topicUpd);
    } catch (error) {
        console.log('Parser can`t encode provided params.');
    }

    messages.pushMessage(params.token, params);
   // this.emit('sntopicupd', enctopicUpd, params, params.token);
};

function msgUpdate(params) {
    try {
        var msgUpd = msgUpdate(params.token, Willmsg().getContent(params));
        var encmsgUpd = parser.encode(msgUpd);
    } catch (error) {
        console.log('Parser can`t encode provided params.');
    }

    messages.pushMessage(params.token, params);
   // this.emit('snmsgupd', encmsgUpd, params, params.token);
}

function onDataRecieved(data, unique, thisClientID, tokens) {   
    vm.unique = unique;
    vm.tokens = tokens;
    vm.thisClientID = thisClientID;
    var that = this;
    var decoded = {};
    console.log("Data received, : ", data);
    console.log("Data type decoded", ENUM.getKeyByValue(ENUM.MessageType, (parser.decode(data)).getType()));

    try {
        decoded = parser.decode(data);
    } catch (error) {
        console.log('Parser unadble to decode received data.');
    }

    if (decoded.getType() == ENUM.MessageType.SN_WILLTOPICREQ) {
        processWillTopic();
    }

    if (decoded.getType() == ENUM.MessageType.SN_WILLMSGREQ) {
        processWillmsg()
    }

    if (decoded.getType() == ENUM.MessageType.SN_CONNACK) {
       
        processConnack(decoded, vm.thisClientID)
    }

    if (decoded.getType() == ENUM.MessageType.SN_REGACK) {
        processRegack(decoded, this);

    }

    if (decoded.getType() == ENUM.MessageType.SN_PUBACK) {
        processPuback(decoded, this);
    }

    if (decoded.getType() == ENUM.MessageType.SN_PUBREC) {
        var id = decoded.getPacketID();
         connectionDone(id, 'snpubrec');
        try {
            var pubrel = SNpubrel(id);
            var encPubrel = parser.encode(pubrel);
            sendData(encPubrel, id, 'snpubrel');
        } catch (error) {
            console.log('Parser can`t encode provided params.');
        }
    }

    if (decoded.getType() == ENUM.MessageType.SN_PUBCOMP) {
        var id = decoded.getPacketID();
        processPubcomp(this, decoded, messages.pullMessage(id))
    }

    if (decoded.getType() == ENUM.MessageType.SN_SUBACK) {
        var id = decoded.getPacketID();
        var codes = decoded.getCode();
        processSuback(decoded, subscribtions.pullMessage(id))
    }

    if (decoded.getType() == ENUM.MessageType.SN_UNSUBACK) {
        var id = decoded.getPacketID();
        processUnsuback(decoded, unsubscribtions.pullMessage(id));
    }

    if (decoded.getType() == ENUM.MessageType.SN_PINGRESP) {
        connectionStatus = ENUM.PingStatus.RECEIVED;
        this.emit('snpingresp');
    }

    if (decoded.getType() == ENUM.MessageType.SN_WILLTOPICRESP) {
        var code = decode.getCode();
        this.emit('sntopicresp', code);
    }

    if (decoded.getType() == ENUM.MessageType.SN_WILLMSGRESP) {
        var code = decode.getCode();
        this.emit('snmsgresp', code);
    }

    if (decoded.getType() == ENUM.MessageType.SN_REGISTER) {
        var regack = SNregack({
            topicID: decoded.getTopicID(),
            packetID: decoded.getPacketID(),
            returnCode: ENUM.ReturnCode.SN_ACCEPTED_RETURN_CODE
        })
        var encRegack = parser.encode(regack);
        // this.emit('snregackout', encRegack);
        sendData(data, null, 'snregackout');
    }

    if (decoded.getType() == ENUM.MessageType.SN_ENCAPSULATED) {
        this.emit('snencapsulated');
    }

    if (decoded.getType() == ENUM.MessageType.SN_ENCAPSULATED) {
        this.emit('snadvertise');
    }

    if (decoded.getType() == ENUM.MessageType.SN_ENCAPSULATED) {
        this.emit('snsearchgw');
    }

    if (decoded.getType() == ENUM.MessageType.SN_ENCAPSULATED) {
        this.emit('sngwinfo');
    }

    if (decoded.getType() == ENUM.MessageType.SN_DISCONNECT) {
        connectionDone(null, 'sn.disconnectin');
    }

    if (decoded.getType() == ENUM.MessageType.SN_PUBLISH) {
        var id = decoded.getPacketID();      
        var publishTopic = decoded.getTopic().getTopic();
        var publishQos = decoded.getTopic().getQos();
        var publishContent = decoded.getContent().toString('utf8');
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
                processPublishin(message)
                break;
            case 1:
                var snpuback = SNpuback({
                    packetID: id,
                    topicID: publishTopic,
                    code: ENUM.ReturnCode.SN_ACCEPTED_RETURN_CODE
                })
                var encPublishPuback = parser.encode(snpuback);
                processPubackout(encPublishPuback, message)
                break;
            case 2:
                var encPublishPubrec = parser.encode(SNpubrec(id));
                processPubrecout(encPublishPubrec, message, this)
                messages.pushMessage(id, message)
                break;
            default:
                break;
        }
    }

    if (decoded.getType() == ENUM.MessageType.SN_PUBREL) {
        var id = decoded.getPacketID();
        var encPubrelPubcomp = parser.encode(SNpubcomp(id));
        processPubcompout(encPubrelPubcomp, decoded, this)
    }
}

function ping(id) {
    var pingreq = SNpingreq(id);
    var encPing = parser.encode(pingreq);
    sendData(encPing, 0, 'snpingreq');
}

function sendData(payload, packetID, parentEvent, topicID) {
    try {
        bus.send('udp.senddata' + vm.unique, {
            payload: payload,
            clientID: vm.thisClientID,
            packetID: packetID,
            parentEvent: parentEvent,
            unique: vm.unique,
            topicID: topicID,
        });
    } catch(e) {
        console.log(e);
    }    
}

function connectionDone(packetID, parentEvent) {
    try {
        bus.send('udp.done' + vm.unique, {
            clientID: vm.thisClientID,
            unique: vm.unique,
            parentEvent: parentEvent,
            packetID: packetID
        });
    } catch(e) { console.log(e) }    
}

function saveMessage(msg) {
    try{
        var message = {
            type: 'snmessage',
            message: {
                topicID: msg.topicID || '',
                topic: msg.topic || '',
                qos: msg.qos,
                content: msg.content || '',
                connectionId: vm.thisClientID,
                direction: msg.direction || 'in',
                unique: vm.unique,
                packetID: msg.packetID || '',
            },
            id: guid(),
            time: (new Date()).getTime()
        }
    
        db.loadDatabase();
        db.insert(message);
    } catch(e) {console.log(e) }   
}

function processConnack(data, id) {
    connectionDone(null, 'snconnack');
    db.loadDatabase();
    if (data.getCode() == 'ACCEPTED') {
        db.remove({ type: 'snconnack' }, { multi: true }, function (err, docs) {
            db.insert({
                type: 'snconnack',
                connectionId: id,
                id: guid()
            });
        });
        ping(id);
    } else {
        db.remove({ type: 'snconnack' }, { multi: true }, function (err, docs) {
        });
    }
}

function processRegister(data, packetID, client) {
    if (client.publish.params.qos == 0) {
       vm.tokens.releaseToken(packetID);
    }
    sendData(data, null, 'snregister');
}

function processWillTopic() {
    var willtopic = SNwilltopic(new FullTopic(this.topic, CLIENT[msg.params.connection.unique].qos), CLIENT[msg.params.connection.unique].retain);
    var message = parser.encode(willtopic);
    sendData(message, null, 'snwilltopic');
}

function processUnsuback(data, msg) {
    connectionDone(data.getPacketID(), 'snunsuback');
    db.loadDatabase();
   vm.tokens.releaseToken(data.getPacketID());
    for (var i = 0; i < msg.length; i++) {
        db.remove({ 'type': 'snsubscribtion', 'subscribtion.topic': msg[i].getTopic() }, { multi: true });
    }
}

function processSuback(data, msg) {
    connectionDone(data.getPacketID(), 'snsuback');   
    try {
        vm.tokens.releaseToken(data.getPacketID());
    } catch(e) {
        console.log(e)
    }
    var subscribtions = [];
    db.loadDatabase();
    for (var i = 0; i < msg.topics.length; i++) {
        var subscribeData = {
            type: 'snsubscribtion',
            subscribtion: {
                topic: msg.topics[i].topic,
                qos: msg.topics[i].qos,
                connectionId: msg.clientID,
                unique: vm.unique,
                topicID: data.getTopicID()
            },
        }
        subscribtions.push(subscribeData);
        db.remove({ 'type': 'subscribtion', 'subscribtion.topic': msg.topics[i].topic }, { multi: true });
    }
    db.insert(subscribtions);
}

function processWillmsg() {
    var willmessage = SNwillmsg(this[unique].message)
    var message = parser.encode(willmessage);
    sendData(message, null, 'snwillmsg');
}

function processRegack(data, client) {
    var pub = client.publish.params

    pub.packetID = data.getPacketID();
    pub.topicID = data.getTopicID()
    try {
        client.Publish(pub);
    } catch(e) {
        console.log(e)
    } 
}

function processPublish(data, params, client) {
    var parentEvent = 'snpublish';

    if (client.publish.params.qos == 0) {
        parentEvent = 'snpublishQos0';
    }
    sendData(data, params.packetID, parentEvent);
    if (client.publish.params.qos == 0) {
        var msg = client.publish.params;
        msg.direction = 'out'
        
        saveMessage(msg);
        connectionDone(null, 'snpubcomp');
    }
}

function processPuback(data, client) {
    connectionDone(data.getPacketID(), 'snpuback');
   vm.tokens.releaseToken(data.getPacketID());
    if (data.getCode() == ENUM.ReturnCode.SN_ACCEPTED_RETURN_CODE) {
        var msg = client.publish.params;
        msg.direction = 'out'
        saveMessage(msg);
    }
}

function processPubcomp(client, data) {
    connectionDone(data.getPacketID(), 'snpubcomp');
   vm.tokens.releaseToken(data.getPacketID());
    var msg = client.publish.params;
    msg.direction = 'out';
    saveMessage(msg);
}

function processPublishin(data) {
    if (!data) return;
    if (data.qos == 0) {
        db.loadDatabase();
        db.find({
            'subscribtion.topicID': parseInt(data.topic)
        }, function (err, docs) {
            if(docs.length) {
                data.topicID = data.topic;
                data.topic = docs[0].subscribtion.topic
                saveMessage(data);
            }           
        });
    }
}

function processPubackout(data, msg) {    
    if (!data) return;
    sendData(data, msg.packetID, 'snpubackout');
    db.loadDatabase();
    db.find({
        'subscribtion.topicID': parseInt(msg.topic)
    }, function (err, docs) {
        msg.topic = docs[0].subscribtion.topic
        saveMessage(msg);
    });
}

function processPubrecout(data, msg, client) {
    client.topic = msg
    if (!data) return;
    sendData(data, msg.packetID, 'snpubrecout');
}

function processPubcompout(data, msg, client) {
    if (!data) return;
    var packetID = msg.getPacketID();
    sendData(data, msg.getPacketID(), 'snpubcompout');
    var id = this.id;
    db.loadDatabase();
    db.find({
        'subscribtion.topicID': parseInt(client.topic.topic)
    }, function (err, docs) {

        if (docs.length) {
            var packet = client.topic;
            packet.topicID = client.topic.topic;
            packet.topic = docs[0].subscribtion.topic
            saveMessage(packet);
        }
    });
} 