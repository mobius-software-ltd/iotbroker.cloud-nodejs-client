(function() {
    'use strict';

    angular
        .module('mqtt')
        .controller('indexCtrl', indexCtrl)

    /** @ngInject */
    function indexCtrl($scope, $location, dataFactory, sessionFactory) {
        var vm = this;
        var sessionData = {};
        vm.exit = exit;
        $scope.route = $location.$$url;
        // console.log(vm.route);

        function exit() {
            dataFactory.disconnect(sessionData);
            sessionFactory.setSessionData();
        }

        init();

        function init() {
            sessionData = sessionFactory.getSessionData();
        }

    }

}());