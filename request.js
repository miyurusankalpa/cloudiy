 
 var airports = $.get("/data/airports.json");
 var emoji2 = $.get("/data/emoji.json");

 //'use strict';
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
    return ('X-FASTLY-REQUEST-ID' in this.headers) || (('X-SERVED-BY' in this.headers) && ('X-TIMER' in this.headers));
  };
  
  Request.prototype.servedByMaxCDN = function () {
    return ('SERVER' in this.headers) && (this.headers.SERVER.split('/')[0] === 'NetDNA-cache');
  };
  
  Request.prototype.servedByKeyCDN = function () {
    return ('SERVER' in this.headers) && (this.headers.SERVER === 'keycdn-engine');
  };
  
  Request.prototype.servedByEdgeCast = function () {
	return ('SERVER' in this.headers) && ((this.headers.SERVER.split(' ')[0] === 'ECS') || (this.headers.SERVER.split(' ')[0] === 'ECD'));
  };
  
  Request.prototype.servedByRailgun = function () {
    return 'CF-RAILGUN' in this.headers;
  };

  Request.prototype.servedOverH2 = function () {
	return ('X-FIREFOX-SPDY' in this.headers) && (this.headers['X-FIREFOX-SPDY'] === 'h2');
  };

  Request.prototype.ServedFromBrowserCache = function () {
    return this.details.fromCache;
  };
  
  // RAY ID header format: CF-RAY:f694c6892660106-SIN
  Request.prototype.getCloudFlareRayID = function () {
    return this.headers['CF-RAY'].split('-')[0];
  };

  // see ^^
  Request.prototype.getCloudFlareLocationCode = function () {
    return this.headers['CF-RAY'].split('-')[1];
  };
  
  // X-Served-By:"cache-sin6927-SIN"
  Request.prototype.getFastlyLocationCode = function () {
    return this.headers['X-SERVED-BY'].split('-')[2];
  };
  
  //X-Fastly-Request-ID:"3b8439a68c9e6237530ecafdf2579044b51049f6"
  Request.prototype.getFastlyReqID = function () {
    return this.headers['X-FASTLY-REQUEST-ID'];
  };
  
  // Server:"ECS (fcn/9F92)"
  Request.prototype.getEdgeCastLocationCode = function () {
    return this.headers['SERVER'].split(' ')[1].split('/')[0].toUpperCase();
  };
  
  // x-edge-location:"sgsg" this anit airport codes
  Request.prototype.getKeyCDNLocationCode = function () {
    return this.headers['X-EDGE-LOCATION'].substring(0,2).toUpperCase();
  };
  
  // You are hitting the MaxCDN Singapore Datacenter<br><img src=netdna.gif?city=202 >
  Request.prototype.getMaxCDNLocationCode = function (data) {
	for(var propName in airports) {
    if(airports.hasOwnProperty(propName)) {
		//skip, wrong city name, this will be fixed in the minifed version
		if(propName=='XSP') continue;
        var propValue = airports[propName];
		if(propValue['city']==data) { return propName; break; }
			}
		};
  };

  Request.prototype.getCloudFlareLocationData = function () {
    var locationCode = this.getCloudFlareLocationCode();
    return airports[locationCode];
  };

  Request.prototype.getLocationName = function (LocationCode) {
	   console.log(airports);

    var airportData = airports.responseJSON[LocationCode];
    if (airportData) {
      return airportData.city + ', ' + airportData.country;
    }

    return LocationCode;
  };
  
  Request.prototype.getCache = function () {
	 if(this.headers['X-CACHE-HIT']) return this.headers['X-CACHE-HIT'].toUpperCase();
	 if(this.headers['X-CACHE']) return this.headers['X-CACHE'].toUpperCase();
	 if(this.headers['CF-CACHE-STATUS']) return this.headers['CF-CACHE-STATUS'].toUpperCase();
    return "N/A";
  };
  
  Request.prototype.getLocationNameCountry = function (LocationCode) {
    var airportData = airports.responseJSON[LocationCode];
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
	var emoji = emoji2.responseJSON;
	for(var propName in emoji) {
    if(emoji.hasOwnProperty(propName)) {
        var propValue = emoji[propName];
		if(locationCode.length>2) {
		if(propValue["name"]==locationCountry) return propValue["emoji"];
		} else {
		if(propValue["code"]==locationCode) { console.log(propValue); return propValue["emoji"];}
		}
	  }
	}
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
        19: 'icons/Cloudiy128.png',
        38: 'icons/Cloudiy.png'
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