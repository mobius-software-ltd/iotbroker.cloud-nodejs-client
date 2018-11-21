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
var AMQPUnwrapper = require('../header/api/AMQPUnwrapper');
var AMQPWrapper = require('../header/api/AMQPWrapper');
var TLVAmqp = require('../tlv/api/TLVAmqp');
var TLVFixed = require('../tlv/impl/TLVFixed');
var TLVList = require('../tlv/impl/TLVList');
var ENUM = require('../../lib/enum')
function MessageHeader(durable, priority, milliseconds, firstAquirer, deliveryCount) {
    this.durable = durable;
    this.priority = priority;
    this.milliseconds = milliseconds;
    this.firstAquirer = firstAquirer;
    this.deliveryCount = deliveryCount;
    return {
        getClassName: function() {
            return 'MessageHeader'
        },
        getValue: function () {

            var list = new TLVList();

            if (durable != null)
                list.addElement(0, AMQPWrapper.wrap(durable));
            if (priority != null)
                list.addElement(1, AMQPWrapper.wrap(priority));
            if (milliseconds != null)
                list.addElement(2, AMQPWrapper.wrap(milliseconds));
            if (firstAquirer != null)
                list.addElement(3, AMQPWrapper.wrap(firstAquirer));
            if (deliveryCount != null)
                list.addElement(4, AMQPWrapper.wrap(deliveryCount));

            var constructor = new DescribedConstructor(list.getCode(), new TLVFixed(ENUM.AMQPType.SMALL_ULONG, Buffer.alloc(1,0x70)));
            list.setConstructor(constructor);

            return list;
        },
        fill: function (value) {
            var list = value;
            if (list.getList().length > 0) {
                var element = list.getList()[0];
                if (element != null)
                    durable = AMQPUnwrapper.unwrapBool(element);
            }
            if (list.getList().length > 1) {
                var element = list.getList()[1];
                if (element != null)
                    priority = AMQPUnwrapper.unwrapUByte(element);
            }
            if (list.getList().length > 2) {
                var element = list.getList()[2];
                if (element != null)
                    milliseconds = AMQPUnwrapper.unwrapUInt(element);
            }
            if (list.getList().length > 3) {
                var element = list.getList()[3];
                if (element != null)
                    firstAquirer = AMQPUnwrapper.unwrapBool(element);
            }
            if (list.getList().length > 4) {
                var element = list.getList()[4];
                if (element != null)
                    deliveryCount = AMQPUnwrapper.unwrapUInt(element);
            }
        },
        getCode: function () {
            return SectionCode.HEADER;
        },
        hashCode: function () {
            var prime = 31;
            var result = 1;
            result = prime * result + ((deliveryCount == null) ? 0 : deliveryCount.hashCode());
            result = prime * result + ((durable == null) ? 0 : durable.hashCode());
            result = prime * result + ((firstAquirer == null) ? 0 : firstAquirer.hashCode());
            result = prime * result + ((milliseconds == null) ? 0 : milliseconds.hashCode());
            result = prime * result + ((priority == null) ? 0 : priority.hashCode());
            return result;
        },
        equals: function (obj) {
            if (this == obj)
                return true;
            if (obj == null)
                return false;
            // if (getClass() != obj.getClass())
            //     return false;
            var other = obj;
            if (deliveryCount == null) {
                if (other.deliveryCount != null)
                    return false;
            }
            else if (deliveryCount != other.deliveryCount)
                return false;
            if (durable == null) {
                if (other.durable != null)
                    return false;
            }
            else if (durable != other.durable)
                return false;
            if (firstAquirer == null) {
                if (other.firstAquirer != null)
                    return false;
            }
            else if (firstAquirer != other.firstAquirer)
                return false;
            if (milliseconds == null) {
                if (other.milliseconds != null)
                    return false;
            }
            else if (milliseconds != other.milliseconds)
                return false;
            if (priority == null) {
                if (other.priority != null)
                    return false;
            }
            else if (priority != other.priority)
                return false;
            return true;
        },
        getDurable: function () {
            return durable;
        },
        setDurable: function (durable) {
            this.durable = durable;
        },
        getPriority: function () {
            return priority;
        },
        setPriority: function (priority) {
            this.priority = priority;
        },
        getMilliseconds: function () {
            return milliseconds;
        },
        setMilliseconds: function (milliseconds) {
            this.milliseconds = milliseconds;
        },
        getFirstAquirer: function () {
            return firstAquirer;
        },
        setFirstAquirer: function (firstAquirer) {
            this.firstAquirer = firstAquirer;
        },
        getDeliveryCount: function () {
            return deliveryCount;
        },
        setDeliveryCount: function (deliveryCount) {
            this.deliveryCount = deliveryCount;
        }
    }
}
module.exports = MessageHeader;