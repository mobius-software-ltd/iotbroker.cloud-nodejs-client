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

var ENUM = require('./lib/enum');
var FLAGS = require('./lib/flags');
var SNconnack = require('./lib/SNconnack');
var SNconnect = require('./lib/SNconnect');
var SNdisconnect = require('./lib/SNdisconnect');
var LengthDetails = require('./lib/LengthDetails');
var Pingreq = require('./lib/SNpingreq');
var Pingresp = require('./lib/SNpingresp');
var SNpuback = require('./lib/SNpuback');
var SNpubcomp = require('./lib/SNpubcomp');
var SNpublish = require('./lib/SNpublish');
var SNpubrec = require('./lib/SNpubrec');
var SNpubrel = require('./lib/SNpubrel');
var SNsuback = require('./lib/SNsuback');
var SNsubscribe = require('./lib/SNsubscribe');
var Text = require('./lib/Text');
var Topic = require('./lib/Topic');
var SNunsuback = require('./lib/SNunsuback');
var SNunsubscribe = require('./lib/SNunsubscribe');
var Willmsg = require('./lib/SNwillmsg');

var Advertised = require('./lib/SNadvertise');
var Encapsulated = require('./lib/SNencapsulated');
var GWInfo = require('./lib/SNgwinfo');
var SNregack = require('./lib/SNregack');
var SNregister = require('./lib/SNregister');
var SearchGW = require('./lib/SNsearchGW');
var Willmsgreq = require('./lib/SNwillmsgreq');
var Willmsgresp = require('./lib/SNwillmsgresp');
var Willmsgupd = require('./lib/SNwillmsgupd');
var SNwilltopic = require('./lib/SNwilltopic');
var Willtopicreq = require('./lib/SNwilltopicreq');
var Willtopicresp = require('./lib/SNwilltopicresp');
var Willtopicupd = require('./lib/SNwilltopicupd');
var FullTopic = require('./lib/topics/fulltopic');
var ShortTopic = require('./lib/topics/shorttopic');
var IdTopic = require('./lib/topics/idtopic');


var SNParser = {
    //PINGREQ_MESSAGE: Pingreq(),
    PINGRESP_MESSAGE: Pingresp(),
    WILLMSGREQ_MESSAGE: Willmsgreq(),
    WILLTOPICREQ_MESSAGE: Willtopicreq(),
    next: next,
    decode: decode,
    encode: encode,
    getBuffer: getBuffer
}


function next(buf) {
    var index = 0;
    var type = ENUM.MessageType[ENUM.getKeyByValue(ENUM.MessageType, (((buf.readUInt8(index) >> 4) & 0xf)))];
    index += 1;

    switch (type) {
        case ENUM.MessageType.SN_PINGREQ:
        case ENUM.MessageType.SN_PINGRESP:
        case ENUM.MessageType.SN_DISCONNECT:
            return Buffer.alloc(2);
        default:
            var length = LengthDetails().decode({
                buf: buf,
                index: index
            });
            index += length.getSize();

            if (length.getLength() === 0)
                return null;
            var result = length.getLength() + length.getSize() + 1;
            return result <= buf.length - index ? Buffer.alloc(result) : null;
    }
}

