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

function AMQPSequence(sequence) {
    this.sequence = sequence;
    return {
        getValue: function () {
            var list = new TLVList();
            if (sequence.length)
                list = AMQPWrapper.wrapList(sequence);

            var constructor = new DescribedConstructor(list.getCode(), new TLVFixed(AMQPType.SMALL_ULONG, Buffer.from(0x76)));
            list.setConstructor(constructor);
            return list;
        },
        fill: function (list) {
            if (list != null)
                sequence = AMQPUnwrapper.unwrapList(list);
        },
        getCode: function () {
            return SectionCode.SEQUENCE;
        },
        hashCode: function () {
            var prime = 31;
            var result = 1;
            result = prime * result + ((sequence == null) ? 0 : sequence.hashCode());
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
            if (sequence == null) {
                if (other.sequence != null)
                    return false;
            }
            else if (sequence != other.sequence)
                return false;
            return true;
        },
        getSequence: function() {
            return sequence;
        }
    }
}
module.exports = AMQPSequence;