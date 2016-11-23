'use strict';
var ENUM = require('./enum');

function Unsubscribe() {
    var packetID;
    var topics = [];

    if (arguments.length == 1) {
        if (Array.isArray(arguments[0]))
            topics = arguments[0];
    }
    if (arguments.length == 2) {
        packetID = arguments[0];
        topics = arguments[1];
    }

    return {
        reInit: function(newPacketID, newTopics) {
            packetID = newPacketID;
            topics = newTopics;
            return this;
        },
        getLength: function() {
            var length = 2;
            for (var i = 0; i < topics.length; i++) {
                length += topics[i].length() + 2;
            }
            return length;
        },
        getType: function() {
            return ENUM.MessageType.UNSUBSCRIBE;
        },
        processBy: function(device) {
            device.processUnsubscribe(this.getPacketID(), topics);
        },
        getTopics: function() {
            return topics;
        },
        setTopics: function(newTopics) {
            topics = newTopics;
        },
        getPacketID: function() {
            return packetID;
        },
        setPacketID: function(newPacketID) {
            packetID = newPacketID;
        },
    }
}

module.exports = Unsubscribe;