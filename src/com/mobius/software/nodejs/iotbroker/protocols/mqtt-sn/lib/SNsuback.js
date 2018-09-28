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


function SNsuback(options) {
    var topicID = options.topicID;
    var packetID = options.packetID;
    var code = options.returnCode;
    var qos = options.qos;

    return {
        reInit: function(options) {
            topicID = options.topicID;
            packetID = options.packetID;
            code = options.returnCode;
            qos = options.qos;
            return this;
        },
        getLength: function() {
            return 8;
        },
        getType: function() {
            return ENUM.MessageType.SN_SUBACK;
        },
        processBy: function(device) {
            device.processSuback(this.getPacketID(), code);
        },
        getCode: function() {
            return code;
        },
        setCode: function(value) {
            code = value;
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
        getQos: function() {
            return qos;
        },
        setQos: function(value) {
            qos = value;
        },
    }
}

module.exports = SNsuback;