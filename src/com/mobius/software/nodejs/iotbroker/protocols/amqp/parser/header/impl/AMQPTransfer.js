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
var ReceiveCode = require('../../avps/ReceiveCode');
var SectionCode = require('../../avps/SectionCode');
var DescribedConstructor = require('../../constructor/DescribedConstructor');
var AMQPHeader = require('../../header/api/AMQPHeader');
var AMQPUnwrapper = require('../../header/api/AMQPUnwrapper');
var AMQPWrapper = require('../../header/api/AMQPWrapper');
var TLVAmqp = require('../../tlv/api/TLVAmqp');
var AMQPMessageFormat = require('../../wrappers/AMQPMessageFormat');
var TLVList = require('../../tlv/impl/TLVList');
var TLVFixed = require('../../tlv/impl/TLVFixed');
var ENUM = require('../../../lib/enum');

function AMQPTransfer(code, doff, type, channel, handle, deliveryId, deliveryTag, messageFormat, settled, more, rcvSettleMode, state, resume, aborted, batchable, sections) {
    var code = ENUM.HeaderCode.TRANSFER;
    var doff = 2;
    var channel = 1;
    var type = 0;
    this.handle = handle;
    this.deliveryId = deliveryId;
    this.deliveryTag = deliveryTag;
    this.messageFormat = messageFormat;
    this.settled = settled;
    this.more = more;
    this.rcvSettleMode = rcvSettleMode;
    this.state = state;
    this.resume = resume;
    this.aborted = aborted;
    this.batchable = batchable;
    this.sections = sections;
    return {
        getClassName: function () {
            return 'AMQPTransfer'
        },
        getCode: function () {
            return code;
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
            var wrapper = new AMQPWrapper();
            try {


                if (this.handle == null)
                    throw new Error("Transfer header's handle can't be null");
              
                list.addElementIndex(0, wrapper.wrapUInt(this.handle));

                if (this.deliveryId != null)
                    list.addElementIndex(1, wrapper.wrapUInt(this.deliveryId));
                if (this.deliveryTag != null)
                    list.addElementIndex(2, wrapper.wrap(this.deliveryTag));
               
                if (this.messageFormat != null)
                    list.addElementIndex(3, wrapper.wrapUInt(this.messageFormat.encode()));
               
                if (this.settled != null)
                    list.addElementIndex(4, wrapper.wrapBool(this.settled));
               
                if (this.more != null)
                    list.addElementIndex(5, wrapper.wrapBool(this.more));
                if (this.rcvSettleMode != null)
                    list.addElementIndex(6, wrapper.wrap(this.rcvSettleMode.getType()));
                if (this.state != null)
                    list.addElementIndex(7, this.state.toArgumentsList());
                if (this.resume != null)
                    list.addElementIndex(8, wrapper.wrap(this.resume));
                if (this.aborted != null)
                    list.addElementIndex(9, wrapper.wrap(this.aborted));
                if (this.batchable != null)
                    list.addElementIndex(10, wrapper.wrap(this.batchable));
               
                var constructor = new DescribedConstructor(list.getCode(), new TLVFixed(ENUM.AMQPType.SMALL_ULONG, Buffer.alloc(1, this.getCode())));
                list.setConstructor(constructor);
            } catch (e) { console.log(e) }
            return list;
        },
        fromArgumentsList: function (list) {
            var size = list.getList().length;
            var unwrapper = new AMQPUnwrapper();
            if (size == 0)
                throw new Error("Received malformed Transfer header: handle can't be null");

            if (size > 11)
                throw new Error("Received malformed Transfer header. Invalid number of arguments: " + size);

            if (size > 0) {
                var element = list.getList()[0];
                if (element == null)
                    throw new Error("Received malformed Transfer header: handle can't be null");

                this.handle = unwrapper.unwrapUInt(element);
            }
            if (size > 1) {
                var element = list.getList()[1];
                if (element != null && element.getCode() != ENUM.AMQPType.NULL)
                this.deliveryId = unwrapper.unwrapUInt(element);
            }
            if (size > 2) {
                var element = list.getList()[2];                
                if (element != null && element.getCode() != ENUM.AMQPType.NULL)
                this.deliveryTag = unwrapper.unwrapBinary(element);
            }
            if (size > 3) {
                var element = list.getList()[3];
                if (element != null && element.getCode() != ENUM.AMQPType.NULL)                
                this.messageFormat = new AMQPMessageFormat(unwrapper.unwrapUInt(element));
            }
            if (size > 4) {
                var element = list.getList()[4];
                if (element != null && element.getCode() != ENUM.AMQPType.NULL) {               
                    this.settled = unwrapper.unwrapBool(element);
                }
                
            }
            if (size > 5) {
                var element = list.getList()[5];
                if (element != null && element.getCode() != ENUM.AMQPType.NULL)
                this.more = unwrapper.unwrapBool(element);
            }
            if (size > 6) {
                var element = list.getList()[6];
                if (element != null && element.getCode() != ENUM.AMQPType.NULL) {
                    this.rcvSettleMode = ENUM.getKeyByValue(ENUM.ReceiveCode, unwrapper.unwrapUByte(element));
                }
               
            }
            if (size > 7) {
                var element = list.getList()[7];
                if (element != null && element.getCode() != ENUM.AMQPType.NULL) {
                    var code = element.getCode();
                    if (code != ENUM.AMQPType.LIST_0 && code != ENUM.AMQPType.LIST_8 && code != ENUM.AMQPType.LIST_32)
                        throw new Error("Expected type 'STATE' - received: " + element.getCode());
                        this.state = HeaderFactory.getState(element);
                        this.state.fromArgumentsList(element);
                }
            }
            if (size > 8) {
                var element = list.getList()[8];
                if (element != null && element.getCode() != ENUM.AMQPType.NULL)
                this.resume = unwrapper.unwrapBool(element);
            }
            if (size > 9) {
                var element = list.getList()[9];
                if (element != null && element.getCode() != ENUM.AMQPType.NULL)
                this.aborted = unwrapper.unwrapBool(element);
            }
            if (size > 10) {
                var element = list.getList()[10];
                if (element != null && element.getCode() != ENUM.AMQPType.NULL)
                this.batchable = unwrapper.unwrapBool(element);
            }
        },
        hashCode: function () {
            var prime = 31;
            var result = AMQPHeader.hashCode();
            result = prime * result + ((aborted == null) ? 0 : aborted.hashCode());
            result = prime * result + ((batchable == null) ? 0 : batchable.hashCode());
            result = prime * result + ((deliveryId == null) ? 0 : deliveryId.hashCode());
            result = prime * result + Arrays.hashCode(deliveryTag);
            result = prime * result + ((handle == null) ? 0 : handle.hashCode());
            result = prime * result + ((messageFormat == null) ? 0 : messageFormat.hashCode());
            result = prime * result + ((more == null) ? 0 : more.hashCode());
            result = prime * result + ((rcvSettleMode == null) ? 0 : rcvSettleMode.hashCode());
            result = prime * result + ((resume == null) ? 0 : resume.hashCode());
            result = prime * result + ((sections == null) ? 0 : sections.hashCode());
            result = prime * result + ((settled == null) ? 0 : settled.hashCode());
            result = prime * result + ((state == null) ? 0 : state.hashCode());
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
            if (aborted == null) {
                if (other.aborted != null)
                    return false;
            }
            else if (aborted != other.aborted)
                return false;
            if (batchable == null) {
                if (other.batchable != null)
                    return false;
            }
            else if (batchable != other.batchable)
                return false;
            if (deliveryId == null) {
                if (other.deliveryId != null)
                    return false;
            }
            else if (deliveryId != other.deliveryId)
                return false;
            if (deliveryTag != other.deliveryTag)
                return false;
            if (handle == null) {
                if (other.handle != null)
                    return false;
            }
            else if (handle != other.handle)
                return false;
            if (messageFormat == null) {
                if (other.messageFormat != null)
                    return false;
            }
            else if (messageFormat != other.messageFormat)
                return false;
            if (more == null) {
                if (other.more != null)
                    return false;
            }
            else if (more != other.more)
                return false;
            if (rcvSettleMode != other.rcvSettleMode)
                return false;
            if (resume == null) {
                if (other.resume != null)
                    return false;
            }
            else if (resume != other.resume)
                return false;
            if (sections == null) {
                if (other.sections != null)
                    return false;
            }
            else if (sections != other.sections)
                return false;
            if (settled == null) {
                if (other.settled != null)
                    return false;
            }
            else if (settled != other.settled)
                return false;
            if (state == null) {
                if (other.state != null)
                    return false;
            }
            else if (state != other.state)
                return false;
            return true;
        },
        getHandle: function () {
            return this.handle;
        },
        setHandle: function (handle) {
            this.handle = handle;
        },
        getDeliveryId: function () {
            return this.deliveryId;
        },
        setDeliveryId: function (deliveryId) {
            this.deliveryId = deliveryId;
        },
        getDeliveryTag: function () {
            return this.deliveryTag;
        },
        setDeliveryTag: function (deliveryTag) {
            this.deliveryTag = deliveryTag;
        },
        getMessageFormat: function () {
            return this.messageFormat;
        },
        setMessageFormat: function (messageFormat) {
            this.messageFormat = messageFormat;
        },
        getSettled: function () {
            return this.settled;
        },
        setSettled: function (settled) {
            this.settled = settled;
        },
        getMore: function () {
            return this.more;
        },
        setMore: function (more) {
            this.more = more;
        },
        getRcvSettleMode: function () {
            return this.rcvSettleMode;
        },
        setRcvSettleMode: function (rcvSettleMode) {
            this.rcvSettleMode = rcvSettleMode;
        },
        getState: function () {
            return this.state;
        },
        setState: function (state) {
            this.state = state;
        },
        getResume: function () {
            return this.resume;
        },
        setResume: function (resume) {
            this.resume = resume;
        },
        getAborted: function () {
            return this.aborted;
        },
        setAborted: function (aborted) {
            this.aborted = aborted;
        },
        getBatchable: function () {
            return this.batchable;
        },
        setBatchable: function (batchable) {
            this.batchable = batchable;
        },
        getHeader: function () {

            return this.sections != null ? this.sections.get(ENUM.SectionCode.HEADER) : null;
        },
        getDeliveryAnnotations: function () {
            return this.sections != null ? this.sections.get(ENUM.SectionCode.DELIVERY_ANNOTATIONS) : null;
        },
        getMessageAnnotations: function () {
            return this.sections != null ? this.sections.get(ENUM.SectionCode.MESSAGE_ANNOTATIONS) : null;
        },
        getProperties: function () {
            return this.sections != null ? this.sections.get(ENUM.SectionCode.PROPERTIES) : null;
        },
        getApplicationProperties: function () {
            return this.sections != null ? this.sections.get(ENUM.SectionCode.APPLICATION_PROPERTIES) : null;
        },
        getData: function () {
            return this.sections != null ? this.sections.get(ENUM.SectionCode.DATA) : null;
        },
        getSequence: function () {
            return this.sections != null ? this.sections.get(ENUM.SectionCode.SEQUENCE) : null;
        },
        getValue: function () {
            return this.sections != null ? this.sections.get(ENUM.SectionCode.VALUE) : null;
        },
        getFooter: function () {
            return this.sections != null ? this.sections.get(ENUM.SectionCode.FOOTER) : null;
        },
        getSections: function () {
            return this.sections;
        },
        setSections: function (sections) {
            this.sections = sections;
        }
    }
}
module.exports = AMQPTransfer;