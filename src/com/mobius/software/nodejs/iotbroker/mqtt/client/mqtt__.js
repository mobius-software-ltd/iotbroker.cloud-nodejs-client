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
    Events.EventEmitter.call(this);
}
util.inherits(MqttClient, Events.EventEmitter);


MqttClient.prototype.Connect = connect;
MqttClient.prototype.Disconnect = disconnect;
MqttClient.prototype.Publish = publish;
MqttClient.prototype.Subscribe = subscribe;
MqttClient.prototype.Unsubscribe = unsubscribe;


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

// connection.on('error', function(error) {
//     console.log('Error occured while establishing connection to host');
//     console.log(error);
// })


function connect(params) {
    var that = this;
    conntectionParams = params;
    connection = connection
    connection.connect(params.port, params.host, function() {
        onConnect.call(that, conntectionParams);
    })
}

function disconnect(params) {
    var disconnect = Disconnect()
    try {
        var encDisconnect = parser.encode(disconnect)
    } catch (e) {
        console.log('Parser can`t encode provided params.');
    }
    connection.write(encDisconnect);
    TIMERS.releaseTimer(0);
    this.emit('disconnected');
    connection.end();
}

function subscribe(params) {
    console.log('Subscribe by worker id:', conntectionParams.id);

    var token = TOKENS.getToken();
    var topics = [];
    for (var i = 0; i < params.topics.length; i++) {
        topics.push(Topic(params.topics[i].topic, params.topics[i].qos));
    }
    var subscribe = Subscribe(token, topics);

    try {
        var encSubscribe = parser.encode(subscribe);
        // console.log('encSubscribe', encSubscribe);
    } catch (e) {
        console.log('Parser can`t encode provided params.');
    }
    var timer = Timer({
        callback: function() {
            connection.write(encSubscribe);
        },
        interval: conntectionParams.keepalive * 1000,
    })
    connection.write(encSubscribe);
    TIMERS.setTimer(token, timer);
    // connection.write(encSubscribe);
}

function unsubscribe(params) {
    var token = TOKENS.getToken();
    var topics = params.topics || [];
    //console.log('params:', topics[0]);
    var unsubscribe = Unsubscribe(token, topics);
    // console.log(unsubscribe.getTopics());

    try {
        var encUnsubscribe = parser.encode(unsubscribe);
        // console.log('encSubscribe', encSubscribe);
    } catch (e) {
        console.log('Parser can`t encode provided params.');
    }
    var timer = Timer({
        callback: function() {
            connection.write(encUnsubscribe);
        },
        interval: conntectionParams.keepalive * 1000,
    })
    connection.write(encUnsubscribe);
    TIMERS.setTimer(token, timer);
}

function publish(params) {
    var that = this;
    var token = null;
    if (params.qos != 0)
        var token = TOKENS.getToken();
    console.log('Publish received params:', params)
    try {
        var publish = Publish(token, Topic(Text(params.topic), params.qos), new Buffer.from(params.content), params.retain, params.isDupe);
        var encPublish = parser.encode(publish);
    } catch (error) {
        console.log('Parser can`t encode provided params.');
    }

    messages.pushMessage(token, params);
    if (params.qos != 0) {
        var timer = Timer({
            callback: function() {
                connection.write(encPublish);
            },
            interval: conntectionParams.keepalive * 1000,
        })
        TIMERS.setTimer(token, timer);
    }
    connection.write(encPublish);
    // if (params.qos == 0)
    // this.emit('puback', params);
}

function onConnect(params) {
    var that = this;
    isMaster = true;
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
    var newTimer = Timer({
        callback: function() {
            connection.write(encConnect);
        },
        interval: conntectionParams.keepalive * 1000
    })
    TIMERS.setTimer(0, newTimer);
    connection.write(encConnect);
    connection.on('data', function(data) {
        onDataRecieved.call(that, data);
    });
}

