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

var Events = require('events');
var util = require('util');
var net = require('net');
var AMQPProtoHeader = require('./parser/header/impl/AMQPProtoHeader')
var SASLInit = require('./parser/header/impl/SASLInit');
var AMQPOpen = require('./parser/header/impl/AMQPOpen');
var AMQPBegin = require('./parser/header/impl/AMQPBegin');
var AMQPPing = require('./parser/header/impl/AMQPPing');
var AMQPEnd = require('./parser/header/impl/AMQPEnd');
var AMQPClose = require('./parser/header/impl/AMQPClose');
var AMQPAttach = require('./parser/header/impl/AMQPAttach');
var AMQPTarget = require('./parser/terminus/AMQPTarget.js');
var AMQPDetach = require('./parser/header/impl/AMQPDetach');
var AMQPTransfer = require('./parser/header/impl/AMQPTransfer');
var AMQPMessageFormat = require('./parser/wrappers/AMQPMessageFormat')
var MessageHeader = require('./parser/sections/MessageHeader')
var AMQPData = require('./parser/sections/AMQPData');
var AMQPSource = require('./parser/terminus/AMQPSource');
var AMQPDisposition = require('./parser/header/impl/AMQPDisposition')
var AMQPAccepted = require('./parser/tlv/impl/AMQPAccepted')

var Datastore = require('nedb');
var db = new Datastore({ filename: 'data' });
var pendingMessages = [];
var parser = require('./parser/AMQPParser')
var isSaslConfirm = null;
var channel = null;
var idleTimeout = null;
var account = {};
var ENUM = require('./lib/enum');
var usedOutgoingMappings = {};
var usedOutgoingHandles = {};
var usedIncomingMappings = {};
var usedIncomingHandles = {};

function AmqpClient() {
	Events.EventEmitter.call(this);
}
util.inherits(AmqpClient, Events.EventEmitter);

AmqpClient.prototype.Connect = connect;
AmqpClient.prototype.onDataRecieved = onDataRecieved;
AmqpClient.prototype.Ping = ping;
AmqpClient.prototype.Disconnect = disconnect;
AmqpClient.prototype.Subscribe = subscribe;
AmqpClient.prototype.Unsubscribe = unsubscribe;
AmqpClient.prototype.Publish = publish;

module.exports = AmqpClient;

var Store = function Store() {
	var storage = [];

	function pushMessage(id, message) {
		storage[id] = message;
	}

	function pullMessage(id) {
		var tmp = storage[id];
		delete storage[id];
		return tmp;
	}
	return {
		pullMessage: pullMessage,
		pushMessage: pushMessage
	}
};
var messages = Store();
var subscribtions = Store();
var unsubscribtions = Store();

function connect(params) {
	try {
		var header = new AMQPProtoHeader();
		header.setProtocolId(3);
		header.setVersionMajor(1);
		header.setVersionMinor(0);
		header.setVersionRevision(0);
	} catch (e) {
		console.log('Can`t create packet.');
	}
	try {
		var encHeader = parser.encode(header)
	} catch (e) {
		console.log('Parser can`t encode provided params.', e);
	}

	this.emit('amqpConnect', encHeader);
}

function disconnect() {
	try {
		var end = new AMQPEnd();
		end.setChannel(channel)
		var result = parser.encode(end)
	} catch (e) {
		console.log(e)
	}
	this.emit('amqp.end', result);
}

function subscribe(topics) {
	try {
		for (var i = 0; i < topics.length; i++) {
			var currentHandler = topics[i].token;
			var attach = new AMQPAttach();
			attach.setChannel(channel);
			attach.setName(topics[i].topic);
			attach.setHandle(currentHandler);
			attach.setRole(ENUM.RoleCode.RECEIVER);
			attach.setSndSettleMode(ENUM.SendCode.MIXED);
			var target = new AMQPTarget();
			target.setAddress(topics[i].topic);
			target.setDurable(ENUM.TerminusDurability.NONE);
			target.setTimeout(0);
			target.setDynamic(false);
			attach.setTarget(target);
			//client.send(attach);
			var result = parser.encode(attach)
			subscribtions.pushMessage(currentHandler, topics[i])
			this.emit('amqp.subscribe', result);
		}
	} catch (e) {
		console.log(e)
	}
}

