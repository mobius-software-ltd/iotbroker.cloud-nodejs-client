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
var OutcomeCode = require('../../avps/OutcomeCode');
var DescribedConstructor = require('../../constructor/DescribedConstructor');
var AMQPHeader = require('../../header/api/AMQPHeader');
var AMQPUnwrapper = require('../../header/api/AMQPUnwrapper');
var AMQPWrapper = require('../../header/api/AMQPWrapper');
var TLVAmqp = require('../../tlv/api/TLVAmqp');
var TLVFixed = require('../../tlv/impl/TLVFixed');
var TLVList = require('../../tlv/impl/TLVList');
var ENUM = require('../../../lib/enum');

function SASLOutcome(code, doff, type, channel, outcomeCode, additionalData) {
     var code = ENUM.HeaderCode.OUTCOME;
     var doff = doff;
     var channel = channel;
     var type = type;
     var outcomeCode = outcomeCode;
     var additionalData = additionalData;
    return {
        getCode: function() {
            return code;
        },
        getClassName: function () {
            return 'SASLOutcome'
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
            try {
                if (outcomeCode == null)
                    throw new Error("SASL-Outcome header's code can't be null");
                list.addElement(0, AMQPWrapper.wrap(outcomeCode.getType()));
                if (additionalData != null)
                    list.addElement(1, AMQPWrapper.wrap(additionalData));

                var constructor = new DescribedConstructor(list.getCode(), new TLVFixed(AMQPType.SMALL_ULONG, Buffer.alloc(1, 0x44)));
                list.setConstructor(constructor);
                return list;
            } catch (e) {
                console.log(e)
            }
        },
        fromArgumentsList: function (list) {
            try {
                var size = list.getList().length;

                if (size == 0)
                    throw new Error("Received malformed SASL-Outcome header: code can't be null");
    
                if (size > 2)
                    throw new Error("Received malformed SASL-Outcome header. Invalid number of arguments: " + size);
    
                    var unwrapper = new AMQPUnwrapper()
                if (size > 0) {
                    var element = list.getList()[0];
                    if (element == null)
                        throw new Error("Received malformed SASL-Outcome header: code can't be null");
                    outcomeCode = unwrapper.unwrapUByte(element);
                }
    
                if (size > 1) {
                    var element = list.getList()[1];
                    if (element != null)
                        additionalData = AMQPUnwrapper.unwrapBinary(element);
                }
            } catch(e) {
                console.log(e)
            }
            
        },
        hashCode: function () {
            var prime = 31;
            var result = AMQPHeader.hashCode();
            result = prime * result + Arrays.hashCode(additionalData);
            result = prime * result + ((outcomeCode == null) ? 0 : outcomeCode.hashCode());
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
            if (additionalData.length !== other.additionalData.length) {
                return false;
            }
            for (var i = 0, l = additionalData.length; i < l; i++) {
                if (additionalData[i] instanceof Array && other.additionalData[i] instanceof Array) {
                    if (additionalData[i] != other.additionalData[i]) {
                        return false;
                    }
                }
                else if (additionalData[i] !== other.additionalData[i]) {
                    return false;
                }
            }

            if (outcomeCode != other.outcomeCode)
                return false;
            return true;
        },
        getOutcomeCode: function () {
            return outcomeCode;
        },
        setOutcomeCode: function (outcomeCode) {
            outcomeCode = outcomeCode;
        },
        getAdditionalData: function () {
            return additionalData;
        },
        setAdditionalData: function (additionalData) {
            additionalData = additionalData;
        }
    }
}
module.exports = SASLOutcome;
