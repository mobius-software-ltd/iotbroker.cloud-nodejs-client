(function() {
    'use strict';

    usersCtrl.$inject = ["$scope", "dataFactory", "sessionFactory"];
    angular
        .module('mqtt')
        .controller('usersCtrl', usersCtrl)

    /** @ngInject */
    function usersCtrl($scope, dataFactory, sessionFactory) {
        var vm = this;
        vm.userslist = [];
        vm.removeUserFromList = removeUserFromList;
        vm.connect = connect;

        getUserslist()

        function getUserslist() {        
             dataFactory.getUsers().then(function(success) {
                 vm.userslist = success;             
             });
         }
 
         function removeUserFromList(user) {
             dataFactory.removeUser(user).then(
                 function (success) {
                     getUserslist()
                 });
         }

         function connect(user) {
            user.unique = user.clientID + Math.random().toString(18).substr(2, 16); 
            dataFactory.connect(user);
        }

    }

}());