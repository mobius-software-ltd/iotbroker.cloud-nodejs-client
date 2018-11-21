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

function AMQPBegin(code, doff, type, channel, remoteChannel, nextOutgoingId, incomingWindow, outgoingWindow, handleMax, offeredCapabilities, desiredCapabilities, properties) {
    var code = ENUM.HeaderCode.BEGIN;
    var doff = 2;
    var type = 0;
    var channel = 1;
    this.remoteChannel = remoteChannel;
    this.nextOutgoingId = nextOutgoingId;
    this.incomingWindow = incomingWindow;
    this.outgoingWindow = outgoingWindow;
    this.handleMax = handleMax;
    this.offeredCapabilities = offeredCapabilities;
    this.desiredCapabilities = desiredCapabilities;
    this.properties = properties;
    return {
        getClassName: function () {
            return 'AMQPBegin'
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
            channel = newChannel;
        },
        toArgumentsList: function () {
            var list = new TLVList();
            var wrapper = new AMQPWrapper();

            if (remoteChannel != null)
                list.addElementIndex(0, wrapper.wrap(remoteChannel));

            if (this.nextOutgoingId == null)
                throw new Error("Begin header's next-outgoing-id can't be null");

            list.addElementIndex(1, wrapper.wrapUInt(this.nextOutgoingId));

            if (this.incomingWindow == null)
                throw new Error("Begin header's incoming-window can't be null");
            list.addElementIndex(2, wrapper.wrapUInt(this.incomingWindow));

            if (this.outgoingWindow == null)
                throw new Error("Begin header's incoming-window can't be null");
            list.addElementIndex(3, wrapper.wrapUInt(this.outgoingWindow));

            if (this.handleMax != null)
                list.addElementIndex(4, wrapper.wrap(this.handleMax));
            if (this.offeredCapabilities)
                list.addElementIndex(5, wrapper.wrapArray(this.offeredCapabilities));
            if (this.desiredCapabilities)
                list.addElementIndex(6, wrapper.wrapArray(this.desiredCapabilities));
            if (this.properties)
                list.addElementIndex(7, wrapper.wrapMap(this.properties));

            var constructor = new DescribedConstructor(list.getCode(), new TLVFixed(ENUM.AMQPType.SMALL_ULONG, Buffer.alloc(1, this.getCode())));
            list.setConstructor(constructor);

            return list;
        },
        fromArgumentsList: function (list) {
            var size = list.getList().length;
            if (size < 4)
                throw new Error("Received malformed Begin header: mandatory " + "fields next-outgoing-id, incoming-window and " + "outgoing-window must not be null");

            if (size > 8)
                throw new Error("Received malformed Begin header. Invalid number of arguments: " + size);

                var unwrapper = new AMQPUnwrapper();

            if (size > 0) {
                var element = list.getList()[0];
                if (element)
                    remoteChannel = unwrapper.unwrapUShort(element);
            }
            if (size > 1) {
                var element = list.getList()[1];
                if (!element)
                    throw new Error("Received malformed Begin header: next-outgoing-id can't be null");
                nextOutgoingId = unwrapper.unwrapUInt(element);
            }
            if (size > 2) {
                var element = list.getList()[2];
                if (!element)
                    throw new Error("Received malformed Begin header: incoming-window can't be null");
                incomingWindow = unwrapper.unwrapUInt(element);
            }
            if (size > 3) {
                var element = list.getList()[3];
                if (!element)
                    throw new Error("Received malformed Begin header: outgoing-window can't be null");
                outgoingWindow = unwrapper.unwrapUInt(element);
            }
            if (size > 4) {
                var element = list.getList()[4];
                if (element)
                    handleMax = unwrapper.unwrapUInt(element);
            }
            if (size > 5) {
                var element = list.getList()[5];
                if (element)
                    offeredCapabilities = unwrapper.unwrapArray(element);
            }
            if (size > 6) {
                var element = list.getList()[6];
                if (element)
                    desiredCapabilities = unwrapper.unwrapArray(element);
            }
            if (size > 7) {
                var element = list.getList()[7];
                if (element)
                    properties = unwrapper.unwrapMap(element);
            }
        },
        hashCode: function () {
            var prime = 31;
            var result = AMQPHeader.hashCode();
            result = prime * result + ((desiredCapabilities == null) ? 0 : desiredCapabilities.hashCode());
            result = prime * result + ((handleMax == null) ? 0 : handleMax.hashCode());
            result = prime * result + ((incomingWindow == null) ? 0 : incomingWindow.hashCode());
            result = prime * result + ((nextOutgoingId == null) ? 0 : nextOutgoingId.hashCode());
            result = prime * result + ((offeredCapabilities == null) ? 0 : offeredCapabilities.hashCode());
            result = prime * result + ((outgoingWindow == null) ? 0 : outgoingWindow.hashCode());
            result = prime * result + ((properties == null) ? 0 : properties.hashCode());
            result = prime * result + ((remoteChannel == null) ? 0 : remoteChannel.hashCode());
            return result;
        },
        equals: function (obj) {
            if (this == obj)
                return true;
            if (!AMQPHeader.equals(obj))
                return false;
            // if (this !== obj)
            //     return false;
            var other = obj;
            if (desiredCapabilities == null) {
                if (other.desiredCapabilities != null)
                    return false;
            }
            else if (desiredCapabilities != other.desiredCapabilities)
                return false;
            if (handleMax == null) {
                if (other.handleMax != null)
                    return false;
            }
            else if (handleMax != other.handleMax)
                return false;
            if (incomingWindow == null) {
                if (other.incomingWindow != null)
                    return false;
            }
            else if (incomingWindow != other.incomingWindow)
                return false;
            if (nextOutgoingId == null) {
                if (other.nextOutgoingId != null)
                    return false;
            }
            else if (nextOutgoingId != other.nextOutgoingId)
                return false;
            if (offeredCapabilities == null) {
                if (other.offeredCapabilities != null)
                    return false;
            }
            else if (offeredCapabilities != other.offeredCapabilities)
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
            if (remoteChannel == null) {
                if (other.remoteChannel != null)
                    return false;
            }
            else if (remoteChannel != other.remoteChannel)
                return false;
            return true;
        },
        getRemoteChannel() {
            return this.remoteChannel;
        },
        setRemoteChannel: function (remoteChannel) {
            this.remoteChannel = remoteChannel;
        },
        getNextOutgoingId: function () {
            return this.nextOutgoingId;
        },
        setNextOutgoingId: function (nextOutgoingId) {
            this.nextOutgoingId = nextOutgoingId;
        },
        getIncomingWindow: function () {
            return this.incomingWindow;
        },
        setIncomingWindow: function (incomingWindow) {
            this.incomingWindow = incomingWindow;
        },
        getOutgoingWindow: function () {
            return this.outgoingWindow;
        },
        setOutgoingWindow: function (outgoingWindow) {
            this.outgoingWindow = outgoingWindow;
        },
        getHandleMax: function () {
            return this.handleMax;
        },
        setHandleMax: function (handleMax) {
            this.handleMax = handleMax;
        },
        getOfferedCapabilities: function () {
            return this.offeredCapabilities;
        },
        setOfferedCapabilities: function (offeredCapabilities) {
            this.offeredCapabilities = offeredCapabilities;
        },
        getDesiredCapabilities: function () {
            return this.desiredCapabilities;
        },
        setDesiredCapabilities: function (desiredCapabilities) {
            this.desiredCapabilities = desiredCapabilities;
        },
        getProperties: function () {
            return this.properties;
        },
        setProperties: function (properties) {
            this.properties = properties;
        }
    }
}
module.exports = AMQPBegin;