function unsubscribe(data) {
	try {
		for (var i = 0; i < data.params.length; i++) {
			var incomingHandle = data.params[i].token;
			var detach = new AMQPDetach();
			detach.setChannel(channel);
			detach.setClosed(true);
			detach.setHandle(incomingHandle);
			var result = parser.encode(detach)
			unsubscribtions.pushMessage(incomingHandle, data.params[i]);
			this.emit('amqp.unsubscribe', result)
		}
	} catch (e) {
		console.log(e)
	}

}

function publish(params) {	
	messages.pushMessage(params.deliveryId, params);
	var currentHandler = params.token
	var deliveryId = params.deliveryId
	var transfer = new AMQPTransfer();
	transfer.setChannel(channel);
	transfer.setDeliveryId(params.deliveryId);
	if (params.qos == ENUM.QoS.AT_MOST_ONCE)
		transfer.setSettled(true);
	else
		transfer.setSettled(false);

	try {
		transfer.setMore(false);
		transfer.setMessageFormat(new AMQPMessageFormat(0));
		var messageHeader = new MessageHeader();
		messageHeader.setDurable(true);
		messageHeader.setPriority(3);
		messageHeader.setMilliseconds(1000);
		var data = new AMQPData();
		data.setValue(Buffer.from(params.content));

		var sections = {};
		sections[ENUM.SectionCode.DATA] = data;
		transfer.setSections(sections);
	} catch (e) { console.log(e) }

	if (usedOutgoingMappings[params.topic]) {
		var handle = usedOutgoingMappings[params.topic]
		transfer.setHandle(handle);

		try {
			var encTransfer = parser.encode(transfer)
		} catch (e) {
			console.log(e)
		}
		this.emit('amqp.publish', encTransfer, deliveryId);
	} else {
		try {
			// var currentHandler = tokens[client.unique].getToken();
			usedOutgoingMappings[params.topic] = currentHandler;
			usedOutgoingHandles[currentHandler] = params.topic;
			transfer.setHandle(currentHandler);
			pendingMessages.push(transfer);
			var attach = new AMQPAttach();
			attach.setChannel(channel);
			attach.setName(params.topic);
			attach.setHandle(currentHandler);
			attach.setRole(ENUM.RoleCode.SENDER);
			//attach.setSndSettleMode(ENUM.SendCode.MIXED);
			attach.setRcvSettleMode(ENUM.ReceiveCode.FIRST);
			attach.setInitialDeliveryCount(0);
			var source = new AMQPSource();
			source.setAddress(params.topic);
			source.setDurable(ENUM.TerminusDurability.NONE);
			source.setTimeout(0);
			source.setDynamic(false);
			attach.setSource(source);
		} catch (e) { console.log(e) }
		try {
			var encAttach = parser.encode(attach, currentHandler)
		} catch (e) {
			console.log(e)
		}

		this.emit('amqp.publish', encAttach, deliveryId);
	}
}

















