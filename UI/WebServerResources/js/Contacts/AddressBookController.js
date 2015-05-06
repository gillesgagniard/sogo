/* -*- Mode: javascript; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

(function() {
  'use strict';

  /**
   * @ngInject
   */
  AddressBookController.$inject = ['$state', '$scope', '$rootScope', '$stateParams', '$timeout', '$mdDialog', 'sgFocus', 'Card', 'AddressBook', 'Dialog', 'sgSettings', 'stateAddressbooks', 'stateAddressbook'];
  function AddressBookController($state, $scope, $rootScope, $stateParams, $timeout, $mdDialog, focus, Card, AddressBook, Dialog, Settings, stateAddressbooks, stateAddressbook) {
    var currentAddressbook;

    $rootScope.currentFolder = stateAddressbook;
    $rootScope.card = null;

      $scope.newComponent = function(ev) {
        $mdDialog.show({
          parent: angular.element(document.body),
          targetEvent: ev,
          clickOutsideToClose: true,
          escapeToClose: true,
          template: [
            '<md-dialog aria-label="' + l('Create component') + '">',
            '  <md-content>',
            '    <div layout="column">',
            '      <md-button ng-click="create(\'card\')">',
            '        ' + l('Contact'),
            '      </md-button>',
            '      <md-button ng-click="create(\'list\')">',
            '        ' + l('List'),
            '      </md-button>',
            '    </div>',
            '  </md-content>',
            '</md-dialog>'
          ].join(''),
          locals: {
            state: $state,
            addressbookId: $scope.currentFolder.id
          },
          controller: ComponentDialogController
        });

        /**
         * @ngInject
         */
        ComponentDialogController.$inject = ['scope', '$mdDialog', 'state', 'addressbookId'];
        function ComponentDialogController(scope, $mdDialog, state, addressbookId) {
          scope.create = function(type) {
            $mdDialog.hide();
            state.go('app.addressbook.new', { addressbookId: addressbookId, contactType: type });
          }
        }
      };
    }

  angular
    .module('SOGo.ContactsUI')  
    .controller('AddressBookController', AddressBookController);                                    
})();
