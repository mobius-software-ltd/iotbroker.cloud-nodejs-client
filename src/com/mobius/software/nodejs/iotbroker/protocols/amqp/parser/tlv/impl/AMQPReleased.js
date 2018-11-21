
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

function AMQPReleased() {
    return {
        toArgumentsList: function () {
            var list = new TLVList();
            var constructor = new DescribedConstructor(list.getCode(), new TLVFixed(AMQPType.SMALL_ULONG, Buffer.from(0x26)));
            list.setConstructor(constructor);
            return list;
        },
        fromArgumentsList: function (list) {
        },
        hashCode: function () {
            return 31;
        },
        equals: function (obj) {
            if (this == obj)
                return true;
            // if (getClass() != obj.getClass())
            // 	return false;
            else
                return false;
        }
    }
}
module.exports = AMQPReleased;