function onDataRecieved(data, client) {

	var decoded = {};
	console.log('Data received', data);

	try {
		decoded = parser.decode(data);
	} catch (error) {
		console.log('Parser unadble to decode received data.');
	}
	

	switch (decoded.getCode()) {

		case ENUM.HeaderCode.ATTACH:
			var attach = decoded;
			processAttach(attach, this);
			break;

		case ENUM.HeaderCode.DETACH:
			var handle = decoded.getHandle();
			this.emit('amqp.unsuback', handle);
			break;

		case ENUM.HeaderCode.DISPOSITION:
			var disposition = decoded;
			processDisposition(this, disposition.getFirst(), disposition.getLast());
			break;

		case ENUM.HeaderCode.FLOW:
			processFlow();
			break;

		case ENUM.HeaderCode.PROTO:
			var header = decoded;
			var packet = processProto(header.getChannel(), header.getProtocolId(), client);
			if (packet) {
				this.emit('amqp.open', packet);
			}
			break

		case ENUM.HeaderCode.MECHANISMS:
			var mechanisms = decoded;
			var saslInit = processSASLMechanism(mechanisms.getMechanisms(), mechanisms.getChannel(), mechanisms.getType(), client);
			this.emit('amqp.saslinit', saslInit);
			break

		case ENUM.HeaderCode.OUTCOME:
			var outcome = decoded;
			var protoHeader = processSASLOutcome(outcome.getOutcomeCode());
			this.emit('amqp.protoheader', protoHeader);
			break;

		case ENUM.HeaderCode.OPEN:
			var begin = processOpen(client.keeapalive);
			this.emit('amqp.begin', begin)
			break;

		case ENUM.HeaderCode.BEGIN:
			this.emit('amqp.beginIN', client)
			processBegin(client);
			break;

		case ENUM.HeaderCode.END:
			var close = processEnd(decoded.getChannel());
			this.emit('amqp.close', close);
			break;

		case ENUM.HeaderCode.CLOSE:
			this.emit('amqp.closeIN', client);
			break;

		case ENUM.HeaderCode.TRANSFER:
			var transfer = decoded;
			var desposition = processTransfer(transfer.getData(), transfer.getHandle(), transfer.getSettled(), transfer.getDeliveryId());			
			var topic = ''
			if(usedOutgoingHandles[transfer.getHandle()])
			 topic = usedOutgoingHandles[transfer.getHandle()]

			var qos = transfer.getSettled() ? ENUM.QoS.AT_MOST_ONCE : ENUM.QoS.AT_LEAST_ONCE;

			this.emit('amqp.dispositionOUT', desposition, transfer, qos, topic);
			break;
	}
}

function processSASLMechanism(mechanisms, channel, headerType, client) {
	var plainMechanism = null;
	mechanisms.forEach(function (mechanism) {
		if (mechanism.getValue().toString().toLowerCase() == 'plain') {
			plainMechanism = mechanism;

		}
	})

	if (plainMechanism == null) {
		// timers.stopAllTimers();
		// client.shutdown();
		// setState(ConnectionState.CONNECTION_FAILED);
		// return
	}
	var saslInit = new SASLInit();

	saslInit.setType(headerType);
	saslInit.setChannel(channel);
	saslInit.setMechanism(plainMechanism.getValue(), ENUM.AMQPType.SYMBOL_8);
	var userBytes = Buffer.from(client.username);
	var passwordBytes = Buffer.from(client.password);
	var challange = Buffer.alloc(userBytes.length + 1 + userBytes.length + 1 + passwordBytes.length);
	var index = 0;
	try {
		index += challange.write(client.username, index)
		challange[userBytes.length] = 0x00;
		index += 1;
		index += challange.write(client.username, index)
		challange[userBytes.length + 1 + userBytes.length] = 0x00;
		index += 1;
		index += challange.write(client.password, index)
		saslInit.setInitialResponse(challange);
		var result = parser.encode(saslInit)
	} catch (e) {
		console.log(e)
	}
	return result;
}


function processSASLOutcome(outcomeCode) {
	try {
		if (outcomeCode != null)
			if (outcomeCode == ENUM.OutcomeCode.OK) {
				isSaslConfirm = true;
				var header = new AMQPProtoHeader();
				header.setProtocolId(0);
				header.setVersionMajor(1);
				header.setVersionMinor(0);
				header.setVersionRevision(0);
				var result = parser.encode(header)
			}
	} catch (e) {
		console.log(e)
	}
	return result;
}

function processProto(channel, protocolId, client) {
	var result = null;
	try {

		if (isSaslConfirm && protocolId == 0) {
			channel = channel;

			var open = new AMQPOpen()
			open.setIdleTimeout(client.keepalive * 1000);
			open.setContainerId(client.clientID);
			open.setChannel(channel);
			result = parser.encode(open)
		}
	} catch (e) {
		console.log(e)
	}
	return result;
}
function processFlow() {
	// not implemented for now
}
function processOpen(timeout) {
	if (timeout)
		idleTimeout = timeout
	try {
		var begin = new AMQPBegin();
		begin.setChannel(channel);
		begin.setNextOutgoingId(0);
		begin.setIncomingWindow(2147483647);
		begin.setOutgoingWindow(0);
		var result = parser.encode(begin)
	} catch (e) {
		console.log(e)
	}
	return result;
}

