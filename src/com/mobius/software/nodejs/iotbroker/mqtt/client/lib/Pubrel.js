'use strict';
var ENUM = require('./enum');

function Pubrel(newPacketID) {
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
            return ENUM.MessageType.PUBREL;
        },
        processBy: function(device) {
            device.processPubarel(this.getPacketID());
        },
        getPacketID: function() {
            return packetID;
        },
        setPacketID: function(newPacketID) {
            packetID = newPacketID;
        },
    }
}

module.exports = Pubrel;