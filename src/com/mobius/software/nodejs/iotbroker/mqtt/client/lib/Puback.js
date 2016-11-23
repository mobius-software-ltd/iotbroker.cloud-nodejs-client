'use strict';
var ENUM = require('./enum');

function Puback(newPacketID) {
    var packetID = newPacketID;

    return {
        reInit: function(newPacketID) {
            packetID = newPacketID;
            return this;
        },
        getLength: function() {
            return 2;
        },
        getType: function() {
            return ENUM.MessageType.PUBACK;
        },
        processBy: function(device) {
            device.processPuback(this.getPacketID());
        },
        getPacketID: function() {
            return packetID;
        },
        setPacketID: function(newPacketID) {
            packetID = newPacketID;
        },
    }
}

module.exports = Puback;