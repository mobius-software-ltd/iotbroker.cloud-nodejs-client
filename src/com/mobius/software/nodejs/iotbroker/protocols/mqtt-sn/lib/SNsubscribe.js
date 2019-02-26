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

function SNsubscribe(newPacketID, newTopic, newDup) {
  
    var packetID = newPacketID;
    var topic = newTopic;
    var dup = newDup;
    var topics = [];
  if (newTopic.length == 1) { 
        if (Array.isArray(newTopic[0]))  
           topic = newTopic[0];
    }

    return {
        reInit: function(newPacketID, newTopic, newDup) {
            packetID = newPacketID;
            topic = newTopic;
            dup = newDup;          
            return this;
        },
        getLength: function() {
            var length = 5;    
            length += topic.getLength();
            if(topic.getLength() > 250) {
                length += 2
            }
            return length;
        },
        getType: function() {
            return ENUM.MessageType.SN_SUBSCRIBE;
        },
        processBy: function(device) {
            device.processSubscribe(this.getPacketID(), topic);
        },
        getTopic: function() {  
             return topic;
        },
        setTopic: function(newTopic) {
            topic = newTopic;
        },
        getPacketID: function() {
            return packetID;
        },
        setPacketID: function(newPacketID) {
            packetID = newPacketID;
        },
        getDup: function() {
            return dup;
        },
        setDup: function(value) {
            dup = value;
        },
    }
}

module.exports = SNsubscribe;