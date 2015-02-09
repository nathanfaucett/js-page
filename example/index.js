var $ = require("jquery"),
    request = require("request"),
    PolyPromise = require("promise"),
    layers = require("layers_browser"),
    page = global.page = require("../src/index.js");


var $app = $("#app"),
    router = new layers.Router();


page.on("request", function(ctx) {
    router.handler(ctx);
});


page.html5Mode(false);


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
            },
            function(response) {
                next(new Error(response.statusCode));
            }
        );
    }
);

router.route("users",
    function(ctx, next) {
        template("templates/users.html").then(
            function(tmpl) {
                $app.find("#content").html(tmpl);
            },
            function(response) {
                next(new Error(response.statusCode));
            }
        );
    }
);

router.use(
    function(err) {
        if (err) {
            throw err;
        }
        console.log("Not Found");
    }
);

page.listen();