function decode(buf) {
    var header = null;
    
    var index = 0;
    var length = buf.readUInt8(index);
    index += 1;

    if (length == ENUM.THREE_OCTET_LENGTH_SUFFIX) {
        length = buf.readUInt16(index);
        index += 2;
    }
    var fixedHeader = buf.readUInt8(index);
    var type = ENUM.MessageType[ENUM.getKeyByValue(ENUM.MessageType, fixedHeader)];
    index += 1;
    // var type = ENUM.MessageType[ENUM.getKeyByValue(ENUM.MessageType, (length))]; // MessageType.valueOf();
    switch (type) {

        case ENUM.MessageType.SN_ADVERTISE:
            var gwID = buf.readUInt8(index);
            index += 2;
            var keepalive = buf.readUInt16BE(index);
            header = SNadvertise({
                gwID: gwID,
                keepalive: keepalive
            });
            break;

        case ENUM.MessageType.SN_SEARCHGW:
            header = SNsearchgw(buf.readUInt8(index));
            break;

        case ENUM.MessageType.SN_GWINFO:
            var gwID = buf.readUInt8(index);
            index += 2;
            var address = buf.readUInt16BE(index);
            header = SNgwinfo({
                gwID: gwID,
                gwAddress: address
            });
            break;

        case ENUM.MessageType.CONNECT:
            var contentFlags = buf.readUInt8(index);
            var flags = 0;
            flags |= 0;
            flags |= contentFlags.Will();
            flags |= contentFlags.CleanSession();
            index += 1;
            var protocolLevel = buf.readUInt8(index);
            index += 1;
            var keepalive = buf.readUInt16BE(index); //
            index += 2;
            var clientIdValue = Buffer.alloc(buf.readUInt16BE(index));
            index += 2;
            var start = index;
            var end = index + clientIdValue.length;
            clientIdValue = buf.slice(start, end);
            index = end;
            var clientID = clientIdValue.toString('utf8');
            var connect = SNconnect({
                clientID: clientID,
                cleanSession: flags.cleanSession,
                keepalive: keepalive,
                willFlag: flags.Will
            });
            header = connect;
            break;

        case ENUM.MessageType.SN_CONNACK:          
            var connackByte = buf.readUInt8(index);
            var connackCode = ENUM.getKeyByValue(ENUM.ConnackCode, connackByte);
           
            if (connackCode == null)
                throw new Error("Invalid connack code: " + connackByte);
               
            header = SNconnack(connackCode);
          
            break;

        case ENUM.MessageType.SN_WILLTOPICREQ:
            header = this.WILLTOPICREQ_MESSAGE;           
            break;

        case ENUM.MessageType.SN_WILLTOPIC:
            var willTopic = null
            var willTopicRetain = false;
            var firstByte = (type << 4);
            firstByte |= (SNwilltopic.getTopic().getQos() << 1);
            firstByte |= SNwilltopic.isRetain() ? 1 : 0;
            var flags = buf.readUInt8(firstByte, index);
            index += 1;
            willTopicRetain = flags.Retain;
            var willTopicBytes = Buffer.alloc(buf.readUInt16BE(index));
            var start = index;
            var end = index + willTopicBytes.length;
            willTopic = buf.slice(start, end);
            index = end;
            willTopic = FullTopic(willTopic, flags.Qos.Value).fullTopic();
            header = SNwilltopic(willTopic, willTopicRetain);
            break;

        case ENUM.MessageType.SN_WILLMSGREQ:
            header = this.WILLMSGREQ_MESSAGE;                 
            break;

        case ENUM.MessageType.SN_WILLMSG:
            var msg = Buffer.alloc(buf.readUInt16BE(index));
            var start = index;
            var end = index + msg.length;
            msg = buf.slice(start, end);
            header = SNwillmsg(msg.toString('utf8'));
            break;

        case ENUM.MessageType.SN_REGISTER:
            var topicID = buf.readUInt16BE(index);
            index += 2;
            var msgID = buf.readUInt16BE(index);
            index += 2;
            var topicName = Buffer.alloc(buf.readUInt16BE(index));
            var start = index;
            var end = index + topicName.length;
            topicName = buf.slice(start, end);
            index = end;

            header = SNregister({
                topicID: topicID,
                packetID: msgID,
                topicName: topicName
            });
             break;

        case ENUM.MessageType.SN_REGACK:
            var topicID = buf.readUInt16BE(index);
            index += 2;
            var packetID = buf.readUInt16BE(index);
            index += 2;
            var code = buf.readUInt8(index);
            header = SNregack({
                topicID: topicID,
                packetID: packetID,
                returnCode: code
            });
            
             break;

        case ENUM.MessageType.SN_PUBLISH:
            var flagsBytes = buf.readUInt8(index) 
            var flags = FLAGS.decodeFlags(flagsBytes, type);
            index += 1;
            var topicID = buf.readUInt16BE(index);
            index += 2;
            var msgID = buf.readUInt16BE(index);
            index += 2;
            
            if (flags.qos != ENUM.QoS.AT_MOST_ONCE && msgID == 0) {
                throw new Error("invalid PUBLISH QoS-0 messageID:" + msgID);
            }
            var topic = null;
            if (flags.TopicType == ENUM.TopicType.SHORT) {
                topic = new ShortTopic(topicID, flags.qos);
            } else {
                topic = new IdTopic(topicID, flags.qos);
            }

            var content = Buffer.alloc(buf.readUInt16BE(index));
            var start = index;
            var end = index + content.length;
            content = buf.slice(start, end);
            header = SNpublish(msgID, topic, content, flags.Retain, flags.Dup);
            break;

        case ENUM.MessageType.SN_PUBACK:    

            var topicID = buf.readUInt16BE(index);
            index += 2;
            var msgID = buf.readUInt16BE(index);
            index += 2
            var code = buf.readUInt8(index);
            header = SNpuback({
                packetID: msgID,
                topicID: topicID,
                returnCode: code
            });
            break;

        case ENUM.MessageType.SN_PUBREC:
            header = SNpubrec(buf.readUInt16BE(index));
            break;

        case ENUM.MessageType.SN_PUBREL:
            header = SNpubrel(buf.readUInt16BE(index));
            break;

        case ENUM.MessageType.SN_PUBCOMP:
            header = SNpubcomp(buf.readUInt16BE(index));
            break;

        case ENUM.MessageType.SN_SUBSCRIBE:
            var firstByte = (type << 4);
            firstByte |= SNsubscribe.getDup() ? 1 : 0;
            firstByte |= SNsubscribe.getTopic().getQos() ? 1 : 0;
            firstByte |= SNsubscribe.getTopic().getType() ? 1 : 0;
            var flags = buf.readUInt8(firstByte, index);
            index += 1;
            var msgID = buf.readUInt16BE(index);
            index += 2
            var subTopicBytes = buf.readUInt16BE(index);
            var topic = null;
            switch (flags.TopicType) {
                case ENUM.TopicType.NAMED:
                    var topicName = subTopicBytes.toString('utf8');
                    topic = FullTopic(topicName, flags.Qos.Value).fullTopic();
                    break;
                case ENUM.TopicType.ID:
                    var topicID = subTopicBytes.readInt16BE(0);
                    topic = IdTopic(topicID, flags.Qos.Value).IdTopic();
                    break;
                case ENUM.TopicType.SHORT:
                    var topicShortName = subTopicBytes.toString('utf8');
                    topic = ShortTopic(topicShortName, flags.Qos.Value).shortTopic();
                    break;
            }
            header = SNsubscribe(msgID, topic, flags.Dup);
            break;

        case ENUM.MessageType.SN_SUBACK:
            //var firstByte = (type << 4);
          //  firstByte |= buf.getQos() ? 1 : 0;
            var flagsBytes = buf.readUInt8(index) 
           // var flags = buf.readUInt8(firstByte, index);
            var flags = FLAGS.decodeFlags(flagsBytes, type);
            index += 1;
            var topicID = buf.readUInt16BE(index);
             index += 2
            var msgID = buf.readUInt16BE(index);
            index += 2
            var code = buf.readUInt8(index);
            header = SNsuback({
                topicID: topicID,
                packetID: msgID,
                returnCode: code,
                qos: flags.qos
            });
            break;


        case ENUM.MessageType.SN_UNSUBSCRIBE:
            var firstByte = (type << 4);
            firstByte |= SNunsubscribe.getTopic().getType() ? 1 : 0;
            var flags = buf.readUInt8(firstByte, index);
            index += 1;
            var msgID = buf.readUInt16BE(index);
            index += 2
            var subTopicBytes = buf.readUInt16BE(index);
            var topic = null;
            switch (flags.TopicType) {
                case ENUM.TopicType.NAMED:
                    var topicName = subTopicBytes.toString('utf8');
                    topic = FullTopic(topicName, flags.Qos.Value).fullTopic();
                    break;
                case ENUM.TopicType.ID:
                    var topicID = subTopicBytes.readInt16BE(0);
                    topic = IdTopic(topicID, flags.Qos.Value).IdTopic();
                    break;
                case ENUM.TopicType.SHORT:
                    var topicShortName = subTopicBytes.toString('utf8');
                    topic = ShortTopic(topicShortName, flags.Qos.Value).shortTopic();
                    break;
            }
            header = SNsubscribe(msgID, topic);
            break;

        case ENUM.MessageType.SN_UNSUBACK:
             header = SNunsuback(buf.readUInt16BE(index));
             break;

        case ENUM.MessageType.SN_PINGREQ:
            var clientIdValue = Buffer.alloc(buf.readUInt16BE(index));
            var start = index;
            var end = index + clientIdValue.length;
            clientIdValue = buf.slice(start, end);
            index = end;
            var clientID = clientIdValue.toString('utf8');
            header = SNpingreq(clientID);
            break;

        case ENUM.MessageType.SN_PINGRESP:
            header = this.PINGRESP_MESSAGE;
            break;

        case ENUM.MessageType.SN_DISCONNECT:
            var keepalive = 0
            header = SNdisconnect(keepalive)
            break;

        case ENUM.MessageType.SN_WILLTOPICUPD:
            var topic = null;
            var retain = false;
            if (buf.length > 0) {
                var firstByte = (type << 4);
                firstByte |= SNwilltopicupd.getQos() ? 1 : 0;
                firstByte |= SNwilltopicupd.getIsRetain() ? 1 : 0;
                var flags = buf.readUInt8(firstByte, index);
                index += 1;
                retain = flags.Retain;
                var willTopicBytes = Buffer.alloc(buf.readUInt16BE(index));
                var start = index;
                var end = index + willTopicBytes.length;
                var willTopic = buf.slice(start, end);
                index = end;
                topic = FullTopic(willTopic, flags.Qos.Value).fullTopic().toString('utf8');
            }
            header = SNwilltopicupd({
                topic: topic,
                isRetain: retain
            });
            break;

        case ENUM.MessageType.SN_WILLMSGUPD:
            var contentBytes = Buffer.alloc(buf.readUInt16BE(index));
            var start = index;
            var end = index + contentBytes.length;
            var content = buf.slice(start, end);
            header = SNwillmsgupd(content.toString('utf8'));
            break;

        case ENUM.MessageType.SN_WILLTOPICRESP:
            header = SNwilltopicresp(buf.readUInt8(index));
            break;

        case ENUM.MessageType.SN_WILLMSGRESP:
            header = SNwillmsgresp(buf.readUInt8(index));
            break;


        case ENUM.MessageType.SN_ENCAPSULATED:
            var ctrl = buf.readUInt16BE(index);
            index += 1;
            var nodeId = Buffer.alloc(buf.readUInt16BE(index));
            var start = index;
            var end = index + nodeId.length;
            nodeId = buf.slice(start, end);
            index = end;
            var message = Buffer.alloc(buf.readUInt16BE(index));
            var startM = index;
            var endM = index + message.length;
            message = buf.slice(startM, endM);
            index = endM;
            header = SNencapsulated(ctrl, nodeId, message);
            break;

        default:
            throw new Error("Invalid header type: " + type);
    }

    return header;
}

