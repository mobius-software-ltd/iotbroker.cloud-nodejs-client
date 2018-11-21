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
var TLVMap = require('../tlv/impl/TLVMap');
var AMQPSymbol = require('../wrappers/AMQPSymbol');

function DeliveryAnnotations(annotations) {
    this.annotations = annotations;
    return {
        getValue: function () {
            var map = new TLVMap();

            if (annotations)
                map = AMQPWrapper.wrapMap(annotations);

            var constructor = new DescribedConstructor(map.getCode(), new TLVFixed(AMQPType.SMALL_ULONG, Buffer.from(0x71)));
            map.setConstructor(constructor);
            return map;
        },
        fill: function (map) {
            if (map != null)
                annotations = AMQPUnwrapper.unwrapMap(map);
        },
        getCode: function () {
            return SectionCode.DELIVERY_ANNOTATIONS;
        },
        hashCode: function () {
            var prime = 31;
            var result = 1;
            result = prime * result + ((annotations == null) ? 0 : annotations.hashCode());
            return result;
        },
        equals: function (obj) {
            if (this == obj)
                return true;
            if (obj == null)
                return false;
            // if (getClass() != obj.getClass())
            // 	return false;
            var other = obj;
            if (annotations == null) {
                if (other.annotations != null)
                    return false;
            } else if (annotations != other.annotations)
                return false;
            return true;
        },
        getAnnotations: function () {
            return annotations;
        }
    }
}
module.exports = DeliveryAnnotations;