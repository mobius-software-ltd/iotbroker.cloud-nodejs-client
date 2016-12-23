(function() {
    'use strict';

    loginCtrl.$inject = ["dataFactory", "sessionFactory"];
    angular
        .module('mqtt')
        .controller('loginCtrl', loginCtrl)

    /** @ngInject */
    function loginCtrl(dataFactory, sessionFactory) {
        var vm = this;
        vm.login = {
            isClean: false,
            will: {
                retain: false
            }
        };
        vm.connect = connect;

        init();

        function connect() {
            // vm.login(vm.login);
            sessionFactory.setSessionData(vm.login);
            dataFactory.connect(vm.login);
        }

        function init() {}

    }

}());