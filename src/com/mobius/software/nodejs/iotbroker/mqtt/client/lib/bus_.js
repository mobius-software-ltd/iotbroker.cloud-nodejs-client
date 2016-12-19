// var mem = require('amnesia');
const cluster = require('cluster');
var mem = require('memored');
var util = require('util');
var events = require('events').EventEmitter;
var Events = new events();
// Events.EventEmitter.call(mem);
// util.inherits(mem, Events.EventEmitter);
// console.log(mem);
var topics = {};

mem.get = function(topic) {
    mem.read('topic', function(err, value) {
        Events.emit('cast', value);
    })
}

mem.set = function(topic, msg) {
    console.log('topic: ', topic, 'msg: ', msg);
    mem.read(topic, function(err, value) {
        // if (!!err) return
        if (typeof value == 'undefined') {
            mem.store(topic, msg, function() {
                mem.read(topic, function(err, value) {
                    topics[topic] = value;
                    console.log('Read value:', value, 'from worker:', cluster.worker.id);
                    Events.emit('change', value);
                });

            });
        }

        if (typeof value != 'undefined') {
            // value[topic].push
            for (var attrname in msg) {
                // console.log('MsgAttr', Array.isArray(value[attrname]));
                if (Array.isArray(value[attrname]) && Array.isArray(msg[attrname])) {
                    value[attrname] = value[attrname].concat(msg[attrname]);
                } else {
                    value[attrname] = msg[attrname];

                }
                // var newMsg = Object.assign({}, msg, value);
            }
            // console.log('MsgAttr', Array.isArray(value[topic]), value[topic]);
            // console.log('MsgAttr', Array.isArray(msg[topic]), msg[topic]);
            var newMsg = value; //msg[topic].concat(value[topic]);

            // console.log('newMsg', newMsg);
            mem.store(topic, newMsg, function() {
                mem.read(topic, function(err, value) {
                    console.log('Read value:', value, 'from worker:', cluster.worker.id);
                    Events.emit('change', value);
                });

            });

        }

    })

    // console.log(topic, msg);

    // mem.store(topic, msg, function() {
    //     mem.read(topic, function(err, value) {
    //         console.log('Read value:', value);
    //     });

    //     Events.emit('change');
    // });
}

// mem.set = function(topic, msg) {
//     console.log(topic, msg);

//     mem.store(topic, msg, function() {
//         mem.read(topic, function(err, value) {
//             console.log('Read value:', value);
//         });

//         Events.emit('change');
//     });
// }

