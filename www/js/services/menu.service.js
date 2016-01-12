/**
 * Menu Factory
 *
 * @description Builds json used in nested menu
 * sync status.
 */
(function() {
  'use strict';

  angular
    .module('starter.services')
    .factory('MenuService', MenuService);

  MenuService.$inject = ['devUtils'];

  function MenuService(devUtils) {

	  return {
	    getSideMenuJson: getSideMenuJson
	  };

	  function getSideMenuJson() {
      devUtils.syncMobileTable('Mobile_Refresh__ap').then(function(resObject){
        console.log("pro syncMobileTable " + JSON.stringify(resObject));
      }).catch(function(reason){
        console.error("pro syncMobileTable " + JSON.stringify(reason));
      });

	    var sideMenuJson = [
	      {"id": 2, "name": "Delivery receipt", "node": true, "parentid": 0, "href": "#/app/home", "icon": "ion-plane", "submenu": [
	      ]},
	      {"id": 3, "name": "Request", "node": true, "parentid": 0, "href": "#/app/contact", "icon": "ion-compose", "submenu": [
	      ]},
	      {"id": 4, "name": "Documents", "node": false, "parentid": 0, "icon": "ion-help-circled", "submenu": [
	        {"id": 41, "name": "Applications", "node": true, "parentid": 4, "href": "#/app/contact", "submenu": []},
	        {"id": 42, "name": "Key benefits", "node": true, "parentid": 4, "href": "#/app/contact", "submenu": []},
	        {"id": 43, "name": "Help", "node": true, "parentid": 4, "href": "#/app/help", "submenu": []}
	      ]},
	      {"id": 5, "name": "Hub", "node": true, "parentid": 0, "href": "#/app/contact", "icon": "ion-ios-tennisball", "submenu": [
	      ]},
	      {"id": 8, "name": "Topics of interest", "node": true, "parentid": 0, "href": "#/app/toi", "icon": "ion-document-text", "submenu": [
	      ]},
	      {"id": 6, "name": "Settings", "node": true, "parentid": 0, "href": "#/app/settings", "icon": "ion-levels", "submenu": [
	      ]},
	      {"id": 7, "name": "Intro", "node": true, "parentid": 0, "href": "#/intro", "icon": "ion-university", "submenu": [
	      ]}
	    ];
	    return sideMenuJson;
	  }
	}

})();