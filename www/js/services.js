/**
 * starter.services module
 *
 * @description defines starter.service module and also sets up some other deps
 * as Angular modules.
 */
angular.module('underscore', [])
  .factory('_', function() {
    return window._; // assumes underscore has already been loaded on the page
});

angular.module('devUtils', [])
  .factory('devUtils', function() {
    return mobileCaddy.require('mobileCaddy/devUtils');
});

angular.module('vsnUtils', [])
  .factory('vsnUtils', function() {
    return mobileCaddy.require('mobileCaddy/vsnUtils');
});

angular.module('smartStoreUtils', [])
  .factory('smartStoreUtils', function() {
    return mobileCaddy.require('mobileCaddy/smartStoreUtils');
});

angular.module('logger', [])
  .factory('logger', function() {
    return mobileCaddy.require('mobileCaddy/logger');
});

angular.module('starter.services', ['underscore', 'devUtils', 'vsnUtils', 'smartStoreUtils', 'logger']);
/**
 * AppRunStatus Factory
 *
 * @description Handles app status events such as "resume" etc.
 */
(function() {
  'use strict';

  angular
    .module('starter.services')
    .factory('AppRunStatusService', AppRunStatusService);

  AppRunStatusService.$inject = ['$ionicPopup', '$ionicLoading', 'devUtils', 'vsnUtils', 'SyncService', 'logger'];

  function AppRunStatusService($ionicPopup, $ionicLoading, devUtils, vsnUtils, SyncService, logger) {

	 return {
	    statusEvent: function(status){
	      logger.log('AppRunStatusService status ' + status);
	      if (status == "resume") {
	        // resume();
	      }
	    }
	  };

	  function resume() {
	    devUtils.dirtyTables().then(function(tables){
	      logger.log('on resume: dirtyTables check');
	      if (tables && tables.length === 0) {
	        logger.log('on resume: calling upgradeAvailable');
	        vsnUtils.upgradeAvailable().then(function(res){
	          logger.log('on resume: upgradeAvailable? ' + res);
	          if (res) {
	            var notificationTimeout = (1000 * 60 * 5); // 5 minutes
	            var prevUpNotification = localStorage.getItem('prevUpNotification');
	            var timeNow = Date.now();
	            if (prevUpNotification === null) {
	              prevUpNotification = 0;
	            }
	            if (parseInt(prevUpNotification) < (timeNow - notificationTimeout)){
	              var confirmPopup = $ionicPopup.confirm({
	                title: 'Upgrade available',
	                template: 'Would you like to upgrade now?',
	                cancelText: 'Not just now',
	                okText: 'Yes'
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
	                  localStorage.removeItem('prevUpNotification');
	                  logger.log('on resume: calling upgradeIfAvailable');
	                  vsnUtils.upgradeIfAvailable().then(function(res){
	                    logger.log('on resume: upgradeIfAvailable res = ' + res);
	                    //console.log('upgradeIfAvailable', res);
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
	                    logger.error("resume " + JSON.stringify(e));
	                    $ionicLoading.hide();
	                  });
	                } else {
	                  localStorage.setItem('prevUpNotification', timeNow);
	                }
	              });
	            }
	          }
	        });
	      } else {
	        logger.log('on resume: dirtyTables found');
	      }
	    });
	    return true;
	  }
  }

})();
/**
 * Deploy Factory
 */
