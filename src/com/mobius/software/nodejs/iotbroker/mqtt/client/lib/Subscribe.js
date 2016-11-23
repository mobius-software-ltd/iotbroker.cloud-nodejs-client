'use strict';
var ENUM = require('./enum');

function Subscribe() {
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
            var length = 0;
            length += this.getPacketID() != null ? 2 : 0;
            for (var i = 0; i < topics.length; i++) {

                length += topics[i].getName().length + 3;
            }
            return length;
        },
        getType: function() {
            return ENUM.MessageType.SUBSCRIBE;
        },
        processBy: function(device) {
            device.processSubscribe(this.getPacketID(), topics);
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

module.exports = Subscribe;