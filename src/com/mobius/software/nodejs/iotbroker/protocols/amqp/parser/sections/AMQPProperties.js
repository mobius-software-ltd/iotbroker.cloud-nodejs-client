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

var AMQPType = require('../avps/AMQPType');
var SectionCode = require('../avps/SectionCode');
var DescribedConstructor = require('../constructor/DescribedConstructor');
var AMQPHeader = require('../header/api/AMQPHeader');
var AMQPUnwrapper = require('../header/api/AMQPUnwrapper');
var AMQPWrapper = require('../header/api/AMQPWrapper');
var TLVAmqp = require('../tlv/api/TLVAmqp');
var TLVFixed = require('../tlv/impl/TLVFixed');
var TLVList = require('../tlv/impl/TLVList');
var BinaryID = require('../wrappers/BinaryID');
//var LongID = require('../wrappers/LongID');
//var MessageID = require('../wrappers/MessageID');
var StringID = require('../wrappers/StringID');
var UuidID = require('../wrappers/UuidID');

function AMQPProperties(messageId, userId, to, subject, replyTo, correlationId, contentType, contentEncoding, absoluteExpiryTime, creationTime, groupId, groupSequence, replyToGroupId) {
    this.messageId = messageId;
    this.userId = userId;
    this.to = to;
    this.subject = subject;
    this.replyTo = replyTo;
    this.correlationId = correlationId;
    this.contentType = contentType;
    this.contentEncoding = contentEncoding;
    this.absoluteExpiryTime = absoluteExpiryTime;
    this.creationTime = creationTime;
    this.groupId = groupId;
    this.groupSequence = groupSequence;
    this.replyToGroupId = replyToGroupId;

    return {
        getCode: function () {
            return SectionCode.PROPERTIES;
        },
        getValue: function () {
            var list = new TLVList();
            if (messageId != null) {
                var value = null;
                if (messageId.getBinary() != null)
                    value = messageId.getBinary();
                else if (messageId.getLong() != null)
                    value = messageId.getLong();
                else if (messageId.getString() != null)
                    value = messageId.getString();
                else if (messageId.getUuid() != null)
                    value = messageId.getUuid();
                list.addElement(0, AMQPWrapper.wrap(value));
            }
            if (userId != null)
                list.addElement(1, AMQPWrapper.wrap(userId));
            if (to != null)
                list.addElement(2, AMQPWrapper.wrap(to));
            if (subject != null)
                list.addElement(3, AMQPWrapper.wrap(subject));
            if (replyTo != null)
                list.addElement(4, AMQPWrapper.wrap(replyTo));
            if (correlationId != null)
                list.addElement(5, AMQPWrapper.wrap(correlationId));
            if (contentType != null)
                list.addElement(6, AMQPWrapper.wrap(contentType));
            if (contentEncoding != null)
                list.addElement(7, AMQPWrapper.wrap(contentEncoding));
            if (absoluteExpiryTime != null)
                list.addElement(8, AMQPWrapper.wrap(absoluteExpiryTime));
            if (creationTime != null)
                list.addElement(9, AMQPWrapper.wrap(creationTime));
            if (groupId != null)
                list.addElement(10, AMQPWrapper.wrap(groupId));
            if (groupSequence != null)
                list.addElement(11, AMQPWrapper.wrap(groupSequence));
            if (replyToGroupId != null)
                list.addElement(12, AMQPWrapper.wrap(replyToGroupId));

            var constructor = new DescribedConstructor(list.getCode(), new TLVFixed(AMQPType.SMALL_ULONG, Buffer.from(0x73)));
            list.setConstructor(constructor);

            return list;
        },
        fill: function (value) {
            var list = value;
            if (list.getList().length > 0) {
                var element = list.getList()[0];
                if (element != null) {
                    switch (element.getCode()) {
                        case AMQPType.ULONG_0:
                        case AMQPType.SMALL_ULONG:
                        case AMQPType.ULONG:
                            messageId = new LongID(AMQPUnwrapper.unwrapULong(element));
                            break;
                        case AMQPType.STRING_8:
                        case AMQPType.STRING_32:
                            messageId = new StringID(AMQPUnwrapper.unwrapString(element));
                            break;
                        case AMQPType.BINARY_8:
                        case AMQPType.BINARY_32:
                            messageId = new BinaryID(AMQPUnwrapper.unwrapBinary(element));
                            break;
                        case AMQPType.UUID:
                            messageId = new UuidID(AMQPUnwrapper.unwrapUuid(element));
                            break;
                        default:
                            throw new Error("Expected type 'MessageID' - received: " + element.getCode());
                    }
                }
            }
            if (list.getList().length > 1) {
                var element = list.getList()[1];
                if (element != null)
                    userId = AMQPUnwrapper.unwrapBinary(element);
            }
            if (list.getList().length > 2) {
                var element = list.getList()[2];
                if (element != null)
                    to = AMQPUnwrapper.unwrapString(element);
            }
            if (list.getList().length > 3) {
                var element = list.getList()[3];
                if (element != null)
                    subject = AMQPUnwrapper.unwrapString(element);
            }
            if (list.getList().length > 4) {
                var element = list.getList()[4];
                if (element != null)
                    replyTo = AMQPUnwrapper.unwrapString(element);
            }
            if (list.getList().length > 5) {
                var element = list.getList()[5];
                if (element != null)
                    correlationId = AMQPUnwrapper.unwrapBinary(element);
            }
            if (list.getList().length > 6) {
                var element = list.getList()[6];
                if (element != null)
                    contentType = AMQPUnwrapper.unwrapString(element);
            }
            if (list.getList().length > 7) {
                var element = list.getList()[7];
                if (element != null)
                    contentEncoding = AMQPUnwrapper.unwrapString(element);
            }
            if (list.getList().length > 8) {
                var element = list.getList()[8];
                if (element != null)
                    absoluteExpiryTime = AMQPUnwrapper.unwrapTimestamp(element);
            }
            if (list.getList().length > 9) {
                var element = list.getList()[9];
                if (element != null)
                    creationTime = AMQPUnwrapper.unwrapTimestamp(element);
            }
            if (list.getList().length > 10) {
                var element = list.getList()[10];
                if (element != null)
                    groupId = AMQPUnwrapper.unwrapString(element);
            }
            if (list.getList().length > 11) {
                var element = list.getList()[11];
                if (element != null)
                    groupSequence = AMQPUnwrapper.unwrapUInt(element);
            }
            if (list.getList().length > 12) {
                var element = list.getList()[12];
                if (element != null)
                    replyToGroupId = AMQPUnwrapper.unwrapString(element);
            }
        },
        hashCode: function () {
            var prime = 31;
            var result = 1;
            result = prime * result + ((absoluteExpiryTime == null) ? 0 : absoluteExpiryTime.hashCode());
            result = prime * result + ((contentEncoding == null) ? 0 : contentEncoding.hashCode());
            result = prime * result + ((contentType == null) ? 0 : contentType.hashCode());
            result = prime * result + Arrays.hashCode(correlationId);
            result = prime * result + ((creationTime == null) ? 0 : creationTime.hashCode());
            result = prime * result + ((groupId == null) ? 0 : groupId.hashCode());
            result = prime * result + ((groupSequence == null) ? 0 : groupSequence.hashCode());
            result = prime * result + ((messageId == null) ? 0 : messageId.hashCode());
            result = prime * result + ((replyTo == null) ? 0 : replyTo.hashCode());
            result = prime * result + ((replyToGroupId == null) ? 0 : replyToGroupId.hashCode());
            result = prime * result + ((subject == null) ? 0 : subject.hashCode());
            result = prime * result + ((to == null) ? 0 : to.hashCode());
            result = prime * result + Arrays.hashCode(userId);
            return result;
        },
        equals: function () {
            if (this == obj)
                return true;
            if (obj == null)
                return false;
            // if (getClass() != obj.getClass())
            //     return false;
            var other = obj;
            if (absoluteExpiryTime == null) {
                if (other.absoluteExpiryTime != null)
                    return false;
            }
            else if (absoluteExpiryTime != other.absoluteExpiryTime)
                return false;
            if (contentEncoding == null) {
                if (other.contentEncoding != null)
                    return false;
            }
            else if (contentEncoding != other.contentEncoding)
                return false;
            if (contentType == null) {
                if (other.contentType != null)
                    return false;
            }
            else if (contentType != other.contentType)
                return false;

            if (correlationId.length !== other.correlationId.length) {
                return false;
            }
            for (var i = 0, l = correlationId.length; i < l; i++) {
                if (correlationId[i] instanceof Array && other.correlationId[i] instanceof Array) {
                    if (correlationId[i] != other.correlationId[i]) {
                        return false;
                    }
                }
                else if (correlationId[i] !== other.correlationId[i]) {
                    return false;
                }
            }

            if (creationTime == null) {
                if (other.creationTime != null)
                    return false;
            }
            else if (creationTime != other.creationTime)
                return false;
            if (groupId == null) {
                if (other.groupId != null)
                    return false;
            }
            else if (groupId != other.groupId)
                return false;
            if (groupSequence == null) {
                if (other.groupSequence != null)
                    return false;
            }
            else if (groupSequence != other.groupSequence)
                return false;
            if (messageId == null) {
                if (other.messageId != null)
                    return false;
            }
            else if (messageId != other.messageId)
                return false;
            if (replyTo == null) {
                if (other.replyTo != null)
                    return false;
            }
            else if (replyTo != other.replyTo)
                return false;
            if (replyToGroupId == null) {
                if (other.replyToGroupId != null)
                    return false;
            }
            else if (replyToGroupId != other.replyToGroupId)
                return false;
            if (subject == null) {
                if (other.subject != null)
                    return false;
            }
            else if (subject != other.subject)
                return false;
            if (to == null) {
                if (other.to != null)
                    return false;
            }
            else if (to != other.to)
                return false;

            if (userId.length !== other.userId.length) {
                return false;
            }
            for (var i = 0, l = userId.length; i < l; i++) {
                if (userId[i] instanceof Array && other.userId[i] instanceof Array) {
                    if (userId[i] != other.userId[i]) {
                        return false;
                    }
                }
                else if (userId[i] !== other.userId[i]) {
                    return false;
                }
            }
            return true;
        },
        getMessageId: function () {
            return messageId;
        },
        setMessageId: function (messageId) {
            this.messageId = messageId;
        },
        getUserId: function () {
            return userId;
        },
        setUserId: function (userId) {
            this.userId = userId;
        },
        getTo: function () {
            return to;
        },
        setTo: function (to) {
            this.to = to;
        },
        getSubject: function () {
            return subject;
        },
        setSubject: function (subject) {
            this.subject = subject;
        },
        getReplyTo: function () {
            return replyTo;
        },
        setReplyTo: function (replyTo) {
            this.replyTo = replyTo;
        },
        getCorrelationId: function () {
            return correlationId;
        },
        setCorrelationId: function (correlationId) {
            this.correlationId = correlationId;
        },
        getContentType: function () {
            return contentType;
        },
        setContentType: function (contentType) {
            this.contentType = contentType;
        },
        getContentEncoding: function () {
            return contentEncoding;
        },
        setContentEncoding: function (contentEncoding) {
            this.contentEncoding = contentEncoding;
        },
        getAbsoluteExpiryTime: function () {
            return absoluteExpiryTime;
        },
        setAbsoluteExpiryTime: function (absoluteExpiryTime) {
            this.absoluteExpiryTime = absoluteExpiryTime;
        },
        getCreationTime: function () {
            return creationTime;
        },
        setCreationTime: function (creationTime) {
            this.creationTime = creationTime;
        },
        getGroupId: function () {
            return groupId;
        },
        setGroupId: function (groupId) {
            this.groupId = groupId;
        },
        getGroupSequence: function () {
            return groupSequence;
        },
        setGroupSequence: function (groupSequence) {
            this.groupSequence = groupSequence;
        },
        getReplyToGroupId: function () {
            return replyToGroupId;
        },
        setReplyToGroupId: function (replyToGroupId) {
            this.replyToGroupId = replyToGroupId;
        }
    }
}
module.exports = AMQPProperties