(function() {
  'use strict';

  angular
    .module('starter.services')
    .factory('DeployService', DeployService);

  DeployService.$inject = ['$rootScope', '$q', '$timeout', '$http'];

  function DeployService($rootScope, $q, $timeout, $http) {
		var apiVersionInt = 32;
		var apiVersion = "v" + 32 + ".0";

	  return {
	    getDetails : getDetails,

	    deployBunlde : function(appConfig){
	      return encodeAppBundle(appConfig).then(function(myBody, bundleFiles){
	        return uploadAppBundle(appConfig, myBody);
	      });
	    },
	    uploadCachePage : uploadCachePage,

	    uploadStartPage : uploadStartPage,

	    srDetails: function() {
	      return encodeAppBundle().then(function(myBody){
	        return uploadAppBundle(myBody);
	      }).then(function(res){
	        return uploadStartPage();
	      });
	    }
	  };

	  function _arrayBufferToBase64( buffer ) {
	    var binary = '';
	    var bytes = new Uint8Array( buffer );
	    var len = bytes.byteLength;
	    for (var i = 0; i < len; i++) {
	        binary += String.fromCharCode( bytes[ i ] );
	    }
	    return window.btoa( binary );
	  }

	  /**
	   * Does the static resource already exist on the platform for this app/vsn
	   */
	  function doesBundleExist(appConfig){
	    return new Promise(function(resolve, reject) {
	    var dataName = appConfig.sf_app_name + '_' + appConfig.sf_app_vsn;
	    // check if statid resource already exists
	    force.request(
	      {
	        path: '/services/data/' + apiVersion + '/tooling/query/?q=select Id, Name, Description, LastModifiedDate from StaticResource WHERE Name=\'' + dataName + '\' LIMIT 1'
	      },
	      function(response) {
	          console.debug('response' , response);
	          resolve(response);
	      },
	      function(error) {
	        console.error('Failed to check if app bundle already existed on platform');
	        reject({message :"App bundle upload failed. See console for details.", type: 'error'});
	      });
	    });
	  }

	  /**
	   * Does the static resource already exist on the platform for this app/vsn
	   */
	  function doesPageExist(pageName){
	    return new Promise(function(resolve, reject) {
	    // check if statid resource already exists
	    force.request(
	      {
	        path: '/services/data/' + apiVersion + '/tooling/query/?q=select Id, Name, Description, LastModifiedDate from ApexPage WHERE Name=\'' + pageName + '\' LIMIT 1'
	      },
	      function(response) {
	          console.debug('response' , response);
	          resolve(response);
	      },
	      function(error) {
	        console.error('Failed to check if page already existed on platform');
	        reject({message :"Page upload failed. See console for details.", type: 'error'});
	      });
	    });
	  }

	  function getDetails () {
	    return new Promise(function(resolve, reject) {
	    var details = {};
	    $timeout(function() {
	        $http.get('../package.json').success(function(appConfig) {
	          appConfig.sf_app_vsn = appConfig.version.replace(/\./g, '');
	          resolve(appConfig);
	        }).catch(function(err){
	          console.error(err);
	        });
	    }, 30);
	    });
	  }

	  function encodeAppBundle(appConfig){
	    return new Promise(function(resolve, reject) {

	      JSZipUtils.getBinaryContent('../' + appConfig.name + '-' + appConfig.version +'.zip', function(err, data) {
	        if(err) {
	          console.error(err);
	          reject(err); // or handle err
	        }
	        var zipFileLoaded = new JSZip(data);
	        $rootScope.deployFiles = zipFileLoaded.files;
	        resolve(_arrayBufferToBase64(data));
	      });
	    });
	  }

	  function uploadAppBundle (appConfig, myBody) {
	    return new Promise(function(resolve, reject) {
	    var dataName = appConfig.sf_app_name + '_' + appConfig.sf_app_vsn;
	    doesBundleExist(appConfig).then(function(response){
	      if (response.records.length > 0) {
	        // Update existing resource
	        console.debug('resource exists... patching existing');
	        var existingSR = response.records[0];
	        force.request(
	          {
	            method: 'PATCH',
	            contentType: 'application/json',
	            path: '/services/data/' + apiVersion + '/tooling/sobjects/StaticResource/' + existingSR.Id + '/',
	            data: {
	              'Body':myBody
	            }
	          },
	          function(response) {
	              console.debug('response' , response);
	              resolve('Existing app bundle updated');
	          },
	          function(error) {
	            console.error('Failed to check if app bundle already existed on platform');
	            reject({message :"App bundle upload failed. See console for details.", type: 'error'});
	          }
	        );
	      } else {
	        // Updload new resource
	        force.request(
	          {
	            method: 'POST',
	            contentType: 'application/json',
	            path: '/services/data/' + apiVersion + '/tooling/sobjects/StaticResource/',
	            data: {
	              'Name': dataName,
	              'Description' : 'App Bundle - auto-uploaded by MobileCaddy delopyment tooling',
	              'ContentType':'application/zip',
	              'Body':myBody,
	              'CacheControl': 'Public'
	            }
	          },
	          function(response) {
	            console.debug('response' , response);
	            resolve('App bundle uploaded');
	          },
	          function(error) {
	            console.error(error);
	            reject({message :"App bundle upload failed. See console for details.", type: 'error'});
	          });
	      }
	    });
	    });
	  }

	  function uploadCachePage(appConfig) {
	    return new Promise(function(resolve, reject) {
	      $timeout(function() {
	        $http.get('../apex-templates/cachepage-template.apex').success(function(data) {
	          var dataName = appConfig.sf_app_name + 'Cache_' + appConfig.sf_app_vsn;
	          var cacheEntriesStr = '';
	          _.each($rootScope.deployFiles, function(el){
	            if (!el.dir) cacheEntriesStr += '{!URLFOR($Resource.' + appConfig.sf_app_name + '_' + appConfig.sf_app_vsn + ', \'' + el.name + '\')}\n';
	          });
	          var dataParsed = data.replace(/MC_UTILS_RESOURCE/g, appConfig.mc_utils_resource);
	          dataParsed = dataParsed.replace(/MY_APP_FILE_LIST/g, cacheEntriesStr);
	          delete $rootScope.deployFiles;

						var pageOptions = JSON.stringify({
							"function":"createApexPage",
							"pageApiName":dataName,
							"pageLabel":dataName,
							"pageContents":dataParsed,
							"apiVersion":apiVersionInt,
							"pageDescription":"MobileCaddy CachePage" });
	          force.request(
	            {
	              method: 'POST',
								path:"/services/apexrest/mobilecaddy1/PlatformDevUtilsR001",
								contentType:"application/json",
								data:{startPageControllerVersion:'001', jsonParams:pageOptions}
	            },
	            function(response) {
	            	// we will get a response like this, is it fails
	            	// "{\"errorMessage\":\"Create Apex Page exception: Error occured processing component ShellAppCache_001. That page name is already in use, please choose a different one. (DUPLICATE_DEVELOPER_NAME). Fields Name.\",\"errorNo\":49}"
	            	var respJson = JSON.parse(response);
	            	if (respJson.errorMessage == "success") {
	              	resolve('Cache manifest uploaded');
	              } else {
		            	respJson.message = respJson.errorMessage;
		            	respJson.type = "error";
	              	console.error(respJson);
	              	reject(respJson);
	              }
	            },
	            function(error) {
	              console.error(error);
	              reject({message :'Start page upload failed. See console for details.', type: 'error'});
	            }
	          );
    			});
	      }, 30);
	    });
	  }


	  function uploadStartPage(appConfig) {
	    return new Promise(function(resolve, reject) {
	      $timeout(function() {
	        $http.get('../apex-templates/startpage-template.apex').success(function(data) {
	          var dataName = appConfig.sf_app_name + '_' + appConfig.sf_app_vsn;
	          var dataParsed = data.replace(/MC_UTILS_RESOURCE/g, appConfig.mc_utils_resource);
	          dataParsed = dataParsed.replace(/MY_APP_RESOURCE/g, appConfig.sf_app_name + '_' + appConfig.sf_app_vsn);
	          dataParsed = dataParsed.replace(/MY_APP_CACHE_RESOURCE/g, appConfig.sf_app_name + 'Cache_' + appConfig.sf_app_vsn);


						var pageOptions = JSON.stringify({
							"function":"createApexPage",
							"pageApiName":dataName,
							"pageLabel":dataName,
							"pageContents":dataParsed,
							"apiVersion":apiVersionInt,
							"pageDescription":"MobileCaddy StartPage" });
	          force.request(
	            {
	              method: 'POST',
								path:"/services/apexrest/mobilecaddy1/PlatformDevUtilsR001",
								contentType:"application/json",
								data:{startPageControllerVersion:'001', jsonParams:pageOptions}
	            },
	            function(response) {
	            	var respJson = JSON.parse(response);
	            	if (respJson.errorMessage == "success") {
	              	resolve('Start page uploaded');
	              } else {
		            	respJson.message = respJson.errorMessage;
		            	respJson.type = "error";
	              	console.error(respJson);
	              	reject(respJson);
	              }
	            },
	            function(error) {
	              console.error(error);
	              reject({message :'Start page upload failed. See console for details.', type: 'error'});
	            }
	          );
	        });
	      }, 30);
	    });
	  }

  }

})();
/**
 * Dev Factory
 *
 * @description
 */