function onDataRecieved(data) {
    var that = this;
    // console.log(this);
    // console.log('Worker id:', conntectionParams.id);
    console.log("Data received: ", data);

    console.log("Data type decoded", ENUM.getKeyByValue(ENUM.MessageType, (parser.decode(data)).getType()));

    try {
        var decoded = parser.decode(data);

    } catch (error) {
        console.log('Parser unadble to decode received data.');
    }

    if (decoded.getType() == ENUM.MessageType.CONNACK) {
        this.emit('connack');
        connectionStatus = ENUM.PingStatus.INITIALIZED;
        if (isMaster) {
            TIMERS.releaseTimer(0);
            var timer = Timer({
                callback: function() {
                    ping.call(that);
                },
                interval: conntectionParams.keepalive * 1000
            });
            TIMERS.setTimer(0, timer);
        }
    }
    if (decoded.getType() == ENUM.MessageType.PINGRESP) {
        connectionStatus = ENUM.PingStatus.RECEIVED;
        console.log("Pingresp received!");
        this.emit('ping');
    }

    if (decoded.getType() == ENUM.MessageType.PUBACK) {
        var id = decoded.getPacketID();
        TOKENS.releaseToken(id);
        TIMERS.releaseTimer(id);
        this.emit('puback', messages.pullMessage(id));
        //console.log("Puback received!");
    }

    if (decoded.getType() == ENUM.MessageType.PUBREC) {
        var id = decoded.getPacketID();
        TIMERS.releaseTimer(id);
        if (TOKENS.contains(id)) {
            try {
                var pubrel = Pubrel(id);
                var encPubrel = parser.encode(pubrel);
                var timer = Timer({
                    callback: function() {
                        connection.write(encPubrel);
                    },
                    interval: conntectionParams.keepalive * 1000,
                })
                TIMERS.setTimer(id, timer);
                connection.write(encPubrel);
            } catch (error) {
                console.log('Parser can`t encode provided params.');
            }
        }
        //console.log("Pubrec received!");
    }

    if (decoded.getType() == ENUM.MessageType.PUBCOMP) {
        var id = decoded.getPacketID();
        TOKENS.releaseToken(id);
        TIMERS.releaseTimer(id);
        this.emit('pubcomp', messages.pullMessage(id));
        // this.emit('pubcomp');
        //console.log("Pubcomp received!");
    }

    if (decoded.getType() == ENUM.MessageType.SUBACK) {
        var id = decoded.getPacketID();
        var codes = decoded.getReturnCodes();
        //console.log(codes);
        console.log("Suback received!. id:", id);
        TOKENS.releaseToken(id);
        TIMERS.releaseTimer(id);
        this.emit('suback');
    }

    if (decoded.getType() == ENUM.MessageType.UNSUBACK) {
        var id = decoded.getPacketID();
        TOKENS.releaseToken(id);
        TIMERS.releaseTimer(id);
        this.emit('unsuback');
        //console.log("Unsuback received!. id:", id);
    }

    if (decoded.getType() == ENUM.MessageType.PUBREL) {
        var id = decoded.getPacketID();
        var encPubrelPubcomp = parser.encode(Pubcomp(id));
        this.emit('publish', messages.pullMessage(id));
        connection.write(encPubrelPubcomp);
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
                topic: publishTopic.substring(0, publishTopic.indexOf(":")),
                qos: ENUM.QoS[publishQos],
                content: publishContent
            }
            //console.log(message);
        switch (ENUM.QoS[publishQos]) {
            case 0:
                this.emit('publish', message);
                break;
            case 1:
                var encPublishPuback = parser.encode(Puback(id));
                connection.write(encPublishPuback);
                this.emit('publish', message);
                break;
            case 2:
                var encPublishPubrec = parser.encode(Pubrec(id));
                connection.write(encPublishPubrec);
                messages.pushMessage(id, message)
                break;
            default:
                break;
        }
    }
}

function ping() {
    if (connectionStatus == ENUM.PingStatus.SENT) {
        this.emit('disconnected');
        disconnect();
        throw Error('Connection lost');
    }
    connectionStatus = ENUM.PingStatus.SENT;
    console.log('ping sent');
    var pingreq = Pingreq();
    var encPing = parser.encode(pingreq);
    connection.write(encPing);
}