'use strict';

var net = require('net');
var ENUM = require('./lib/enum');
var Connect = require('./lib/Connect');
var Connack = require('./lib/Connack');
var Disconnect = require('./lib/Disconnect');
var Pingreq = require('./lib/Pingreq');
var Pingresp = require('./lib/Pingresp');
var Publish = require('./lib/Publish');
var Will = require('./lib/Will');
var Topic = require('./lib/Topic');
var Text = require('./lib/Text');
var MQParser = require('./MQParser');


// console.log(ENUM.ConnackCode['SERVER_UNUVALIABLE']);

function MqttClient() {
    this.ENUM = ENUM;
}

MqttClient.prototype.Connect = Connect;
MqttClient.prototype.Connack = Connack;
MqttClient.prototype.Disconnect = Disconnect;
MqttClient.prototype.Pingreq = Pingreq;
MqttClient.prototype.Pingresp = Pingresp;
MqttClient.prototype.Publish = Publish;
MqttClient.prototype.Will = Will;
MqttClient.prototype.Topic = Topic;
MqttClient.prototype.Text = Text;
MqttClient.prototype.MQParser = MQParser;


module.exports = MqttClient;
module.exports.Connect = MqttClient.prototype.Connect;