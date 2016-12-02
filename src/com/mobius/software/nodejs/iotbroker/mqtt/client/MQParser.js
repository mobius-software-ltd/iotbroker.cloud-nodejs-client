'use strict';

// var net = require('net');
var ENUM = require('./lib/enum');
var Connack = require('./lib/Connack');
var Connect = require('./lib/Connect');
var Disconnect = require('./lib/Disconnect');
var LengthDetails = require('./lib/LengthDetails');
var Pingreq = require('./lib/Pingreq');
var Pingresp = require('./lib/Pingresp');
var Puback = require('./lib/Puback');
var Pubcomp = require('./lib/Pubcomp');
var Publish = require('./lib/Publish');
var Pubrec = require('./lib/Pubrec');
var Pubrel = require('./lib/Pubrel');
var Suback = require('./lib/Suback');
var Subscribe = require('./lib/Subscribe');
var Text = require('./lib/Text');
var Topic = require('./lib/Topic');
var Unsuback = require('./lib/Unsuback');
var Unsubscribe = require('./lib/Unsubscribe');
var Will = require('./lib/Will');

// console.log(ENUM.QoS.AT_MOST_ONCE);

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
    var index = 0;
    // buf.markReaderIndex();
    var type = ENUM.MessageType[ENUM.getKeyByValue(ENUM.MessageType, (((buf.readUInt8(index) >> 4) & 0xf)))];
    index += 1;

    switch (type) {
        case ENUM.MessageType.PINGREQ:
        case ENUM.MessageType.PINGRESP:
        case ENUM.MessageType.DISCONNECT:
            // buf.resetReaderIndex();
            return Buffer.alloc(2);
        default:
            var length = LengthDetails().decode({
                buf: buf,
                index: index
            });
            index += length.getSize();

            // buf.resetReaderIndex();
            if (length.getLength() === 0)
                return null;
            var result = length.getLength() + length.getSize() + 1;
            return result <= buf.length - index ? Buffer.alloc(result) : null;
    }
}

