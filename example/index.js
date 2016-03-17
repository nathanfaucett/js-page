var $ = require("jquery"),
    request = require("request"),
    PolyPromise = require("promise_polyfill"),
    layers = require("layers_browser"),
    page = global.page = require("..");


var $app = $("#app"),
    router = new layers.Router();


page.on("request", function(ctx) {
    console.log(ctx);
    router.handler(ctx, function onHandler(error) {
        if (error) {
            throw error;
        }
    });
});


function template(url) {
    var cache = template.cache,
        defer = PolyPromise.defer();

    if (!cache[url]) {
        request.get(url).then(
            function(response) {
                cache[url] = response.data;
                defer.resolve(response.data);
            },
            function(response) {
                defer.reject(response);
            }
        );
    } else {
        defer.resolve(cache[url]);
    }

    return defer.promise;
}
template.cache = {};


router.use(
    function(ctx, next) {
        template("templates/header.html").then(
            function(tmpl) {
                $app.find("#header").html(tmpl);
                next();
            },
            function() {
                next();
            }
        );
    }
);

router.route(
    function(ctx, next) {
        template("templates/home.html").then(
            function(tmpl) {
                $app.find("#content").html(tmpl);
                ctx.end();
                next();
            },
            function(response) {
                ctx.end();
                next(new Error(response.statusCode));
            }
        );
    }
);

router.route("/users",
    function(ctx, next) {
        template("templates/users.html").then(
            function(tmpl) {
                $app.find("#content").html(tmpl);
                ctx.end();
                next();
            },
            function(response) {
                ctx.end();
                next(new Error(response.statusCode));
            }
        );
    }
);

router.use(
    function(error, ctx, next) {
        if (error) {
            next(error);
        } else {
            next();
        }
    }
);


page.setHtml5Mode(false, function onSetHtml5Mode() {
    page.listen();
});