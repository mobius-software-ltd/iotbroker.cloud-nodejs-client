'use strict';
var ENUM = require('./enum');

function Unsuback(newPacketID) {
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
            return ENUM.MessageType.UNSUBACK;
        },
        processBy: function(device) {
            device.processUnsuback(this.getPacketID());
        },
        getPacketID: function() {
            return packetID;
        },
        setPacketID: function(newPacketID) {
            packetID = newPacketID;
        },
    }
}

module.exports = Unsuback;