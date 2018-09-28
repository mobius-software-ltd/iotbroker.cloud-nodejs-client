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

'use strict'
var ENUM = require('../lib/enum');


function SNencapsulated(options) {
    var radius = options.radius;
    var wirelessNodeID = options.wirelessNodeID;
    var message = options.message;
    return {
        reInit: function(options) {
            radius = options.radius;
            wirelessNodeID = options.wirelessNodeID;
            message = options.message;
            return this;
        },
        getLength: function() {
            var length = 3;
            if(wirelessNodeID != null) {
                length += wirelessNodeID.length;
            }
            if(message.getLength() > 0) {
                length += message.getLength();
            }
            return length;
        },
        getType: function() {
            return ENUM.MessageType.SN_ENCAPSULATED;
        },
        getRadius: function() {
            return radius;
        },
        setRadius: function(value) {
            radius = value;
        },
        getWirelessNodeID: function() {
            return wirelessNodeID;
        },
        setWirelessNodeID: function(value) {
            wirelessNodeID = value;
        },
        getMessage: function() {
            return message;
        },
        setMessage: function(value) {
            message = value;
        },
        
    }
}

module.exports = SNencapsulated;