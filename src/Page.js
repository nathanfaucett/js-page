var url = require("@nathanfaucett/url"),
    urlPath = require("@nathanfaucett/url_path"),
    sameOrigin = require("@nathanfaucett/same_origin"),
    EventEmitter = require("@nathanfaucett/event_emitter"),
    eventListener = require("@nathanfaucett/event_listener"),
    environment = require("@nathanfaucett/environment"),
    supports = require("@nathanfaucett/supports");


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

    this._name = null;
    this._canChangeState = true;
    this._socketName = null;
    this._isClient = null;

    this._title = document.title || "";
    this._titleBase = this._title;
    this._origin = location.origin || (
        location.protocol + "//" +
        location.hostname +
        (location.port ? ":" + location.port : "")
    );
    this._base = "/";
    this._currentPath = location.pathname;
    this._history = [];
    this._html5Mode = supportsHtml5Mode;
    this._messenger = null;

    this.onGetHtml5Mode = function(data, callback) {
        return _this._onGetHtml5Mode(data, callback);
    };
    this.onSetHtml5Mode = function(data, callback) {
        return _this._onSetHtml5Mode(data, callback);
    };

    this.onGetBase = function(data, callback) {
        return _this._onGetBase(data, callback);
    };
    this.onSetBase = function(data, callback) {
        return _this._onSetBase(data, callback);
    };

    this.onGetTitleBase = function(data, callback) {
        return _this._onGetTitleBase(data, callback);
    };
    this.onSetTitleBase = function(data, callback) {
        return _this._onSetTitleBase(data, callback);
    };

    this.onGetTitle = function(data, callback) {
        return _this._onGetTitle(data, callback);
    };
    this.onSetTitle = function(data, callback) {
        return _this._onSetTitle(data, callback);
    };

    this.onSetPathNoEmit = function(data, callback) {
        return _this._onSetPathNoEmit(data, callback);
    };

    this.onBack = function(data, callback) {
        return _this._onBack(data, callback);
    };
    this.onGo = function(data, callback) {
        return _this._onGo(data, callback);
    };
    this.onReload = function(data, callback) {
        return _this._onReload(data, callback);
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

    this._name = "page_server";
    this._socketName = "page_client";
    this._isClient = false;
    this._messenger = messenger;

    return Page_init(this, callback);
};

PagePrototype.initClient = function(messenger, callback) {

    this._name = "page_client";
    this._socketName = "page_server";
    this._isClient = true;
    this._messenger = messenger;

    eventListener.on(window, supports.dom && document.ontouchstart ? "touchstart" : "click", this.onClick);
    eventListener.on(window, "popstate", this.onPopState);
    eventListener.on(window, "hashchange", this.onHashChange);

    return Page_init(this, callback);
};

function Page_init(_this, callback) {
    var messenger = _this._messenger;

    messenger.on(_this._socketName + ".getHtml5Mode", _this.onGetHtml5Mode);
    messenger.on(_this._socketName + ".setHtml5Mode", _this.onSetHtml5Mode);

    messenger.on(_this._socketName + ".getBase", _this.onGetBase);
    messenger.on(_this._socketName + ".setBase", _this.onSetBase);

    messenger.on(_this._socketName + ".getTitleBase", _this.onGetTitleBase);
    messenger.on(_this._socketName + ".setTitleBase", _this.onSetTitleBase);

    messenger.on(_this._socketName + ".getTitle", _this.onGetTitle);
    messenger.on(_this._socketName + ".setTitle", _this.onSetTitle);

    messenger.on(_this._socketName + ".setPathNoStateChange", _this.onSetPathNoEmit);

    messenger.on(_this._socketName + ".back", _this.onBack);
    messenger.on(_this._socketName + ".go", _this.onGo);
    messenger.on(_this._socketName + ".reload", _this.onReload);

    messenger.emit(_this._name + ".init", null, callback);

    return _this;
}

PagePrototype.listen = function(callback) {
    this.go((this._html5Mode ?
        urlPath.relative(this._base, location.pathname + location.search) :
        location.hash.slice(1)
    ) || "/", callback);
};

PagePrototype._onGetHtml5Mode = function(data, callback) {
    callback(undefined, this._html5Mode);
    return this;
};
PagePrototype._onSetHtml5Mode = function(data, callback) {
    if (supports.dom) {
        if (supportsHtml5Mode) {
            this._html5Mode = !!data.value;
        } else {
            this._html5Mode = false;
        }
    } else {
        this._html5Mode = !!data.value;
    }
    callback(undefined, this._html5Mode);
    return this;
};

PagePrototype._onGetBase = function(data, callback) {
    callback(undefined, this._base);
    return this;
};
PagePrototype._onSetBase = function(data, callback) {
    this._base = data.value;
    callback(undefined, this._base);
    return this;
};

PagePrototype._onGetTitleBase = function(data, callback) {
    callback(undefined, this._titleBase);
    return this;
};
PagePrototype._onSetTitleBase = function(data, callback) {
    this._titleBase = data.value;
    callback(undefined, this._titleBase);
    return this;
};

