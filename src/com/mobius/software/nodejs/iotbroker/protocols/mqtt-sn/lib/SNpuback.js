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

function SNpuback(options) {
    var packetID = options.packetID;
    var topicID = options.topicID;
    var code = options.returnCode;
    return {
        reInit: function(options) {
            topicID = options.packetID;
            packetID = options.topicID;
            code = options.returnCode;
            return this;
        },
        getLength: function() {
            return 7;
        },
        getType: function() {
            return ENUM.MessageType.SN_PUBACK;
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
        getTopicID: function() {
            return topicID;
        },
        setTopicID: function(value) {
            topicID = value;
        },
        getCode: function() {
            return code;
        },
        setCode: function(value) {
            code = value;
        },
    }
}

module.exports = SNpuback;