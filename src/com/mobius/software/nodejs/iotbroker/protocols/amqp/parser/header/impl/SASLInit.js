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

function SASLInit(code, doff, type, channel, mechanism, initialResponse, hostName, amqptype) {
    this.code = ENUM.HeaderCode.INIT;
    this.doff = 2;
    this.channel = channel;
    this.type = type;
    this.mechanism = mechanism;
    this.initialResponse = initialResponse;
    this.hostName = hostName;
    this.amqptype = amqptype
    return {
        getAMQPType: function() {
            return this.amqptype;
        },
        getCode: function() {
            return this.code;
        },
        setAMQPType: function(type) {
            this.amqptype = type;
        },
        getClassName: function() {
            return 'SASLInit'
        }, 
        getCode: function () {
            return ENUM.HeaderCode.INIT;
        },
        getDoff: function () {
            return 2;
        },
        setDoff: function (newDoff) {
            this.doff = newDoff;
        },
        getType: function () {
            return this.type;
        },
        setType: function (newType) {
            this.type = newType;
        },
        getChannel: function () {
            return this.channel;
        },
        setChannel: function (newChannel) {
            this.channel = newChannel;
        },
        toArgumentsList: function () {
           
            var list = new TLVList();
            if (this.mechanism == null)
                throw new Error("SASL-Init header's mechanism can't be null");

           
            var wrapper = new AMQPWrapper()
          
            list.addElement(0, wrapper.wrap(this.mechanism));
         
            if (this.initialResponse != null) {               
                list.addElement(1, wrapper.wrapBinary(this.initialResponse));
            }
               
            
               
            if (hostName != null)
                list.addElement(2, wrapper.wrap(hostName));
           
            var constructor = new DescribedConstructor(list.getCode(), new TLVFixed(ENUM.AMQPType.SMALL_ULONG, Buffer.alloc(1, 0x41)));            
            list.setConstructor(constructor);

            return list;
        },
        fromArgumentsList: function (list) {
            var size = list.getList().length;

            if (size == 0)
                throw new Error("Received malformed SASL-Init header: mechanism can't be null");

            if (size > 3)
                throw new Error("Received malformed SASL-Init header. Invalid number of arguments: " + size);

            if (size > 0) {
                var element = list.getList()[0];
                if (element == null)
                    throw new Error("Received malformed SASL-Init header: mechanism can't be null");
                mechanism = AMQPUnwrapper.unwrapSymbol(element);
            }

            if (size > 1) {
                var element = list.getList()[1];
                if (element != null)
                    initialResponse = AMQPUnwrapper.unwrapBinary(element);
            }

            if (size > 2) {
                var element = list.getList()[2];
                if (element != null)
                    hostName = AMQPUnwrapper.unwrapString(element);
            }
        },
        hashCode: function () {
            var prime = 31;
            var result = AMQPHeader.hashCode();
            result = prime * result + ((hostName == null) ? 0 : hostName.hashCode());
            result = prime * result + Arrays.hashCode(initialResponse);
            result = prime * result + ((mechanism == null) ? 0 : mechanism.hashCode());
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
            if (hostName == null) {
                if (other.hostName != null)
                    return false;
            }
            else if (hostName != other.hostName)
                return false;
            // if (!Arrays.equals(initialResponse, other.initialResponse))
            //     return false;

            if (initialResponse.length !== other.initialResponse.length) {
                return false;
            }
            for (var i = 0, l = initialResponse.length; i < l; i++) {
                if (initialResponse[i] instanceof Array && other.initialResponse[i] instanceof Array) {
                    if (initialResponse[i] != other.initialResponse[i]) {
                        return false;
                    }
                }
                else if (initialResponse[i] !== other.initialResponse[i]) {
                    return false;
                }
            }


            if (mechanism == null) {
                if (other.mechanism != null)
                    return false;
            }
            else if (mechanism != other.mechanism)
                return false;
            return true;
        },
        getMechanism: function () {
            return mechanism.getValue();
        },
        setMechanism: function (mechanism, type) {
            this.mechanism = new AMQPSymbol(mechanism, type);
        },
        getInitialResponse: function () {
            return this.initialResponse;
        },
        setInitialResponse: function (initialResponse) {
            this.initialResponse = initialResponse;
        },
        getHostName: function () {
            return hostName;
        },
        setHostName: function (hostName) {
            this.hostName = hostName;
        }
    }
}
module.exports = SASLInit; 