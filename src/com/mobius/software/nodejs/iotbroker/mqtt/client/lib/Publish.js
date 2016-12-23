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

function Publish(newPacketID, newTopic, newContent, newRetain, newDup) {
    var packetID;
    var topic;
    var content;
    var retain;
    var dup;

    if (arguments.length == 4)
        reInit(null, newTopic, newContent, newRetain, newDup);
    else if (arguments.length == 5)
        reInit(newPacketID, newTopic, newContent, newRetain, newDup);
    else
        throw new Error('Missing parameters for Publish');

    function reInit(newPacketID, newTopic, newContent, newRetain, newDup) {
        packetID = newPacketID;
        topic = newTopic;
        content = newContent;
        retain = newRetain;
        dup = newDup;
        return this;
    }


    function getType() {
        return ENUM.MessageType.PUBLISH;
    }

    function processBy(device) {
        device.processPublish(this.getPacketID(), topic, content, retain, dup);
    }

    function getLength() {
        var length = 0;
        length += this.getPacketID() != null ? 2 : 0;
        length += topic.getLength() + 2;
        length += content.length;
        return length;
    }

    function getTopic() {
        return topic;
    }

    function setTopic(newTopic) {
        topic = newTopic;
    }

    function getContent() {
        return content;
    }

    function setContent(newContent) {
        content = newContent;
    }

    function isRetain() {
        return retain;
    }

    function setRetain(newRetain) {
        retain = newRetain;
    }

    function isDup() {
        return dup;
    }

    function setDup(newDup) {
        dup = newDup;
    }

    function getPacketID() {
        return packetID;
    }

    function setPacketID(newPacketID) {
        packetID = newPacketID;
    }


    return {
        getType: getType,
        processBy: processBy,
        getLength: getLength,
        getTopic: getTopic,
        setTopic: setTopic,
        getContent: getContent,
        setContent: setContent,
        isRetain: isRetain,
        setRetain: setRetain,
        isDup: isDup,
        setDup: setDup,
        getPacketID: getPacketID,
        setPacketID: setPacketID
    }
}

module.exports = Publish;