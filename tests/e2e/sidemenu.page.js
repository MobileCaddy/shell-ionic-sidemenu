/**
 * Page Object Definition
 * landing page
 */

var SideMenu = function() {

  this.settingsMenuItem =   element(by.linkText('Settings'));

};

module.exports = new SideMenu();