(function() {
  'use strict';

  angular
    .module('starter.services')
    .factory('DevService', DevService);

  DevService.$inject = ['$rootScope', '$q', '_', 'devUtils', 'smartStoreUtils'];

  function DevService($rootScope, $q, _, devUtils, smartStoreUtils) {

	  return {
	    allTables: getTables,

	    allRecords: function(tableName,refreshFlag) {
	    	var tableRecs = [];
	      switch (refreshFlag) {
	        case true :
	          tableRecs = [];
	          tableRecs = getRecords(tableName, true);
	          break;
	        default :
	          if ((typeof tableRecs == 'undefined') || (tableRecs.length < 1)) {
	            tableRecs = [];
	            tableRecs = getRecords(tableName, true);
	          } else {
	            tableRecs = [];
	            tableRecs = getRecords(tableName, false);
	          }
	      }
	      return tableRecs;
	    },
	    getRecordForSoupEntryId: getRecordForSoupEntryId,

	    insertMobileLog: insertMobileLog
	  };

	  function getTables() {
	    var deferred = $q.defer();
	    var tables = [];

	    // Add other system tables
	    tables.push({'Name' : 'syncLib_system_data'});
	    tables.push({'Name' : 'appSoup'});
	    tables.push({'Name' : 'cacheSoup'});
	    tables.push({'Name' : 'recsToSync'});
	    smartStoreUtils.listMobileTables(
	      smartStoreUtils.ALPHA,
	      // Success callback
	      function(tableNames) {
	          $j.each(tableNames, function(i,tableName) {
	            tables.push({'Name' : tableName});
	            // TODO :: make this a promise ?
	            // TODO :: Improve this, add a meta table?
	            smartStoreUtils.getTableDefnColumnValue(
	              tableName,
	              'Snapshot Data Required',
	              function(snapshotValue) {
	                // Create the snapshot table too, if required
	                if (snapshotValue == 'Yes') {
	                  tables.push({'Name' : 'SnapShot_' + tableName});
	                } else {
	                }
	                $rootScope.$apply(function(){
	                  tables = tables;
	                });
	                return tables;
	              }, // end success callback
	              function(resObject){
	                console.error('MC : Error from listMobileTables -> ' + angular.toJson(resObject));
	                deferred.reject('error');
	              });
	          });

	          $rootScope.$apply(function(){
	            deferred.resolve(tables);
	            });
	          return deferred.promise;
	        },
	      function(e) {
	        console.log('MC: error from listMobileTables -> ' + angular.toJson(e));
	        deferred.reject(e);
	      });
	    return deferred.promise;
	  }


	 /**
	  * Works out if Val is likely an ID based on it's format
	  * @param {string} Val
	  * @return {boolean}
	  */
	  function isId(Val) {
	    var patt = /^[a-zA-Z0-9]{18}$/;
	    return patt.test(Val);
	  }


	  function getRecords(tableName, refreshFlag) {
	    var deferred = $q.defer();
	    var myTableRecs = [];
	    devUtils.readRecords(tableName, []).then(function(resObject) {
	    	console.log(tableName, resObject);
	      $j.each(resObject.records, function(i,record) {
	        var tableRec = [];
	        for (var fieldDef in record) {
	          var field = {
	            'Name' : fieldDef,
	            'Value' : record[fieldDef],
	            'ID_flag' : isId(record[fieldDef])};
	          tableRec.push(field);
	        } // end loop through the object fields
	        myTableRecs.push(tableRec);
	      });
	      deferred.resolve(myTableRecs);
	    }).catch(function(resObject){
	      console.error('MC : Error from devUtils.readRecords -> ' + angular.toJson(resObject));
	      deferred.reject('error');
	    });
	    return deferred.promise;
	  }

	  function getRecordForSoupEntryId(tableName, soupRecordId) {
	    return new Promise(function(resolve, reject) {
	      devUtils.readRecords(tableName, []).then(function(resObject) {
	        var record = _.findWhere(resObject.records, {'_soupEntryId': soupRecordId});
	        resolve(record);
	      }).catch(function(resObject){
	        reject(resObject);
	      });
	    });
	  }

	  function insertRecordUsingSmartStoreUtils(tableName, rec) {
	    return new Promise(function(resolve, reject) {
	      smartStoreUtils.insertRecords(tableName, [rec],
	        function(res) {
	          resolve(res);
	        },
	        function(err) {
	          reject(err);
	        }
	      );
	    });
	  }

	  function insertMobileLog(recs) {
	    return new Promise(function(resolve, reject) {
	      var remainingData = JSON.stringify(recs);
	      var dataToInsert = [];
	      // Push 'chunks' of data to array for processing further down
	      while (remainingData.length > 0) {
	        dataToInsert.push(remainingData.substring(0,32767));
	        remainingData = remainingData.substring(32767);
	      }
	      // Iterate over the data 'chunks', inserting each 'chunk' into the Mobile_Log_mc table
	      var sequence = Promise.resolve();
	      dataToInsert.forEach(function(data){
	        sequence = sequence.then(function() {
	          var mobileLog = {};
	          mobileLog.Name = "TMP-" + new Date().valueOf();
	          mobileLog.mobilecaddy1__Error_Text__c = data;
	          mobileLog.SystemModstamp = new Date().getTime();
	          return insertRecordUsingSmartStoreUtils('Mobile_Log__mc', mobileLog);
	        }).then(function(resObject) {
	          resolve(resObject);
	        }).catch(function(res){
	          reject(res);
	        });
	      });
	    });
	  }

  }

})();
/**
 * LocalNotificationService
 *
 * @description Enables device local notifications using Cordova Local-Notification Plugin
 *              (https://github.com/katzer/cordova-plugin-local-notifications)
 */
