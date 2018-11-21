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


// import com.mobius.software.amqp.parser.avps.AMQPType;
// import com.mobius.software.amqp.parser.avps.HeaderCode;
// import com.mobius.software.amqp.parser.constructor.DescribedConstructor;
// import com.mobius.software.amqp.parser.exception.MalformedHeaderException;
// import com.mobius.software.amqp.parser.header.api.AMQPHeader;
// import com.mobius.software.amqp.parser.header.api.AMQPUnwrapper;
// import com.mobius.software.amqp.parser.header.api.AMQPWrapper;
// import com.mobius.software.amqp.parser.tlv.api.TLVAmqp;
// import com.mobius.software.amqp.parser.tlv.impl.AMQPError;
// import com.mobius.software.amqp.parser.tlv.impl.TLVFixed;
// import com.mobius.software.amqp.parser.tlv.impl.TLVList;

var AMQPType = require('../../avps/AMQPType');
var DescribedConstructor = require('../../constructor/DescribedConstructor');
var AMQPHeader = require('../../header/api/AMQPHeader');
var AMQPUnwrapper = require('../../header/api/AMQPUnwrapper');
var AMQPWrapper = require('../../header/api/AMQPWrapper');
var AMQPError = require('../../tlv/impl/AMQPError');
var TLVFixed = require('../../tlv/impl/TLVFixed');
var TLVList = require('../../tlv/impl/TLVList');
var TLVAmqp = require('../../tlv/api/TLVAmqp');
var ENUM = require('../../../lib/enum')

function AMQPDetach(code, doff, type, channel, handle, closed, error) {

    var code = ENUM.HeaderCode.DETACH
    var doff = 2;
    var type = 0;
    this.channel = channel;
    this.handle = handle;
    this.closed = closed;
    this.error = error;
    return {
        // new AMQPHeader(HeaderCode.DETACH, 2, 0, 0);
        getClassName: function() {
            return 'AMQPDetach'
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
            var wrapper = new AMQPWrapper();
            if (this.handle == null)
                throw new Error("Detach header's handle can't be null");

            list.addElementIndex(0, wrapper.wrapUInt(this.handle));

            if (this.closed != null)
                list.addElementIndex(1, wrapper.wrapBool(this.closed));

            if (this.error != null)
                list.addElementIndex(2, error.toArgumentsList());

            var constructor = new DescribedConstructor(list.getCode(), new TLVFixed(ENUM.AMQPType.SMALL_ULONG, Buffer.alloc(1,this.getCode())));
            list.setConstructor(constructor);

            return list;
        },
        fromArgumentsList: function (list) {
            var size = list.getList().length;
            var unwrapper = new AMQPUnwrapper();
            if (size == 0)
                throw new Error("Received malformed Detach header: handle can't be null");

            if (size > 3)
                throw new Error("Received malformed Detach header. Invalid number of arguments: " + size);

            if (size > 0) {
                var element = list.getList()[0];
                if (!element)
                    throw new Error("Received malformed Detach header: handle can't be null");
                  
                this.handle = unwrapper.unwrapUInt(element);
            }
            if (size > 1) {
                var element = list.getList()[1];
                if (element)
                    this.closed = unwrapper.unwrapBool(element);
            }
            if (size > 2) {
                var element = list.getList()[2];
                if (element) {
                    var code = element.getCode();
                    if (code != ENUM.AMQPType.LIST_0 && code != ENUM.AMQPType.LIST_8 && code != ENUM.AMQPType.LIST_32)
                        throw new Error("Expected type 'ERROR' - received: " + element.getCode());

                    var error = new AMQPError();
                    error.fromArgumentsList(element);
                }
            }
        },
        hashCode: function () {
            var prime = 31;
            var result = AMQPHeader.hashCode();
            result = prime * result + ((closed == null) ? 0 : closed.hashCode());
            result = prime * result + ((error == null) ? 0 : error.hashCode());
            result = prime * result + ((handle == null) ? 0 : handle.hashCode());
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
            if (closed == null) {
                if (other.closed != null)
                    return false;
            }
            else if (closed != other.closed)
                return false;
            if (error == null) {
                if (other.error != null)
                    return false;
            }
            else if (error != other.error)
                return false;
            if (handle == null) {
                if (other.handle != null)
                    return false;
            }
            else if (handle != other.handle)
                return false;

            return true;
        },
        getHandle: function () {
            return this.handle;
        },
        setHandle: function (handle) {
            this.handle = handle;
        },
        getClosed: function () {
            return this.closed;
        },
        setClosed: function (closed) {
            this.closed = closed;
        },
        getError: function () {
            return this.error;
        },
        setError: function (error) {
            this.error = error;
        }
    }
}
module.exports = AMQPDetach;