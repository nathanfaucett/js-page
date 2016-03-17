var urls = require("urls"),
    urlPath = require("url_path"),
    sameOrigin = require("same_origin"),
    EventEmitter = require("event_emitter"),
    eventListener = require("event_listener"),
    environment = require("environment"),
    supports = require("supports");


var window = environment.window,
    document = environment.document,

    location = window.location || {},
    navigator = window.navigator || {},
    history = window.history,

    supportsHtml5Mode = (function() {
        var userAgent = navigator.userAgent || "";
        if (
            (userAgent.indexOf("Android 2.") !== -1 || userAgent.indexOf("Android 4.0") !== -1) &&
            userAgent.indexOf("Mobile Safari") !== -1 &&
            userAgent.indexOf("Chrome") === -1
        ) {
            return false;
        }

        return (history && history.pushState != null);
    }()),

    PagePrototype;


module.exports = Page;


function Page() {
    var _this = this;

    EventEmitter.call(this, -1);

    this.__name = null;
    this.__socketName = null;
    this.__isClient = null;

    this.__title = document.title || "";
    this.__titleBase = this.__title;
    this.__origin = location.origin;
    this.__base = "/";
    this.__currentPath = location.pathname;
    this.__history = [];
    this.__html5Mode = supportsHtml5Mode;
    this.__messenger = null;

    this.onGetHtml5Mode = function(data, callback) {
        return _this.__onGetHtml5Mode(data, callback);
    };
    this.onSetHtml5Mode = function(data, callback) {
        return _this.__onSetHtml5Mode(data, callback);
    };

    this.onGetBase = function(data, callback) {
        return _this.__onGetBase(data, callback);
    };
    this.onSetBase = function(data, callback) {
        return _this.__onSetBase(data, callback);
    };

    this.onGetTitleBase = function(data, callback) {
        return _this.__onGetTitleBase(data, callback);
    };
    this.onSetTitleBase = function(data, callback) {
        return _this.__onSetTitleBase(data, callback);
    };

    this.onGetTitle = function(data, callback) {
        return _this.__onGetTitle(data, callback);
    };
    this.onSetTitle = function(data, callback) {
        return _this.__onSetTitle(data, callback);
    };

    this.onBack = function(data, callback) {
        return _this.__onBack(data, callback);
    };
    this.onGo = function(data, callback) {
        return _this.__onGo(data, callback);
    };
    this.onReload = function(data, callback) {
        return _this.__onReload(data, callback);
    };

    this.onClick = function(e) {
        return onClick(_this, e);
    };
    this.onPopState = function(e) {
        return onPopState(_this, e);
    };
    this.onHashChange = function(e) {
        return onHashChange(_this, e);
    };
}
EventEmitter.extend(Page);
PagePrototype = Page.prototype;

PagePrototype.initServer = function(messenger, callback) {

    this.__name = "page_server";
    this.__socketName = "page_client";
    this.__isClient = false;
    this.__messenger = messenger;

    return Page_init(this, callback);
};

PagePrototype.initClient = function(messenger, callback) {

    this.__name = "page_client";
    this.__socketName = "page_server";
    this.__isClient = true;
    this.__messenger = messenger;

    eventListener.on(window, supports.dom && document.ontouchstart ? "touchstart" : "click", this.onClick);
    eventListener.on(window, "popstate", this.onPopState);
    eventListener.on(window, "hashchange", this.onHashChange);

    return Page_init(this, callback);
};

function Page_init(_this, callback) {
    var messenger = _this.__messenger;

    messenger.on(_this.__socketName + ".getHtml5Mode", _this.onGetHtml5Mode);
    messenger.on(_this.__socketName + ".setHtml5Mode", _this.onSetHtml5Mode);

    messenger.on(_this.__socketName + ".getBase", _this.onGetBase);
    messenger.on(_this.__socketName + ".setBase", _this.onSetBase);

    messenger.on(_this.__socketName + ".getTitleBase", _this.onGetTitleBase);
    messenger.on(_this.__socketName + ".setTitleBase", _this.onSetTitleBase);

    messenger.on(_this.__socketName + ".getTitle", _this.onGetTitle);
    messenger.on(_this.__socketName + ".setTitle", _this.onSetTitle);

    messenger.on(_this.__socketName + ".back", _this.onBack);
    messenger.on(_this.__socketName + ".go", _this.onGo);
    messenger.on(_this.__socketName + ".reload", _this.onReload);

    messenger.emit(_this.__name + ".init", null, callback);

    return _this;
}

PagePrototype.listen = function(callback) {
    this.go((this.__html5Mode ?
        urlPath.relative(this.__base, location.pathname + location.search) :
        location.hash.slice(1)
    ) || "/", callback);
};

PagePrototype.__onGetHtml5Mode = function(data, callback) {
    callback(undefined, this.__html5Mode);
    return this;
};
PagePrototype.__onSetHtml5Mode = function(data, callback) {
    if (supports.dom) {
        if (supportsHtml5Mode) {
            this.__html5Mode = !!data.value;
        } else {
            this.__html5Mode = false;
        }
    } else {
        this.__html5Mode = !!data.value;
    }
    callback(undefined, this.__html5Mode);
    return this;
};

