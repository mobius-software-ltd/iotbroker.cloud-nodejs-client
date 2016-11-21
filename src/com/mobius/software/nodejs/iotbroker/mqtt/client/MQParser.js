'use strict';

var net = require('net');
var ENUM = require('./lib/enum');
var Connect = require('./lib/Connect');
var Connack = require('./lib/Connack');
var Disconnect = require('./lib/Disconnect');
var Pingreq = require('./lib/Pingreq');
var Pingresp = require('./lib/Pingresp');
var LengthDetails = require('./lib/LengthDetails')

// console.log(ENUM.ConnackCode['SERVER_UNUVALIABBE']);

var MQParser = {
    DISCONNECT_MESSAGE: Disconnect(),
    PINGREQ_MESSAGE: Pingreq(),
    PINGRESP_MESSAGE: Pingresp(),
    next: next,
    decode: decode,
    encode: encode,
    getBuffer: getBuffer
}


function next(buf) {
    // buf.markReaderIndex();
    var type = ENUM.getKeyByValue(ENUM.MessageType, (((buf.readByte() >> 4) & 0xf)));

    switch (type) {
        case PINGREQ:
        case PINGRESP:
        case DISCONNECT:
            // buf.resetReaderIndex();
            return Buffer.alloc(2);
        default:
            var length = LengthDetails.decode(buf);
            // buf.resetReaderIndex();
            if (length.getLength() == 0)
                return null;
            var result = length.getLength() + length.getSize() + 1;
            return result <= buf.readableBytes() ? Buffer.alloc(result) : null;
    }
}

function decode(buf) {

}