function processBegin(client) {
	try {
		// var topics = []

		// db.loadDatabase();
		// db.find({
		//     type: 'amqp.subscribtion',
		//     'subscribtion.connectionId': client.username,
		//     'subscribtion.clientID': client.clientID,
		// }, function (err, docs) {
		//     if (docs) {
		//         for (var i = 0; i < docs.length; i++) {
		//             topics.push(docs[i].subscribtion)
		//         }
		//         // console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^4444444444444^^^^^^^^^^^^^^^^^^^^^^^^^^^')
		//         // console.log(topics)
		//         // subscribe(topics)
		//     }
		//     console.log('^^^^^^^^^^^11111111111111111111111111111111111111111111111111111111^^^^^^^')
		//     console.log(topics)
		//     if (topics.length)
		//         subscribe(topics)
		// });



		// List < DBTopic > dbTopics = dbInterface.getTopics(account);
		// for (DBTopic dbTopic : dbTopics)
		// {
		//     subscribe(new Topic[]
		//         { new Topic(new Text(dbTopic.getName()), QoS.valueOf((int) dbTopic.getQos())) });
		// }
	} catch (e) {
		console.log(e)
	}

};

function processEnd() {
	try {
		var close = new AMQPClose();
		close.setChannel(channel);
		var result = parser.encode(close)
	} catch (e) {
		console.log(e)
	}
	return result;
}

function ping() {
	try {
		var ping = parser.encode(new AMQPPing())
	} catch (e) {
		console.log(e)
	}
	this.emit('amqp.pingreq', ping);
}

function processAttach(attach, obj) {

	var self = obj;
	var name = attach.getName();
	var role = attach.getRole();
	var handle = attach.getHandle();
	var realHandle = null;
	if (role != null) {
		//if (role == ENUM.RoleCode.RECEIVER) {
		realHandle = usedOutgoingMappings[name]

		if (realHandle && pendingMessages.length) {
			for (var i = 0; i < pendingMessages.length; i++) {
				var currMessage = pendingMessages[i];
				if (currMessage.handle == realHandle) {
					pendingMessages.splice(i, 1);
					i--;
					try {
						var encTransfer = parser.encode(currMessage)
					} catch (e) { console.log(e) }

					self.emit('amqp.publish', encTransfer, realHandle);
				}
			}
		} else {
			try {

				self.emit('amqp.suback', attach, subscribtions.pullMessage(handle));
			}
			catch (e) {
				console.log("An error occured while saving topic, " + e);
			}
		}
		// } else {

		// 	usedIncomingMappings[name] = handle;
		// 	usedIncomingHandles[handle] = name;			
		// 	var topic = {
		// 		topic: name,
		// 		token: handle
		// 	}
		// 	self.emit('amqp.suback', attach, topic);
		// 	//self.emit('amqp.publishIN', handle, name);
		// }
	}
}

function processDisposition(self, first, last) {

	if (first) {
		if (last) {
			for (var i = first; i < last; i++) {
				///timers.remove(i.intValue());	
				self.emit('amqp.dispositionIN', messages.pullMessage(i), first);
			}
		}
		else {
			self.emit('amqp.dispositionIN', messages.pullMessage(first), first);

		}
	}
}

function processTransfer(data, handle, settled, deliveryId) {

	var qos = ENUM.QoS.AT_LEAST_ONCE;
	if (settled != null && settled)
		qos = ENUM.QoS.AT_MOST_ONCE;
	else {
		try {
			var disposition = new AMQPDisposition();
			disposition.setChannel(channel);
			disposition.setRole(ENUM.RoleCode.RECEIVER);
			disposition.setFirst(deliveryId);
			disposition.setLast(deliveryId);
			disposition.setSettled(true);
			disposition.setState(new AMQPAccepted());

			var encDisposition = parser.encode(disposition)

		} catch (e) {
			console.log(e)
		}

		return encDisposition;

	}

	// var topicName = null;
	// if (handle == null || !usedOutgoingHandles.containsKey(handle))
	// 	return;

	// topicName = usedOutgoingHandles[handle];

	// var message = new Message(account, topicName, new String(data.getData()), true, qos.getValue(), false, false);
	// try
	// {
	// 	logger.info("storing publish to DB");
	// 	dbInterface.saveMessage(message);
	// }
	// catch (SQLException e)
	// {
	// 	e.printStackTrace();
	// }

	// if (listener != null)
	// 	listener.messageReceived(message);
}