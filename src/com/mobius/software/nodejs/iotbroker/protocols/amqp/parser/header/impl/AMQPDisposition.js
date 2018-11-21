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

//var AMQPType = require('../../avps/AMQPType');
var RoleCode = require('../../avps/RoleCode');
var DescribedConstructor = require('../../constructor/DescribedConstructor');
//var AMQPHeader = require('../../header/api/AMQPHeader');
var AMQPUnwrapper = require('../../header/api/AMQPUnwrapper');
var AMQPWrapper = require('../../header/api/AMQPWrapper');
//var HeaderFactory = require('../../header/api/HeaderFactory');
var TLVList = require('../../tlv/impl/TLVList');
var TLVFixed = require('../../tlv/impl/TLVFixed');
var ENUM = require('../../../lib/enum');

function AMQPDisposition(code, doff, type, channel, role, first, last, settled, state, batchable) {
    var code = ENUM.HeaderCode.DISPOSITION;
    var doff = 2;
    var type = 0;
    var channel = channel;
    this.role = role;
    this.first = first;
    this.last = last;
    this.settled = settled;
    this.state = state;
    this.batchable = batchable;
    return {
        getClassName: function() {
            return 'AMQPDisposition'
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
            var wrapper = new AMQPWrapper();
            if (this.role == null)
                throw new Error("Disposition header's role can't be null");
            list.addElementIndex(0, wrapper.wrapBool(this.role));

            if (this.first == null)
                throw new Error("Transfer header's first can't be null");
            list.addElementIndex(1, wrapper.wrapUInt(this.first));

            if (this.last != null)
                list.addElementIndex(2, wrapper.wrapUInt(this.last));
            if (this.settled != null)
                list.addElementIndex(3, wrapper.wrapBool(this.settled));
            if (this.state != null)
                list.addElementIndex(4, this.state.toArgumentsList());
            if (this.batchable != null)
                list.addElementIndex(5, wrapper.wrap(this.batchable));

            var constructor = new DescribedConstructor(list.getCode(), new TLVFixed(ENUM.AMQPType.SMALL_ULONG, Buffer.alloc(1,this.getCode())));
            list.setConstructor(constructor);

            return list;
        },
        fromArgumentsList: function (list) {
            var size = list.getList().length;
            var unwrapper = new AMQPUnwrapper();
            if (size < 2)
                throw new Error("Received malformed Disposition header: role and first can't be null");

            if (size > 6)
                throw new Error("Received malformed Disposition header. Invalid number of arguments: " + size);

            if (size > 0) {
                var element = list.getList()[0];
                if (element == null)
                    throw new Error("Received malformed Disposition header: role can't be null");
             
                    this.role = ENUM.getKeyByValue(ENUM.RoleCode, unwrapper.unwrapBool(element));
            }
            if (size > 1) {
                var element = list.getList()[1];
                if (element == null)
                    throw new Error("Received malformed Disposition header: first can't be null");
                    this.first = unwrapper.unwrapUInt(element);
            }
            if (size > 2) {
                var element = list.getList()[2]; 
                if (element != null && element.getValue() != null)                
                this.last = unwrapper.unwrapUInt(element);
            }
            if (size > 3) {
                var element = list.getList()[3];
                if (element != null)                
                this.settled = unwrapper.unwrapBool(element);
            }
            if (size > 4) {
                var element = list.getList()[4];
                if (element != null && element.getValue() != null) {
                    var code = element.getCode();
                    if (code != ENUM.AMQPType.LIST_0 && code != ENUM.AMQPType.LIST_8 && code != ENUM.AMQPType.LIST_32)
                        throw new Error("Expected type 'STATE' - received: " + element.getCode());

                        this.state = HeaderFactory.getState(element);
                        this.state.fromArgumentsList(element);
                }
            }
            if (size > 5) {
                var element = list.getList()[5];
                if (element != null)
                this.batchable = unwrapper.unwrapBool(element);
            }
        },
        hashCode: function () {
            var prime = 31;
            var result = AMQPHeader.hashCode();
            result = prime * result + ((batchable == null) ? 0 : batchable.hashCode());
            result = prime * result + ((first == null) ? 0 : first.hashCode());
            result = prime * result + ((last == null) ? 0 : last.hashCode());
            result = prime * result + ((role == null) ? 0 : role.hashCode());
            result = prime * result + ((settled == null) ? 0 : settled.hashCode());
            result = prime * result + ((state == null) ? 0 : state.hashCode());
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
            if (batchable == null) {
                if (other.batchable != null)
                    return false;
            }
            else if (batchable != other.batchable)
                return false;
            if (first == null) {
                if (other.first != null)
                    return false;
            }
            else if (first != other.first)
                return false;
            if (last == null) {
                if (other.last != null)
                    return false;
            }
            else if (last != other.last)
                return false;
            if (role != other.role)
                return false;
            if (settled == null) {
                if (other.settled != null)
                    return false;
            }
            else if (settled != other.settled)
                return false;
            if (state == null) {
                if (other.state != null)
                    return false;
            }
            else if (state != other.state)
                return false;
            return true;
        },
        getRole: function () {
            return role;
        },
        setRole: function (role) {
            this.role = role;
        },
        getFirst: function () {
            return this.first;
        },
        setFirst: function (first) {
            this.first = first;
        },
        getLast: function () {
            return this.last;
        },
        setLast: function (last) {
            this.last = last;
        },
        getSettled: function () {
            return settled;
        },
        setSettled: function (settled) {
            this.settled = settled;
        },
        getState: function () {
            return state;
        },
        setState: function (state) {
            this.state = state;
        },
        getBatchable: function () {
            return batchable;
        },
        setBatchable: function (batchable) {
            this.batchable = batchable;
        }

    }
}
module.exports = AMQPDisposition;