var urls = require("urls"),
    urlPath = require("url_path"),
    type = require("type"),
    EventEmitter = require("event_emitter");


var page = new EventEmitter(),

    pageHtml5Mode = false,
    pageOrigin = location.origin,
    pageBase = location.pathname || "/",
    pageCurrentPath = "",
    pageHistory = [],

    sameOrigin_url = /^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/,
    sameOrigin_parts = sameOrigin_url.exec(location.href),

    supportsHtml5Mode = global.history && global.history.pushState,
    supportsEventListener = type.isNative(document.addEventListener),

    addEvent, removeEvent, dispatchEvent;


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

if (supportsEventListener) {
    addEvent = function(elem, name, handler) {
        elem.addEventListener(name, handler, false);
        return handler;
    };

    removeEvent = function(elem, name, handler) {
        elem.removeEventListener(name, handler, false);
        return true;
    };

    dispatchEvent = function(elem, name) {
        var event = document.createEvent("Event");

        event.initEvent(name, true, true);

        return elem.dispatchEvent(event);
    };
} else {
    addEvent = function(elem, name, handler) {

        function boundedHandler(e) {

            return handler.call(elem, e);
        }

        elem[name + handler] = boundedHandler;
        elem.attachEvent("on" + name, boundedHandler);

        return handler;
    };

    removeEvent = function(elem, name, handler) {
        elem.detachEvent("on" + name, elem[name + handler]);
        return true;
    };

    dispatchEvent = function(elem, name) {
        var event = document.createEventObject();

        return elem.fireEvent("on" + name, event);
    };
}


page.init = page.listen = function() {

    addEvent(global, "click", onclick);
    addEvent(global, "popstate", onpopstate);
    addEvent(global, "hashchange", onhashchange);

    page.emit("listen");
    page.go((pageHtml5Mode ? urlPath.relative(base, location.pathname) : location.hash.slice(1)) || "/");

    return page;
};

page.html5Mode = function(value) {
    if (value != null && supportsHtml5Mode) {
        pageHtml5Mode = !!value;
    }
    return pageHtml5Mode;
};

page.base = function(value) {
    if (type.isString(value)) {
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
        history.replaceState(ctx, ctx.fullUrl.path, urlPath.join(base, path));
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
    if (link && link.indexOf("mailto:") > -1) return;

    if (el.href && !sameOrigin(el.href)) return;
    if (urlPath.isAbsoluteURL(link) && !sameOrigin(link)) return;

    e.preventDefault();
    page.go(urls.parse(link).path);
}

function which(e) {
    e = e || global.event;
    return e.which == null ? +e.button : +e.which;
}


module.exports = page;
