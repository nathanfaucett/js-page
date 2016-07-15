page
=======

single page routes for the browser


```javascript
var page = require("@nathanfaucett/page");


page.on("request", function(ctx) {
    // handle ctx object
});

page.setHtml5Mode(false, function onSetHtml5Mode() {
    page.listen();
});
```
