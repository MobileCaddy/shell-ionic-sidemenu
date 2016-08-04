/**
 * starter.controllers module
 *
 * @description defines starter.controllers module
 */
(function() {
  'use strict';

  angular.module('starter.controllers', ['ionic'])

      .directive('mcSyncSpinner', function($rootScope, SyncService, NetworkService, $window) {
        return {
          restrict: 'E',
          scope: {},
          link: function(scope){
            var curSyncState = SyncService.getSyncState();
            if (curSyncState == 'Complete' || curSyncState ==  "InitialLoadComplete") {
              var networkState = NetworkService.getNetworkStatus();
              scope.syncState = networkState;
            } else {
              scope.syncState = "syncing";
            }

            var deregisterHandleSyncTables = $rootScope.$on('syncTables', function(event, args) {
              if (args && args.result) {
                var syncInfo = args.result.toString();
                console.log("syncInfo", syncInfo);
                if (syncInfo == 'Complete' || syncInfo ==  "InitialLoadComplete") {
                  var networkState = NetworkService.getNetworkStatus();
                  scope.syncState = networkState;
                  scope.$apply();
                } else if (scope.syncState !== "syncing") {
                  console.log("scope.syncState = 'syncing'");
                  scope.syncState = "syncing";
                  scope.$apply();
                } else {
                  console.log("scope.syncState == 'syncing'");
                }
              }
            });

            var deregisterHandleNetworkState = $rootScope.$on('networkState', function(event, args) {
              var networkState = args.state.toString();
              console.log("networkState", networkState);
              scope.syncState = networkState;
              scope.$apply();
            });

            scope.$on('$destroy',
                deregisterHandleSyncTables,
                deregisterHandleNetworkState
            );
          },
          templateUrl: $window.RESOURCE_ROOT + 'templates/mcSyncSpinner.html'
        };
      });

})();


/**
 * Deploy Controller
 *
 * @description controller for the Deploy to Salesforce
 */
(function() {
  'use strict';

  angular
    .module('starter.controllers')
    .controller('DeployCtrl', DeployCtrl);

  DeployCtrl.$inject = ['$scope', 'DeployService'];

  function DeployCtrl($scope, DeployService) {


	  function iconForErr(errType) {
	    switch(errType) {
	        case 'info':
	            return 'ion-information-circled';
	        default:
	            return 'ion-close-round';
	    }
	  }

	  var messages = [{message : 'Uploading bundle...', type : ''}];
	  var appConfig = {};

	  $scope.messages = messages;

	  DeployService.getDetails().then(function(data){
	    console.log('data', data);
	    appConfig = data;
	    return DeployService.checkVsn(appConfig.min_mobilecaddy_version);
	  }).then(function(){
	    return DeployService.deployBunlde(appConfig);
	  }).then(function(res){
	    console.dir(res);
	    var msg = {message : res, type : 'ok', icon : "ion-checkmark-round"};
	    $scope.$apply(function() {
	      $scope.messages.push(msg);
	      msg = {message : 'Uploading cache manifest...', type : ''};
	      $scope.messages.push(msg);
	    });
	    return DeployService.uploadCachePage(appConfig);
	  }).then(function(res){
	    console.dir(res);
	    var msg = {message : res, type : 'ok', icon : "ion-checkmark-round"};
	    $scope.$apply(function() {
	      $scope.messages.push(msg);
	      msg = {message : 'Uploading start page...', type : ''};
	      $scope.messages.push(msg);
	    });
	    return DeployService.uploadStartPage(appConfig);
	  }).then(function(res){
	    console.dir(res);
	    var msg = {message : res, type : 'ok', icon : "ion-checkmark-round"};
	    $scope.$apply(function() {
	      $scope.messages.push(msg);
	      msg = {message : 'Deploy Completed successfully.', type : 'final'};
	      $scope.messages.push(msg);
	    });
	  }).catch(function(err){
	    var msg = {message : err.message, type : err.type,  icon : iconForErr(err.type)};
	    $scope.$apply(function() {
	      $scope.messages.push(msg);
	      if (err.type != 'error') {
	         msg = {message : 'Deploy Completed successfully.', type : 'final'};
	        $scope.messages.push(msg);
	      }
	    });
	    console.debug(err);
	  });

  }

})();
/**
 * SettingsHB Controller
 *
 * @description Controller for settings heartbeat dev tool
 */
