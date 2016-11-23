"use strict";

var express = require('express');
var mqtt = require('../client/mqtt');
var MQParser = require('../client/MQParser');
// var ENUM = require('../client/lib/enum');
var net = require('net');

var app = express();

var connection = new net.Socket();
connection.on('data', function(data) {
    console.log('Received: ', data);
});

connection.on('close', function() {
    console.log('Connection closed');
});


app.post('/connect', function onConnect(req, res) {
    var CLIENT = new mqtt();
    var connect = CLIENT.Connect({
        username: "firstTestAccount@foo.bar",
        password: "firstTestAccountPassword",
        clientID: "_123456789",
        isClean: true,
        keepalive: 60,
        will: CLIENT.Will(CLIENT.Topic(CLIENT.Text("lookup"), CLIENT.ENUM.QoS.AT_LEAST_ONCE), Buffer.from("John: i'll be back"), true)
    });
    var parser = CLIENT.MQParser;
    var enc = parser.encode(connect);

    connection.connect(1883, '172.21.0.252', function connectionCallback() {
        console.log('Connected!');
        connection.write(enc);
        console.log("Sent data: ", enc);
    });


    connection.on('error', function(error) {
        console.log('Error: ', error);
        connection.destroy();
        res.send(JSON.stringify(error));
    });

    connection.once('data', function(data) {
        var parser = CLIENT.MQParser;
        res.send(JSON.stringify(data));
        var decoded = parser.decode(data);
        // console.log('decoded:', decoded.getType());
    });

});

app.post('/disconnect', function onDisconnect(req, res) {

    var CLIENT = new mqtt();
    var disconnect = CLIENT.Disconnect();
    var enc = parser.encode(disconnect);

    connection.write(enc);
    console.log("Sent data: ", enc);

    // connection.once('data', function(data) {
    res.end();
    // });
});

app.post('/pingreq', function onPingreq(req, res) {

    var CLIENT = new mqtt();
    // console.log(CLIENT.ENUM.getKeyByValue(CLIENT.ENUM.MessageType, 2));
    var pingreq = CLIENT.Pingreq();
    var parser = CLIENT.MQParser;
    var enc = parser.encode(pingreq);

    connection.write(enc);

    connection.once('data', function(data) {
        res.send(JSON.stringify((parser.decode(data)).getType()));
    });
    // res.send(JSON.stringify(enc));
});

app.post('/publish', function onPublish(req, res) {
    var CLIENT = new mqtt();
    var parser = CLIENT.MQParser;
    var content = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64]);
    var publishData = CLIENT.Publish(100, CLIENT.Topic(CLIENT.Text("new_topic"), CLIENT.ENUM.QoS.EXACTLY_ONCE), content, true, true);
    var enc = parser.encode(publishData);

    console.log("Sent data: ", enc);
    // console.log(enc.toString('utf8'));
    connection.write(enc);

    connection.once('data', function(data) {
        console.log(data);
        res.send(JSON.stringify((parser.decode(data)).getType()));
    });
})

app.listen('8888', function() {
    console.log('app is running on port 8888');
})