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

//var AMQPType = require('../avps/AMQPType');
var TerminusDurability = require('../avps/TerminusDurability');
var TerminusExpiryPolicy = require('../avps/TerminusExpiryPolicy');
var DescribedConstructor = require('../constructor/DescribedConstructor');
var AMQPUnwrapper = require('../header/api/AMQPUnwrapper');
var AMQPWrapper = require('../header/api/AMQPWrapper');
//var HeaderFactory = require('../header/api/HeaderFactory');
//var TLVAmqp = require('../tlv/api/TLVAmqp');
var AMQPSymbol = require('../wrappers/AMQPSymbol');
var TLVFixed = require('../tlv/impl/TLVFixed');
var TLVList = require('../tlv/impl/TLVList');
var ENUM = require('../../lib/enum')

function AMQPTarget(address, durable, expiryPeriod, timeout, dynamic, dynamicNodeProperties, capabilities) {
    this.address = address;
    this.durable = durable;
    this.expiryPeriod = expiryPeriod;
    this.timeout = timeout;
    this.dynamic = dynamic;
    this.dynamicNodeProperties = dynamicNodeProperties;
    this.capabilities = capabilities;
    return {
        toArgumentsList: function () {
            var list = new TLVList();
            var wrapper = new AMQPWrapper();
            if (this.address != null)
                list.addElementIndex(0, wrapper.wrapString(this.address));
            if (this.durable != null)
                list.addElementIndex(1, wrapper.wrapUInt(this.durable));
            if (this.expiryPeriod != null)
                list.addElementIndex(2, wrapper.wrap(new AMQPSymbol(expiryPeriod.getPolicy())));
            if (this.timeout != null)
                list.addElementIndex(3, wrapper.wrapUInt(this.timeout));
            if (this.dynamic != null)
                list.addElementIndex(4, wrapper.wrapBool(dynamic));

            if (this.dynamicNodeProperties)
                if (this.dynamic != null) {
                    if (dynamic)
                        list.addElementIndex(5, wrapper.wrapMap(this.dynamicNodeProperties));
                    else
                        throw new Error("Target's dynamic-node-properties can't be specified when dynamic flag is false");
                }
                else
                    throw new Error("Target's dynamic-node-properties can't be specified when dynamic flag is not set");

            if (this.capabilities)
                list.addElementIndex(6, wrapper.wrapArray(this.capabilities));

            var constructor = new DescribedConstructor(list.getCode(), new TLVFixed(ENUM.AMQPType.SMALL_ULONG, Buffer.alloc(1,0x29)));
            list.setConstructor(constructor);

            return list;
        },
        fromArgumentsList: function (list) {
            if (list.getList().length > 0) {
                var element = list.getList()[0];
                if (element != null)
                    address = AMQPUnwrapper.unwrapString(element);
            }
            if (list.getList().length > 1) {
                var element = list.getList()[1];
                if (element != null)
                    durable = TerminusDurability.valueOf(AMQPUnwrapper.unwrapUInt(element));
            }
            if (list.getList().length > 2) {
                var element = list.getList()[2];
                if (element != null)
                    expiryPeriod = TerminusExpiryPolicy.getPolicy(AMQPUnwrapper.unwrapSymbol(element).getValue());
            }
            if (list.getList().length > 3) {
                var element = list.getList()[3];
                if (element != null)
                    timeout = AMQPUnwrapper.unwrapUInt(element);
            }
            if (list.getList().length > 4) {
                var element = list.getList()[4];
                if (element != null)
                    dynamic = AMQPUnwrapper.unwrapBool(element);
            }
            if (list.getList().length > 5) {
                var element = list.getList()[5];
                if (element != null) {
                    if (dynamic != null) {
                        if (dynamic)
                            dynamicNodeProperties = AMQPUnwrapper.unwrapMap(element);
                        else
                            throw new Error("Received malformed Target: dynamic-node-properties can't be specified when dynamic flag is false");
                    }
                    else
                        throw new Error("Received malformed Target: dynamic-node-properties can't be specified when dynamic flag is not set");
                }
            }
            if (list.getList().length > 6) {
                var element = list.getList()[6];
                if (element != null)
                    capabilities = AMQPUnwrapper.unwrapArray(element);
            }
        },
        hashCode: function () {
            var prime = 31;
            var result = 1;
            result = prime * result + ((address == null) ? 0 : address.hashCode());
            result = prime * result + ((capabilities == null) ? 0 : capabilities.hashCode());
            result = prime * result + ((durable == null) ? 0 : durable.hashCode());
            result = prime * result + ((dynamic == null) ? 0 : dynamic.hashCode());
            result = prime * result + ((dynamicNodeProperties == null) ? 0 : dynamicNodeProperties.hashCode());
            result = prime * result + ((expiryPeriod == null) ? 0 : expiryPeriod.hashCode());
            result = prime * result + ((timeout == null) ? 0 : timeout.hashCode());
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
            if (address == null) {
                if (other.address != null)
                    return false;
            }
            else if (address != other.address)
                return false;
            if (capabilities == null) {
                if (other.capabilities != null)
                    return false;
            }
            else if (capabilities != other.capabilities)
                return false;
            if (durable != other.durable)
                return false;
            if (dynamic == null) {
                if (other.dynamic != null)
                    return false;
            }
            else if (dynamic != other.dynamic)
                return false;
            if (dynamicNodeProperties == null) {
                if (other.dynamicNodeProperties != null)
                    return false;
            }
            else if (dynamicNodeProperties != other.dynamicNodeProperties)
                return false;
            if (expiryPeriod != other.expiryPeriod)
                return false;
            if (timeout == null) {
                if (other.timeout != null)
                    return false;
            }
            else if (timeout != other.timeout)
                return false;
            return true;
        },
        getAddress: function () {
            return address;
        },
        setAddress: function (address) {
            this.address = address;
        },
        getDurable: function () {
            return durable;
        },
        setDurable: function (durability) {
            this.durable = durability;
        },
        getExpiryPeriod: function () {
            return expiryPeriod;
        },
        setExpiryPeriod: function (expiryPeriod) {
            this.expiryPeriod = expiryPeriod;
        },
        getTimeout: function () {
            return timeout;
        },
        setTimeout: function (timeout) {
            this.timeout = timeout;
        },
        getDynamic: function () {
            return dynamic;
        },
        setDynamic: function (dynamic) {
            this.dynamic = dynamic;
        },
        getDynamicNodeProperties: function () {
            return dynamicNodeProperties;
        },
        getCapabilities: function () {
            return capabilities;
        },
        setDynamicNodeProperties: function (dynamicNodeProperties) {
            this.dynamicNodeProperties = dynamicNodeProperties;
        },
        setCapabilities: function (capabilities) {
            this.capabilities = capabilities;
        }
    }
}

module.exports = AMQPTarget;