const app = require("./app");

const port = 8080;

app.set("port", port);

app.listen(app.get("port"), () => {
    console.log("Express Server is Running at " + app.get("port") + "...");
});
