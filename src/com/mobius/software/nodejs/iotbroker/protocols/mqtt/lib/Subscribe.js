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