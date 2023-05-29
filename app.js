const path          = require("path");
const express       = require("express");
const cookie_parser = require("cookie-parser");
const hbs           = require("express-handlebars");

/* data */
// create the in-memory database and hydrate it with table dumps from Google sheets
// if you are in localdev, assume that this has already been done by a script in package.json
if (!process.env.LOCALDEV) {

    require("./startup");
}
/* data */

/* app configuration */
const app = express();
app.engine("hbs", hbs.engine({
                                 extname: "hbs",
                                 defaultView: "main",
                                 layoutsDir: path.join(__dirname, "/src/_views/_common/layouts/"),
                                 partialsDir: path.join(__dirname, "/src/_views/_common/partials/"),
                                 helpers: {
                                     ...require("./src/utils/stringFormatting"), ...require("./src/utils/viewRendering"), ...require(
                                         "./src/helpers")
                                 }
                             }));
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "/src/_views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookie_parser());
if (!process.env.LOCALDEV) {
    app.use(require("./src/middleware/morgan-json")());
}
/* app configuration */

/* router */
app.use("/events", require("./src/_routes/events"));
app.use("/dryers", require("./src/_routes/dryers"));
app.use("/washdays", require("./src/_routes/washDays"));
app.use("/admin", require("./src/_routes/admin"));
app.use("/auth", require("./src/_routes/auth"));
app.use("/", require("./src/_routes/dashboard"));
/* router */

// run the app
const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`app listening on port ${port}`);
});
