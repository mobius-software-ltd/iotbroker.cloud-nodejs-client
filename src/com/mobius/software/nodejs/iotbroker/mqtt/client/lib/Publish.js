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