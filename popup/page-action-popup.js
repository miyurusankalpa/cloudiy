$('#load').show();
(function () {
  'use strict';
  /* global $ */
  // get the current tab's ID and extract request info
  // from the extension object
  var queryInfo = {
    active: true,
    windowId: chrome.windows.WINDOW_ID_CURRENT
  };

  chrome.tabs.query(queryInfo, function (tabs) {
    var tabID = tabs[0].id;
    // get the extension's window object
    var extensionWindow = chrome.extension.getBackgroundPage();
    var request = extensionWindow.requests[tabID];
	
	if(!request) {
		console.log("error");
		$('#test4').show();
		$('#ipAddress').hide();
		$('#location').hide();
	}
		
	var is_cdn = false;
	
    $('#ip').text(request.getServerIP());
	$('#tracert').val('tracert '+request.getServerIP());
	$('#ping').val('ping '+request.getServerIP());
	
    // CloudFlare
    if (request.servedByCloudFlare()) {
	  $('#provider').text("Cloudflare"); var is_cdn = true;
      $('#rayID').text(request.getRayID());
      $('#locationCode').text(request.getCloudFlareLocationCode());
      $('#locationName').text(request.getLocationName(request.getCloudFlareLocationCode()));
      $('#traceURL').attr('href', request.getCloudFlareTrace());
	  $('#test').attr('src', 'https://emoji.beeimg.com/'+request.getLocationEmoji(request.getCloudFlareLocationCode()));
	  $('#test2').attr('src', 'https://blog.cloudflare.com/content/images/2016/09/cf-blog-logo-crop.png');
    }
	
	// Fastly
    if (request.servedByFastly()) {
	  $('#provider').text("Fastly"); var is_cdn = true;
      //$('#rayID').text(request.getRayID());
      $('#locationCode').text(request.getFastlyLocationCode());
      $('#locationName').text(request.getLocationName(request.getFastlyLocationCode()));
      //$('#traceURL').attr('href', request.getCloudFlareTrace());
	  $('#test').attr('src', 'https://emoji.beeimg.com/'+request.getLocationEmoji(request.getFastlyLocationCode()));
	  $('#test2').attr('src', 'https://www.fastly.com/sites/all/themes/custom/fastly2016/logo.png');
    }
	
	// MaxCDN
    if (request.servedByMaxCDN()) {
	  $('#provider').text("MaxCDN"); var is_cdn = true;
	  jQuery.get("http://"+request.getServerIP(), function(data, status){
            console.log("Data: " + data + "\nStatus: " + status);
			console.log(data.split(' ')[5]);
			var LocationCode = request.getMaxCDNLocationCode(data.split(' ')[5]);
	  console.log(LocationCode);
      //$('#rayID').text(request.getRayID());
      $('#locationCode').text(LocationCode);
      $('#locationName').text(request.getLocationName(LocationCode));
	  $('#test').attr('src', 'https://emoji.beeimg.com/'+request.getLocationEmoji(LocationCode));
	  });
	  $('#test2').attr('src', 'https://www.maxcdn.com/wp-content/themes/maxcdn/assets/img/branding/maxcdn-stackpath-logo.svg');
    }
	
	if(!is_cdn){
		jQuery.getJSON("https://ipinfo.io/"+request.getServerIP()+"/json/", function(data, status){
            console.log("Data: " + data + "\nStatus: " + status);
	  $('#provider').text(data.org);
	  $('#host').text(data.hostname);
      //$('#rayID').text(request.getRayID());
      $('#locationCode').text(data.country);
      $('#locationName').text(data.city);
	  $('#test').attr('src', 'https://emoji.beeimg.com/'+request.getLocationEmoji(data.country));
	  });
	}
	
	$('#load').hide();

  });
})();
