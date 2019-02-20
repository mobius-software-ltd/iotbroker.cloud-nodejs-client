(function() {
    'use strict';

    topicsCtrl.$inject = ["$scope", "dataFactory", "sessionFactory"];
    angular
        .module('mqtt')
        .controller('topicsCtrl', topicsCtrl)

    /** @ngInject */
    function topicsCtrl($scope, dataFactory, sessionFactory) {
        var vm = this;
        var sessionData;
        vm.sessionData = sessionFactory.getSessionData();
        vm.topics = [];
        vm.newItem = {};
        vm.deleteItem = deleteItem;
        vm.addItem = addItem;
        vm.scrollBottom = scrollBottom;

        $scope.popover = {
            templateUrl: '/view/topics/modal.html',
            title: 'Add new topic'
        };

        $scope.deletePopover = {
            templateUrl: '/view/topics/popoverDelete.html',
            title: 'Unsubscribe from topic?'
        };

        init();

        function scrollBottom() {
            setTimeout(function(){
              document.documentElement.scrollTop = document.documentElement.offsetHeight;
            }, 200)
            
        }

        function deleteItem(params) {
            // console.log(params.item);
            if (typeof params.item == 'undefined') return;
            dataFactory.unsubscribe({
                topics: [params.item.topic],
                username: sessionData.username,
                clientID: sessionData.clientID,
                type: sessionData.type,
                topic: [params.item],
                unique: sessionData.unique  
            }).then(function(data) {
                setTimeout(function() {
                    getTopics();
                    // console.log(vm.topics);
                }, 2000);
                document.body.click();
            });
        }

        function addItem() {
            // console.log(vm.newItem);
            if ((typeof vm.newItem.qos == 'undefined' && vm.sessionData.type.id != 3 && vm.sessionData.type.id != 4) || typeof vm.newItem.topic == 'undefined') return;
            dataFactory.subscribe({
                topics: [vm.newItem],
                username: sessionData.username,
                clientID: sessionData.clientID,
                type: sessionData.type,
                unique: sessionData.unique         
            }).then(function(data) {
                setTimeout(function() {
                    getTopics();
                }, 1000);
                vm.newItem = {};
                document.body.click();
            });
        }

        function getTopics() {
             dataFactory.getTopics({
                username: sessionData.username,  
                clientID: sessionData.clientID,
                type: sessionData.type         
            }).then(function(data) {
                if (data.data.length > 0) {
                    sessionFactory.pushTopic(data.data);
                }
                vm.topics = [];
                vm.topics = sessionFactory.getTopics();
                if (data.data.length == 0) {
                    vm.topics = [];
                }
            });
        }

        function init() {
            sessionData = sessionFactory.getSessionData();
            if (!!sessionData)
                getTopics();
        }

    }

}());