function decode(buf) {
    var header = null;

    var index = 0;
    var fixedHeader = buf.readUInt8(index);
    index += 1;

    var length = LengthDetails().decode({
        buf: buf,
        index: index
    });
    index += length.getSize();
    // console.log('length: ', length.getLength());
    var type = ENUM.MessageType[ENUM.getKeyByValue(ENUM.MessageType, (fixedHeader >> 4) & 0xf)]; // MessageType.valueOf();
    // console.log(type);
    // try {
    switch (type) {
        case ENUM.MessageType.CONNECT:
            var nameValue = Buffer.alloc(buf.readUInt16BE(index));
            index += 2;
            var start = index;
            var end = index + nameValue.length;
            nameValue = buf.slice(start, end);
            index = end;
            // buf.readBytes(nameValue, 0, nameValue.length);
            var name = nameValue.toString('utf8');
            if (name != 'MQTT')
                throw new Error("CONNECT, protocol-name set to " + name);

            var protocolLevel = buf.readUInt8(index);
            index += 1;

            var contentFlags = buf.readUInt8(index);
            index += 1;

            var userNameFlag = ((contentFlags >> 7) & 1) == 1 ? true : false;
            var userPassFlag = ((contentFlags >> 6) & 1) == 1 ? true : false;
            var willRetain = ((contentFlags >> 5) & 1) == 1 ? true : false;

            var willQos = ENUM.getKeyByValue(ENUM.QoS, (((contentFlags & 0x1f) >> 3) & 3));
            if (!!!willQos)
                throw new Error("CONNECT, will QoS set to " + willQos);

            var willFlag = (((contentFlags >> 2) & 1) == 1) ? true : false;
            ///
            if (ENUM.QoS[willQos] > 0 && !willFlag)
                throw new Error("CONNECT, will QoS set to " + willQos + ", willFlag not set");

            if (willRetain && !willFlag)
                throw new Error("CONNECT, will retain set, willFlag not set");

            var cleanSession = ((contentFlags >> 1) & 1) == 1 ? true : false;

            var reservedFlag = (contentFlags & 1) == 1 ? true : false;
            if (reservedFlag)
                throw new Error("CONNECT, reserved flag set to true");

            var keepalive = buf.readUInt16BE(index); //
            index += 2;
            var clientIdValue = Buffer.alloc(buf.readUInt16BE(index));
            index += 2;

            // byte[] clientIdValue = new byte[buf.readUInt16BE()];
            var start = index;
            var end = index + clientIdValue.length;
            clientIdValue = buf.slice(start, end);
            index = end;

            // buf.readBytes(clientIdValue, 0, clientIdValue.length);
            var clientID = clientIdValue.toString('utf8');

            // if (!StringVerifier.verify(clientID))
            //     throw new Error("ClientID contains restricted characters: U+0000, U+D000-U+DFFF");

            var willTopic = null;
            var willMessage = null;
            var username = null;
            var password = null;
            var will = null;

            if (willFlag) {
                if (buf.length - index < 2)
                    throw new Error("Invalid encoding will/username/password");

                var willTopicValue = Buffer.alloc(buf.readUInt16BE(index));
                index += 2;

                // byte[] clientIdValue = new byte[buf.readUInt16BE()];
                // byte[] willTopicValue = new byte[buf.readUInt16BE()];
                if (buf.length - index < willTopicValue.length)
                    throw new Error("Invalid encoding will/username/password");
                var start = index;
                var end = index + willTopicValue.length;
                willTopicValue = buf.slice(start, end);
                index = end;
                // buf.readBytes(willTopicValue, 0, willTopicValue.length);
                var willTopicName = willTopicValue.toString('utf8');
                // if (!StringVerifier.verify(willTopicName))
                //     throw new Error("WillTopic contains one or more restricted characters: U+0000, U+D000-U+DFFF");
                willTopic = Text(willTopicName);

                if (buf.length - index < 2)
                    throw new Error("Invalid encoding will/username/password");

                willMessage = Buffer.alloc(buf.readUInt16BE(index));
                index += 2;


                if (buf.length - index < willMessage.length)
                    throw new Error("Invalid encoding will/username/password");

                var start = index;
                var end = index + willMessage.length;
                willMessage = buf.slice(start, end);
                index = end;

                // buf.readBytes(willMessage, 0, willMessage.length);
                if (willTopic.length() === 0)
                    throw new Error("invalid will encoding");
                will = new Will(new Topic(willTopic, willQos), willMessage, willRetain);
                if (!will.isValid())
                    throw new Error("invalid will encoding");
            }

            if (userNameFlag) {
                if (buf.length - index < 2)
                    throw new Error("Invalid encoding will/username/password");

                var userNameValue = Buffer.alloc(buf.readUInt16BE(index));
                index += 2;

                if (buf.length - index < userNameValue.length)
                    throw new Error("Invalid encoding will/username/password");

                var start = index;
                var end = index + userNameValue.length;
                userNameValue = buf.slice(start, end);
                index = end;
                username = userNameValue.toString('utf8');
                // buf.readBytes(userNameValue, 0, userNameValue.length);
                // if (!StringVerifier.verify(username))
                //     throw new Error("Username contains one or more restricted characters: U+0000, U+D000-U+DFFF");
            }

            if (userPassFlag) {
                if (buf.length - index < 2)
                    throw new Error("Invalid encoding will/username/password");

                var userPassValue = Buffer.alloc(buf.readUInt16BE(index));
                index += 2;

                if (buf.length - index < userPassValue.length)
                    throw new Error("Invalid encoding will/username/password");

                var start = index;
                var end = index + userPassValue.length;
                userPassValue = buf.slice(start, end);
                index = end;

                // buf.readBytes(userPassValue, 0, userPassValue.length);
                password = userPassValue.toString('utf8');;
                // if (!StringVerifier.verify(password))
                //     throw new Error("Password contains one or more restricted characters: U+0000, U+D000-U+DFFF");
            }

            if (buf.length - index > 0)
                throw new Error("Invalid encoding will/username/password");

            var connect = Connect(username, password, clientID, cleanSession, keepalive, will);
            if (protocolLevel != 4)
                connect.setProtocolLevel(protocolLevel);
            header = connect;
            break;

        case ENUM.MessageType.CONNACK:
            var sessionPresentValue = buf.readUInt8(index);
            index += 1;
            // console.log(buf);
            // console.log('CONNACK', index, sessionPresentValue)

            if (sessionPresentValue != 0 && sessionPresentValue != 1)
                throw new Error("CONNACK, session-present set to " + (sessionPresentValue & 0xff));
            var isPresent = sessionPresentValue == 1 ? true : false;

            var connackByte = buf.readUInt8(index);
            index += 1;
            var connackCode = ENUM.getKeyByValue(ENUM.ConnackCode, connackByte);
            // console.log('connackByte', connackCode);
            if (connackCode == null)
                throw new Error("Invalid connack code: " + connackByte);
            header = Connack({
                sessionPresent: isPresent,
                returnCode: connackCode
            });
            break;

        case ENUM.MessageType.PUBLISH:
            var dataLength = length.getLength();
            fixedHeader &= 0xf;

            var dup = ((fixedHeader >> 3) & 1) == 1 ? true : false;

            var qos = ENUM.getKeyByValue(ENUM.QoS, ((fixedHeader & 0x07) >> 1));
            if (qos == null)
                throw new Error("invalid QoS value");
            if (dup && ENUM.QoS[qos] == ENUM.QoS.AT_MOST_ONCE)
                throw new Error("PUBLISH, QoS-0 dup flag present");

            var retain = ((fixedHeader & 1) == 1) ? true : false;

            var topicNameValue = Buffer.alloc(buf.readUInt16BE(index));
            index += 2;

            var start = index;
            var end = index + topicNameValue.length;
            topicNameValue = buf.slice(start, end);
            index = end;
            // buf.readBytes(topicNameValue, 0, topicNameValue.length);

            var topicName = topicNameValue.toString('utf8');

            // if (!StringVerifier.verify(topicName))
            //     throw new Error("Publish-topic contains one or more restricted characters: U+0000, U+D000-U+DFFF");
            dataLength -= topicName.length + 2;

            var packetID = null;
            if (ENUM.QoS[qos] != ENUM.QoS.AT_MOST_ONCE) {
                packetID = buf.readUInt16BE(index);
                index += 2;

                if (packetID < 0 || packetID > 65535)
                    throw new Error("Invalid PUBLISH packetID encoding");
                dataLength -= 2;
            }
            var data = Buffer.alloc(dataLength);
            if (dataLength > 0) {
                var start = index;
                var end = index + data.length;
                data = buf.slice(start, end);
                index = end;
            }
            // buf.readBytes(data, 0, data.length);
            header = Publish(packetID, Topic(Text(topicName), qos), data, retain, dup);
            break;

        case ENUM.MessageType.PUBACK:
            header = Puback(buf.readUInt16BE(index));
            break;

        case ENUM.MessageType.PUBREC:
            header = Pubrec(buf.readUInt16BE(index));
            break;

        case ENUM.MessageType.PUBREL:
            header = Pubrel(buf.readUInt16BE(index));
            break;

        case ENUM.MessageType.PUBCOMP:
            header = Pubcomp(buf.readUInt16BE(index));
            break;

        case ENUM.MessageType.SUBSCRIBE:
            var subID = buf.readUInt16BE(index);
            index += 2;
            var subscriptions = [];
            while (buf.length - index > 0) {
                var value = Buffer.alloc(buf.readUInt16BE(index));
                index += 2;

                var start = index;
                var end = index + value.length;
                value = buf.slice(start, end);
                index = end;

                // buf.readBytes(value, 0, value.length);
                var requestedQos = ENUM.getKeyByValue(ENUM.QoS, buf.readUInt8(index));
                index += 1;
                if (requestedQos == null)
                    throw new Error("Subscribe qos must be in range from 0 to 2: " + requestedQos);
                var topic = value.toString('utf8');
                // if (!StringVerifier.verify(topic))
                //     throw new Error("Subscribe topic contains one or more restricted characters: U+0000, U+D000-U+DFFF");
                var subscription = Topic(Text(topic), requestedQos);
                subscriptions.push(subscription);
            }
            if (subscriptions.length === 0)
                throw new Error("Subscribe with 0 topics");

            header = Subscribe(subID, subscriptions);
            break;

        case ENUM.MessageType.SUBACK:
            var subackID = buf.readUInt16BE(index);
            index += 2;
            var subackCodes = [];
            while (buf.length - index > 0) {
                var subackByte = buf.readUInt8(index);
                index += 1;
                var subackCode = ENUM.getKeyByValue(ENUM.SubackCode, subackByte);
                if (subackCode == null)
                    throw new Error("Invalid suback code: " + subackByte);
                subackCodes.push(subackCode);
            }
            if (subackCodes.length === 0)
                throw new Error("Suback with 0 return-codes");

            header = Suback(subackID, subackCodes);
            break;

        case ENUM.MessageType.UNSUBSCRIBE:
            var unsubID = buf.readUInt16BE(index);
            index += 1;
            var unsubscribeTopics = [];
            while (buf.length - index > 0) {
                var value = Buffer.alloc(buf.readUInt16BE(index));
                index += 2;
                // byte[] value = new byte[buf.readUInt16BE()];
                // buf.readBytes(value, 0, value.length);
                var start = index;
                var end = index + value.length;
                value = buf.slice(start, end);
                index = end;

                var topic = value.toString('utf8');
                // if (!StringVerifier.verify(topic))
                //     throw new Error("Unsubscribe topic contains one or more restricted characters: U+0000, U+D000-U+DFFF");
                unsubscribeTopics.push(Text(topic));
            }
            if (unsubscribeTopics.length === 0)
                throw new Error("Unsubscribe with 0 topics");
            header = Unsubscribe(unsubID, unsubscribeTopics);
            break;

        case ENUM.MessageType.UNSUBACK:
            header = Unsuback(buf.readUInt16BE(index));
            break;

        case ENUM.MessageType.PINGREQ:
            header = this.PINGREQ_MESSAGE;
            break;
        case ENUM.MessageType.PINGRESP:
            header = this.PINGRESP_MESSAGE;
            break;
        case ENUM.MessageType.DISCONNECT:
            header = this.DISCONNECT_MESSAGE;
            break;

        default:
            throw new Error("Invalid header type: " + type);
    }

    // if (buf.isReadable())
    //     throw new Error("unexpected bytes in content");

    // if (length.getLength() != header.getLength())
    // throw new Error("Invalid length. Encoded: " + length.getLength() + ", actual: " + header.getLength());

    return header;
    // }catch (e) {
    //throw new Error("unsupported string encoding:" + e);
    //}
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
            buf.writeUInt8((type << 4), 0);
            index = buf.writeUInt8(connack.isSessionPresent(), index);
            index = buf.writeUInt8(connack.getReturnCode().getNum(), index);
            break;

        case ENUM.MessageType.PUBLISH:
            var publish = header;
            var firstByte = (type << 4);
            firstByte |= publish.isDup() ? 8 : 0;
            firstByte |= (publish.getTopic().getQos() << 1);
            firstByte |= publish.isRetain() ? 1 : 0;
            buf.writeUInt8(firstByte, 0);
            // console.log('buf:', buf);
            // console.log('index:', index);
            index = buf.writeUInt16BE(publish.getTopic().getLength(), index);
            index += buf.write(publish.getTopic().getName().toString(), index);
            // console.log(!!publish.getPacketID());
            switch (publish.getTopic().getQos()) {
                case ENUM.QoS.AT_MOST_ONCE:
                    if (!!publish.getPacketID())
                        throw new Error("publish qos-0 must not contain packetID");
                    break;
                case ENUM.QoS.AT_LEAST_ONCE:
                case ENUM.QoS.EXACTLY_ONCE:
                    if (!publish.getPacketID())
                        throw new Error("publish qos-1,2 must contain packetID");
                    index = buf.writeUInt16BE(publish.getPacketID(), index);
                    break;
            }

            // console.log(publish.getContent());
            index += buf.write(publish.getContent().toString('utf8'), index);
            break;

        case ENUM.MessageType.PUBACK:
            var puback = header;
            buf.writeUInt8((type << 4), 0);
            index = buf.writeUInt16BE(puback.getPacketID(), index);
            break;

        case ENUM.MessageType.PUBREC:
            var pubrec = header;
            buf.writeUInt8((type << 4), 0);
            index = buf.writeUInt16BE(pubrec.getPacketID(), index);
            break;

        case ENUM.MessageType.PUBREL:
            var pubrel = header;
            buf.writeUInt8(((type << 4) | 0x2), 0);
            index = buf.writeUInt16BE(pubrel.getPacketID(), index);
            break;

        case ENUM.MessageType.PUBCOMP:
            var pubcomp = header;
            buf.writeUInt8((type << 4), 0);
            index = buf.writeUInt16BE(pubcomp.getPacketID(), index);
            break;

        case ENUM.MessageType.SUBSCRIBE:
            var sub = header;
            buf.writeUInt8(((type << 4) | 0x2), 0);
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
            buf.writeUInt8((type << 4), 0);
            index = buf.writeUInt16BE(suback.getPacketID(), index);
            var codes = suback.getReturnCodes()
            for (var i = 0; i < codes.length; i++) {
                index = buf.writeUInt8(codes[i].getNum(), index);
            }
            break;

        case ENUM.MessageType.UNSUBSCRIBE:
            var unsub = header;
            buf.writeUInt8(((type << 4) | 0x2), 0);
            index = buf.writeUInt16BE(unsub.getPacketID(), index);
            var topics = unsub.getTopics()
            for (var i = 0; i < topics.length; i++) {
                index = buf.writeUInt16BE(topics[i].length, index);
                index += buf.write(topics[i].toString(), index);
            }
            break;

        case ENUM.MessageType.UNSUBACK:
            var unsuback = header;
            buf.writeUInt8((type << 4), 0);
            index = buf.writeUInt16BE(unsuback.getPacketID(), index);
            break;

        case ENUM.MessageType.DISCONNECT:
        case ENUM.MessageType.PINGREQ:
        case ENUM.MessageType.PINGRESP:
            buf.writeUInt8((type << 4), 0);
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

// console.log(MQParser.decode(MQParser.encode(Pubcomp(100))).getType());
module.exports = MQParser;