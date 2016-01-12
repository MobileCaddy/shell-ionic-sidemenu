/**
 * Menu Controller
 *
 * @description controller for menu page
 */
(function() {
  'use strict';

  angular
    .module('starter.controllers')
    .controller('MenuCtrl', MenuCtrl);

  MenuCtrl.$inject = ['MenuService'];

  function MenuCtrl(MenuService) {
    var vm = this;

    vm.allSideMenuItems = MenuService.getSideMenuJson();
    vm.items = vm.allSideMenuItems;
    vm.selectedItem = null;
    vm.showSubmenu = showSubmenu;
    vm.goBack = goBack;

    function showSubmenu(item) {
      vm.items = item.submenu;
      vm.selectedItem = item;
    }

    function goBack() {
      if (vm.selectedItem.parentid === 0) {
        vm.items = vm.allSideMenuItems;
        vm.selectedItem = null;
      } else {
        parentItem = findItemById(vm.allSideMenuItems, vm.selectedItem.parentid);
        showSubmenu(parentItem);
      }
    }

    function findItemById(obj, id) {
      if (obj.id == id) { return obj; }
      for (var i in obj) {
        if (obj[i] !== null && typeof(obj[i]) == "object") {
          var result = findItemById(obj[i], id);
          if (result) { return result; }
        }
      }
      return null;
    }

  }

})();