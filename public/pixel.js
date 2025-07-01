(function () {
    function getQueryParam(name) {
        try {
            var url = new URL(window.location.href);
            return url.searchParams.get(name);
        } catch (e) {
            // fallback for older browsers
            var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
            return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
        }
    }
    var tid = getQueryParam('tid') || 'spfy-test';
    window._ghq = window._ghq || [];
    var u = 'https://violet.ghtinc.com/tracking/groundhogSensitiveCookie';
    var g = document.createElement('script');
    g.type = 'text/javascript';
    g.async = true;
    g.src = u;
    document.getElementsByTagName('head')[0].appendChild(g);

    (function (t) {
        var u = 'https://violet.ghtinc.com/tracking',
            j = document.createElement('script');
        window._ghq.push(['setTrackerUrl', u + '/track/v2']);
        window._ghq.push(['setTrackerId', t]);
        window._ghq.push(['trackPageView']);
        j.type = 'text/javascript';
        j.async = true;
        j.src = u + '/groundhog-tracker.js';
        document.getElementsByTagName('head')[0].appendChild(j);
    })(tid);
})(); 