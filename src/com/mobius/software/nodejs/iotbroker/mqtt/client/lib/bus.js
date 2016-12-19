var mem = require('amnesia');
mem.conf = [{
    "host": "127.0.0.1",
    "port": 57300
}, {
    "host": "127.0.0.1",
    "port": 57301
}, {
    "host": "127.0.0.1",
    "port": 57302
}, {
    "host": "127.0.0.1",
    "port": 57303
}, {
    "host": "127.0.0.1",
    "port": 57304
}, {
    "host": "127.0.0.1",
    "port": 57305
}, {
    "host": "127.0.0.1",
    "port": 57306
}, {
    "host": "127.0.0.1",
    "port": 57307
}, {
    "host": "127.0.0.1",
    "port": 57308
}, {
    "host": "127.0.0.1",
    "port": 57309
}, {
    "host": "127.0.0.1",
    "port": 57310
}, {
    "host": "127.0.0.1",
    "port": 57311
}, {
    "host": "127.0.0.1",
    "port": 57312
}, {
    "host": "127.0.0.1",
    "port": 57313
}, ]; //PORT FROM 57301

mem.on('log', function(data) {
    // console.log(data);
})

function Bus() {
    // setTimeout(function() {

    function subscribe(topic, callback) {
        var timer = setInterval(function() {
            if (mem.initialized) {
                mem.on('change', function(oldValue, newValue, remoteUpdate) {
                    var newData = JSON.parse(newValue);
                    if (typeof oldValue != 'undefined') {
                        var oldData = JSON.parse(oldValue);
                        var oldMsg = oldData[prop];
                    }
                    // console.log('oldValue: ', oldValue);

                    var prop = topic.toString();
                    var msg = newData[prop];
                    if (!!msg && !oldMsg)
                        if (typeof msg.id == 'undefined') {
                            // console.log(msg);
                            callback.call(this, msg);
                        }
                });
                clearInterval(timer);
            }
        }, 20);
    }

    function listen(topic, callback) { ////////////////////
        // setTimeout(function() {
        var timer = setInterval(function() {
            if (mem.initialized) {

                // console.log('MEM DATA:', mem);
                // console.log('mem.id: ', mem.conf.id);
                if (mem.conf.id == 0) {
                    if (typeof mem.data == 'undefined')
                        mem.data = {};
                    var data = mem.data;
                    if (typeof data.busListeners == 'undefined') {
                        data['busListeners'] = new Object();
                        data.busListeners[topic] = [];
                    } else if (typeof data.busListeners[topic] == 'undefined') {
                        data.busListeners[topic] = [];
                    }
                    data.busListeners[topic].push(mem.conf.id);
                    console.log('DATA: ', data.busListeners);
                    mem.data = data; //JSON.parse(JSON.stringify(data));

                    mem.on('change', function(oldValue, newValue, remoteUpdate) {
                        var newData = JSON.parse(newValue);
                        console.log(newData);
                        var prop = topic.toString();
                        var msg = newData[prop];

                        if (typeof msg != 'undefined' && typeof newData.busListeners[prop] != 'undefined' && newData.busListeners[prop].length > 0) {
                            if (typeof msg.id != 'undefined') {
                                if (newData.busListeners[prop].includes(msg.id.toString()) && mem.conf.id.toString() == msg.id.toString()) {
                                    console.log('newData[prop]: ', prop, newData[prop]);
                                    console.log('mem.conf.id.toString(): ', mem.conf.id.toString());
                                    // console.log('msg.id.toString(): ', msg.id.toString());
                                    delete msg.id;
                                    delete mem.data.busListeners[prop];
                                    // console.log('CALLBACK: ', callback);
                                    callback.call(this, msg);
                                }
                            }
                        }
                    });

                } else {
                    var initTimer = setInterval(function() {
                        if (typeof mem.data != 'undefined') {
                            // console.log('!=1 MEM DATA:', mem.data);
                            var data = mem.data;
                            console.log('DATA: ', data);
                            if (typeof data.busListeners == 'undefined') {
                                data['busListeners'] = new Object();
                                console.log('!!!!!', data)
                                data.busListeners[topic] = [];
                            } else if (typeof data.busListeners[topic] == 'undefined') {
                                data.busListeners[topic] = [];
                            }
                            // console.log('indexof:', data.busListeners[topic].indexOf(mem.conf.id));
                            if (data.busListeners[topic].indexOf(mem.conf.id) == -1)
                                data.busListeners[topic].push(mem.conf.id);
                            mem.data = data; //JSON.parse(JSON.stringify(data));

                            clearInterval(initTimer);

                            mem.on('change', function(oldValue, newValue, remoteUpdate) {
                                var newData = JSON.parse(newValue);
                                console.log(newData);
                                var prop = topic.toString();
                                var msg = newData[prop];
                                if (typeof msg != 'undefined' && typeof newData.busListeners[prop] != 'undefined' && newData.busListeners[prop].length > 0) {
                                    if (typeof msg.id != 'undefined') {
                                        if (newData.busListeners[prop].includes(msg.id.toString()) && mem.conf.id.toString() == msg.id.toString()) {
                                            console.log('newData[prop]: ', prop, newData[prop]);
                                            console.log('mem.conf.id.toString(): ', mem.conf.id.toString());
                                            console.log('msg.id.toString(): ', msg.id.toString());
                                            delete msg.id;
                                            delete mem.data.busListeners[prop];
                                            // console.log('CALLBACK: ', callback);
                                            callback.call(this, msg);
                                        }
                                    }
                                }
                            });
                        }
                    }, 20);
                }

                // mem.on('change', function(oldValue, newValue, remoteUpdate) {
                //     var newData = JSON.parse(newValue);
                //     var prop = topic.toString();
                //     var msg = newData[prop];
                //     if (typeof msg != 'undefined' && newData.busListeners[prop].length > 0) {
                //         if (typeof msg.id != 'undefined') {
                //             if (newData.busListeners[prop].includes(msg.id.toString()) && mem.conf.id.toString() == msg.id.toString()) {
                //                 console.log('newData[prop]: ', newData[prop]);
                //                 console.log('mem.conf.id.toString(): ', mem.conf.id.toString());
                //                 console.log('msg.id.toString(): ', msg.id.toString());
                //                 delete msg.id;
                //                 // console.log('CALLBACK: ', callback);
                //                 callback.call(this, msg);
                //             }
                //         }
                //     }
                // });
                clearInterval(timer);
            }
        }, 2000);
    }

    function publish(topic, msg) {
        var data = mem.data || {};
        // console.log(data);
        var prop = topic.toString();
        data[prop] = msg;
        mem.data = JSON.parse(JSON.stringify(data));
        // console.log('MEM: ', mem.data);
    }

    function send(topic, msg) {

        var data = mem.data || {};
        msg.id = mem.conf.id;
        if (typeof mem.data.busListeners[topic] != 'undefined') {
            for (var i = 0; i <= mem.conf.length; i++) {
                if (mem.data.busListeners[topic].includes(msg.id.toString())) {
                    // console.log('Bus SEND: ', msg);
                    // console.log('SEND topic:', topic, '_msg: ', msg);
                    var prop = topic.toString();
                    data[prop] = msg;
                    mem.data = JSON.parse(JSON.stringify(data));
                    console.log('MEM.DATA:', JSON.stringify(mem.data));
                    break;
                } else {
                    msg.id = i;
                }
            }
        }
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

setInterval(function() {
    console.log('MEM DATA:', mem.data);

}, 10000);

module.exports = new Bus();