function Bus() {
    // setTimeout(function() {

    function subscribe(topic, callback) {
        // if (mem.initialized) {
        //     mem.on('change', function(oldValue, newValue, remoteUpdate) {
        //         var newData = JSON.parse(newValue);
        //         if (typeof oldValue != 'undefined') {
        //             var oldData = JSON.parse(oldValue);
        //             var oldMsg = oldData[prop];
        //         }
        //         // console.log('oldValue: ', oldValue);

        //         var prop = topic.toString();
        //         var msg = newData[prop];
        //         if (!!msg && !oldMsg)
        //             if (typeof msg.id == 'undefined') {
        //                 // console.log(msg);
        //                 callback.call(this, msg);
        //             }
        //     });
        // }
    }

    function listen(topic, callback) { ////////////////////
        var busListeners = {};
        // busListeners.name = topic;
        busListeners[topic] = [];
        busListeners[topic].push(cluster.worker.id);
        // if (mem.conf.id == 0) {
        //     if (typeof mem.data == 'undefined')
        //         mem.data = {};
        //     var data = {};
        //     if (typeof data.busListeners == 'undefined') {
        //         data.busListeners = {};
        //         data.busListeners[topic] = [];
        //     } else if (typeof data.busListeners[topic] == 'undefined') {
        //         data.busListeners[topic] = [];
        //     }
        //     data.busListeners[topic].push(mem.conf.id);
        //     console.log('DATA: ', data.busListeners);
        //     mem.data = data; //JSON.parse(JSON.stringify(data));
        mem.set(topic, busListeners);
        // if (typeof msg != 'undefined' && newData.busListeners[prop].length > 0) {
        //     if (typeof msg != 'undefined' && typeof newData.busListeners[prop] != 'undefined' && newData.busListeners[prop].length > 0) {
        //         if (typeof msg.id != 'undefined') {
        //             if (newData.busListeners[prop].includes(msg.id.toString()) && mem.conf.id.toString() == msg.id.toString()) {
        //                 // console.log('newData[prop]: ', prop, newData[prop]);
        //                 // console.log('mem.conf.id.toString(): ', mem.conf.id.toString());
        //                 // console.log('msg.id.toString(): ', msg.id.toString());
        //                 delete msg.id;
        //                 delete mem.data.busListeners[prop];
        //                 // console.log('CALLBACK: ', callback);
        //                 callback.call(this, msg);
        //             }
        //         }
        //     }
        // };

        // } else {
        //     if (typeof mem.data != 'undefined') {
        //         // console.log('!=1 MEM DATA:', mem.data);
        //         var data = mem.data;
        //         console.log('DATA: ', data.busListeners);
        //         if (typeof mem.data.busListeners == 'undefined') {
        //             data.busListeners = {};
        //             data.busListeners[topic] = [];

        //         } else if (typeof data.busListeners[topic] == 'undefined') {
        //             data.busListeners[topic] = [];
        //         }
        //         // console.log('indexof:', data.busListeners[topic].indexOf(mem.conf.id));
        //         if (data.busListeners[topic].indexOf(mem.conf.id) == -1)
        //             data.busListeners[topic].push(mem.conf.id);
        //         mem.data = data; //JSON.parse(JSON.stringify(data));

        //         clearInterval(initTimer);

        //         mem.on('change', function(oldValue, newValue, remoteUpdate) {
        //             var newData = JSON.parse(newValue);
        //             console.log(newData);
        //             var prop = topic.toString();
        //             var msg = newData[prop];
        //             if (typeof msg != 'undefined' && typeof newData.busListeners[prop] != 'undefined' && newData.busListeners[prop].length > 0) {
        //                 if (typeof msg.id != 'undefined') {
        //                     if (newData.busListeners[prop].includes(msg.id.toString()) && mem.conf.id.toString() == msg.id.toString()) {
        //                         console.log('newData[prop]: ', prop, newData[prop]);
        //                         console.log('mem.conf.id.toString(): ', mem.conf.id.toString());
        //                         console.log('msg.id.toString(): ', msg.id.toString());
        //                         delete msg.id;
        //                         delete mem.data.busListeners[prop];
        //                         // console.log('CALLBACK: ', callback);
        //                         callback.call(this, msg);
        //                     }
        //                 }
        //             }
        //         });
        //     }
        // }

        Events.on('change', function(value) {
            console.log('MSG:', value, 'from worker:', cluster.worker.id);
            // var newData = JSON.parse(newValue);
            // var prop = topic.toString();
            // var msg = newData[prop];
            // if (typeof msg != 'undefined' && newData.busListeners[prop].length > 0) {
            //     if (typeof msg.id != 'undefined') {
            //         if (newData.busListeners[prop].includes(msg.id.toString()) && mem.conf.id.toString() == msg.id.toString()) {
            //             console.log('newData[prop]: ', newData[prop]);
            //             console.log('mem.conf.id.toString(): ', mem.conf.id.toString());
            //             console.log('msg.id.toString(): ', msg.id.toString());
            //             delete msg.id;
            //             // console.log('CALLBACK: ', callback);
            //             callback.call(this, msg);
            //         }
            //     }
            // }
        });
    }


    function publish(topic, msg) {
        // var data = mem.data || {};
        // // console.log(data);
        // var prop = topic.toString();
        // data[prop] = msg;
        // mem.data = JSON.parse(JSON.stringify(data));
        // console.log('MEM: ', mem.data);
    }

    function send(topic, msg) {

        // var data = mem.data || {};
        // msg.id = mem.conf.id;
        // if (typeof mem.data.busListeners[topic] != 'undefined') {
        //     for (var i = 0; i <= mem.conf.length; i++) {
        //         if (mem.data.busListeners[topic].includes(msg.id.toString())) {
        //             // console.log('Bus SEND: ', msg);
        //             // console.log('SEND topic:', topic, '_msg: ', msg);
        //             var prop = topic.toString();
        //             data[prop] = msg;
        //             mem.data = JSON.parse(JSON.stringify(data));
        //             console.log('MEM.DATA:', JSON.stringify(mem.data));
        //             break;
        //         } else {
        //             msg.id = i;
        //         }
        //     }
        // }
        mem.set(topic, msg);
    }

    function getId() {
        return mem.conf.id;
    }


    this.subscribe = subscribe;
    this.publish = publish;
    this.send = send;
    this.listen = listen;
    this.getId = getId;
    // }, 1000);
    // return this;
}

// setInterval(function() {
//     // console.log('MEM DATA:', mem.data);

// }, 5000);

module.exports = new Bus();