(function() {
  'use strict';

  angular
    .module('starter.services')
    .factory('LocalNotificationService', LocalNotificationService);

  LocalNotificationService.$inject = ['$cordovaLocalNotification', '$cordovaNetwork', 'devUtils', 'logger'];

  function LocalNotificationService($cordovaLocalNotification, $cordovaNetwork, devUtils, logger) {

    var lnDefaultTimeout = 600,  // 5 minutes
        lnDefaultId      = 100100,
        lnDefaultMsg     = 'Unsynced records';

    return {
      cancelNotification: cancelNotification,

      setLocalNotification: setLocalNotification,

      handleLocalNotification: handleLocalNotification,

      handleLocalNotificationClick: handleLocalNotificationClick,

      getLocalNotificationState: getLocalNotificationState,

      setLocalNotificationState: setLocalNotificationState
    };


    /**
     * @function cancelNotification
     * @description Attempts to cancel the localNotifcation with a certain id
     * @param  {string | number | undefined} id
     */
    function cancelNotification(id) {
      return new Promise(function(resolve, reject) {
        id =  (id) ? id : lnDefaultId;
        if (getLocalNotificationState() == "disabled") {
          logger.log('cancelNotification NotificationState disabled');
          resolve();
        } else {
          logger.log('cancelNotification', id);
          if (cordova && cordova.plugins && cordova.plugins.notification) {
            $cordovaLocalNotification.cancel(id).then(function (result) {
              logger.log('localNotification cancelled if it existed', id, result);
              resolve(result);
            });
          }
        }
    });
    }

    /**
     * @function setLocalNotification
     * @description Sets a localNotification for id
     * @param {string | number | undefined} id
     * @param {integer | undefined} secsTillNotify - number of seconds till notification
     * @param {string | undefined} msg
     */
    function setLocalNotification(id, secsTillNotify, msg) {
      return new Promise(function(resolve, reject) {
        if (getLocalNotificationState() == "disabled") {
          logger.log('setLocalNotification NotificationState disabled');
          resolve('ok');
        } else {
          // Set to defaults if needed
          id =  (id) ? id : lnDefaultId;
          secsTillNotify =  (secsTillNotify) ? secsTillNotify : lnDefaultTimeout;
          msg =  (msg) ? msg : lnDefaultMsg;

          logger.log('setLocalNotification id', id, secsTillNotify, msg );
          devUtils.dirtyTables().then(function(tables){
            if (tables && tables.length === 0 && id == lnDefaultId) {
              // do nothing if no dirtyTables and using defeault ID (the used by SyncService)
              logger.log('setLocalNotification no dirty tables', id);
              resolve();
            } else {
              if (cordova && cordova.plugins && cordova.plugins.notification) {
                var alarmTime = new Date();
                alarmTime.setSeconds(alarmTime.getSeconds() + secsTillNotify);
                logger.log('setLocalNotification alarmTime', alarmTime);
                $cordovaLocalNotification.isScheduled(id).then(function(isScheduled) {
                  logger.log('setLocalNotification isScheduled', isScheduled);
                  if (isScheduled) {
                    // update existing notification
                    $cordovaLocalNotification.update({
                      id: id,
                      at: alarmTime,
                    }).then(function (result) {
                      logger.log("localNotification updated", id, result);
                      resolve(result);
                    });
                  } else {
                    // set a new notification
                    var args = {
                      id: id,
                      at: alarmTime,
                      text: msg,
                      sound: null};
                    if (device.platform == "Android") {
                       args.ongoing = true;
                       args.smallIcon = "res://icon";
                    }
                    $cordovaLocalNotification.schedule(args).then(function (result) {
                      logger.log("localNotification has been set", id, result);
                      resolve(result);
                    });
                  }
                }).catch(function(err){
                  logger.error("setLocalNotification", JSON.stringify(err));
                  reject(err);
                });
              } else {
                logger.log('setLocalNotification no cordova plugin');
                resolve();
              }
            }
          });
        }
      });
    }

    function handleLocalNotification(id, state) {
      return new Promise(function(resolve, reject) {
        if (getLocalNotificationState() == "disabled") {
          logger.log('handleLocalNotification NotificationState disabled');
          resolve();
        } else {
          logger.log('handleLocalNotification', id, state);
          if (cordova && cordova.plugins && cordova.plugins.notification) {
            if (id == lnDefaultId) { // lnDefaultId is used for our syncProcess
              $cordovaLocalNotification.cancel(id, function(){});
              devUtils.dirtyTables().then(function(tables){
                //console.log('mc tables', tables);
                if (tables && tables.length !== 0) {
                  var isOnline = $cordovaNetwork.isOnline();
                  logger.log('handleLocalNotification isOnline', isOnline);
                  if (isOnline) {
                    // take this opportunity to set our network status in case it's wrong
                    localStorage.setItem('networkStatus', 'online');
                    resolve();
                    SyncService.syncAllTables();
                  } else {
                    // take this opportunity to set our network status in case it's wrong
                    localStorage.setItem('networkStatus', 'offline');
                    setLocalNotification(id).then(function(result){
                      resolve(result);
                    }).catch(function(e){
                      reject(e);
                    });
                  }
                } else {
                  resolve();
                }
              });
            } else {
              resolve();
            }
          } else {
            resolve();
          }
        }
      });
    }


    function handleLocalNotificationClick(id, state) {
      return new Promise(function(resolve, reject) {
        if (getLocalNotificationState() == "disabled") {
          logger.log('handleLocalNotification NotificationState disabled');
          resolve();
        } else {
          logger.log('handleLocalNotification', id, state);
          if (cordova && cordova.plugins && cordova.plugins.notification) {
            if (id == lnDefaultId) { // lnDefaultId is used for our syncProcess
              $cordovaLocalNotification.cancel(id, function(){});
              devUtils.dirtyTables().then(function(tables){
                //console.log('mc tables', tables);
                if (tables && tables.length !== 0) {
                  var isOnline = $cordovaNetwork.isOnline();
                  logger.log('handleLocalNotification isOnline', isOnline);
                  if (isOnline) {
                    // take this opportunity to set our network status in case it's wrong
                    localStorage.setItem('networkStatus', 'online');
                    resolve();
                  } else {
                    // take this opportunity to set our network status in case it's wrong
                    localStorage.setItem('networkStatus', 'offline');
                    setLocalNotification(id).then(function(result){
                      resolve(result);
                    }).catch(function(e){
                      reject(e);
                    });
                  }
                } else {
                  resolve();
                }
              });
            } else {
              resolve();
            }
          } else {
            resolve();
          }
        }
      });
    }

    function getLocalNotificationState() {
      var localNotificationState = localStorage.getItem("localNotificationState");
      if (localNotificationState === null) {
        localNotificationState = "enabled";
        localStorage.setItem("localNotificationState", localNotificationState);
      }
      return localNotificationState;
    }

    function setLocalNotificationState(status) {
      localStorage.setItem("localNotificationState", status);
    }

  }

})();
/**
 * Network Factory
 *
 * @description Handles network events (online/offline) and kicks off tasks if needed
 */