(function() {
  'use strict';

  angular
    .module('starter.controllers')
    .controller('SettingsHBCtrl', SettingsHBCtrl);

  SettingsHBCtrl.$inject = ['$scope', 'NetworkService'];

  function SettingsHBCtrl($scope, NetworkService) {

    if (localStorage.connection) {
      $scope.heartbeatStatus = localStorage.connection;
    } else {
      $scope.heartbeatStatus = 100100;
    }

    $scope.hbUpdate = function() {
      localStorage.connection = $scope.heartbeatStatus;
      if ($scope.heartbeatStatus == 100100) NetworkService.networkEvent('online');
      if ($scope.heartbeatStatus == 100103) NetworkService.networkEvent('offline');
    };

  }

})();
/**
 * MTI Controller
 *
 * @description controller for the MTI listing
 */
(function() {
  'use strict';

  angular
    .module('starter.controllers')
    .controller('MTICtrl', MTICtrl);

  MTICtrl.$inject = ['$scope', '$rootScope', '$location', '$ionicPopup', '$ionicLoading', 'DevService', 'devUtils', 'logger'];

  function MTICtrl($scope, $rootScope, $location, $ionicPopup, $ionicLoading, DevService, devUtils, logger) {

	  var adminTimeout = (1000 * 60 *5 ); // 5 minutes
	  if ( $rootScope.adminLoggedIn > Date.now() - adminTimeout) {
	  } else {
	    $location.url('app/settings');
	    var alertPopup = $ionicPopup.alert({
	      title: 'Access Denied'
	    });
	    alertPopup.then(function(res) {
	      //$location.url('app/settings');
	      $scope.$apply();
	    });
	  }

	  DevService.allTables().then(function(tables) {
	    $scope.tables = tables;
	  }, function(reason) {
	    console.error('Angular: promise returned reason -> ' + reason);
	  });

	  $scope.showTable = function(tableName) {
	    $location.path(decodeURIComponent("/app/settings/mti/" + tableName));
	  };

	  $scope.syncTable = function(tableName) {
	    var confirmPopup = $ionicPopup.confirm({
	      title: 'Sync Table',
	      template: "<div style='text-align:center;'>Are you sure you want to sync " + tableName + "?</div>",
	      cancelText: 'No',
	      okText: 'Yes',
	    });
	    confirmPopup.then(function(res) {
	      if (res) {
	        $ionicLoading.show({
	          duration: 10000,
	          template: 'Syncing ' + tableName + " ..."
	        });
	        devUtils.syncMobileTable(tableName).then(function(resObject){
	          $ionicLoading.hide();
	        }).catch(function(e){
	          logger.error('syncTable from settings ' + tableName + " " + JSON.stringify(e));
	          $ionicLoading.hide();
	          var alertPopup = $ionicPopup.alert({
	            title: 'Operation failed!',
	            template: '<p>Sorry, something went wrong.</p><p class="error_details">Error: ' + e.status + ' - ' + e.mc_add_status + '</p>'
	          });
	        });
	      }
	    });
	  };

	  $scope.saveTableToML = function(tableName) {
	    var confirmPopup = $ionicPopup.confirm({
	      title: 'Save Table To Mobile Log',
	      template: "<div style='text-align:center;'>Are you sure you want to save " + tableName + "?</div>",
	      cancelText: 'No',
	      okText: 'Yes',
	    });
	    confirmPopup.then(function(res) {
	      if (res) {
	        $ionicLoading.show({
	          duration: 10000,
	          template: 'Saving ' + tableName + " ..."
	        });
	        // Read the table records
	        DevService.allRecords(tableName, false).then(function(tableRecs) {
	          // console.log("tableRecs",angular.toJson(tableRecs));
	          return DevService.insertMobileLog(tableRecs);
	        }).then(function(resObject) {
	          // console.log("mc resObject",resObject);
	          $ionicLoading.hide();
	        }).catch(function(e){
	          logger.error('saveTableToML ' + tableName + " " + JSON.stringify(e));
	          $ionicLoading.hide();
	          var alertPopup = $ionicPopup.alert({
	            title: 'Operation failed!',
	            template: '<p>Sorry, something went wrong.</p><p class="error_details">Error: ' + e.status + ' - ' + e.mc_add_status + '</p>'
	          });
	        });
	      }
	    });
	  };

  }

})();
/**
 * MTIDetail Controller
 *
 * @description controller for the MTI details (per table)
 */
