'use strict';
var ENUM = require('./enum');

function Pubrec(newPacketID) {
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
            return ENUM.MessageType.PUBREC;
        },
        processBy: function(device) {
            device.processPubrec(this.getPacketID());
        },
        getPacketID: function() {
            return packetID;
        },
        setPacketID: function(newPacketID) {
            packetID = newPacketID;
        },
    }
}

module.exports = Pubrec;