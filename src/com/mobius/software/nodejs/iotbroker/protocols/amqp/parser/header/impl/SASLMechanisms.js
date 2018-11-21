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
var ENUM = require('../../../lib/enum');

function SASLMechanisms(code, doff, type, channel, mechanisms) {
   
    var code = ENUM.HeaderCode.MECHANISMS;
    var doff = 2;   
    var type = 1;
    var channel = 0;
    var mechanisms = mechanisms;
    return {
        getClassName: function() {
            return 'SASLMechanisms'
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

            if (mechanisms == null)
                throw new Error("At least one SASL Mechanism must be specified");

            list.addElement(0, AMQPWrapper.wrapArray(mechanisms));

            var constructor = new DescribedConstructor(list.getCode(), new TLVFixed(AMQPType.SMALL_ULONG, Buffer.from(0x40)));
            list.setConstructor(constructor);

            return list;
        },
        fromArgumentsList: function (list) {
          
            try {
                if (list.getLength() > 0) {
                    var element = list.getList()[0];                   
                    var unwrapper = new AMQPUnwrapper()
                    if (element != null)
                        mechanisms = unwrapper.unwrapArray(element);
                }
            } catch(e) {
                console.log(e)
            }
           
        },
        hashCode: function () {
            var prime = 31;
            var result = AMQPHeader.hashCode();
            result = prime * result + ((mechanisms == null) ? 0 : mechanisms.hashCode());
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
            if (mechanisms == null) {
                if (other.mechanisms != null)
                    return false;
            }
            else if (mechanisms != other.mechanisms)
                return false;
            return true;
        },
        getMechanisms: function () {
            return mechanisms;
        },
        setMechanisms: function (mechanisms) {
            mechanisms = mechanisms;
        }
    }
}
module.exports = SASLMechanisms;