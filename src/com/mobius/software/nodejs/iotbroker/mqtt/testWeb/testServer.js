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
    res.send(JSON.stringify(data));
});
connection.on('error', function(error) {
    console.log('Error: ', error);
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
        will: new CLIENT.Will(CLIENT.Topic(CLIENT.Text("lookup"), CLIENT.ENUM.QoS.AT_LEAST_ONCE), Buffer.from("John: i'll be back"), true)
    });
    var parser = CLIENT.MQParser;
    var enc = parser.encode(connect);

    connection.connect(1883, '172.21.0.252', function connectionCallback() {
        console.log('Connected!');
        connection.write(enc);
        console.log("Sent data: ", enc);
    });

    res.send(JSON.stringify(enc));
});

app.post('/disconnect', function onConnect(req, res) {

    var CLIENT = new mqtt();
    // console.log(CLIENT.ENUM.getKeyByValue(CLIENT.ENUM.MessageType, 2));
    var disconnect = CLIENT.Disconnect();
    var parser = CLIENT.MQParser;
    var enc = parser.encode(disconnect);

    var connection = new net.Socket();
    // connection.connect(1883, '172.21.0.252', function connectionCallback() {
    // console.log('Connected!');
    connection.write(enc);
    console.log("Sent data: ", enc);
    // });


    res.send('Done!');
});

app.post('/pingreq', function onConnect(req, res) {

    var CLIENT = new mqtt();
    // console.log(CLIENT.ENUM.getKeyByValue(CLIENT.ENUM.MessageType, 2));
    var pingreq = CLIENT.Pingreq();
    var parser = CLIENT.MQParser;
    var enc = parser.encode(pingreq);

    // var connection = new net.Socket();
    // connection.connect(1883, '172.21.0.252', function connectionCallback() {
    //     console.log('Connected!');
    connection.write(enc);
    //     console.log("Sent data: ", enc);
    // });


    // console.log(enc.toString());
    // console.log(connect.getWill().getContent());
    res.send(JSON.stringify(enc));
});

app.post('/pingresp', function onConnect(req, res) {

    var CLIENT = new mqtt();
    // console.log(CLIENT.ENUM.getKeyByValue(CLIENT.ENUM.MessageType, 2));
    var pingresp = CLIENT.Pingresp();
    var parser = CLIENT.MQParser;
    var enc = parser.encode(pingresp);

    var connection = new net.Socket();
    connection.connect(1883, '172.21.0.252', function connectionCallback() {
        console.log('Connected!');
        connection.write(enc);
        console.log("Sent data: ", enc);
    });

    connection.on('data', function(data) {
        console.log('Received: ', data);
    });

    connection.on('error', function(error) {
        console.log('Error: ', error);
    });

    connection.on('close', function() {
        console.log('Connection closed');
    });

    // console.log(enc.toString());
    // console.log(connect.getWill().getContent());
    res.send(JSON.stringify(enc));
});

app.listen('8888', function() {
    console.log('app is running on port 8888');
})