function encode(header) {
    // console.log(header.getLength())
    var length = header.getLength();
    var newBuffer = getBuffer(length);
    var buf = newBuffer.buffer;
    var type = header.getType();
    var index = newBuffer.position;
    // console.log(type)
    switch (type) {
        case ENUM.MessageType.CONNECT:
            var connect = header;
            if (connect.isWillFlag() && !connect.getWill().isValid())
                throw new Error("Method encode(header) in MQParser class got invalid will encoding");

            buf.writeUInt8((type << 4), 0);
            index = buf.writeUInt16BE(4, index);
            index += buf.write(connect.getName(), index);
            index = buf.writeUInt8(connect.getProtocolLevel(), index);
            var contentFlags = 0;
            contentFlags |= 0;
            contentFlags |= connect.isClean() ? 0x02 : 0;
            contentFlags |= connect.isWillFlag() ? 0x04 : 0;
            contentFlags |= connect.isWillFlag() ? connect.getWill().getTopic().getQos() << 3 : 0;
            contentFlags |= connect.isWillFlag() ? connect.getWill().getRetain() ? 0x20 : 0 : 0;
            contentFlags |= connect.isUsernameFlag() ? 0x40 : 0;
            contentFlags |= connect.isPasswordFlag() ? 0x80 : 0;
            index = buf.writeUInt8(contentFlags, index);
            index = buf.writeUInt16BE(connect.getKeepAlive(), index);
            index = buf.writeUInt16BE(connect.getClientID().length, index);
            index += buf.write(connect.getClientID(), index);
            if (connect.isWillFlag() == true) {

                var willTopic = connect.getWill().getTopic().getName();
                // console.log("Buffer length:" + willTopic.length());
                // console.log(connect.getName(), "index:", index);

                if (!!willTopic) {
                    index = buf.writeUInt16BE(willTopic.length(), index);
                    index += buf.write(willTopic.toString(), index);
                }

                var willMessage = connect.getWill().getContent();
                if (!!willMessage) {
                    index = buf.writeUInt16BE(willMessage.length, index);
                    index += buf.write(willMessage.toString(), index);
                }
            }

            var username = connect.getUserName();
            if (!!username) {
                index = buf.writeUInt16BE(username.length, index);
                index += buf.write(username, index);
            }

            var password = connect.getPassword();
            if (!!password) {
                index = buf.writeUInt16BE(password.length, index);
                index += buf.write(password, index);
            }
            break;

        case ENUM.MessageType.CONNACK:
            var connack = header;
            index = buf.writeUInt8((type << 4), 0);
            index = buf.writeUInt8(connack.isSessionPresent(), index);
            index = buf.writeUInt8(connack.getReturnCode().getNum(), index);
            break;

        case ENUM.MessageType.PUBLISH:
            var publish = header;
            var firstByte = (type << 4);
            firstByte |= publish.isDup() ? 8 : 0;
            firstByte |= (publish.getTopic().getQos() << 1);
            firstByte |= publish.isRetain() ? 1 : 0;
            index = buf.writeUInt8(firstByte, 0);
            index = buf.writeUInt16BE(publish.getTopic().length(), index);
            index += buf.write(publish.getTopic().getName().toString(), index);
            if (!!publish.getPacketID())
                index = buf.writeUInt16BE(publish.getPacketID(), index);
            index += buf.write(publish.getContent(), index);
            break;

        case ENUM.MessageType.PUBACK:
            var puback = header;
            index = buf.writeUInt8((type << 4), 0);
            index = buf.writeUInt16BE(puback.getPacketID(), index);
            break;

        case ENUM.MessageType.PUBREC:
            var pubrec = header;
            index = buf.writeUInt8((type << 4), 0);
            index = buf.writeUInt16BE(pubrec.getPacketID(), index);
            break;

        case ENUM.MessageType.PUBREL:
            var pubrel = header;
            index = buf.writeUInt8(((type << 4) | 0x2), 0);
            index = buf.writeUInt16BE(pubrel.getPacketID(), index);
            break;

        case ENUM.MessageType.PUBCOMP:
            var pubcomp = header;
            index = buf.writeUInt8((type << 4), 0);
            index = buf.writeUInt16BE(pubcomp.getPacketID(), index);
            break;

        case ENUM.MessageType.SUBSCRIBE:
            var sub = header;
            index = buf.writeUInt8(((type << 4) | 0x2), 0);
            if (!!sub.getPacketID())
                index = buf.writeUInt16BE(sub.getPacketID(), index);
            var topics = sub.getTopics()
            for (var i = 0; i < topics.length; i++) {
                index = buf.writeUInt16BE(topics[i].getName().length, index);
                index += buf.write(topics[i].getName().toString(), index);
                index = buf.writeUInt8(topics[i].getQos(), index);
            }
            break;

        case ENUM.MessageType.SUBACK:
            var suback = header;
            index = buf.writeUInt8((type << 4), 0);
            index = buf.writeUInt16BE(suback.getPacketID(), index);
            var codes = suback.getReturnCodes()
            for (var i = 0; i < codes.length; i++) {
                index = buf.writeUInt8(codes[i].getNum(), index);
            }
            break;

        case ENUM.MessageType.UNSUBSCRIBE:
            var unsub = header;
            index = buf.writeUInt8(((type << 4) | 0x2), 0);
            index = buf.writeUInt16BE(unsub.getPacketID(), index);
            var topics = unsub.getTopics()
            for (var i = 0; i < topics.length; i++) {
                index = buf.writeUInt16BE(topic.getLength(), index);
                index += buf.write(topic.toString(), index);
            }
            break;

        case ENUM.MessageType.UNSUBACK:
            var unsuback = header;
            index = buf.writeUInt8((type << 4), 0);
            index = buf.writeUInt16BE(unsuback.getPacketID(), index);
            break;

        case ENUM.MessageType.DISCONNECT:
        case ENUM.MessageType.PINGREQ:
        case ENUM.MessageType.PINGRESP:
            index = buf.writeUInt8((type << 4), 0);
            // console.log(buf, index);
            break;

        default:
            throw new Error("Method encode(header) in MQParser class got invalid header type: " + type);
    }

    return buf;
}

function getBuffer(length) {
    var lengthBytes;
    // console.log(length);
    if (length <= 127)
        lengthBytes = 1;
    else if (length <= 16383)
        lengthBytes = 2;
    else if (length <= 2097151)
        lengthBytes = 3;
    else if (length <= 26843545)
        lengthBytes = 4;
    else
        throw new Error("Method getBuffer(length) in MQParser class got length which exceeds the maximum limit of 26843545 bytes");

    var bufferSize = 1 + lengthBytes + length;
    var buf = Buffer.alloc(bufferSize);


    var encByte;
    var pos = 1,
        l = length;

    do {
        encByte = l % 128;
        l = (Math.floor(l / 128)).toFixed(0);
        // console.log(l);
        if (l > 0)
            buf.writeUInt8(encByte + 128, pos)
        else
            buf.writeUInt8(encByte, pos)

        pos++;
    }
    while (l > 0);

    // var a = buf.writeUInt8(true, 0);
    // console.log(a);

    return {
        buffer: buf,
        position: pos
    };
}
// console.log(MQParser.getBuffer(127));

module.exports = MQParser;