(function() {
  'use strict';

  angular
    .module('starter.services')
    .factory('NetworkService', NetworkService);

  NetworkService.$inject = ['$rootScope', 'SyncService', 'logger'];

  function NetworkService($rootScope, SyncService, logger) {
  	return {
	    networkEvent: networkEvent,

      getNetworkStatus: getNetworkStatus,

      setNetworkStatus: setNetworkStatus
	  };

	  function networkEvent(status){
      var pastStatus = localStorage.getItem('networkStatus');
      if (status == "online" && pastStatus != status) {
        // You could put some actions in here that you want to take place when
        // your app regains connectivity. For example see the Mobile Seed Apps
        // If you don't need this then you can ignore this. e.g.
        // SyncService.syncTables(['Table_x__ap', 'Table_y__ap'], true);
        //
        // TODO (TH) Are we doing this, I've not looked at the flows at the time of writing?
      }
      if (pastStatus != status) {
        $rootScope.$emit('networkState', {state : status});
      }
      localStorage.setItem('networkStatus', status);
      logger.log("NetworkService " + status);
      return true;
    }

   	function getNetworkStatus() {
      return localStorage.getItem('networkStatus');
    }

    function setNetworkStatus(status) {
	      localStorage.setItem('networkStatus', status);
     }

  }

})();
/**
 * Outbox Factory
 *
 * @description Gets data for the Outbox menu option.
 *
 */
