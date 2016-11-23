'use strict';
var ENUM = require('./enum');


function Suback(newPacketID, newReturnCodes) {
    var packetID = newPacketID;
    var returnCodes = newReturnCodes;

    return {
        reInit: function(newPacketID, newReturnCodes) {
            var packetID = newPacketID;
            var returnCodes = newReturnCodes;
            return this;
        },
        getLength: function() {
            return 2 + returnCodes.length;
        },
        getType: function() {
            return ENUM.MessageType.SUBACK;
        },
        processBy: function(device) {
            device.processSuback(this.getPacketID(), returnCodes);
        },
        getReturnCodes: function() {
            return returnCodes;
        },
        setReturnCodes: function(newReturnCodes) {
            returnCodes = returnCodes;
        },
        getPacketID: function() {
            return packetID;
        },
        setPacketID: function(newPacketID) {
            packetID = newPacketID;
        },
    }
}

module.exports = Suback;