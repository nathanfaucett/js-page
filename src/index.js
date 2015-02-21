var urls = require("urls"),
    urlPath = require("url_path"),
    sameOrigin = require("same_origin"),
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
    pageBase = "/",
    pageCurrentPath = location.pathname,
    pageHistory = [],

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
    var ctx = buildContext(path);

    replaceState(ctx, ctx.fullUrl.path);
    page.emit("request", ctx);

    return page;
};

page.hasHistory = function() {
    return pageHistory.length !== 0;
};

page.back = function(fallback) {
    var history = pageHistory,
        currentPath = pageCurrentPath,
        i = history.length,
        path;

    while (i--) {
        path = history[i];

        if (path !== currentPath) {
            history.length = i + 1;
            return page.go(path);
        }
    }

    if (isString(fallback)) {
        return page.go(fallback);
    } else {
        return false;
    }
};

page.reload = function() {
    var ctx = buildContext(pageCurrentPath);
    page.emit("request", ctx);
    return page;
};

function end() {
    this.forceEnd = true;
}

function buildContext(path) {
    var ctx = {},
        fullUrl = urls.parse(pageOrigin + path, true);

    ctx.forceEnd = false;
    ctx.fullUrl = fullUrl;
    ctx.pathname = fullUrl.pathname;
    ctx.query = fullUrl.query;
    ctx.end = end;

    return ctx;
}

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

    if (
        which(e) !== 1 ||
        e.metaKey || e.ctrlKey || e.shiftKey ||
        e.defaultPrevented
    ) {
        return;
    }

    el = e.target;
    while (el && el.nodeName !== "A") {
        el = el.parentNode;
    }

    if (!el || "A" !== el.nodeName ||
        el.getAttribute("download") || el.getAttribute("rel") === "external"
    ) {
        return;
    }

    link = el.getAttribute("href") || el.href;

    if (!link || el.target) {
        return;
    }

    link = link[0] === "#" ? link.slice(1) : link;

    if (link && (link.indexOf("mailto:") > -1 || link.indexOf("tel:") > -1)) {
        return;
    }

    if (
        el.href && !sameOrigin.browser(el.href) ||
        (urlPath.isAbsoluteURL(link) && !sameOrigin.browser(link))
    ) {
        return;
    }

    e.preventDefault();
    page.go(urls.parse(link).path);
}

function which(e) {
    e = e || window.event;
    return e.which == null ? +e.button : +e.which;
}


module.exports = page;
