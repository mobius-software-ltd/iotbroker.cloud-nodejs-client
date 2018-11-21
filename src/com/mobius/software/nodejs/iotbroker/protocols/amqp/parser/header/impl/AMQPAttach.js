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

var ReceiveCode = require('../../avps/ReceiveCode');
var RoleCode = require('../../avps/RoleCode');
var SendCode = require('../../avps/SendCode');
var AMQPHeader = require('../../header/api/AMQPHeader');
var AMQPUnwrapper = require('../../header/api/AMQPUnwrapper');
var AMQPWrapper = require('../../header/api/AMQPWrapper');
var DescribedConstructor = require('../../constructor/DescribedConstructor');
// var AMQPSource = require('../../terminus/AMQPSource');
var AMQPTarget = require('../../terminus/AMQPTarget');
// //var TLVAmqp = require('../../tlv/api/TLVAmqp');
var TLVFixed = require('../../tlv/impl/TLVFixed');
var TLVList = require('../../tlv/impl/TLVList');
//var AMQPSymbol = require('../../wrappers/AMQPSymbol');
var ENUM = require('../../../lib/enum')

function AMQPAttach(code, doff, type, channel, name, handle, role, sndSettleMode, rcvSettleMode, source, target, unsettled, incompleteUnsettled, initialDeliveryCount, maxMessageSize, offeredCapabilities, desiredCapabilities, properties) {
    var code = ENUM.HeaderCode.ATTACH;
    var doff = 2;
    var type = 0;
    this.channel = channel
    this.name = name;
    this.handle = handle;
    this.role = role;
    this.sndSettleMode = sndSettleMode;
    this.rcvSettleMode = rcvSettleMode;
    this.source = source;
    this.target = target;
    this.unsettled = unsettled;
    this.incompleteUnsettled = incompleteUnsettled;
    this.initialDeliveryCount = initialDeliveryCount;
    this.maxMessageSize = maxMessageSize;
    this.offeredCapabilities = offeredCapabilities;
    this.desiredCapabilities = desiredCapabilities;
    this.properties = properties;
    return {
        // new AMQPHeader(HeaderCode.ATTACH, 2, 0, 0);  
        getClassName: function () {
            return 'AMQPAttach'
        },
        getCode: function () {
            return code;
        },
        toArgumentsList: function () {
            var list = new TLVList();
            var wrapper = new AMQPWrapper();

            if (this.name == null)
                throw new Error("Attach header's name can't be null");
            list.addElementIndex(0, wrapper.wrapString(this.name));

            if (this.handle == null)
                throw new Error("Attach header's handle can't be null");
            list.addElementIndex(1, wrapper.wrapUInt(this.handle));

            if (this.role == null)
                throw new Error("Attach header's role can't be null");
            list.addElementIndex(2, wrapper.wrapBool(this.role));

           
            if (this.sndSettleMode != null)
                list.addElementIndex(3, wrapper.wrapUByte(this.sndSettleMode));
            if (this.rcvSettleMode != null)
                list.addElementIndex(4, wrapper.wrapUByte(this.rcvSettleMode));
            if (this.source != null)
                list.addElementIndex(5, this.source.toArgumentsList());
            if (this.target != null)
                list.addElementIndex(6, this.target.toArgumentsList());
            if (this.unsettled)
                list.addElementIndex(7, wrapper.wrapMap(this.unsettled));
            if (this.incompleteUnsettled != null)
                list.addElementIndex(8, wrapper.wrap(this.incompleteUnsettled));

            if (this.initialDeliveryCount != null)
                list.addElementIndex(9, wrapper.wrapUInt(this.initialDeliveryCount));
            else if (this.role == ENUM.RoleCode.SENDER)
                throw new Error("Sender's attach header must contain a non-null initial-delivery-count value");

            if (this.maxMessageSize != null)
                list.addElementIndex(10, wrapper.wrap(this.maxMessageSize));
            if (this.offeredCapabilities)
                list.addElementIndex(11, wrapper.wrapArray(this.offeredCapabilities));
            if (this.desiredCapabilities)
                list.addElementIndex(12, wrapper.wrapArray(this.desiredCapabilities));
            if (this.properties)
                list.addElementIndex(13, wrapper.wrapMap(this.properties));
          
            var constructor = new DescribedConstructor(list.getCode(), new TLVFixed(ENUM.AMQPType.SMALL_ULONG, Buffer.alloc(1, this.getCode())));

            list.setConstructor(constructor);

            return list;
        },
        fromArgumentsList: function (list) {
            var size = list.getList().length;
            var unwrapper = new AMQPUnwrapper();
            if (size < 3)
                throw new Error("Received malformed Attach header: mandatory " + "fields name, handle and role must not be null");

            if (size > 14)
                throw new Error("Received malformed Attach header. Invalid number of arguments: " + size);

            if (size > 0) {
                var element = list.getList()[0];
                if (element == null)
                    throw new Error("Received malformed Attach header: name can't be null");
                this.name = unwrapper.unwrapString(element);
            }
            if (size > 1) {
                var element = list.getList()[1];
                if (element == null)
                    throw new Error("Received malformed Attach header: handle can't be null");
                  
                this.handle = unwrapper.unwrapUInt(element);
            }
            if (size > 2) {
                var element = list.getList()[2];
                if (element == null)
                    throw new Error("Received malformed Attach header: role can't be null");
               this.role = ENUM.getKeyByValue(ENUM.RoleCode, unwrapper.unwrapBool(element));
            }
            if (size > 3) {
                var element = list.getList()[3];
                if (element == null)
                    this.sndSettleMode = SendCode.valueOf(unwrapper.unwrapUByte(element));
            }
            if (size > 4) {
                var element = list.getList()[4];
                if (element == null)
                    this.rcvSettleMode = ReceiveCode.valueOf(unwrapper.unwrapUByte(element));
            }
            if (size > 5) {
                var element = list.getList()[5];
                if (element == null) {
                    var code = element.getCode();
                    if (code != AMQPType.LIST_0 && code != AMQPType.LIST_8 && code != AMQPType.LIST_32)
                        throw new Error("Expected type SOURCE - received: " + element.getCode());
                    var source = new AMQPSource();
                    this.source.fromArgumentsList(element);
                }
            }
            if (size > 6) {
                var element = list.getList()[6];
                if (element == null) {
                    var code = element.getCode();
                    if (code != AMQPType.LIST_0 && code != AMQPType.LIST_8 && code != AMQPType.LIST_32)
                        throw new Error("Expected type TARGET - received: " + element.getCode());
                    this.target = new AMQPTarget();
                    this.target.fromArgumentsList(element);
                }
            }
            if (size > 7) {
                var unsettledMap = list.getList()[7];
                if (unsettledMap == null)
                    this.unsettled = unwrapper.unwrapMap(unsettledMap);
            }
            if (size > 8) {
                var element = list.getList()[8];
                if (element == null)
                    this.incompleteUnsettled = unwrapper.unwrapBool(element);
            }
            if (size > 9) {
                var element = list.getList()[9];
                if (element != null)
                    this.initialDeliveryCount = unwrapper.unwrapUInt(element);
                else if (this.role == ENUM.RoleCode.SENDER)
                    throw new Error("Received an attach header with a null initial-delivery-count");
            }
            if (size > 10) {
                var element = list.getList()[10];
                if (element == null)
                    this.maxMessageSize = unwrapper.unwrapULong(element);
            }
            if (size > 11) {
                var element = list.getList()[11];
                if (element == null)
                    this.offeredCapabilities = unwrapper.unwrapArray(element);
            }
            if (size > 12) {
                var element = list.getList()[12];
                if (element == null)
                    this.desiredCapabilities = unwrapper.unwrapArray(element);
            }
            if (size > 13) {
                var element = list.getList()[13];
                if (element == null)
                    this.properties = unwrapper.unwrapMap(element);
            }
        },
        hashCode: function () {
            var prime = 31;
            var result = AMQPHeader.hashCode(); // ????
            result = prime * result + ((desiredCapabilities == null) ? 0 : desiredCapabilities.hashCode());
            result = prime * result + ((handle == null) ? 0 : handle.hashCode());
            result = prime * result + ((incompleteUnsettled == null) ? 0 : incompleteUnsettled.hashCode());
            result = prime * result + ((initialDeliveryCount == null) ? 0 : initialDeliveryCount.hashCode());
            result = prime * result + ((maxMessageSize == null) ? 0 : maxMessageSize.hashCode());
            result = prime * result + ((name == null) ? 0 : name.hashCode());
            result = prime * result + ((offeredCapabilities == null) ? 0 : offeredCapabilities.hashCode());
            result = prime * result + ((properties == null) ? 0 : properties.hashCode());
            result = prime * result + ((rcvSettleMode == null) ? 0 : rcvSettleMode.hashCode());
            result = prime * result + ((role == null) ? 0 : role.hashCode());
            result = prime * result + ((sndSettleMode == null) ? 0 : sndSettleMode.hashCode());
            result = prime * result + ((source == null) ? 0 : source.hashCode());
            result = prime * result + ((target == null) ? 0 : target.hashCode());
            result = prime * result + ((unsettled == null) ? 0 : unsettled.hashCode());
            return result;
        },
        equals: function (obj) {
            if (this == obj)
                return true;
            if (!AMQPHeader.equals(obj))
                return false;
            // if (this !== obj) ////!!!!!!!!!!!!!!!!!!!!!
            //     return false;
            var other = obj;
            if (desiredCapabilities == null) {
                if (other.desiredCapabilities != null)
                    return false;
            }
            else if (desiredCapabilities != other.desiredCapabilities)
                return false;
            if (handle == null) {
                if (other.handle != null)
                    return false;
            }
            else if (handle != other.handle)
                return false;
            if (incompleteUnsettled == null) {
                if (other.incompleteUnsettled != null)
                    return false;
            }
            else if (incompleteUnsettled != other.incompleteUnsettled)
                return false;
            if (initialDeliveryCount == null) {
                if (other.initialDeliveryCount != null)
                    return false;
            }
            else if (initialDeliveryCount != other.initialDeliveryCount)
                return false;
            if (maxMessageSize == null) {
                if (other.maxMessageSize != null)
                    return false;
            }
            else if (maxMessageSize != other.maxMessageSize)
                return false;
            if (name == null) {
                if (other.name != null)
                    return false;
            }
            else if (name != other.name)
                return false;
            if (offeredCapabilities == null) {
                if (other.offeredCapabilities != null)
                    return false;
            }
            else if (offeredCapabilities != other.offeredCapabilities)
                return false;
            if (properties == null) {
                if (other.properties != null)
                    return false;
            }
            else if (properties != other.properties)
                return false;
            if (rcvSettleMode != other.rcvSettleMode)
                return false;
            if (role != other.role)
                return false;
            if (sndSettleMode != other.sndSettleMode)
                return false;
            if (source == null) {
                if (other.source != null)
                    return false;
            }
            else if (source != other.source)
                return false;
            if (target == null) {
                if (other.target != null)
                    return false;
            }
            else if (target != other.target)
                return false;
            if (unsettled == null) {
                if (other.unsettled != null)
                    return false;
            }
            else if (unsettled != other.unsettled)
                return false;
            return true;
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
            return this.channel;
        },
        setChannel: function (newChannel) {
            this.channel = newChannel;
        },
        getName: function () {
            return this.name;
        },
        setName: function (name) {
            this.name = name;
        },
        getHandle: function () {
            return this.handle
        },
        setHandle: function (handle) {
            this.handle = handle;
        },
        getRole: function () {
            return this.role;
        },
        setRole: function (role) {
            this.role = role;
        },
        getSndSettleMode: function () {
            return this.sndSettleMode;
        },
        setSndSettleMode: function (sndSettleMode) {
            this.sndSettleMode = sndSettleMode;
        },
        getRcvSettleMode: function () {
            return sndSettleMode;
        },
        setRcvSettleMode: function (rcvSettleMode) {
            this.rcvSettleMode = rcvSettleMode;
        },
        getSource: function () {
            return source;
        },
        setSource: function (source) {
            this.source = source;
        },
        getTarget: function () {
            return target;
        },
        setTarget: function (target) {
            this.target = target;
        },
        getUnsettled: function () {
            return unsettled;
        },
        getIncompleteUnsettled: function () {
            return incompleteUnsettled;
        },
        setIncompleteUnsettled: function (incompleteUnsettled) {
            this.incompleteUnsettled = incompleteUnsettled;
        },
        getInitialDeliveryCount: function () {
            return initialDeliveryCount;
        },
        setInitialDeliveryCount: function (initialDeliveryCount) {
            this.initialDeliveryCount = initialDeliveryCount;
        },
        getMaxMessageSize: function () {
            return maxMessageSize;
        },
        setMaxMessageSize: function (maxMessageSize) {
            this.maxMessageSize = maxMessageSize;
        },
        getOfferedCapabilities: function () {
            return offeredCapabilities;
        },
        getDesiredCapabilities: function () {
            return desiredCapabilities;
        },
        getProperties: function () {
            return properties;
        },
        setUnsettled: function (unsettled) {
            this.unsettled = unsettled;
        },
        setOfferedCapabilities: function (offeredCapabilities) {
            this.offeredCapabilities = offeredCapabilities;
        },
        setDesiredCapabilities: function (desiredCapabilities) {
            this.desiredCapabilities = desiredCapabilities;
        },
        setProperties: function (properties) {
            this.properties = properties;
        }
    }
}
module.exports = AMQPAttach;