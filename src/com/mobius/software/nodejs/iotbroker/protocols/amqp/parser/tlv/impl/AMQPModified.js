
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
var AMQPSymbol = require('../../wrappers/AMQPSymbol');

function AMQPModified(deliveryFailed, undeliverableHere, messageAnnotations) {
    this.deliveryFailed = deliveryFailed;
    this.undeliverableHere = undeliverableHere;
    this.messageAnnotations = messageAnnotations;
    return {
        toArgumentsList: function () {
            var list = new TLVList();

            if (deliveryFailed != null)
                list.addElement(0, AMQPWrapper.wrap(deliveryFailed));
            if (undeliverableHere != null)
                list.addElement(1, AMQPWrapper.wrap(undeliverableHere));
            if (messageAnnotations.length)
                list.addElement(2, AMQPWrapper.wrapMap(messageAnnotations));

            var constructor = new DescribedConstructor(list.getCode(), new TLVFixed(AMQPType.SMALL_ULONG, Buffer.from(0x27)));
            list.setConstructor(constructor);

            return list;
        },
        fromArgumentsList: function (list) {
            if (list.getList().length > 0) {
                var element = list.getList()[0];
                if (element != null)
                    deliveryFailed = AMQPUnwrapper.unwrapBool(element);
            }
            if (list.getList().length > 1) {
                var element = list.getList()[1];
                if (element != null)
                    undeliverableHere = AMQPUnwrapper.unwrapBool(element);
            }
            if (list.getList().length > 2) {
                var element = list.getList()[2];
                if (element != null)
                    messageAnnotations = AMQPUnwrapper.unwrapMap(element);
            }
        },
        hashCode: function () {
            var prime = 31;
            var result = 1;
            result = prime * result + ((deliveryFailed == null) ? 0 : deliveryFailed.hashCode());
            result = prime * result + ((messageAnnotations == null) ? 0 : messageAnnotations.hashCode());
            result = prime * result + ((undeliverableHere == null) ? 0 : undeliverableHere.hashCode());
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
            if (deliveryFailed == null) {
                if (other.deliveryFailed != null)
                    return false;
            } else if (deliveryFailed != other.deliveryFailed)
                return false;
            if (messageAnnotations == null) {
                if (other.messageAnnotations != null)
                    return false;
            } else if (messageAnnotations != other.messageAnnotations)
                return false;
            if (undeliverableHere == null) {
                if (other.undeliverableHere != null)
                    return false;
            } else if (undeliverableHere != other.undeliverableHere)
                return false;
            return true;
        },
        getDeliveryFailed: function () {
            return deliveryFailed;
        },
        setDeliveryFailed: function (deliveryFailed) {
            this.deliveryFailed = deliveryFailed;
        },
        getUndeliverableHere: function () {
            return undeliverableHere;
        },
        setUndeliverableHere: function (undeliverableHere) {
            this.undeliverableHere = undeliverableHere;
        },
        getMessageAnnotations: function () {
            return messageAnnotations;
        },
        setMessageAnnotations: function (messageAnnotations) {
            this.messageAnnotations = messageAnnotations;
        }

    }
}
module.exports = AMQPModified;