(function() {
  'use strict';

  angular
    .module('starter.services')
    .factory('OutboxService', OutboxService);

  OutboxService.$inject = ['devUtils', 'logger'];

  function OutboxService(devUtils, logger) {

    return {
      getDirtyRecordsCount: getDirtyRecordsCount,
      getDirtyRecords: getDirtyRecords
    };

    function getDirtyRecordsCount() {
      return new Promise(function(resolve, reject) {
        devUtils.readRecords('recsToSync', []).then(function(resObject) {
          var records = _.chain(resObject.records)
            .filter(function(el){
                return (el.Mobile_Table_Name != "Connection_Session__mc" && el.Mobile_Table_Name != "Mobile_Log__mc") ? true : false;
              })
            .value();
          resolve(records.length);
        }).catch(function(resObject){
          // console.error('getDirtyRecordsCount ', angular.toJson(resObject));
          logger.error('getDirtyRecordsCount ' + angular.toJson(resObject));
          reject(resObject);
        });
      });
    }

    function getDirtyRecords() {
      return new Promise(function(resolve, reject) {
        devUtils.readRecords('recsToSync', []).then(function(resObject) {
          var records = _.chain(resObject.records)
            .filter(function(el){
                return (el.Mobile_Table_Name != "Connection_Session__mc" && el.Mobile_Table_Name != "Mobile_Log__mc") ? true : false;
              })
            .value();
          resolve(records);
        }).catch(function(resObject){
          // console.error('getDirtyRecords ', angular.toJson(resObject));
          logger.error('getDirtyRecords ' + angular.toJson(resObject));
          reject(resObject);
        });
      });
    }

  }

})();
/**
 * Sync Factory
 *
 * @description Handles Sync calls to the MobileCaddy API amd gets/sets sync state
 *
 */
