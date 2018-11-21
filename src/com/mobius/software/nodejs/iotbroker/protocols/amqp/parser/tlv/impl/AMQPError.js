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
var ErrorCode = require('../../avps/ErrorCode');
var DescribedConstructor = require('../../constructor/DescribedConstructor');
var AMQPUnwrapper = require('../../header/api/AMQPUnwrapper');
var AMQPWrapper = require('../../header/api/AMQPWrapper');
var AMQPSymbol = require('../../wrappers/AMQPSymbol');
var TLVAmqp = require('../api/TLVAmqp');

function AMQPError(condition, description, info) {
    this.condition = condition;
    this.description = description;
    this.info = info;
    return {
        toArgumentsList: function () {
            var list = new TLVList();

            if (condition != null)
                list.addElement(0, AMQPWrapper.wrap(new AMQPSymbol(condition.getCondition())));

            if (description != null)
                list.addElement(1, AMQPWrapper.wrap(description));

            if (info.length)
                list.addElement(2, AMQPWrapper.wrapMap(info));

            var constructor = new DescribedConstructor(list.getCode(), new TLVFixed(AMQPType.SMALL_ULONG, Buffer.from(0x1D)));

            list.setConstructor(constructor);

            return list;
        },
        fromArgumentsList(list) {
            if (list.getList().length > 0) {
                var element = list.getList()[0];
                if (element != null)
                    condition = ErrorCode.getCondition(AMQPUnwrapper.unwrapSymbol(element).getValue());
            }

            if (list.getList().length > 1) {
                var element = list.getList()[1];
                if (element != null)
                    description = AMQPUnwrapper.unwrapString(element);
            }

            if (list.getList().length > 2) {
                var element = list.getList()[2];
                if (element != null)
                    info = AMQPUnwrapper.unwrapMap(element);
            }
        },
        hashCode: function () {
            var prime = 31;
            var result = 1;
            result = prime * result + ((condition == null) ? 0 : condition.hashCode());
            result = prime * result + ((description == null) ? 0 : description.hashCode());
            result = prime * result + ((info == null) ? 0 : info.hashCode());
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
            if (condition != other.condition)
                return false;
            if (description == null) {
                if (other.description != null)
                    return false;
            }
            else if (description != other.description)
                return false;
            if (info == null) {
                if (other.info != null)
                    return false;
            }
            else if (info != other.info)
                return false;
            return true;
        },
        getCondition: function () {
            return condition;
        },
        setCondition: function (condition) {
            this.condition = condition;
        },
        getDescription: function () {
            return description;
        },
        setDescription: function (description) {
            this.description = description;
        },
        getInfo: function () {
            return info;
        },
        setInfo: function (info) {
            this.info = info;
        }
    }
}
module.exports = AMQPError;