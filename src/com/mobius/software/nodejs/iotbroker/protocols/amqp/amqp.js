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
var TOKENS = require('./lib/Tokens');
var Datastore = require('nedb');
var db = new Datastore({ filename: 'data' });
var dbUser = new Datastore({ filename: 'userData' });
var ENUM = require('./lib/enum');
var parser = require('./parser/AMQPParser')

var vm = this;
vm.isSaslConfirm = null;
vm.pendingMessages = [];
vm.channel = null;
vm.idleTimeout = null;
vm.usedOutgoingMappings = {};
vm.usedOutgoingHandles = {};
vm.tokens = {};

var bus = require('servicebus').bus({
    queuesFile: `.queues.amqp.${process.pid}`
});
var guid = require('./lib/guid');

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
vm.messages = Store();
vm.subscribtions = Store();
vm.unsubscribtions = Store();

function connect(params, connectTimeout) {	
	vm.unique = params.unique;
	vm.username = params.username;
	vm.connectTimeout = connectTimeout
	vm.tokens[vm.unique] = new TOKENS() // token; 
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

	sendData(encHeader, 0, 'amqpConnect');
}

function disconnect() {
	try {
		var end = new AMQPEnd();
		end.setChannel(vm.channel)
		var result = parser.encode(end)
	} catch (e) {
		console.log(e)
	}
	if(result)
	sendData(result, 1, 'amqp.end'); 
}

function subscribe(topics) {
        try {
		for (var i = 0; i < topics.length; i++) {
			topics[i].token = vm.tokens[vm.unique].getToken();
			var currentHandler = topics[i].token;
			var attach = new AMQPAttach();
			attach.setChannel(vm.channel);
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
			var result = parser.encode(attach)		
			vm.subscribtions.pushMessage(currentHandler, topics[i])
			sendData(result, 0, 'amqp.subscribe');
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
			detach.setChannel(vm.channel);
			detach.setClosed(true);
			detach.setHandle(incomingHandle);
			var result = parser.encode(detach)
			vm.unsubscribtions.pushMessage(incomingHandle, data.params[i]);
			sendData(result, 0, 'amqp.unsubscribe'); 
		}
	} catch (e) {
		console.log(e)
	}

}