(function() {
  'use strict';

  angular
    .module('starter.controllers')
    .controller('MTIDetailCtrl', MTIDetailCtrl);

  MTIDetailCtrl.$inject = ['$scope', '$stateParams', '$ionicLoading', '$ionicModal', 'DevService'];

  function MTIDetailCtrl($scope, $stateParams, $ionicLoading, $ionicModal, DevService) {

	  $ionicLoading.show({
	      duration: 30000,
	      noBackdrop: true,
	      template: '<p id="app-progress-msg" class="item-icon-left"><i class="icon ion-loading-c"></i>Fetching records...</p>'
	    });
	  $scope.table = {'Name': $stateParams.tableName};
	  DevService.allRecords($stateParams.tableName, false)
	    .then(function(tableRecs) {
	    $scope.tableRecs = tableRecs;
	    $ionicLoading.hide();
	  }, function(reason) {
	    console.error('Angular: promise returned error -> ' + reason);
	  });

	  $scope.getItemHeight = function(item, index) {
	    return (typeof(item) != "undefined")  ? 100 + item.length*55 : 0;
	  };

	  $scope.search = {};

	  $scope.clearSearch = function() {
	    $scope.search.query = "";
	  };

	  $scope.showRecord = function(tableRec, soupRecordId) {
	    $ionicLoading.show({
	      duration: 10000,
	      template: 'Loading...'
	    });
	    var tableName;
	    for (i = 0, len = tableRec.length; i < len; i++) {
	      if (tableRec[i].Name == "Mobile_Table_Name") {
	        tableName = tableRec[i].Value;
	      }
	    }
	    console.log("tableName",tableName, soupRecordId);
	    DevService.getRecordForSoupEntryId(tableName, soupRecordId).then(function(record) {
	      console.log("record",record);
	      $scope.showTableRecord(tableName, record, soupRecordId);
	      $ionicLoading.hide();
	    }, function(reason) {
	      $ionicLoading.hide();
	      console.error('getRecordForSoupEntryId ' + reason);
	    });
	  };

	  $scope.showTableRecord = function(tableName, record, soupRecordId) {
	    $ionicModal.fromTemplateUrl('settingDevMTITableRecord.html', function(modal) {
	      $scope.tableRecordModal = modal;
	      $scope.tableRecordModal.tableName = tableName;
	      $scope.tableRecordModal.record = record;
	      $scope.tableRecordModal.soupRecordId = soupRecordId;
	      $scope.tableRecordModal.show();
	    }, {
	      scope: $scope,
	      animation: 'slide-in-up',
	      backdropClickToClose : false
	    });
	  };

	  $scope.closeShowTableRecord = function() {
	    $scope.tableRecordModal.hide();
	    $scope.tableRecordModal.remove();
	    delete $scope.tableRecordModal;
	  };

  }

})();
/**
 * Outbox Controller
 *
 * @description controller for outbox page.
 */
