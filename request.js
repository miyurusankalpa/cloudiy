define(['airports','emoji'], function (airports,emoji) {
  'use strict';

  // the Request object, contains information about a request
  var Request = function (details) {
    this.details = details;
    this.headersRaw = details.responseHeaders;

    // headers will be stored as name: value pairs (all names will be upper case)
    this.headers = {};

    // weather the request object knows about the SPDY status or not
    // this status is available in the context of the page, requires message passing
    // from the extension to the page
    this.hasConnectionInfo = false;
    this.SPDY = false;
    this.connectionType = null;

    this.preProcessHeaders();
  };

  // convert the headers array into an object and upcase all names
  // (warning! will preserve only last of multiple headers with same name)
  Request.prototype.preProcessHeaders = function () {
    this.headersRaw.forEach(function (header) {
      this.headers[header.name.toUpperCase()] = header.value;
    }, this);

    /*if ('CF-RAILGUN' in this.headers) {
      this.processRailgunHeader();
    }
	if ('X-FASTLY-REQUEST-ID' in this.headers) {
      //this.processFastly();
    }*/
  };

  Request.prototype.queryConnectionInfoAndSetIcon = function () {
    var tabID = this.details.tabId;
    if (this.hasConnectionInfo) {
      this.setPageActionIconAndPopup();
    } else {
      var csMessageData = {
        action: 'check_connection_info'
      };
      var csMessageCallback = function (csMsgResponse) {
        // stop and return if we don't get a response, happens with hidden/background tabs
        if (typeof csMsgResponse === 'undefined') {
          return;
        }

        var request = window.requests[tabID];
        request.setConnectionInfo(csMsgResponse);
        request.setPageActionIconAndPopup();
      };

      try {
        chrome.tabs.sendMessage(this.details.tabId, csMessageData, csMessageCallback);
      } catch (err) {
        console.log('caught exception when sending message to content script');
        console.log(chrome.extension.lastError());
        console.log(err);
      }
    }
  };

  // check if the server header matches 'cloudflare-nginx'
  Request.prototype.servedByCloudFlare = function () {
    return ('SERVER' in this.headers) && (this.headers.SERVER === 'cloudflare-nginx');
  };
  
  Request.prototype.servedByFastly = function () {
    return ('X-FASTLY-REQUEST-ID' in this.headers) && ('X-SERVED-BY' in this.headers);
  };
  
  Request.prototype.servedByMaxCDN = function () {
    return ('SERVER' in this.headers) && (this.headers.SERVER.split('/')[0] === 'NetDNA-cache');
  };
  
  Request.prototype.servedByRailgun = function () {
    return 'CF-RAILGUN' in this.headers;
  };

  Request.prototype.servedOverH2 = function () {
    return this.SPDY && this.connectionType === 'h2';
  };

  Request.prototype.ServedFromBrowserCache = function () {
    return this.details.fromCache;
  };
  
  // RAY ID header format: CF-RAY:f694c6892660106-SIN
  Request.prototype.getRayID = function () {
    return this.headers['CF-RAY'].split('-')[0];
  };

  Request.prototype.getCloudFlareLocationCode = function () {
    return this.headers['CF-RAY'].split('-')[1];
  };
  
  // X-Served-By:"cache-sin6927-SIN"
  Request.prototype.getFastlyLocationCode = function () {
    return this.headers['X-SERVED-BY'].split('-')[2];
  };
  
  // You are hitting the MaxCDN Singapore Datacenter<br><img src=netdna.gif?city=202 >
  Request.prototype.getMaxCDNLocationCode = function (data) {
	for(var propName in airports) {
    if(airports.hasOwnProperty(propName)) {
		if(propName=='XSP') continue;
        var propValue = airports[propName];
		if(propValue['city']==data) { console.log(propName); return propName; break; }
			}
		};
  };

  Request.prototype.getCloudFlareLocationData = function () {
    var locationCode = this.getCloudFlareLocationCode();
    return airports[locationCode];
  };

  Request.prototype.getLocationName = function (LocationCode) {
    var airportData = airports[LocationCode];
    if (airportData) {
      return airportData.city + ', ' + airportData.country;
    }

    return LocationCode;
  };
  
  Request.prototype.getLocationNameCountry = function (LocationCode) {
    var airportData = airports[LocationCode];
    if (airportData) {
      return airportData.country;
    }

    return LocationCode;
  };

  Request.prototype.getCloudFlareTrace = function () {
    var traceURL = new URL(this.details.url);
    traceURL.pathname = '/cdn-cgi/trace';
    return traceURL.toString();
  };

  Request.prototype.getTabID = function () {
    return this.details.tabId;
  };

  Request.prototype.getRequestURL = function () {
    return this.details.url;
  };

  Request.prototype.getRailgunMetaData = function () {
    return this.railgunMetaData;
  };

  Request.prototype.getServerIP = function () {
    return this.details.ip ? this.details.ip : '';
  };
  
  Request.prototype.getIcon = function (i) {
    var dURL = new URL(this.details.url);
    if(i===1) dURL.pathname = '/apple-touch-icon.png';
	if(i===2) dURL.pathname = '/favcion.ico';
    return dURL.toString();
  };

  Request.prototype.isv6IP = function () {
    return this.getServerIP().indexOf(':') !== -1;
  };

  Request.prototype.getLocationEmoji = function (locationCode) {
	var locationCountry = this.getLocationNameCountry(locationCode);
	for(var propName in emoji) {
    if(emoji.hasOwnProperty(propName)) {
        var propValue = emoji[propName];
		if(locationCode.length>2) {
		if(propValue['name']==locationCountry) return propValue['emoji'];
		} else {
		if(propValue['code']==locationCode) { console.log(propValue); return propValue['emoji'];}
		}
	  }
	}
  };
  
  // figure out what the page action should be based on the
  // features we detected in this request
  Request.prototype.getPageActionPath = function () {
    return this.getImagePath('images/claire-3-');
  };

  Request.prototype.getPopupPath = function () {
    return this.getImagePath('images/claire-3-popup-');
  };

  Request.prototype.getImagePath = function (basePath) {
    var iconPathParts = [];

    if (this.servedByCloudFlare()) {
      iconPathParts.push('on');
    } else {
      iconPathParts.push('off');
    }

    if (this.servedOverH2()) {
      iconPathParts.push('h2');
    }

    if (this.isv6IP()) {
      iconPathParts.push('ipv6');
    }

    if (this.servedByRailgun()) {
      iconPathParts.push('rg');
    }

    return basePath + iconPathParts.join('-');
  };

  Request.prototype.setConnectionInfo = function (connectionInfo) {
    this.hasConnectionInfo = true;
    this.SPDY = connectionInfo.spdy;
    this.connectionType = connectionInfo.type;
  };

  Request.prototype.setPageActionIconAndPopup = function () {
    var iconPath = this.getPageActionPath();
    var tabID = this.details.tabId;
    chrome.pageAction.setIcon({
      tabId: this.details.tabId,
      path: {
        19: iconPath + '.png',
        38: iconPath + '@2x.png'
      }
    }, function () {
      try {
        chrome.pageAction.setPopup({
          tabId: tabID,
          popup: 'popup/settings.html'
        });
        chrome.pageAction.show(tabID);
      } catch (err) {
        console.log('Exception on page action show for tab with ID: ', tabID, err);
      }
    });
  };

  Request.prototype.logToConsole = function () {
    /*if (localStorage.getItem('debug_logging') !== 'yes') {
      return;
    }*/

    console.log('\n');
    console.log(this.details.url, this.details.ip, 'CF - ' + this.servedByCloudFlare());
    console.log('Request - ', this.details);
    if (this.servedByCloudFlare()) {
      console.log('Ray ID - ', this.getRayID());
    }
    if (this.servedByRailgun()) {
      var railgunMetaData = this.getRailgunMetaData();
      console.log('Railgun - ', railgunMetaData.id, railgunMetaData.messages.join('; '));
    }
  };

  return Request;
});