function publish(params) {	
	params.token = vm.tokens[vm.unique].getToken();
	vm.messages.pushMessage(params.deliveryId, params);
	var deliveryId = params.deliveryId
	var transfer = new AMQPTransfer();
	transfer.setChannel(vm.channel);
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

	if (vm.usedOutgoingMappings[params.topic]) {
		var handle = vm.usedOutgoingMappings[params.topic]
		transfer.setHandle(handle);
		if(transfer.getSettled()) {
			connectionDone(transfer.getDeliveryId())
		}
		try {
			var encTransfer = parser.encode(transfer)
		} catch (e) {
			console.log(e)
		}
		if(encTransfer) {
			sendData(encTransfer, deliveryId, 'amqp.publish');
		}
		
	} else {
		try {
			var currentHandler = vm.tokens[vm.unique].getToken();
			vm.usedOutgoingMappings[params.topic] = currentHandler;
			vm.usedOutgoingHandles[currentHandler] = params.topic;
			transfer.setHandle(currentHandler);
			vm.pendingMessages.push(transfer);
			var attach = new AMQPAttach();
			attach.setChannel(vm.channel);
			attach.setName(params.topic);
			attach.setHandle(currentHandler);
			attach.setRole(ENUM.RoleCode.SENDER);
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
		sendData(encAttach, deliveryId, 'amqp.publishAttach');
	}
}


function onDataRecieved(data, client) {

	var decoded = {};	
	try {
		var part = '';
		var received = '';
		while (received.length<data.length) {
			var index = 0
			part = parser.next(data);
			index += part.length;
			received += part;
			data = data.slice(index)
		
			decoded = parser.decode(part);
		}
	} catch(e) {
		console.log('Parser unadble to decode received data.');
	}
	// try {
	// 	decoded = parser.decode(data);
	// } catch (error) {
	// 	console.log('Parser unadble to decode received data.');
	// }
	

	switch (decoded.getCode()) {

		case ENUM.HeaderCode.ATTACH:
			var attach = decoded;
			processAttach(attach, this);
			break;

		case ENUM.HeaderCode.DETACH:
			var handle = decoded.getHandle();
			processUnsuback(handle, this)
			break;

		case ENUM.HeaderCode.DISPOSITION:
			var disposition = decoded;			
			processDisposition(this, disposition.getFirst(), disposition.getLast(), client);
			break;

		case ENUM.HeaderCode.FLOW:
			processFlow();
			break;

		case ENUM.HeaderCode.PROTO:
			var header = decoded;
			var packet = processProto(header.getChannel(), header.getProtocolId(), client);
			if (packet) {
				sendData(packet, 1, 'amqp.open');  
			}
			break

		case ENUM.HeaderCode.MECHANISMS:
			var mechanisms = decoded;
			var saslInit = processSASLMechanism(mechanisms.getMechanisms(), mechanisms.getChannel(), mechanisms.getType(), client);
			if(saslInit)
			 sendData(saslInit, 1, 'amqp.saslinit');
			break

		case ENUM.HeaderCode.OUTCOME:
			var outcome = decoded;
			var protoHeader = processSASLOutcome(outcome.getOutcomeCode());
			if(protoHeader)
			sendData(protoHeader, 1, 'amqp.protoheader');

			break;

		case ENUM.HeaderCode.OPEN:
			processOpen(client.keeapalive, this);
			break;

		case ENUM.HeaderCode.BEGIN:
			processBegin(client, this);
			break;

		case ENUM.HeaderCode.END:
			var close = processEnd(decoded.getChannel());		
			break;

		case ENUM.HeaderCode.CLOSE:
			connectionDone(null, 'amqp.disconnect', null); 
			break;

		case ENUM.HeaderCode.TRANSFER:
			var transfer = decoded;
			var desposition = processTransfer(transfer.getData(), transfer.getHandle(), transfer.getSettled(), transfer.getDeliveryId());			
			var topic = ''
			if(vm.usedOutgoingHandles[transfer.getHandle()])
			    topic = vm.usedOutgoingHandles[transfer.getHandle()]

			var qos = transfer.getSettled() ? ENUM.QoS.AT_MOST_ONCE : ENUM.QoS.AT_LEAST_ONCE;

			processDispositionOUT(desposition, transfer, qos, topic, client)
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
				vm.isSaslConfirm = true;
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

		if (vm.isSaslConfirm && protocolId == 0) {
			vm.channel = channel;

			var open = new AMQPOpen()
			open.setIdleTimeout(client.keepalive * 1000);
			open.setContainerId(client.clientID);
			open.setChannel(vm.channel);
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
function processOpen(timeout, client) {
	if (timeout)
		vm.idleTimeout = timeout
	try {
		var begin = new AMQPBegin();
		begin.setChannel(vm.channel);
		begin.setNextOutgoingId(0);
		begin.setIncomingWindow(2147483647);
		begin.setOutgoingWindow(0);
		var result = parser.encode(begin)
	} catch (e) {
		console.log(e)
	}

	if (!result) return;
	sendData(result, 1, 'amqp.begin');
	db.loadDatabase();
	if (client.isClean) {
		db.remove({ 'type': 'amqp.subscribtion', 'subscribtion.connectionId': client.id, 'subscribtion.clientID':client.clientID }, { multi: true });
}

}

function processBegin(client, that) {
	try {
		if (!that) return;
		var id = client.username;
		clearTimeout(vm.connectTimeout)
		db.loadDatabase();
		// db.remove({ type: 'amqp.connack' }, { multi: true }, function (err, docs) {
			db.insert({
				type: 'connack',
				unique: client.unique,
				connectionId: id,
				id: guid()
			});
			dbUser.loadDatabase();
			dbUser.remove({'clientID': that.userInfo.clientID, 'type.name': that.userInfo.type.name }, { multi: true })                    
			dbUser.insert(that.userInfo);
		// });
		that.params.type = 'amqp.connection';
		db.insert(that.params);

		var topics = []
		var unique = that.unique;
		db.find({
			type: 'amqp.subscribtion',
			'subscribtion.connectionId': client.username,
			'subscribtion.clientID': client.clientID,
		}, function (err, docs) {
			if (docs) {
				for (var i = 0; i < docs.length; i++) {					
					if (docs[i]) {
						topics.push(docs[i].subscribtion)
					}
				}

			}

			if (topics.length)
				that.Subscribe(topics)
		});

		ping();
	} catch (e) {
		console.log(e)
	}

};

function processEnd() {
	try {
		var close = new AMQPClose();
		close.setChannel(vm.channel);
		var result = parser.encode(close)
	} catch (e) {
		console.log(e)
	}
	if(result)
		sendData(result, 1, 'amqp.end'); 	
}

function ping() {
	try {
		var ping = parser.encode(new AMQPPing())
	} catch (e) {
		console.log(e)
	}
	sendData(ping, -1, 'amqp.pingreq'); 
}

function processAttach(attach, obj) {
	var self = obj;
	var name = attach.getName();
	var role = attach.getRole();
	var handle = attach.getHandle();	
	var realHandle = null;
	if (role != null) {
		if (ENUM.RoleCode[role]) {
		realHandle = vm.usedOutgoingMappings[name];

		if (realHandle && vm.pendingMessages.length) {
			for (var i = 0; i < vm.pendingMessages.length; i++) {
				var currMessage = vm.pendingMessages[i];
				if (currMessage.handle == realHandle) {
					vm.pendingMessages.splice(i, 1);
					i--;
					if(currMessage.getSettled()) {
						connectionDone(currMessage.getDeliveryId())
					}
					try {
						var encTransfer = parser.encode(currMessage)
					} catch (e) { console.log(e) }					
					sendData(encTransfer, currMessage.getDeliveryId(), 'amqp.publish');
				}
			}
			}
		} else {			
			try {
				var msg=vm.subscribtions.pullMessage(handle);
				if(msg)
  				   processSuback(attach, msg, self)
				else
				   processSuback(attach, attach, self)
			}
			catch (e) {
				console.log("An error occured while saving topic, " + e);
			}
		}		
	}
}

function processDisposition(self, first, last, client) {
	if (first) {
		if (last) {
			for (var i = first; i < last; i++) {
				processDispositionIN(vm.messages.pullMessage(i), i, client)
			}
		}
		else {
			processDispositionIN(vm.messages.pullMessage(first), first, client)

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
			disposition.setChannel(vm.channel);
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
}

function sendData(payload, packetID, parentEvent) {  
    bus.send('amqp.sendData' + vm.unique, {
        payload: payload,
        username: vm.username,
        packetID: packetID,
        parentEvent: parentEvent,
        unique: vm.unique
    });    
}

function connectionDone(packetID, parentEvent, payload) {
    bus.send('amqp.done' + vm.unique, {       
        packetID: packetID,
        username: vm.username,
        parentEvent: parentEvent,
        unique: vm.unique,
        payload: payload
    });
}

function processSuback(data, msg, client) {
	if (!data) return;	
	connectionDone(0, 'amqp.suback', data);
	var subscribtions = [];
	var clientID = client.clientID;
	var username = client.id;
	db.loadDatabase();
	var subscribeData = {
		type: 'amqp.subscribtion',
		subscribtion: {
			topic: data.name,
			qos: ENUM.QoS.AT_LEAST_ONCE,
			connectionId: username,
			clientID: clientID,
			token: msg.token
		},
	}
	subscribtions.push(subscribeData);
	db.remove({ 'type': 'amqp.subscribtion', 'subscribtion.topic': data.name , 'subscribtion.connectionId': username, 'subscribtion.clientID': clientID}, { multi: true });
	
	db.insert(subscribtions);
}

function processUnsuback(token, client) {
	if (!token) return;
	connectionDone(token, 'amqp.unsuback', null);
	var clientID = client.clientID;
	var username = client.id;
	db.loadDatabase();
	db.remove({ 'type': 'amqp.subscribtion', 'subscribtion.token': token , 'subscribtion.connectionId': username, 'subscribtion.clientID': clientID }, { multi: true });
}

function processDispositionIN(data, token, message) {	
	connectionDone(token, 'amqp.dispositionIN', null);
	if (!data) return;
	db.loadDatabase();
	var outMessage = {
		type: 'amqp.message',
		message: {
			topic: data.topic,
			qos: data.qos,
			content: data.content,
			connectionId: data.username,
			direction: 'out',
			unique: data.unique,
			clientID: data.clientID
		},
		id: guid(),
		time: (new Date()).getTime()
	}
	db.insert(outMessage);
}

function processDispositionOUT(data, transfer, qos, topic, client) {
	var content = transfer.getData().getData().toString();
	if (!data) return;
	sendData(data, null, 'amqp.dispositionOUT');
	var token = transfer.getHandle();
	var topicName = topic;
	var id = client.username;
        var unique = client.unique;
	var clientID = client.clientID;
	db.loadDatabase();
	db.find({
		type: 'amqp.subscribtion', 'subscribtion.topic': topic, 'subscribtion.connectionId': id, 'subscribtion.clientID': clientID
	}, function (err, docs) {
		if (docs.length) {
			topicName = docs[0].subscribtion.topic
		}

	});
	db.find({
		type: 'amqp.subscribtion', 'subscribtion.token': token, 'subscribtion.connectionId': id, 'subscribtion.clientID': clientID
	}, function (err, docs) {
		if (docs.length) {
			topicName = docs[0].subscribtion.topic
		}
		var inMessage = {
			type: 'amqp.message',
			message: {
				topic: topicName,
				qos: qos,
				content: content,
				connectionId: id,
				direction: 'in',
				unique: unique,
				clientID: clientID
			},
			id: guid(),
			time: (new Date()).getTime()
		}
		db.insert(inMessage);
	});
}
