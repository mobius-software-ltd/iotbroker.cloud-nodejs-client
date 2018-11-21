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

var AMQPType = require('../../avps/AMQPType');
var DescribedConstructor = require('../../constructor/DescribedConstructor');
var AMQPHeader = require('../../header/api/AMQPHeader');
var AMQPUnwrapper = require('../../header/api/AMQPUnwrapper');
var AMQPWrapper = require('../../header/api/AMQPWrapper');
var TLVAmqp = require('../../tlv/api/TLVAmqp');
var TLVFixed = require('../../tlv/impl/TLVFixed');
var TLVList = require('../../tlv/impl/TLVList');
var AMQPSymbol = require('../../wrappers/AMQPSymbol');
var ENUM = require('../../../lib/enum')

function AMQPFlow(code, doff, type, channel, nextIncomingId, incomingWindow, nextOutgoingId, outgoingWindow, handle, deliveryCount, linkCredit, avaliable, drain, echo, properties) {
    var code = ENUM.HeaderCode.FLOW;
    var doff = doff;
    var type = type;
    this.channel = channel;
    this.nextIncomingId = nextIncomingId;
    this.incomingWindow = incomingWindow;
    this.nextOutgoingId = nextOutgoingId;
    this.outgoingWindow = outgoingWindow;
    this.handle = handle;
    this.deliveryCount = deliveryCount;
    this.linkCredit = linkCredit;
    this.avaliable = avaliable;
    this.drain = drain;
    this.echo = echo;
    this.properties = properties;
    return {
        getClassName: function () {
            return 'AMQPFlow'
        },
        getCode: function () {
            return code;
        },
        getDoff: function () {
            return doff;
        },
        setDoff: function (newDoff) {
            doff = newDoff;
        },
        getType: function () {
            return type;
        },
        setType: function (newType) {
            type = newType;
        },
        getChannel: function () {
            return channel;
        },
        setChannel: function (newChannel) {
            this.channel = newChannel;
        },
        toArgumentsList: function () {
            var list = new TLVList();

            if (nextIncomingId != null)
                list.addElement(0, AMQPWrapper.wrap(nextIncomingId));

            if (incomingWindow == null)
                throw new Error("Flow header's incoming-window can't be null");
            list.addElement(1, AMQPWrapper.wrap(incomingWindow));

            if (nextOutgoingId == null)
                throw new Error("Flow header's next-outgoing-id can't be null");
            list.addElement(2, AMQPWrapper.wrap(nextOutgoingId));

            if (outgoingWindow == null)
                throw new Error("Flow header's outgoing-window can't be null");
            list.addElement(3, AMQPWrapper.wrap(outgoingWindow));

            if (handle != null)
                list.addElement(4, AMQPWrapper.wrap(handle));

            if (deliveryCount != null)
                if (handle != null)
                    list.addElement(5, AMQPWrapper.wrap(deliveryCount));
                else
                    throw new Error("Flow headers delivery-count can't be assigned when handle is not specified");

            if (linkCredit != null)
                if (handle != null)
                    list.addElement(6, AMQPWrapper.wrap(linkCredit));
                else
                    throw new Error("Flow headers link-credit can't be assigned when handle is not specified");

            if (avaliable != null)
                if (handle != null)
                    list.addElement(7, AMQPWrapper.wrap(avaliable));
                else
                    throw new Error("Flow headers avaliable can't be assigned when handle is not specified");

            if (drain != null)
                if (handle != null)
                    list.addElement(8, AMQPWrapper.wrap(drain));
                else
                    throw new Error("Flow headers drain can't be assigned when handle is not specified");

            if (echo != null)
                list.addElement(9, AMQPWrapper.wrap(echo));
            if (!properties.length)
                list.addElement(10, AMQPWrapper.wrapMap(properties));

            var constructor = new DescribedConstructor(list.getCode(), new TLVFixed(AMQPType.SMALL_ULONG, Buffer.from(code.getType())));
            list.setConstructor(constructor);

            return list;
        },
        fromArgumentsList: function (list) {
            var size = list.getList().length;
            var unwrapper = new AMQPUnwrapper();
            if (size < 4)
                throw new Error("Received malformed Flow header: mandatory " + "fields incoming-window, next-outgoing-id and " + "outgoing-window must not be null");

            if (size > 11)
                throw new Error("Received malformed Flow header. Invalid arguments size: " + size);

            if (size > 0) {
                var element = list.getList()[0];
                if (element != null)
                    this.nextIncomingId = unwrapper.unwrapUInt(element);
            }
            if (size > 1) {
                var element = list.getList()[1];
                if (element == null)
                    throw new Error("Received malformed Flow header: incoming-window can't be null");
                this.incomingWindow = unwrapper.unwrapUInt(element);
            }
            if (size > 2) {
                var element = list.getList()[2];
                if (element == null)
                    throw new Error("Received malformed Flow header: next-outgoing-id can't be null");
                this.nextOutgoingId = unwrapper.unwrapUInt(element);
            }
            if (size > 3) {
                var element = list.getList()[3];
                if (element == null)
                    throw new Error("Received malformed Flow header: outgoing-window can't be null");
                this.outgoingWindow = unwrapper.unwrapUInt(element);
            }
            if (size > 4) {
                var element = list.getList()[4];
                if (element != null)
                    this.handle = unwrapper.unwrapUInt(element);
            }
            if (size > 5) {
                var element = list.getList()[5];
                if (element != null)
                    if (this.handle != null)
                        this.deliveryCount = unwrapper.unwrapUInt(element);
                    else
                        throw new Error("Received malformed Flow header: delivery-count can't be present when handle is null");
            }
            if (size > 6) {
                var element = list.getList()[6];
                if (element != null)
                    if (this.handle != null)
                        this.linkCredit = unwrapper.unwrapUInt(element);
                    else
                        throw new Error("Received malformed Flow header: link-credit can't be present when handle is null");

            }
            if (size > 7) {
                var element = list.getList()[7];
                if (element != null)
                    if (this.handle != null)
                        this.avaliable = unwrapper.unwrapUInt(element);
                    else
                        throw new Error("Received malformed Flow header: avaliable can't be present when handle is null");
            }
            if (size > 8) {
                var element = list.getList()[8];
                if (element != null)
                    if (this.handle != null)
                        this.drain = unwrapper.unwrapBool(element);
                    else
                        throw new Error("Received malformed Flow header: drain can't be present when handle is null");

            }
            if (size > 9) {
                var element = list.getList()[9];
                if (element != null)
                    this.echo = unwrapper.unwrapBool(element);
            }
            if (size > 10) {
                var element = list.getList()[10];
                if (element != null)
                    this.properties = unwrapper.unwrapMap(element);
            }
        },
        hashCode: function () {
            var prime = 31;
            var result = AMQPHeader.hashCode();
            result = prime * result + ((avaliable == null) ? 0 : avaliable.hashCode());
            result = prime * result + ((deliveryCount == null) ? 0 : deliveryCount.hashCode());
            result = prime * result + ((drain == null) ? 0 : drain.hashCode());
            result = prime * result + ((echo == null) ? 0 : echo.hashCode());
            result = prime * result + ((handle == null) ? 0 : handle.hashCode());
            result = prime * result + ((incomingWindow == null) ? 0 : incomingWindow.hashCode());
            result = prime * result + ((linkCredit == null) ? 0 : linkCredit.hashCode());
            result = prime * result + ((nextIncomingId == null) ? 0 : nextIncomingId.hashCode());
            result = prime * result + ((nextOutgoingId == null) ? 0 : nextOutgoingId.hashCode());
            result = prime * result + ((outgoingWindow == null) ? 0 : outgoingWindow.hashCode());
            result = prime * result + ((properties == null) ? 0 : properties.hashCode());
            return result;
        },
        equals: function (obj) {
            if (this == obj)
                return true;
            if (!AMQPHeader.equals(obj))
                return false;
            // if (getClass() != obj.getClass())
            //     return false;
            var other = obj;
            if (avaliable == null) {
                if (other.avaliable != null)
                    return false;
            }
            else if (avaliable != other.avaliable)
                return false;
            if (deliveryCount == null) {
                if (other.deliveryCount != null)
                    return false;
            }
            else if (deliveryCount != other.deliveryCount)
                return false;
            if (drain == null) {
                if (other.drain != null)
                    return false;
            }
            else if (drain != other.drain)
                return false;
            if (echo == null) {
                if (other.echo != null)
                    return false;
            }
            else if (echo != other.echo)
                return false;
            if (handle == null) {
                if (other.handle != null)
                    return false;
            }
            else if (handle != other.handle)
                return false;
            if (incomingWindow == null) {
                if (other.incomingWindow != null)
                    return false;
            }
            else if (incomingWindow != other.incomingWindow)
                return false;
            if (linkCredit == null) {
                if (other.linkCredit != null)
                    return false;
            }
            else if (linkCredit != other.linkCredit)
                return false;
            if (nextIncomingId == null) {
                if (other.nextIncomingId != null)
                    return false;
            }
            else if (nextIncomingId != other.nextIncomingId)
                return false;
            if (nextOutgoingId == null) {
                if (other.nextOutgoingId != null)
                    return false;
            }
            else if (nextOutgoingId != other.nextOutgoingId)
                return false;
            if (outgoingWindow == null) {
                if (other.outgoingWindow != null)
                    return false;
            }
            else if (outgoingWindow != other.outgoingWindow)
                return false;
            if (properties == null) {
                if (other.properties != null)
                    return false;
            }
            else if (properties != other.properties)
                return false;
            return true;
        },
        getNextIncomingId: function () {
            return nextIncomingId;
        },
        setNextIncomingId: function (nextIncomingId) {
            this.nextIncomingId = nextIncomingId;
        },
        getIncomingWindow: function () {
            return incomingWindow;
        },
        setIncomingWindow: function (incomingWindow) {
            this.incomingWindow = incomingWindow;
        },
        getNextOutgoingId: function () {
            return nextOutgoingId;
        },
        setNextOutgoingId: function (nextOutgoingId) {
            this.nextOutgoingId = nextOutgoingId;
        },
        getOutgoingWindow: function () {
            return outgoingWindow;
        },
        setOutgoingWindow: function (outgoingWindow) {
            this.outgoingWindow = outgoingWindow;
        },
        getHandle: function () {
            return handle;
        },
        setHandle: function (handle) {
            this.handle = handle;
        },
        getDeliveryCount: function () {
            return deliveryCount;
        },
        setDeliveryCount: function (deliveryCount) {
            this.deliveryCount = deliveryCount;
        },
        getLinkCredit: function () {
            return linkCredit;
        },
        setLinkCredit: function (linkCredit) {
            this.linkCredit = linkCredit;
        },
        getAvaliable: function () {
            return avaliable;
        },
        setAvaliable: function (avaliable) {
            this.avaliable = avaliable;
        },
        getDrain: function () {
            return drain;
        },
        setDrain: function (drain) {
            this.drain = drain;
        },
        getEcho: function () {
            return echo;
        },
        setEcho: function (echo) {
            this.echo = echo;
        },
        getProperties: function () {
            return properties;
        },
        setProperties: function (properties) {
            this.properties = properties;
        }
    }
}
module.exports = AMQPFlow;
