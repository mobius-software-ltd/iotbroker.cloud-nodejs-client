(function() {
    'use strict';

    navigation.$inject = ["$location", "dataFactory", "$timeout", "$rootScope", "sessionFactory"];
    angular
        .module('mqtt')
        .directive('navigation', navigation);


    /** @ngInject */
    function navigation($location, dataFactory, $timeout, $rootScope, sessionFactory) {

        function navigationController() {
            var vm = this;
            vm.sessionData = {}
            vm.auth = $rootScope.auth;
            init();
            
            check();

            function check() {
                var user = sessionFactory.getSessionData();
                dataFactory.checkConnection({ unique: user.unique })
                    .then(function(success) {
                        if(!success) {
                            dataFactory.disconnect(user);
                          //  $location.path('/');
                        }
                        vm.timer = $timeout(check, 2000);
                    }, function(error) {
                        dataFactory.disconnect(user);
                    } )
            };
            $rootScope.$on('$routeChangeSuccess', function() {
                vm.route = $location.$$url;
                $timeout.cancel( vm.timer);
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