(function() {
  'use strict';

  angular
    .module('starter.controllers')
    .controller('OutboxCtrl', OutboxCtrl);

  OutboxCtrl.$inject = ['$rootScope', '$scope', '$ionicLoading', '$timeout', 'logger', 'OutboxService', 'SyncService', 'NetworkService', 'UserService'];

  function OutboxCtrl($rootScope, $scope, $ionicLoading, $timeout, logger, OutboxService, SyncService, NetworkService, UserService)  {
    logger.log("in OutboxCtrl");

    var outboxControllerViewModel = this;
    var updateOutboxCountTimeout;

    outboxControllerViewModel.dirtyRecordExist = false;
    outboxControllerViewModel.syncing = false;

    // Methods used in view
    outboxControllerViewModel.syncNow = syncNow;

    activate();

    function activate() {
      $ionicLoading.show({
        duration: 5000,
        template: 'Loading...',
        animation: 'fade-in',
        showBackdrop: true
      });
      // get the dirty records
      OutboxService.getDirtyRecords().then(function(records) {
        if (records.length === 0) {
          // If no dirty records then show the 'No records...' message
          outboxControllerViewModel.dirtyRecordExist = false;
          outboxControllerViewModel.outboxCount = "";
        } else {
          // Update count in this view's title (the count next to the Outbox menu item is updated by raising event 'MenuCtrl:updateOutboxCount')
          outboxControllerViewModel.outboxCount = records.length > 0 ? " (" + records.length + ")" : "";
          outboxControllerViewModel.dirtyRecords = buildDisplayRecords(records);
          // Show the Sync Now button
          outboxControllerViewModel.dirtyRecordExist = true;
        }
        $ionicLoading.hide();
        updateOutboxCountTimeout = $timeout(function() {
          // Update the outbox count displayed in the side menu (updated in MenuCtrl)
          $rootScope.$emit('MenuCtrl:updateOutboxCount');
        },0);
      });
    }

    // Build the records to display in view
    function buildDisplayRecords(records) {
      // Count number of dirty records for each mobile table name
      var counts = _.countBy(records, 'Mobile_Table_Name');
      // Build data to display in view
      var dirtyRecords = _.map(counts, function(value, key){
        // Map a more user fiendly name to the mobile table name
        var displayTableName;
        switch (key) {
          // Add lines below like this for each table you're interested in
          // case "myDummyTable1__ap" :
          //   displayTableName = "Table 1";
          //   break;
          // case "myDummyTable1__ap" :
          //   displayTableName = "Table 2";
            // break;
          default :
            // Won't come in here unless a new mobile table has been mobilised for the app, and not catered for in switch
            displayTableName = key;
        }
        return {
            "displayTableName": displayTableName,
            "mobileTableName": key,
            "count": value
        };
      });
      return dirtyRecords;
    }

    // Run the sync method in the MenuCtrl
    function syncNow() {
      if (NetworkService.getNetworkStatus() === "online") {
        $rootScope.$emit('MenuCtrl:syncNow');
        outboxControllerViewModel.syncing = true;
      } else {
        outboxControllerViewModel.syncing = false;
        $ionicLoading.show({
          template: 'Please go on-line before attempting to sync',
          animation: 'fade-in',
          showBackdrop: true,
          duration: 2000
        });
      }
    }

    // Process events fired from the SyncService
    var deregisterHandleSyncTables = $rootScope.$on('syncTables', function(event, args) {
      logger.log("OutboxCtrl syncTables: " + JSON.stringify(args));
      if (args.result.toString() == "Complete") {
        // Refresh this view after sync is complete
        activate();
        outboxControllerViewModel.syncing = false;
      }
    });


    $scope.$on('$destroy', function() {
      logger.log("OutboxCtrl destroy");
      deregisterHandleSyncTables();
      $timeout.cancel(updateOutboxCountTimeout);
    });

  }

})();

/**
 * Settings Controller
 *
 * @description Controller for the settings area
 */
