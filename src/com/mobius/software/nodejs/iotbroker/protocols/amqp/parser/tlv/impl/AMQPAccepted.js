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
var ENUM = require('../../../lib/enum');
var TLVList = require('../impl/TLVList')
var TLVFixed = require('../impl/TLVFixed')

function AMQPAccepted() {
    return {
        toArgumentsList: function () {
            var list = new TLVList();
            var constructor = new DescribedConstructor(list.getCode(), new TLVFixed(ENUM.AMQPType.SMALL_ULONG, Buffer.alloc(1, 0x24)));
            list.setConstructor(constructor);
            return list;
        },
        fromArgumentsList(list) {
        },
        hashCode: function () {
            return 31;
        },
        equals: function (obj) {
            // if (getClass() != obj.getClass())
            // 	return false;
            if (this == obj)
                return true;
            else
                return true;
        }
    }
}
module.exports = AMQPAccepted