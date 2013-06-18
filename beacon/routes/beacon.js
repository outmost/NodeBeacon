/*
 * GET beacon.
 */

var StatsD = require('node-statsd').StatsD
	, tldtools = require('tldtools').init()
	, http = require('http')
	, qs = require('querystring')
	, ms = require('ms')
	, geoip = require('geoip-lite')
	, useragent = require('useragent');

exports.beacon = function(req, res){

    // Parse "u" parameter from request URL using tldtools
    var ref = req.query.u;
	var domain = tldtools.extract(ref);
	var root = domain.domain;

	// get TLD (.com / .co.uk / .de ... etc)
	var tld = domain.tld;
	// replace periods in tld with underscores ready for graphite
	var cleanTld = tld.replace(/\./g, '_');
	// check if subdomain (inc www), if no subdomain then assign to www
	if(domain.subdomain.length < 1) {
		var subdomain = "www";
	}
	else {
		var subdomain = domain.subdomain;
	}

	// http or https?
	var protocol = domain.url_tokens.protocol;
	var pageType = req.query.pageType;
	var userStatus = req.query.userStatus;
        
	// Parse "ip" parameter from request headers using GEO IP
	var ip = req.ip;
	var loc = geoip.lookup(ip);
	var country = loc.country;
	var region = loc.region;

	// Get User Agent from Request headers, parse using useragent
    var userAgent = req.headers['user-agent'];
	var ua = useragent.lookup(userAgent);
	var browser = ua.family;
	var browserVersion = ua.major;
	var os = ua.os.family;
	var device = ua.device.family;

	// move this to Boomerang to ease load on Node Beacon?
	var uaString = ua.toString();
	var mobileTest = uaString.toLowerCase();

	if(mobileTest.match(/(ipad)|(iphone)|(ipod)|(android)|(webos)/i)){
		var deviceType = "mobile";
	}
	else {
		var deviceType = "desktop";
	}

	// Check to see if the "r" (referrer) parameter is empty, if so then mark as New Visit
	// NOTE: assumes users are not tracked across domains - a user browsing between www.example.com and blog.example.com would be marked as a repeat visit, even if the www and blog site share no cachable files.
	if (req.query.r.length >= 1) {
		var visitType = "repeat";
	}
	else {
		var visitType = "new";
	}
		
	// Parse load time parameters and convert to milliseconds using ms
	var responseTime = ms(req.query.t_resp);
	var pageReady = ms(req.query.t_page);
	var docComplete = ms(req.query.t_done);
 
 
	// Send a 204 Response (no content)
	res.writeHead( 204 );
	res.end();
 
	//Debug me (remove for production use)
	
	// domain
	console.log("root domain:" + root);
	console.log("tld:" + tld);
	console.log("subdomain:" + subdomain);
	console.log("protocol:" + protocol);
	// ip
	console.log("country IP:" + country);
	console.log("region IP:" + region);
	// ua
	console.log("useragent:" + ua);
	console.log("os:" + os);
	console.log("device:" + device);
	console.log("isMobile:" + deviceType);
	//graphite
	console.log("graphite pathname:" + root + "." + tld);

	// Connect to StatsD (hostname, port number) and send timing data
	var c = new StatsD('127.0.0.1',8125);

	//c.timing(root+'.'+tld+'.'+subdomain+'.pages.'+pageType+'.TTFB', responseTime);
	//c.timing(root+'.'+tld+'.'+subdomain+'.pages.'+pageType+'.Render', pageReady);
	c.timing(root+'.'+cleanTld+'.'+subdomain+'.pageTypes.'+pageType+'.docComplete', docComplete);

	c.timing(root+'.'+cleanTld+'.'+subdomain+'.geographical.'+country+'.'+region+'.docComplete', docComplete);

	c.timing(root+'.'+cleanTld+'.'+subdomain+'.browsers.'+browser+'.'+browserVersion+'.docComplete', docComplete);

	//tracking devices in graphite could be VERY expensive, let's try OS instead
	//c.timing(root+'.'+tld+'.'+subdomain+'.devices.'+device+'.docComplete', docComplete);
	c.timing(root+'.'+cleanTld+'.'+subdomain+'.devices.'+deviceType+'.docComplete', docComplete);

	c.timing(root+'.'+cleanTld+'.'+subdomain+'.visitors.'+visitType+'.docComplete', docComplete);

	c.timing(root+'.'+cleanTld+'.'+subdomain+'.visitors.'+userStatus+'.docComplete', docComplete);

};