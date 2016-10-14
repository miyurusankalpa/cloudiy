$('#load').show();
$('head').append('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/octicons/4.3.0/octicons.min.css">\
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/octicons/4.3.0/font/octicons.min.css">');

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
		$('#load').hide();
		$('#ipAddress').hide();
		$('#location').hide();
		$('#actions').hide();
	}
		
	var is_cdn = false;
	
    $('#ip').text(request.getServerIP());
	$('#tracert').val('tracert '+request.getServerIP());
	$('#ping').val('ping '+request.getServerIP());
	
    // CloudFlare
    if (request.servedByCloudFlare()) {
	  $('#provider').text("Cloudflare"); var is_cdn = true;
      $('#rqID').text(request.getCloudFlareRayID());

	  var LocationCode = request.getCloudFlareLocationCode();
      $('#traceURL').attr('href', request.getCloudFlareTrace());
	  $('#test2').attr('src', 'https://blog.cloudflare.com/content/images/2016/09/cf-blog-logo-crop.png');
    } else {
		 $('#traceURL').hide();
	}
	
	// Fastly
    if (request.servedByFastly()) {
	  $('#provider').text("Fastly"); var is_cdn = true;
      $('#rqID').text(request.getFastlyReqID());
	  var LocationCode = request.getFastlyLocationCode();
	  $('#test2').attr('src', 'https://www.fastly.com/sites/all/themes/custom/fastly2016/logo.png');
    }
	
	// MaxCDN
    if (request.servedByMaxCDN()) {
	  $('#provider').text("MaxCDN"); var is_cdn = true;
	  jQuery.get("http://"+request.getServerIP(), function(data, status){
            //console.log("Data: " + data + "\nStatus: " + status);
		  var LocationCode = request.getMaxCDNLocationCode(data.split(' ')[5]);
		  test1(LocationCode);
	  });
	  $('#test2').attr('src', 'https://www.maxcdn.com/wp-content/themes/maxcdn/assets/img/branding/maxcdn-stackpath-logo.svg');
    }
	
	// KeyCDN
    if (request.servedByKeyCDN()) {
	  $('#provider').text("KeyCDN"); var is_cdn = true;
      //$('#rayID').text(request.getRayID());
	  var LocationCode = request.getKeyCDNLocationCode();
	  $('#test2').attr('src', 'https://cdn.keycdn.com/img/logo.svg');
    }
	
	// EdgeCast
    if (request.servedByEdgeCast()) {
	  $('#provider').text("EdgeCast"); var is_cdn = true;
      //$('#rayID').text(request.getRayID());
	   var LocationCode = request.getEdgeCastLocationCode();
	  $('#test2').attr('src', 'https://upload.wikimedia.org/wikipedia/commons/9/9b/EdgeCast_logo.png');
    }
	
	if(!is_cdn){
		$('#test5').show();
		$('#load').hide();
		$('#ipAddress').hide();
		$('#location').hide();
		$('#actions').hide();
		/*jQuery.getJSON("https://ipinfo.io/"+request.getServerIP()+"/json/", function(data, status){
            console.log("Data: " + data + "\nStatus: " + status);
	  $('#provider').text(data.org);
	  $('#host').text(data.hostname);
      //$('#rayID').text(request.getRayID());
      $('#locationCode').text(data.country);
      $('#locationName').text(data.city);
	  $('#test').attr('src', 'https://emoji.beeimg.com/'+request.getLocationEmoji(data.country));
	  });*/
	  $('#load').hide();
	} else{
		if($('#rqID').val()=="")  $('#rqID').hide();
		test1(LocationCode); test2(request);
	}
	
	function test1(LocationCode){
		$('#locationCode').text(LocationCode);
        $('#locationName').text(request.getLocationName(LocationCode));
		$('#test').attr('src', 'https://emoji.beeimg.com/'+request.getLocationEmoji(LocationCode));
		$('#load').hide();
	}
	
	function test2(request){
	  $('#bad1').addClass("badge new badge-"+test3(request.getCache())).text("Cache: "+request.getCache());
	  $('#bad2').addClass("badge new badge-"+test3(request.servedOverH2())).text("HTTP2: "+request.servedOverH2());
	  $('#bad3').addClass("badge new badge-"+test3(request.isv6IP())).text("IPv6: "+request.isv6IP());
	}
	
	function test3(response){
		if(response=='HIT') return "success"; else if(response=='MISS') return "warning"; else if(response==true) return "success"; else if(response==false) return "warning"; else return "primary";
	}

  });
})();