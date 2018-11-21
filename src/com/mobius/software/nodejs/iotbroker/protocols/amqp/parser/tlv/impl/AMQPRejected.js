
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
var TLVAmqp = require('../api/TLVAmqp');

function AMQPRejected(error) {
    this.error = error;
    return {
        toArgumentsList: function () {
            var list = new TLVList();

            if (error != null)
                list.addElement(0, error.toArgumentsList());

            var constructor = new DescribedConstructor(list.getCode(), new TLVFixed(AMQPType.SMALL_ULONG, Buffer.from(0x25)));
            list.setConstructor(constructor);

            return list;
        },
        fromArgumentsList: function (list) {
            if (list.getList().length > 0) {
                var element = list.getList()[0];
                if (element != null) {
                    var code = element.getCode();
                    if (code != AMQPType.LIST_0 && code != AMQPType.LIST_8 && code != AMQPType.LIST_32)
                        throw new Error("Expected type 'ERROR' - received: " + element.getCode());
                    error = new AMQPError;
                    error.fromArgumentsList(element);
                }
            }
        },
        hashCode: function () {
            var prime = 31;
            var result = 1;
            result = prime * result + ((error == null) ? 0 : error.hashCode());
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
        setError: function (error) {
            this.error = error;
        }
    }
}
module.exports = AMQPRejected;