PagePrototype._onGetTitle = function(data, callback) {
    callback(undefined, this._title);
    return this;
};
PagePrototype._onSetTitle = function(data, callback) {
    this._title = data.value;
    document.title = this._titleBase + this._title;
    callback(undefined, this._title);
    return this;
};

PagePrototype._onSetPathNoEmit = function(data, callback) {
    var ctx = data.ctx;

    Page_setState(this, ctx, ctx.fullUrl.path);
    callback(undefined, ctx);

    return this;
};

PagePrototype._onGo = function(data, callback) {
    var ctx = data.ctx;

    this._canChangeState = !!data.canChangeState;
    Page_replaceState(this, ctx, ctx.fullUrl.path);
    Page_emitRequest(this, ctx);
    this._canChangeState = true;

    callback(undefined, ctx);

    return this;
};
PagePrototype._onBack = function(data, callback) {
    var historyCache = this._history,
        currentPath = this._currentPath,
        i = historyCache.length,
        path;

    while (i--) {
        path = historyCache[i];

        if (path !== currentPath) {
            historyCache.length = i + 1;
            this._onGo(data, callback);
            return true;
        }
    }

    return false;
};
PagePrototype._onReload = function(data, callback) {
    var ctx = data.ctx;

    this._canChangeState = !!data.canChangeState;
    Page_emitRequest(this, ctx);
    this._canChangeState = true;

    callback(undefined, ctx);

    return this;
};

PagePrototype.getHtml5Mode = function() {
    return this._html5Mode;
};
PagePrototype.setHtml5Mode = function(value, callback) {
    if (supports.dom) {
        if (supportsHtml5Mode) {
            this._html5Mode = !!value;
        } else {
            this._html5Mode = false;
        }
    } else {
        this._html5Mode = !!value;
    }

    this._messenger.emit(this._name + ".setHtml5Mode", {
        value: this._html5Mode
    }, callback);

    return this;
};

PagePrototype.getBase = function() {
    return this._base;
};
PagePrototype.setBase = function(value, callback) {
    this._base = value;

    this._messenger.emit(this._name + ".setBase", {
        value: this._base
    }, callback);

    return this;
};

PagePrototype.getTitleBase = function() {
    return this._titleBase;
};
PagePrototype.setTitleBase = function(value, callback) {

    this._titleBase = value;
    document.title = this._titleBase + this._title;

    this._messenger.emit(this._name + ".setTitleBase", {
        value: this._titleBase
    }, callback);

    return this;
};

PagePrototype.getTitle = function() {
    return this._title;
};
PagePrototype.setTitle = function(value, callback) {

    this._title = value;
    document.title = this._titleBase + this._title;

    this._messenger.emit(this._name + ".setTitleBase", {
        value: document.title
    }, callback);

    return this;
};

PagePrototype.setPathNoStateChange = function(path, callback) {
    var ctx = Page_createContext(this, path);

    this._canChangeState = false;
    Page_setState(this, ctx, ctx.fullUrl.path);
    this._canChangeState = true;

    this._messenger.emit(this._name + ".setPathNoStateChange", {
        ctx: ctx,
        canChangeState: false
    }, callback);

    return this;
};

PagePrototype.go = function(path, callback) {
    var ctx = Page_createContext(this, path);

    Page_replaceState(this, ctx, ctx.fullUrl.path);
    Page_emitRequest(this, ctx);

    this._messenger.emit(this._name + ".go", {
        ctx: ctx,
        canChangeState: true
    }, callback);

    return this;
};
PagePrototype.back = function(data, callback) {
    var historyCache = this._history,
        currentPath = this._currentPath,
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
    var ctx = Page_createContext(this, this._currentPath);

    Page_emitRequest(this, ctx);

    this._messenger.emit(this._name + ".reload", {
        ctx: ctx,
        canChangeState: true
    }, callback);

    return this;
};

function Page_emitRequest(_this, ctx) {
    if (_this._canChangeState) {
        _this.emitArg("request", ctx);
    }
}

function Page_createContext(_this, path) {
    var ctx = {},
        fullUrl = url.parse(_this._origin + path, true),
        pathname = fullUrl.pathname;

    ctx.fullUrl = fullUrl;
    ctx.pathname = pathname;
    ctx.query = fullUrl.query;

    return ctx;
}

function Page_replaceState(_this, ctx, path) {
    _this._history.push(_this._currentPath);
    _this._currentPath = path;
    Page_setState(_this, ctx, path);
}

function Page_setState(_this, ctx, path) {
    if (_this._html5Mode) {
        history.replaceState({
            path: ctx.path
        }, ctx.fullUrl.path, urlPath.join(_this._base, path));
    } else {
        location.hash = path;
    }
}

function onHashChange(_this) {
    var path = location.hash.slice(1) || "/";

    if (!_this._html5Mode && _this._currentPath !== path) {
        _this.go(path);
    }
}

function onPopState(_this, e) {
    if (_this._html5Mode && e.state) {
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

    _this.go(url.parse(link).path);
}

function which(e) {
    e = e || window.event;
    return e.which == null ? +e.button : +e.which;
}