(function() {
	'use strict';

	angular
		.module('starter.services')
		.factory('SyncService', SyncService);

	SyncService.$inject = ['$rootScope', 'devUtils', 'LocalNotificationService','UserService'];

	function SyncService($rootScope, devUtils, LocalNotificationService, UserService) {

		// Just a guess at the record age that is acceptable to be on the device
		// Set as needed for your use case
		var fourHours = 1000 * 60 * 60 * 4; // 4 hours in milliseconds

		// This is where you put your list of tables that you want from the platform
		var appTables = [
			// {'Name': 'myDummyTable1__ap', 'syncWithoutLocalUpdates': true, 'maxTableAge' : fourHours},
			// {'Name': 'myDummyTable2__ap', 'syncWithoutLocalUpdates': true, 'maxTableAge' : fourHours}
		];

		var appTablesSyncNow = [
			// {'Name': 'myDummyTable1__ap', 'syncWithoutLocalUpdates': true, 'maxTableAge' : 0}
		];


		return {
			appTables: appTables,

			getSyncLock: getSyncLock,

			setSyncLock: setSyncLock,

			getSyncState: getSyncState,

			setSyncState: setSyncState,

			syncAllTables: syncAllTables,

			syncAllTablesNow: syncAllTablesNow,

			syncTables: syncTables,

			initialSync: initialSync,

			coldStartSync: coldStartSync,

			pushTables: pushTables

		};


		/**
		 * @function getSyncLock
		 * @description gets syncLockName value from localStorage, or "false" if not set
		 * @param {string | undefined} syncLockName
		 * @return {string}
		 */
		function getSyncLock(syncLockName) {
			if (!syncLockName) syncLockName = 'syncLock';
			var syncLock = localStorage.getItem(syncLockName);
			if (syncLock === null) {
				syncLock = "false";
				localStorage.setItem(syncLockName, syncLock);
			}
			return syncLock;
		}


		/**
		 * @function setSyncLock
		 * @description Sets syncLockName value in localStorage item
		 * @param {string} syncLockName
		 * @param {string} status
		 */
		function setSyncLock(syncLockName, status) {
			if (!status) {
				status = syncLockName;
				syncLockName = 'syncLock';
			}
			localStorage.setItem(syncLockName, status);
		}


		/**
		 * @function getSyncState
		 * @description gets syncState from localStorage, or "complete" if not set
		 * @return {string}
		 */
		function getSyncState() {
			var syncState = localStorage.getItem("syncState");
			if (syncState === null) {
				syncState = "Complete";
				localStorage.setItem("syncState", syncState);
			}
			return syncState;
		}


		/**
		 * @function setSyncState
		 * @description Sets syncState localStorage item
		 * @param {string} status
		 */
		function setSyncState(status) {
			localStorage.setItem("syncState", status);
		}


		/**
		 * @function initialSync
		 * @description Makes initialSync call for all (biz logic) tables
		 * @return {promise}
		 */
		function initialSync() {
			// return syn/cAllTables();
			return new Promise(function(resolve, reject) {
				setSyncState("syncing");
				var initialTabArr = [];
				appTables.forEach(function(el){
					if (el.syncWithoutLocalUpdates) initialTabArr.push(el.Name);
				});
				//console.log('initialSync', initialTabArr);
				devUtils.initialSync(initialTabArr).then(function(res){
					UserService.setProcessDone("initialDataLoaded");
					$rootScope.$emit('syncTables', {result : "InitialLoadComplete"});
					setSyncState("Complete");
					resolve();
				}).catch(function(resObject){
					// TODO LOGGER in MOCK FOR UNIT TEST
					console.error('initialSync ',resObject);
					reject(resObject);
				});
			});
		}


		/**
		 * @function coldStartSync description
		 * @description Calls iterative sync on all tables (Mobile_Log__mc first)
		 * @return {promise}
		 */
		function coldStartSync() {
			return new Promise(function(resolve, reject) {
				//console.log("coldStartSync");
				var myAppTables = [{'Name': 'Mobile_Log__mc', 'syncWithoutLocalUpdates': false, 'maxTableAge' : fourHours}].concat(appTables);
				syncTables(myAppTables).then(function(resObject){
					//console.log('coldStartSync', resObject);
					resolve(resObject);
				});
				// IT ALWAYS RESOLVES
				// }) .catch(function(resObject){
				//     logger.warn('syncAllTables ',resObject);
				//     reject(resObject);
				// });
			});
		}


		/**
		 * @function syncAllTables description
		 * @description Calls iterative sync on all tables (Mobile_Log__mc first)
		 * @return {promise}
		 */
		function syncAllTables() {
			return new Promise(function(resolve, reject) {
				var myAppTables = appTables;
				myAppTables.push({'Name': 'Mobile_Log__mc', 'syncWithoutLocalUpdates': false, 'maxTableAge' : fourHours});
				syncTables(myAppTables).then(function(resObject){
					//console.log('syncAllTables', resObject);
					resolve(resObject);
				});
				// IT ALWAYS RESOLVES
				// }) .catch(function(resObject){
				//     logger.warn('syncAllTables ',resObject);
				//     reject(resObject);
				// });
			});
		}


		/**
		 * @function syncAllTablesNow
		 * @description Calls iterative sync on all tables now
		 * @return {promise}
		 */
		function syncAllTablesNow() {
			return new Promise(function(resolve, reject) {
				syncTables(appTablesSyncNow).then(function(resObject){
					//console.log('syncAllTablesNow', resObject);
					resolve(resObject);
				});
				// IT ALWAYS RESOLVES
				// }) .catch(function(resObject){
				//     logger.warn('syncAllTablesNow ',resObject);
				//     reject(resObject);
				// });
			});
		}


		/**
		 * @function syncTables
		 * @description syncs tables to/from SFDC
		 * @param  {object[]} - array of {Name, syncWithoutLocalUpdates, maxTableAge}
		 */
		function syncTables(tablesToSync){
			return new Promise(function(resolve, reject) {
				// TODO - put some local notification stuff in here.
				doSyncTables(tablesToSync).then(function(res){
					// console.log("syncTables", res);
					$rootScope.$emit('syncTables', {result : "Complete"});
					setSyncState("Complete");
					// NOTE - Commented out for the time being - see TOPS-96
					if (!res || res.status == 100999) {
						LocalNotificationService.setLocalNotification();
					} else {
						LocalNotificationService.cancelNotification();
					}
					resolve(res);
				});
				// IT ALWAYS RESOLVES
				// }).catch(function(e){
				// 	logger.warn('syncTables', e);
				// 	$rootScope.$emit('syncTables', {result : "Complete"});
				//    setSyncState("Complete");
				//    reject(e);
				// });
			});
		}

		/**
		 * @description This is used to push a list of tables only if there are records waiting to be pushed
		 * @param string[] Array of table names to be synced in order
		 **/
		function pushTables(tablesToPush) {
			// Loop through the tables and build up an array of {Name, syncWithoutLocalUpdates, maxTableAge}
			var tablesToSync = [];
			tablesToPush.forEach(function(el){
				tablesToSync.push({'Name':el, 'syncWithoutLocalUpdates':false, 'maxTableAge':0});
			});
			// console.log('tops tablesToSync ',tablesToSync);
			return new Promise(function(resolve, reject) {
				// TODO - put some local notification stuff in here.
				doSyncTables(tablesToSync).then(function(res){
					// console.log("syncTables", res);
					$rootScope.$emit('syncTables', {result : "Complete"});
					setSyncState("Complete");
					// NOTE - Commented out for the time being - see TOPS-96
					if (!res || res.status == 100999) {
					 LocalNotificationService.setLocalNotification();
					} else {
					 LocalNotificationService.cancelNotification();
					}
					resolve(res);
				});
				// IT ALWAYS RESOLVES
				// }).catch(function(e){
				//  logger.warn('syncTables', e);
				//  $rootScope.$emit('syncTables', {result : "Complete"});
				//    setSyncState("Complete");
				//    reject(e);
				// });
			});
		}

		function doSyncTables(tablesToSync){
			// Check that we not syncLocked or have a sync in progress
			var syncLock = getSyncLock();
			var syncState = getSyncState();
			if (syncLock == "true" || syncState == "syncing") {
				return Promise.resolve({status:100999});
			} else {
				setSyncState("syncing");
				$rootScope.$emit('syncTables', {result : "StartSync"});

				var stopSyncing = false;
				var sequence = Promise.resolve();

				return tablesToSync.reduce(function(sequence, table){
					if (typeof(table.maxTableAge) == "undefined") {
						table.maxTableAge = (1000 * 60 * 1); // 3 minutes
					}
					return sequence.then(function(res) {
						//console.log("doSyncTables inSequence", table, res, stopSyncing);
						//$rootScope.$emit('syncTables', {result : "TableComplete " + table.Name});
						if (!stopSyncing) {
							return devUtils.syncMobileTable(table.Name, table.syncWithoutLocalUpdates, table.maxTableAge);
						} else {
							//console.log("skipping sync");
							return {status:100999};
						}
					}).then(function(resObject){
						switch (resObject.status) {
							case devUtils.SYNC_NOK :
							case devUtils.SYNC_ALREADY_IN_PROGRESS :
								if (typeof(resObject.mc_add_status) == "undefined" || resObject.mc_add_status != "no-sync-no-updates") {
									stopSyncing = true;
									setSyncState("Complete");
								}
						}
						$rootScope.$emit('syncTables', {table: table.Name, result : resObject.status});
						return resObject;
					}).catch(function(e){
						//console.error('doSyncTables', e);
						if (e.status != devUtils.SYNC_UNKONWN_TABLE) {
							stopSyncing = true;
							$rootScope.$emit('syncTables', {table: table.Name, result : e.status});
							setSyncState("Complete");
						}
						return e;
					});
				}, Promise.resolve());

			}
		}


	}

})();

