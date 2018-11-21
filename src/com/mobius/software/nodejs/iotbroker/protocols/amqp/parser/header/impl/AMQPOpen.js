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

function AMQPOpen(code, doff, type, channel, containerId, hostname, maxFrameSize, channelMax, idleTimeout, outgoingLocales, incomingLocales, offeredCapabilities, desiredCapabilities, properties) {
    this.containerId = containerId;
    this.hostname = hostname;
    this.maxFrameSize = maxFrameSize;
    this.channelMax = channelMax;
    this.idleTimeout = idleTimeout;
    this.outgoingLocales = outgoingLocales;
    this.incomingLocales = incomingLocales;
    this.offeredCapabilities = offeredCapabilities;
    this.desiredCapabilities = desiredCapabilities;
    this.properties = properties;
    var doff = 2;
    var type = type;
    this.channel = channel;
   var code = ENUM.HeaderCode.OPEN;
    return {
        getClassName: function() {
            return 'AMQPOpen'
        }, 
        getCode: function() {
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
            return this.channel;
        },
        setChannel: function (newChannel) {
            this.channel = newChannel;
        },
        toArgumentsList: function () {
            var list = new TLVList();

            var wrapper = new AMQPWrapper()

            if (this.getContainerId() == null)
                throw new Error("Open header's container id can't be null");
                
            list.addElementIndex(0, wrapper.wrapString(this.getContainerId()));

            if (this.getHostname() != null)
                list.addElementIndex(1, wrapper.wrap(hostname));
            if (maxFrameSize != null)
                list.addElementIndex(2, wrapper.wrap(maxFrameSize));
            if (channelMax != null)
                list.addElementIndex(3, wrapper.wrap(channelMax));
            if (this.getIdleTimeout() != null)
                list.addElementIndex(4, wrapper.wrapUInt(this.getIdleTimeout()));
            if (outgoingLocales)
                list.addElementIndex(5, wrapper.wrapArray(outgoingLocales));
            if (incomingLocales)
                list.addElementIndex(6, wrapper.wrapArray(incomingLocales));
            if (offeredCapabilities)
                list.addElementIndex(7, wrapper.wrapArray(offeredCapabilities));
            if (desiredCapabilities)
                list.addElementIndex(8, wrapper.wrapArray(desiredCapabilities));
            if (properties)
                list.addElementIndex(9, wrapper.wrapMap(properties));
               
            var constructor = new DescribedConstructor(list.getCode(), new TLVFixed(ENUM.AMQPType.SMALL_ULONG, Buffer.alloc(1, this.getCode())));           
            list.setConstructor(constructor);        
           
            return list;
        },
        fromArgumentsList(list) {
            var size = list.getList().length;
            if (size == 0)
                throw new Error("Received malformed Open header: container id can't be null");

            if (size > 10)
                throw new Error("Received malformed Open header. Invalid number of arguments: " + size);

            var element = list.getList()[0];
            if (element == null)
                throw new Error("Received malformed Open header: container id can't be null");
           
          
            var unwrapper = new AMQPUnwrapper();

            this.containerId = unwrapper.unwrapString(element);
          
            if (size > 1) {
                element = list.getList()[1];
                if (element != null)
                    this.hostname = unwrapper.unwrapString(element);
            }
            if (size > 2) {
                element = list.getList()[2];
                if (element != null)
                this.maxFrameSize = unwrapper.unwrapUInt(element);
            }
            if (size > 3) {
                element = list.getList()[3];
                if (element != null)
                this.channelMax = unwrapper.unwrapUShort(element);
            }
            if (size > 4) {
                element = list.getList()[4];
                if (element != null)
                this.idleTimeout = unwrapper.unwrapUInt(element);
            }
            if (size > 5) {
                element = list.getList()[5];
                if (element != null)
                this.outgoingLocales = unwrapper.unwrapArray(element);
            }
            if (size > 6) {
                element = list.getList()[6];
                if (element != null)
                this.incomingLocales = unwrapper.unwrapArray(element);
            }
            if (size > 7) {
                element = list.getList()[7];
                if (element != null)
                this.offeredCapabilities = unwrapper.unwrapArray(element);
            }
            if (size > 8) {
                element = list.getList()[8];
                if (element != null)
                this.desiredCapabilities = unwrapper.unwrapArray(element);
            }
            if (size > 9) {
                element = list.getList()[9];
                if (element != null)
                this.properties = unwrapper.unwrapMap(element);
            }
        },
        hashCode: function () {
            var prime = 31;
            var result = AMQPHeader.hashCode();
            result = prime * result + ((channelMax == null) ? 0 : channelMax.hashCode());
            result = prime * result + ((containerId == null) ? 0 : containerId.hashCode());
            result = prime * result + ((desiredCapabilities == null) ? 0 : desiredCapabilities.hashCode());
            result = prime * result + ((hostname == null) ? 0 : hostname.hashCode());
            result = prime * result + ((idleTimeout == null) ? 0 : idleTimeout.hashCode());
            result = prime * result + ((incomingLocales == null) ? 0 : incomingLocales.hashCode());
            result = prime * result + ((maxFrameSize == null) ? 0 : maxFrameSize.hashCode());
            result = prime * result + ((offeredCapabilities == null) ? 0 : offeredCapabilities.hashCode());
            result = prime * result + ((outgoingLocales == null) ? 0 : outgoingLocales.hashCode());
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
            if (channelMax == null) {
                if (other.channelMax != null)
                    return false;
            }
            else if (channelMax != other.channelMax)
                return false;
            if (containerId == null) {
                if (other.containerId != null)
                    return false;
            }
            else if (containerId != other.containerId)
                return false;
            if (desiredCapabilities == null) {
                if (other.desiredCapabilities != null)
                    return false;
            }
            else if (desiredCapabilities != other.desiredCapabilities)
                return false;
            if (hostname == null) {
                if (other.hostname != null)
                    return false;
            }
            else if (hostname != other.hostname)
                return false;
            if (idleTimeout == null) {
                if (other.idleTimeout != null)
                    return false;
            }
            else if (idleTimeout != other.idleTimeout)
                return false;
            if (incomingLocales == null) {
                if (other.incomingLocales != null)
                    return false;
            }
            else if (incomingLocales != other.incomingLocales)
                return false;
            if (maxFrameSize == null) {
                if (other.maxFrameSize != null)
                    return false;
            }
            else if (maxFrameSize != other.maxFrameSize)
                return false;
            if (offeredCapabilities == null) {
                if (other.offeredCapabilities != null)
                    return false;
            }
            else if (offeredCapabilities != other.offeredCapabilities)
                return false;
            if (outgoingLocales == null) {
                if (other.outgoingLocales != null)
                    return false;
            }
            else if (outgoingLocales != other.outgoingLocales)
                return false;
            if (properties == null) {
                if (other.properties != null)
                    return false;
            }
            else if (properties != other.properties)
                return false;
            return true;
        },
        getContainerId: function () {
            return this.containerId;
        },
        setContainerId: function (containerId) {
            this.containerId = containerId;
        },
        getHostname: function () {
            return hostname;
        },
        setHostname: function (hostname) {
            this.hostname = hostname;
        },
        getMaxFrameSize: function () {
            return maxFrameSize;
        },
        setMaxFrameSize: function (maxFrameSize) {
            this.maxFrameSize = maxFrameSize;
        },
        getChannelMax: function () {
            return channelMax;
        },
        setChannelMax: function (channelMax) {
            this.channelMax = channelMax;
        },
        getIdleTimeout: function () {
            return this.idleTimeout;
        },
        setIdleTimeout: function (idleTimeout) {
            this.idleTimeout = idleTimeout;
        },
        getOutgoingLocales: function () {
            return outgoingLocales;
        },
        setOutgoingLocales: function (outgoingLocales) {
            this.outgoingLocales = outgoingLocales;
        },
        getIncomingLocales: function () {
            return incomingLocales;
        },
        setIncomingLocales: function (incomingLocales) {
            this.incomingLocales = incomingLocales;
        },
        getOfferedCapabilities: function () {
            return offeredCapabilities;
        },
        setOfferedCapabilities: function (offeredCapabilities) {
            this.offeredCapabilities = offeredCapabilities;
        },
        getDesiredCapabilities: function () {
            return desiredCapabilities;
        },
        setDesiredCapabilities: function (desiredCapabilities) {
            this.desiredCapabilities = desiredCapabilities;
        },
        getProperties: function () {
            return properties;
        },
        setProperties: function (properties) {
            this.properties = properties;
        }
    }
}
module.exports = AMQPOpen;