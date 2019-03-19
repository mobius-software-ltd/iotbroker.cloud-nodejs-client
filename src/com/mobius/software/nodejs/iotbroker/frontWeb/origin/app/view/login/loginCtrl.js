(function() {
    'use strict';

    loginCtrl.$inject = ["dataFactory", "sessionFactory"];
    angular
        .module('mqtt')
        .controller('loginCtrl', loginCtrl)

    /** @ngInject */
    function loginCtrl(dataFactory, sessionFactory) {
        var vm = this;
        vm.protocolType = null;
      
        vm.types = [{name: "MQTT", id: 1},
                    {name: "SN", id: 2},
                    {name: "COAP", id: 3},
                    {name: "AMQP", id: 4},
                    {name: "WEBSOCKETS", id: 5}]
        vm.login = {
            isClean: false,
            will: {
                retain: false
            },
            secure: false,
            certificate: null,
            privateKey: null
        };
        vm.connect = connect;
        
        init();         

        function connect(user) {
            for(var i = 0; i < vm.types.length; i++) {
                if(vm.protocolType == vm.types[i].id) {
                    user.type = vm.types[i];
                }
            }
            user.unique = user.clientID + Math.random().toString(18).substr(2, 16);  
            dataFactory.connect(user);            
        }       
       
        function init() {}

    }

}());