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
// import com.mobius.software.amqp.parser.avps.SectionCode;
// import com.mobius.software.amqp.parser.constructor.DescribedConstructor;
// import com.mobius.software.amqp.parser.header.api.AMQPUnwrapper;
// import com.mobius.software.amqp.parser.header.api.AMQPWrapper;
// import com.mobius.software.amqp.parser.tlv.api.TLVAmqp;
// import com.mobius.software.amqp.parser.tlv.impl.TLVFixed;
// import com.mobius.software.amqp.parser.tlv.impl.TLVNull;

var AMQPType = require('../avps/AMQPType');
var SectionCode = require('../avps/SectionCode');
var DescribedConstructor = require('../constructor/DescribedConstructor');
var AMQPUnwrapper = require('../header/api/AMQPUnwrapper');
var AMQPWrapper = require('../header/api/AMQPWrapper');
var TLVAmqp = require('../tlv/api/TLVAmqp');
var TLVFixed = require('../tlv/impl/TLVFixed');
var TLVNull = require('../tlv/impl/TLVNull');

function AMQPValue(value) {
    this.value = value;
    return {
        getValue: function () {
            var val = value != null ? AMQPWrapper.wrap(value) : new TLVNull();

            var constructor = new DescribedConstructor(val.getCode(), new TLVFixed(AMQPType.SMALL_ULONG, Buffer.from(0x77)));
            val.setConstructor(constructor);
            return val;
        },
        fill: function (value) {
            if (value != null)
                this.value = AMQPUnwrapper.unwrap(value);
        },
        getCode: function () {
            return SectionCode.VALUE;
        },
        hashCode: function () {
            var prime = 31;
            var result = 1;
            result = prime * result + ((value == null) ? 0 : value.hashCode());
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
            if (value == null) {
                if (other.value != null)
                    return false;
            }
            else if (value != other.value)
                return false;
            return true;
        },
        getVal: function () {
            return value;
        },
        setValue: function (value) {
            this.value = value;
        }
    }
}
module.exports = AMQPValue;