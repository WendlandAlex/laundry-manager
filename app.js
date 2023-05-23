const { db } = require("./src/lib/db");
const { bags } = require("./config");
const {
    camelCaseToSnakeCase,
    snakeCaseToCamelCase,
    splitOnDelimiter,
    toTitleCase
} = require("./src/utils/stringFormatting");
const cookieParser = require("cookie-parser");
const {
    getFriendlyTimeFromUnixTimestamp,
    getWashDayFromMoment,
    normalizeTime
} = require("./src/lib/moment-tz");

// create the in-memory database and hydrate it with table dumps from Google sheets
if (!process.env.LOCALDEV) {
    const { startup } = require("./src/services/startup");

    console.log("DOWN");
    db.migrate.rollback().then(function () {
        console.log("UP");
        return db.migrate.latest();

    });
    console.log("SEED");
    startup();
    console.log("SEED DONE");
}

const path = require("path");
const express = require("express");

const hbs = require("express-handlebars");
const port = process.env.PORT || 8080;

const app = express();
app.set("view engine", "hbs");
app.engine("hbs", hbs.engine({
                                 extname: "hbs",
                                 defaultView: "main",
                                 layoutsDir: path.join(__dirname, "/src/_views/_common/layouts/"),
                                 partialsDir: path.join(__dirname, "/src/_views/_common/partials/")
                             }));
app.set("views", path.join(__dirname, "/src/_views"));

const hbsRuntime = hbs.create({});

hbsRuntime.handlebars.registerHelper("isNotNull", function (arg) {
    return arg != null;
});

hbsRuntime.handlebars.registerHelper("jsonify", function (obj) {
    return JSON.stringify(obj, null, 2);
});

hbsRuntime.handlebars.registerHelper("isNumeric", function (str) {
    return parseInt(str);
});


hbsRuntime.handlebars.registerHelper("workingify", function (bool) {
    if (bool === true) {
        return `Working ✅`;
    } else {
        return `Not Working ❌`;
    }
});

hbsRuntime.handlebars.registerHelper("splitOnDelimiter", function (str, delimiter, takeIndex = null) {
    return splitOnDelimiter(str, delimiter, takeIndex);
});

hbsRuntime.handlebars.registerHelper("toLowerCase", function (str) {
    return str.toLowerCase();
});

hbsRuntime.handlebars.registerHelper("toUpperCase", function (str) {
    return str.toUpperCase();
});

hbsRuntime.handlebars.registerHelper("toTitleCase", function (str) {
    return toTitleCase(str);
});

hbsRuntime.handlebars.registerHelper("snakeCaseToCamelCase", function (str) {
    return snakeCaseToCamelCase(str);
});

hbsRuntime.handlebars.registerHelper("camelCaseToSnakeCase", function (str) {
    return camelCaseToSnakeCase(str);
});

hbsRuntime.handlebars.registerHelper("stringEquals", function (str1, str2) {
    return str1 == str2;
});

hbsRuntime.handlebars.registerHelper("arrayIncludes", function (arr, ...arguments) {
    for (let term of arguments) {
        if (arr.includes(term)) {
            return true;
        }
    }
});

hbsRuntime.handlebars.registerHelper("arrayLength", function (arr) {
    return arr.length;
});

hbsRuntime.handlebars.registerHelper("getBagLastEvent", function (arr) {
    _top = arr[0];
    columnNames = Object.values(bags.eventTypes).map(i => i.columnName);

    for (let [event, value] of Object.entries(_top)) {
        if (!columnNames.includes(event)) {
            continue;
        }
        if (value != null) {
            return event;
        }
    }
});

hbsRuntime.handlebars.registerHelper("getEventTypeByColumnName", function (columnName) {
    return getEventTypeByColumnName(columnName);
});

hbsRuntime.handlebars.registerHelper("extractNotes", function (arr) {
    res = [];
    arr.forEach(i => {
        if (i.notes) {
            res.push(i.notes);
        }
    });

    return res;
});

// thank you https://stackoverflow.com/a/20891435
hbsRuntime.handlebars.registerHelper("preselectSelect", function (option, passedValue) {
    if (option === passedValue) {
        return " selected";
    } else {
        return "";
    }
});

hbsRuntime.handlebars.registerHelper("dateFromISOString", function (ISOString) {
    return getWashDayFromMoment(ISOString);
});

hbsRuntime.handlebars.registerHelper("humanTimeFromISOString", function (ISOString) {
    return normalizeTime(ISOString).HumanTime;
});

hbsRuntime.handlebars.registerHelper("humanTimeFromUnix", function (timestamp) {
    return getFriendlyTimeFromUnixTimestamp(timestamp);
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
if (!process.env.LOCALDEV) {
    const loggingMiddleware = require("./src/middleware/morgan-json");
    app.use(loggingMiddleware());
}
app.use(cookieParser());

const eventsRoutes = require("./src/_routes/events");
const dryersRoutes = require("./src/_routes/dryers");
const washDayRoutes = require("./src/_routes/washDays");
const dashboardRoutes = require("./src/_routes/dashboard");
const adminRoutes = require("./src/_routes/admin");
const authRoutes = require("./src/_routes/auth");
const { getEventTypeByColumnName } = require("./src/utils/viewRendering");

app.use("/events", eventsRoutes);
app.use("/dryers", dryersRoutes);
app.use("/washdays", washDayRoutes);
app.use("/admin", adminRoutes);
app.use("/auth", authRoutes);
app.use("/", dashboardRoutes);

app.listen(port, () => {
    console.log(`app listening on port ${port}`);
});
