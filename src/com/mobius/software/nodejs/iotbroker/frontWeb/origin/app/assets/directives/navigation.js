(function() {
    'use strict';

    navigation.$inject = ["$location", "$rootScope", "sessionFactory"];
    angular
        .module('mqtt')
        .directive('navigation', navigation);


    /** @ngInject */
    function navigation($location, $rootScope, sessionFactory) {

        function navigationController() {
            var vm = this;
            vm.sessionData = {}
            vm.auth = $rootScope.auth;
            init();
            
            $rootScope.$on('$routeChangeSuccess', function() {
                vm.route = $location.$$url;

            })

            function init() {
                vm.route = $location.$$url;
                vm.sessionData = sessionFactory.getSessionData();
            }  
            
            $rootScope.$watch(
				function() {
					return  vm.auth = $rootScope.auth;
				},
				function() {
                    vm.auth = $rootScope.auth;
					
				}
			);
        }

        function link() {

        }

        return {
            bindToController: true,
            controller: navigationController,
            controllerAs: 'Ctrl',
            link: link,
            restrict: 'AE',
            scope: {},
            templateUrl: 'assets/directives/navigation.html'
        }
    }

}());