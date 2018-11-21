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
var TLVAmqp = require('../../tlv/api/TLVAmqp');
var AMQPError = require('../../tlv/impl/AMQPError');
var TLVFixed = require('../../tlv/impl/TLVFixed');
var TLVList = require('../../tlv/impl/TLVList');
var TLVNull = require('../../tlv/impl/TLVNull');
var ENUM = require('../../../lib/enum')

function AMQPClose(code, doff, type, channel, error) {
   var code = ENUM.HeaderCode.CLOSE;
   var doff = 2;
   var type = 0;
   var channel = 0;
   var error = error;
    return {
        //  new AMQPHeader(HeaderCode.CLOSE, 2, 0, 0);
        getClassName: function() {
            return 'AMQPClose'
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
            return channel;
        },
        setChannel: function (newChannel) {
           channel = newChannel;
        },
        toArgumentsList: function () {
            var list = new TLVList();
            if (error)
                list.addElement(0, error.toArgumentsList());
            else
                list.addElement(0, new TLVNull());

            var constructor = new DescribedConstructor(list.getCode(), new TLVFixed(ENUM.AMQPType.SMALL_ULONG, Buffer.alloc(1, this.getCode())));
            list.setConstructor(constructor);

            return list;
        },
        fromArgumentsList: function (list) {
            if (list.getList().length > 0) {
                var element = list.getList()[0];
                if (element != null && element.getCode()!= ENUM.AMQPType.NULL) {
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
            var result = ENUM.AMQPHeader.hashCode();
            result = prime * result + ((error == null) ? 0 : error.hashCode());
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
            if (error == null) {
                if (other.error != null)
                    return false;
            }
            else if (error != other.error)
                return false;
            return true;
        },
        getError: function () {
            return error;
        },
        setError(error) {
           error = error;
        }
    }

}
module.exports = AMQPClose;
