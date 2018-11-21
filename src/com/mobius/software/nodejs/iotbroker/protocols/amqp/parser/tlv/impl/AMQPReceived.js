
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
var AMQPUnwrapper = require('../../header/api/AMQPUnwrapper');
var AMQPWrapper = require('../../header/api/AMQPWrapper');
var TLVAmqp = require('../api/TLVAmqp');

function AMQPReceived(sectionNumber, sectionOffset) {
    this.sectionNumber = sectionNumber;
    this.sectionOffset = sectionOffset;
    return {
        toArgumentsList: function () {
            var list = new TLVList();
            if (sectionNumber != null)
                list.addElement(0, AMQPWrapper.wrap(sectionNumber));
            if (sectionOffset != null)
                list.addElement(1, AMQPWrapper.wrap(sectionOffset));

            var constructor = new DescribedConstructor(list.getCode(), new TLVFixed(AMQPType.SMALL_ULONG, Buffer.from(0x23)));
            list.setConstructor(constructor);

            return list;
        },
        fromArgumentsList: function (list) {
            if (list.getList().length > 0) {
                var element = list.getList()[0];
                if (element != null)
                    sectionNumber = AMQPUnwrapper.unwrapUInt(element);
            }
            if (list.getList().length > 1) {
                var element = list.getList()[1];
                if (element != null)
                    sectionOffset = AMQPUnwrapper.unwrapULong(element);
            }
        },
        hashCode: function () {
            var prime = 31;
            var result = 1;
            result = prime * result + ((sectionNumber == null) ? 0 : sectionNumber.hashCode());
            result = prime * result + ((sectionOffset == null) ? 0 : sectionOffset.hashCode());
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
            if (sectionNumber == null) {
                if (other.sectionNumber != null)
                    return false;
            }
            else if (sectionNumber != other.sectionNumber)
            return false;
            if (sectionOffset == null) {
                if (other.sectionOffset != null)
                    return false;
            }
            else if (sectionOffset != other.sectionOffset)
            return false;
            return true;
        },
        getSectionNumber: function () {
            return sectionNumber;
        },
        setSectionNumber: function (sectionNumber) {
            this.sectionNumber = sectionNumber;
        },
        getSectionOffset: function () {
            return sectionOffset;
        },
        setSectionOffset: function (sectionOffset) {
            this.sectionOffset = sectionOffset;
        }
    }
}
module.exports = AMQPReceived;