/**
 * User Factory
 *
 * @description User services: sets/gets current user id; sets/gets 'processes' local storage
 * sync status.
 */
(function() {
  'use strict';

  angular
    .module('starter.services')
    .factory('UserService', UserService);

  UserService.$inject = ['devUtils', 'logger'];

  function UserService(devUtils, logger) {

    return {
      getCurrentUserId: getCurrentUserId,
      setCurrentUserId: setCurrentUserId,
      hasDoneProcess: hasDoneProcess,
      setProcessDone: setProcessDone,
    };

    function getCurrentUserId() {
      return new Promise(function(resolve, reject) {
        var currentUserId = localStorage.getItem('currentUserId');
        if (currentUserId !== null) {
          resolve(currentUserId);
        } else {
          devUtils.getCurrentUserId().then(function(userId){
            localStorage.setItem('currentUserId', userId);
            resolve(userId);
          }).catch(function(resObject){
            logger.log('getCurrentUserId',resObject);
            reject(resObject);
          });
        }
      });
    }

    function setCurrentUserId(userId) {
      return new Promise(function(resolve, reject) {
        localStorage.setItem('currentUserId', userId);
        resolve(true);
      });
    }

    function hasDoneProcess(processName) {
      return new Promise(function(resolve, reject) {
        var processes = JSON.parse(localStorage.getItem('processes'));
        if (processes === null) {
          resolve(false);
        } else {
          if (processes[processName] == "true") {
            resolve(true);
          } else {
            resolve(false);
          }
        }
      });
    }

    function setProcessDone(processName) {
      return new Promise(function(resolve, reject) {
        logger.log('setProcessDone',processName);
        var processes = JSON.parse(localStorage.getItem('processes'));
        if (processes === null) {
          processes = {};
        }
        processes[processName] = "true";
        localStorage.setItem('processes', JSON.stringify(processes));
        resolve(true);
      });
    }

  }

})();
