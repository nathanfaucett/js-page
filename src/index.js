var urls = require("urls"),
    urlPath = require("url_path"),
    isString = require("is_string"),
    EventEmitter = require("event_emitter"),
    eventListener = require("event_listener"),
    environment = require("environment");


var page = new EventEmitter(),

    window = environment.window,
    location = window.location || {},
    navigator = window.navigator || {},

    pageListening = false,
    pageHtml5Mode = false,
    pageOrigin = location.origin,
    pageBase = location.pathname || "/",
    pageCurrentPath = "",
    pageHistory = [],

    sameOrigin_url = /^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/,
    sameOrigin_parts = sameOrigin_url.exec(location.href),

    supportsHtml5Mode = (function() {
        var userAgent = navigator.userAgent || "";
        if (
            (userAgent.indexOf("Android 2.") !== -1 || userAgent.indexOf("Android 4.0") !== -1) &&
            userAgent.indexOf("Mobile Safari") !== -1 &&
            userAgent.indexOf("Chrome") === -1
        ) {
            return false;
        }

        return (window.history && window.history.pushState != null);
    }());


function sameOrigin(href) {
    var parts, urlPort, testPort;

    if (!urlPath.isAbsoluteURL(href)) return true;

    parts = sameOrigin_url.exec(href.toLowerCase());

    if (!parts) return false;

    urlPort = sameOrigin_parts[3];
    testPort = parts[3];

    return !(
        (parts[1] !== sameOrigin_parts[1]) ||
        (parts[2] !== sameOrigin_parts[2]) || !(
            (testPort === urlPort) ||
            (!testPort && (urlPort === "80" || urlPort === "443")) ||
            (!urlPort && (testPort === "80" || testPort === "443"))
        )
    );
}


page.init = page.listen = function() {
    if (pageListening === false) {
        pageListening = true;

        eventListener.on(window, "click", onclick);
        eventListener.on(window, "popstate", onpopstate);
        eventListener.on(window, "hashchange", onhashchange);

        page.emit("listen");
        page.go((pageHtml5Mode ? urlPath.relative(pageBase, location.pathname + location.search) : location.hash.slice(1)) || "/");
    }

    return page;
};

page.close = function() {
    if (pageListening === true) {
        pageListening = false;

        eventListener.off(window, "click", onclick);
        eventListener.off(window, "popstate", onpopstate);
        eventListener.off(window, "hashchange", onhashchange);

        page.emit("close");
    }

    return page;
};

page.html5Mode = function(value) {
    if (value != null && supportsHtml5Mode) {
        pageHtml5Mode = !!value;
    }
    return pageHtml5Mode;
};

page.base = function(value) {
    if (isString(value)) {
        pageBase = value;
    }
    return pageBase;
};

page.go = function(path) {
    var ctx = {},
        fullUrl = urls.parse(pageOrigin + path, true);

    ctx.fullUrl = fullUrl;
    ctx.pathname = fullUrl.pathname;
    ctx.query = fullUrl.query;

    replaceState(ctx, path);

    page.emit("request", ctx);

    return page;
};

page.hasHistory = function() {

    return pageHistory.length !== 0;
};

page.back = function() {
    if (pageHistory.length) {
        page.go(pageHistory.pop());
    }

    return page;
};

function replaceState(ctx, path) {
    pageHistory.push(pageCurrentPath);
    pageCurrentPath = path;

    if (pageHtml5Mode) {
        history.replaceState(ctx, ctx.fullUrl.path, urlPath.join(pageBase, path));
    } else {
        location.hash = path;
    }
}

function onpopstate(e) {
    if (pageHtml5Mode && e.state) {
        page.go(e.state.fullUrl.path);
    }
}

function onhashchange() {
    var path = location.hash.slice(1) || "/";

    if (!pageHtml5Mode && pageCurrentPath !== path) {
        page.go(path);
    }
}

function onclick(e) {
    var el, link;

    if (which(e) !== 1) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (e.defaultPrevented) return;

    el = e.target;
    link = el.getAttribute("href");

    if (!link || el.target) return;
    if (link[0] === "#") link = link.slice(1);
    if (link && (link.indexOf("mailto:") > -1 || link.indexOf("tel:") > -1)) return;

    if (el.href && !sameOrigin(el.href)) return;
    if (urlPath.isAbsoluteURL(link) && !sameOrigin(link)) return;

    e.preventDefault();
    page.go(urls.parse(link).path);
}

function which(e) {
    e = e || window.event;
    return e.which == null ? +e.button : +e.which;
}


module.exports = page;