PagePrototype.__onGetBase = function(data, callback) {
    callback(undefined, this.__base);
    return this;
};
PagePrototype.__onSetBase = function(data, callback) {
    this.__base = data.value;
    callback(undefined, this.__base);
    return this;
};

PagePrototype.__onGetTitleBase = function(data, callback) {
    callback(undefined, this.__titleBase);
    return this;
};
PagePrototype.__onSetTitleBase = function(data, callback) {
    this.__titleBase = data.value;
    callback(undefined, this.__titleBase);
    return this;
};

PagePrototype.__onGetTitle = function(data, callback) {
    callback(undefined, this.__title);
    return this;
};
PagePrototype.__onSetTitle = function(data, callback) {
    this.__title = data.value;
    document.title = this.__titleBase + this.__title;
    callback(undefined, this.__title);
    return this;
};

PagePrototype.__onGo = function(data, callback) {
    var ctx = data.ctx;
    Page_replaceState(this, ctx, ctx.fullUrl.path);
    this.emitArg("request", ctx);
    callback(undefined, ctx);
    return this;
};
PagePrototype.__onBack = function(data, callback) {
    var historyCache = this.__history,
        currentPath = this.__currentPath,
        i = historyCache.length,
        path;

    while (i--) {
        path = historyCache[i];

        if (path !== currentPath) {
            historyCache.length = i + 1;
            this.__onGo(data, callback);
            return true;
        }
    }

    return false;
};
PagePrototype.__onReload = function(data, callback) {
    var ctx = data.ctx;
    this.emitArg("request", ctx);
    callback(undefined, ctx);
    return this;
};

PagePrototype.getHtml5Mode = function() {
    return this.__html5Mode;
};
PagePrototype.setHtml5Mode = function(value, callback) {
    if (supports.dom) {
        if (supportsHtml5Mode) {
            this.__html5Mode = !!value;
        } else {
            this.__html5Mode = false;
        }
    } else {
        this.__html5Mode = !!value;
    }

    this.__messenger.emit(this.__name + ".setHtml5Mode", {
        value: this.__html5Mode
    }, callback);
    return this;
};

PagePrototype.getBase = function() {
    return this.__base;
};
PagePrototype.setBase = function(value, callback) {
    this.__base = value;
    this.__messenger.emit(this.__name + ".setBase", {
        value: this.__base
    }, callback);
    return this;
};

PagePrototype.getTitleBase = function() {
    return this.__titleBase;
};
PagePrototype.setTitleBase = function(value, callback) {
    this.__titleBase = value;
    document.title = this.__titleBase + this.__title;
    this.__messenger.emit(this.__name + ".setTitleBase", {
        value: this.__titleBase
    }, callback);
    return this;
};

PagePrototype.getTitle = function() {
    return this.__title;
};
PagePrototype.setTitle = function(value, callback) {
    this.__title = value;
    document.title = this.__titleBase + this.__title;
    this.__messenger.emit(this.__name + ".setTitleBase", {
        value: document.title
    }, callback);
    return this;
};

PagePrototype.go = function(path, callback) {
    var ctx = Page_createContext(this, path);

    Page_replaceState(this, ctx, ctx.fullUrl.path);
    this.emitArg("request", ctx);

    this.__messenger.emit(this.__name + ".go", {
        ctx: ctx
    }, callback);

    return this;
};
PagePrototype.back = function(data, callback) {
    var historyCache = this.__history,
        currentPath = this.__currentPath,
        i = historyCache.length,
        path;

    while (i--) {
        path = historyCache[i];

        if (path !== currentPath) {
            historyCache.length = i - 1;
            this.go(path, callback);
            return true;
        }
    }

    return false;
};
PagePrototype.reload = function(callback) {
    var ctx = Page_createContext(this, this.__currentPath);
    this.emitArg("request", ctx);
    this.__messenger.emit(this.__name + ".reload", {
        ctx: ctx
    }, callback);
    return this;
};

function Page_createContext(_this, path) {
    var ctx = {},
        fullUrl = urls.parse(_this.__origin + path, true),
        pathname = fullUrl.pathname;

    ctx.fullUrl = fullUrl;
    ctx.pathname = pathname;
    ctx.query = fullUrl.query;

    return ctx;
}

function Page_replaceState(_this, ctx, path) {
    _this.__history.push(_this.__currentPath);
    _this.__currentPath = path;
    Page_setState(_this, ctx, path);
}

function Page_setState(_this, ctx, path) {
    if (_this.__html5Mode) {
        history.replaceState({
            path: ctx.path
        }, ctx.fullUrl.path, urlPath.join(_this.__base, path));
    } else {
        location.hash = path;
    }
}

function onHashChange(_this) {
    var path = location.hash.slice(1) || "/";

    if (!_this.__html5Mode && _this.__currentPath !== path) {
        _this.go(path);
    }
}

function onPopState(_this, e) {
    if (_this.__html5Mode && e.state) {
        _this.go(e.state.fullUrl.path);
    }
}

function onClick(_this, e) {
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
        (el.href && !sameOrigin.browser(el.href)) ||
        (urlPath.isAbsoluteURL(link) && !sameOrigin.browser(link))
    ) {
        return;
    }

    e.preventDefault();

    _this.go(urls.parse(link).path);
}

function which(e) {
    e = e || window.event;
    return e.which == null ? +e.button : +e.which;
}
