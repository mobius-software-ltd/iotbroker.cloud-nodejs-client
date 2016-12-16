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


function MqttClient() {
    this.ENUM = ENUM;
    // this.id;
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
    this.emit('mqttDisconnect', encDisconnect);
}

function subscribe(params) {
    var topics = [];
    for (var i = 0; i < params.topics.length; i++) {
        topics.push(Topic(params.topics[i].topic, params.topics[i].qos));
    }
    var subscribe = Subscribe(params.token, topics);

    try {
        var encSubscribe = parser.encode(subscribe);
    } catch (e) {
        console.log('Parser can`t encode provided params.');
    }
    subscribtions.pushMessage(params.token, params)
    this.emit('mqttSubscribe', encSubscribe, params.token)
}

function unsubscribe(params) {
    var topics = params || [];
    // console.log(params);
    var unsubscribe = Unsubscribe(params.token, topics);

    try {
        var encUnsubscribe = parser.encode(unsubscribe);
    } catch (e) {
        console.log('Parser can`t encode provided params.');
    }
    unsubscribtions.pushMessage(params.token, topics);
    this.emit('mqttUnsubscribe', encUnsubscribe, params.token);
}

function publish(params) {
    if (params.qos == 0) {
        params.token = null;
    }
    try {
        var publish = Publish(params.token, Topic(Text(params.topic), params.qos), new Buffer.from(params.content), params.retain, params.isDupe);
        var encPublish = parser.encode(publish);
    } catch (error) {
        console.log('Parser can`t encode provided params.');
    }

    messages.pushMessage(params.token, params);
    this.emit('mqttPublish', encPublish, params, params.token);
}

function connect(params) {
    conntectionParams = params;
    var connect = Connect({
        username: params.username,
        password: params.password,
        clientID: params.clientID || 'MQTT-' + Math.random().toString(18).substr(2, 16),
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
    this.emit('mqttConnect', encConnect);
}

function onDataRecieved(data) {
    var that = this;
    console.log("Data received: ", data);

    console.log("Data type decoded", ENUM.getKeyByValue(ENUM.MessageType, (parser.decode(data)).getType()));

    try {
        var decoded = parser.decode(data);

    } catch (error) {
        console.log('Parser unadble to decode received data.');
    }

    if (decoded.getType() == ENUM.MessageType.CONNACK) {
        this.emit('mqttConnack', decoded);
        // setInterval
        // connectionStatus = ENUM.PingStatus.INITIALIZED;
        // if (isMaster) {
        //     TIMERS.releaseTimer(0);
        //     var timer = Timer({
        //         callback: function() {
        //             ping.call(that);
        //         },
        //         interval: conntectionParams.keepalive * 1000
        //     });
        //     TIMERS.setTimer(0, timer);
        // }
    }
    if (decoded.getType() == ENUM.MessageType.PINGRESP) {
        connectionStatus = ENUM.PingStatus.RECEIVED;
        console.log("Pingresp received!");
        this.emit('mqttPingResp');
    }

    if (decoded.getType() == ENUM.MessageType.PUBACK) {
        var id = decoded.getPacketID();
        this.emit('mqttPuback', decoded, messages.pullMessage(id));
        console.log("Puback received!");
    }

    if (decoded.getType() == ENUM.MessageType.PUBREC) {
        var id = decoded.getPacketID();
        this.emit('mqttPubrec', id);

        try {
            var pubrel = Pubrel(id);
            var encPubrel = parser.encode(pubrel);
            this.emit('mqttPubrel', encPubrel, id);
        } catch (error) {
            console.log('Parser can`t encode provided params.');
        }
    }

    if (decoded.getType() == ENUM.MessageType.PUBCOMP) {
        var id = decoded.getPacketID();
        this.emit('mqttPubcomp', decoded, messages.pullMessage(id));
        console.log("Pubcomp received!");
    }

    if (decoded.getType() == ENUM.MessageType.SUBACK) {
        var id = decoded.getPacketID();
        var codes = decoded.getReturnCodes();
        console.log("Suback received!.");
        this.emit('mqttSuback', decoded, subscribtions.pullMessage(id));
    }

    if (decoded.getType() == ENUM.MessageType.UNSUBACK) {
        var id = decoded.getPacketID();
        this.emit('mqttUnsuback', decoded, unsubscribtions.pullMessage(id));
    }

    if (decoded.getType() == ENUM.MessageType.PUBREL) {
        var id = decoded.getPacketID();
        var encPubrelPubcomp = parser.encode(Pubcomp(id));
        this.emit('mqttPubcompOut', encPubrelPubcomp, messages.pullMessage(id));
    }

    if (decoded.getType() == ENUM.MessageType.PUBLISH) {
        var id = decoded.getPacketID();
        var publishTopic = decoded.getTopic().toString();
        var publishQos = decoded.getTopic().getQos();
        var publishContent = decoded.getContent().toString('utf8');
        console.log("Publish received!. id:", id);
        console.log("Publish qos:", publishQos);
        console.log("Publish topic:", publishTopic);
        console.log("Publish content:", publishContent);
        var message = {
            packetID: id,
            topic: publishTopic.substring(0, publishTopic.indexOf(":")),
            qos: ENUM.QoS[publishQos],
            content: publishContent
        }
        switch (ENUM.QoS[publishQos]) {
            case 0:
                this.emit('mqttPublishIn', message);
                break;
            case 1:
                var encPublishPuback = parser.encode(Puback(id));
                this.emit('mqttPubackOut', encPublishPuback, message);
                break;
            case 2:
                var encPublishPubrec = parser.encode(Pubrec(id));
                this.emit('mqttPubrecOut', encPublishPubrec, message);
                messages.pushMessage(id, message)
                break;
            default:
                break;
        }
    }
}

function ping() {
    // if (connectionStatus == ENUM.PingStatus.SENT) {
    //     this.emit('disconnected');
    //     disconnect();
    //     throw Error('Connection lost');
    // }
    // connectionStatus = ENUM.PingStatus.SENT;
    // console.log('ping sent');
    var pingreq = Pingreq();
    var encPing = parser.encode(pingreq);
    // connection.write(encPing);
    this.emit('mqttPing', encPing);

}