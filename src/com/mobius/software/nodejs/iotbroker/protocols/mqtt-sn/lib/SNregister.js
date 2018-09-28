/**
 * Mobius Software LTD
 * Copyright 2015-2016, Mobius Software LTD
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 */

'use strict';
var ENUM = require('../lib/enum');

function SNregister(options) {
    var topicID = options.topicID; 
    var packetID = options.packetID;
    var topicName = options.topicName;

    return {
        reInit: function(options) {
            topicID = options.topicID; 
            packetID = options.packetID;
            topicName = options.topicName;
            return this;
        },
        getLength: function() {

            if(topicName.length == 0) {
                throw new Error("SNRegister must contain a valid topic name");
            }
            var length = 6;
            length += topicName.length;
            if(topicName.length > 249) {
                length += 2
            }
            return length;
        },
        getType: function() {
            return ENUM.MessageType.SN_REGISTER;
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
        getTopicID: function() {
            return topicID;
        },
        setTopicID: function(value) {
            topicID = value;
        },
        getTopicName: function() {
            return topicName;
        },
        setTopicName: function(value) {
            topicName = value;
        },
    }
}

module.exports = SNregister;