function encode(header) {
    //var length =  Buffer.byteLength(JSON.stringify(header))
    var length = header.getLength();
    var newBuffer = getBuffer(length);
    var buf = newBuffer.buffer;
    var type = header.getType();
    var index = newBuffer.position;
    
    index = buf.writeUInt8(type, index);
    
    switch (type) {

        case ENUM.MessageType.SN_ADVERTISE:
            var advertise = header;
            index = buf.writeUInt8(advertise.getGwID(), index);
            index = buf.writeUInt16BE(advertise.getKeepAlive(), index);
            break;

        case ENUM.MessageType.SN_SEARCHGW:
            var search = header;
            index = buf.writeUInt8(search.getRadius(), index);
            break;

        case ENUM.MessageType.SN_GWINFO:
            var gwinfo = header;
            index = buf.writeUInt8(gwinfo.getGwID(), index);
            if (gwinfo.getGwAddress() != null) {
                buf.writeUInt16BE(Buffer.from(gwinfo.getGwAddress()), index);
            }
            break;

        case ENUM.MessageType.SN_CONNECT:
            var connect = header;
            var bytesFlag = FLAGS.encodeFlags(false, null, false, connect.getWillFlag(), connect.getCleanSession(), null);
            index = buf.writeUInt8(bytesFlag, index);
            index = buf.writeUInt8(connect.getProtocolLevel(), index);
            index = buf.writeUInt16BE(connect.getKeepAlive(), index);
            index = buf.write(connect.getClientID(), index);
            break;

        case ENUM.MessageType.SN_CONNACK:
        case ENUM.MessageType.SN_WILLTOPICRESP:
        case ENUM.MessageType.SN_WILLMSGRESP:
            var respMessage = header;
            index = buf.writeUInt8(respMessage.getCode(), index);
            break;

        case ENUM.MessageType.SN_WILLTOPIC:
            var topic = header;
           if (topic.getTopic() != null) {
                var bytesFlag = FLAGS.encodeFlags(false, topic.getTopic().getQos(), topic.getIsRetain(), false, false, ENUM.TopicType.UNKNOWN);
                 index = buf.writeUInt8(bytesFlag, index);
                index = buf.write(topic.getTopic().encode(), index);                
            }
            break;

        case ENUM.MessageType.SN_WILLMSG:
            var message = header;
            index = buf.write(message.getContent(), index);
            break;

        case ENUM.MessageType.SN_REGISTER:
            var register = header;
             index = buf.writeUInt16BE(register.getTopicID(), index);
             index = buf.writeUInt16BE(register.getPacketID(), index);
             index = buf.write(register.getTopicName(), index);
            break;

        case ENUM.MessageType.SN_REGACK:
            var regack = header;
             index = buf.writeUInt16BE(regack.getTopicID(), index);
            index = buf.writeUInt16BE(regack.getPacketID(), index);
            index = buf.writeUInt8(regack.getCode(), index);
            break;

        case ENUM.MessageType.SN_PUBLISH:
            var publish = header;
            var bytesFlag = FLAGS.encodeFlags(publish.isDup(), publish.getTopic().getQos(), publish.isRetain(), false, false, publish.getTopic().getType());                 
             index = buf.writeUInt8(bytesFlag, index);
            index = buf.writeUInt16BE(publish.getTopic().getTopic(), index);
            index = buf.writeUInt16BE(publish.getPacketID(), index);
             index = buf.write(publish.getContent(), index);
            break;

        case ENUM.MessageType.SN_PUBACK:
            var puback = header;
            index = buf.writeUInt16BE(puback.getTopicID(), index);
            index = buf.writeUInt16BE(puback.getPacketID(), index);
            index = buf.writeUInt8(puback.getCode(), index);
            break;

        case ENUM.MessageType.SN_PUBREC:
        case ENUM.MessageType.SN_PUBREL:
        case ENUM.MessageType.SN_PUBCOMP:
        case ENUM.MessageType.SN_UNSUBACK:
            var respMessege = header;
            index = buf.writeUInt16BE(respMessege.getPacketID(), index);
            break;

        case ENUM.MessageType.SN_SUBSCRIBE:
            var subscribe = header;
            var bytesFlag = FLAGS.encodeFlags(subscribe.getDup(), subscribe.getTopic().getQos(), false, false, false, subscribe.getTopic().getType());
            index = buf.writeUInt8(bytesFlag, index);
            index = buf.writeUInt16BE(subscribe.getPacketID(), index);
            index = buf.write(subscribe.getTopic().encode(), index);
            break;

        case ENUM.MessageType.SN_SUBACK:
            var suback = header;
            var bytesFlag = FLAGS.encodeFlags(false, suback.getQos(), false, false, false, ENUM.TopicType.UNKNOWN);
            index = buf.writeUInt8(bytesFlag, index);
            index = buf.writeUInt16BE(suback.getTopicID(), index);
            index = buf.writeUInt16BE(suback.getPacketID(), index);
            index = buf.writeUInt8(suback.getCode(), index);
            break;

        case ENUM.MessageType.SN_UNSUBSCRIBE:
           
            var unsub = header;
             var bytesFlag = FLAGS.encodeFlags(false, null, false, false, false, unsub.getTopic().getType());
            index = buf.writeUInt8(bytesFlag, index);
            index = buf.writeUInt16BE(unsub.getPacketID(), index);
            index = buf.write(unsub.getTopic().encode(), index);
            break;

        case ENUM.MessageType.SN_PINGREQ:         
            if (length > 2) {
                var pingreq = header;
                index = buf.write(pingreq.getClientID(), index);
            }
            break;

        case ENUM.MessageType.SN_DISCONNECT:
            if (length > 2) {
                var disconnect = header;
                index = buf.writeUInt16BE(disconnect.getKeepAlive(), index);
            }
            break;

        case ENUM.MessageType.SN_WILLTOPICREQ:
        case ENUM.MessageType.SN_WILLMSGREQ:
        case ENUM.MessageType.SN_PINGRESP:
            break;

        case ENUM.MessageType.SN_WILLTOPICUPD:
            var topicUpd = header;
            if (topicUpd != null) {
                var bytesFlag = FLAGS.encodeFlags(false, topicUpd.getTopic().getQos(), topicUpd.getIsRetain(), false, false, ENUM.TopicType.UNKNOWN);
                index = buf.writeUInt8(bytesFlag, index);
                index = buf.write(unsub.getTopic().encode(), index);
            }
            break;

        case ENUM.MessageType.SN_WILLMSGUPD:
            var msgUpd = header;
            index = buf.writeUInt16BE(msgUpd.getContent(), index);
            break;

        case ENUM.MessageType.SN_ENCAPSULATED:
            var encapsulated = header;
            var byte = 0;
            byte |= encapsulated.getRadius();
            index = buf.writeUInt8(byte, index);
            index = buf.write(encapsulated.getWirelessNodeID(), index);
            var messByte = 0;
            messByte |= encapsulated.getmessage();
            index = buf.write(messByte, index);
            break;

        default:
            throw new Error("Method encode(header) in SNParser class got invalid header type: " + type);
    }

    return buf;
}

function getBuffer(length) {
    var lengthBytes = 0;
    // if (length <= 255)
    //     lengthBytes = 0;
    // else
    //     lengthBytes = 2;

    var bufferSize = lengthBytes + length;
    var buf = Buffer.alloc(bufferSize);
    var ind = 0
    var pos = 1;
    if (length <= 255)
        buf.writeUInt8(length);
    else {
        ind = buf.writeUInt8(0x01);
        buf.writeUInt16BE(length, ind);
        pos = 3;
    }

    return {
        buffer: buf,
        position: pos
    };
}

module.exports = SNParser;