(function() {
  'use strict';

  angular
    .module('starter.controllers')
    .controller('SettingsCtrl', SettingsCtrl);

	SettingsCtrl.$inject = ['$scope', '$rootScope', '$ionicPopup', '$ionicLoading', '$location', 'devUtils', 'vsnUtils', 'DevService', 'logger', 'SyncService', 'NetworkService', '$timeout', 'OutboxService'];

	function SettingsCtrl($scope, $rootScope, $ionicPopup, $ionicLoading, $location, devUtils, vsnUtils, DevService, logger, SyncService, NetworkService, $timeout, OutboxService) {

		/**
		 * Sync Now Stuff For Sync Now Button On Settings Page
		 *
         */

		$scope.outboxCount = '';
		function syncNow() {
			if (NetworkService.getNetworkStatus() === "online") {
				var syncTimeout = $timeout(function () {
					SyncService.syncAllTablesNow();
				}, 0);
			} else {
				$ionicLoading.show({
					template: 'Please go on-line before attempting to sync',
					animation: 'fade-in',
					showBackdrop: true,
					duration: 2500
				});
			}
		}

		function updateOutboxCount() {
			OutboxService.getDirtyRecordsCount().then(function(result) {
				$scope.outboxCount = result > 0 ? " (" + result + ")" : "";
			});
		}

		var deregisterHandleUpdateOutboxCount = $rootScope.$on('MenuCtrl:updateOutboxCount', function(event, args) {
			updateOutboxCount();
		});

		var deregisterHandleSyncNow = $rootScope.$on('MenuCtrl:syncNow', function(event, args) {
			syncNow();
		});

		/**
		 * @event on syncTables
		 * @description Handle events fired from the SyncService.
		 */
		var deregisterHandleSyncTables = $rootScope.$on('syncTables', function(event, args) {
			// logger.log("MenuCtrl syncTables: " + JSON.stringify(args));
			if (args && args.result) {
				if (args.result.toString() == "Complete") {
					updateOutboxCount();
				}
			}
		});

		$scope.$on('$destroy', function() {
			$timeout.cancel(syncTimeout);
			deregisterHandleSyncTables();
			deregisterHandleUpdateOutboxCount();
			deregisterHandleSyncNow();
		});


		/**
		 * SyncNow Service To Sync Current Data
		 */

		var syncTimeout;
		$scope.syncNow = function () {
			if (NetworkService.getNetworkStatus() === "online") {
				syncTimeout = $timeout(function() {
					SyncService.syncAllTablesNow();
				}, 0);
			} else {
				$ionicLoading.show({
					template: 'Please go on-line before attempting to sync',
					animation: 'fade-in',
					showBackdrop: true,
					duration: 2500
				});
			}
		};


	  /*
	  ---------------------------------------------------------------------------
	    Main settings page
	  ---------------------------------------------------------------------------
	  */

	  // This unhides the nav-bar. The navbar is hidden in the cases where we want a
	  // splash screen, such as in this app
	  // NOTE - you will want to add the following two lines to the controller that
	  // is first called by your app.
	  var e = document.getElementById('my-nav-bar');
	  angular.element(e).removeClass( "mc-hide" );

	  $scope.logoutAllowedClass = 'disabled';
	  $scope.recsToSyncCount = 0;

	  $scope.codeflow = LOCAL_DEV;

	  $scope.upgradeAvailable = false;
	  vsnUtils.upgradeAvailable().then(function(res){
	    if (res)  return devUtils.dirtyTables();
	  }).then(function(tables){
	  	var tables2 = tables.filter(function(table){
	  		return table != "Mobile_Log__mc";
	  	});
	    if (tables2 && tables2.length === 0) {
	      $scope.upgradeAvailable = true;
				$timeout(function() {
          $scope.$apply();
        }, 0);
	    }
	  });

	  DevService.allRecords('recsToSync', false)
	    .then(function(recsToSyncRecs) {
	    $scope.recsToSyncCount = recsToSyncRecs.length;
	    if ($scope.recsToSyncCount === 0) {
	      $scope.logoutAllowedClass = '';
	    } else {
	      $scope.recsToSyncCount  = 0;
	    }
	  }, function(reason) {
	    console.error('Angular: promise returned reason -> ' + reason);
	  });


	  DevService.allRecords('appSoup', false)
	    .then(function(appSoupRecs) {
	    $scope.settingsRecs = extractSettingsValues(appSoupRecs);
	  }, function(reason) {
	    console.error('Angular: promise returned reason -> ' + reason);
	  });

	  function extractSettingsValues(appSoupRecs) {
	    var settingRecs = {};
	    $j.each(appSoupRecs, function(i,records) {
	      var tableRec = {};
	      $j.each(records, function(i,record) {
	        switch (record.Name) {
	          case "Name" :
	            tableRec.Name = record.Value;
	            break;
	          case "CurrentValue" :
	            tableRec.Value = record.Value;
	            break;
	        }
	      }); // end loop through the object fields
	      settingRecs[tableRec.Name] = tableRec.Value;
	    });
	    return settingRecs;
	  }


	  /*
	  ---------------------------------------------------------------------------
	    Utility Functions
	  ---------------------------------------------------------------------------
	  */
	  function validateAdminPassword(pword) {
	    return (pword == "123") ?  true : false;
	  }

	  $scope.upgradeIfAvailable = function() {
	    devUtils.dirtyTables().then(function(tables){
	      logger.log('upgrade: dirtyTables check');
	      if (tables && tables.length === 0) {
	        logger.log('upgrade: no dirtyTables');
	        var confirmPopup = $ionicPopup.confirm({
	          title: 'Upgrade',
	          template: 'Are you sure you want to upgrade now?'
	        });
	        confirmPopup.then(function(res) {
	          if(res) {
	            $ionicLoading.show({
	              duration: 30000,
	              delay : 400,
	              maxWidth: 600,
	              noBackdrop: true,
	              template: '<h1>Upgrade app...</h1><p id="app-upgrade-msg" class="item-icon-left">Upgrading...<ion-spinner/></p>'
	            });
	            logger.log('upgrade: calling upgradeIfAvailable');
	            vsnUtils.upgradeIfAvailable().then(function(res){
	              logger.log('upgrade: upgradeIfAvailable? ' + res);
	              if (!res) {
	                $ionicLoading.hide();
	                $scope.data = {};
	                $ionicPopup.show({
	                  title: 'Upgrade',
	                  subTitle: 'The upgrade could not take place due to sync in progress. Please try again later.',
	                  scope: $scope,
	                  buttons: [
	                    {
	                      text: 'OK',
	                      type: 'button-positive',
	                      onTap: function(e) {
	                        return true;
	                      }
	                    }
	                  ]
	                });
	              }
	            }).catch(function(e){
	              logger.error('upgrade: ' + JSON.stringify(e));
	              $ionicLoading.hide();
	            });
	          }
	        });
	      } else {
	        logger.log('upgrade: dirtyTables found');
	        $scope.data = {};
	        $ionicPopup.show({
	          title: 'Upgrade',
	          subTitle: 'Unable to upgrade. A sync is required - please try later.',
	          scope: $scope,
	          buttons: [
	            {
	              text: 'OK',
	              type: 'button-positive',
	              onTap: function(e) {
	                return true;
	              }
	            }
	          ]
	        });
	      }
	    });
	  };

	  /*
	  ---------------------------------------------------------------------------
	    Log in/out
	  ---------------------------------------------------------------------------
	  */
	  $scope.showAdminPasswordPopup = function() {
	    var adminTimeout = (1000 * 60 * 5); // 5 minutes
	    if ( $rootScope.adminLoggedIn > Date.now() - adminTimeout) {
	      $location.path('app/settings/devtools');
	      $rootScope.adminLoggedIn = Date.now();
	      $scope.$apply();
	    } else {
	      $scope.data = {};
	      var myPopup = $ionicPopup.show({
	        template: '<input type="password" ng-model="data.admin">',
	        title: 'Enter Admin Password',
	        scope: $scope,
	        buttons: [
	          { text: 'Cancel' },
	          { text: '<b>Continue</b>',
	            type: 'button-positive',
	            onTap: function(e) {
	            if (validateAdminPassword($scope.data.admin)) {
	                $location.path('app/settings/devtools');
	                $rootScope.adminLoggedIn = Date.now();
	              } else {
	                console.log("Password incorrect");
	              }
	            }
	          },
	        ]
	      });
	    }
	  };

	  $scope.showConfirmLogout = function() {
	   var confirmPopup = $ionicPopup.confirm({
	     title: 'Logout',
	     template: 'Are you sure you want to logout?'
	   });
	   confirmPopup.then(function(res) {
	     if(res) {
	       $rootScope.adminLoggedIn = null;
	       cordova.require("com.salesforce.plugin.sfaccountmanager").logout();
	     }
	   });
	  };

	  $scope.showConfirmReset = function() {
	    var confirmPopup = $ionicPopup.confirm({
	      title: 'Reset App Data',
	      template: 'Are you sure you want to reset ALL application data?'
	    });
	    confirmPopup.then(function(res) {
	      if(res) {
	        console.debug("Resetting app");
	        var i;
	        var name;
	        $ionicLoading.show({
	          duration: 30000,
	          delay : 400,
	          maxWidth: 600,
	          noBackdrop: true,
	          template: '<h1>Resetting app...</h1><p id="app-progress-msg" class="item-icon-left">Clearing data...<ion-spinner/></p>'
	        });
	        vsnUtils.hardReset().then(function(res){
	          //$ionicLoading.hide();
	        }).catch(function(e){
	          console.error(e);
	          $ionicLoading.hide();
	        });
	      }
	    });
	  };

	  $scope.setLogLevel = function() {
	    if ($scope.log.level == "Off") {
	      localStorage.removeItem('logLevel');
	    } else {
	      localStorage.setItem('logLevel', $scope.log.level);
	    }
	    $scope.log.levelChange = false;
	  };

	  $scope.getLogLevel = function() {
	    var logLevel = localStorage.getItem("logLevel");
	    if (logLevel === null) {
	      logLevel = "Off";
	    }
	    return logLevel;
	  };

	  $scope.log = {};
	  $scope.log.level = $scope.getLogLevel();
	  $scope.log.levelChange = false;

	  $scope.logLevelChange = function() {
	    $scope.log.levelChange = true;
	  };

  }

})();

/**
 * Testing Controller
 *
 * @description controller for testing functions in the settings pages
 */
(function() {
  'use strict';

  angular
    .module('starter.controllers')
    .controller('TestingCtrl', TestingCtrl);

  TestingCtrl.$inject = ['$scope', 'AppRunStatusService'];

  function TestingCtrl($scope, AppRunStatusService) {

	  $scope.resumeEvent = function() {
	    console.debug("resumeEvent");
	    AppRunStatusService.statusEvent('resume');
	  };

  }

})();