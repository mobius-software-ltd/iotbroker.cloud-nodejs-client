'use strict';
var ENUM = require('./enum');

function Pubcomp(newPacketID) {
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
            return ENUM.MessageType.PUBCOMP;
        },
        processBy: function(device) {
            device.processPubcomp(this.getPacketID());
        },
        getPacketID: function() {
            return packetID;
        },
        setPacketID: function(newPacketID) {
            packetID = newPacketID;
        },
    }
}

module.exports = Pubcomp;