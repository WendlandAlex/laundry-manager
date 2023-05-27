const {
    insertEventDb,
    getEvent
} = require("../../lib/db");
const {
    moment,
    getCurrentWashDay,
    normalizeTime
} = require("../../lib/moment-tz");
const {
    spreadsheets,
    organization,
    laundromat
} = require("../../../config");
const {
    dryerIdFromRowColumn,
    rowColumnFromDryerId
} = require("../../utils/dryers");
const { appendEventGoogleSheets } = require("../../lib/google-sheets");
const {
    parseWorking,
    parseRestarted
} = require("./events.utils");
const { injectCommonViewAttributes } = require("../../utils/viewRendering");

const getAllEvents = async (req, res, next) => {
    let data = await getEvent("events",
                              { active: 1 },
                              null,
                              "desc");

    data.map(i => {
        let {
            row,
            column
        } = rowColumnFromDryerId(i.dryer_id);
        i.column = column;
        i.row = (row == 1) ? "Top" : "Bottom";
        i.workingBool = (i.working == 1) ? true : false;
    });

    res.render("events/eventsList", {
        ...injectCommonViewAttributes(req, res),
        pageTitle: `${laundromat.name} Dryer Events - ${organization.shortName}`,
        events: data,
        eventsFormRenderUrl: "/events/submit"
    });
};

const getEventsByDryerId = async (req, res, next) => {
    let data = await getEvent("events",
                              {
                                  dryer_id: req.params.dryer_id,
                                  active: 1,
                              },
                              null,
                              "asc");

    res.send(data);
};

const renderForm = async (req, res) => {
    let row = null
    if (req.query.row) {
        row = req.query.row.toLowerCase()
    } else if (req.query.Row) {
        row = req.query.Row.toLowerCase()
    }

    let column = null
    if (req.query.column) {
        column = req.query.column
    } else if (req.query.Column) {
        column = req.query.Column
    }

    let dryer_id = dryerIdFromRowColumn(row, column);

    let textFields = [
        "error_code", "notes"
    ];
    let checkboxFields = [
        "restarted", "working"
    ];
    let formSchema = {
        textFields: textFields,
        checkboxFields: checkboxFields
    };

    res.render("events/eventForm", {
        ...injectCommonViewAttributes(req, res),
        pageTitle: `${laundromat.name} Dryer Event - ${organization.shortName}`,
        row: row,
        column: column,
        dryer_id: dryer_id,
        formSchema: formSchema,
        eventFormSubmitUrl: "/events/insertOneEvent"
    });
};

const insertOneEvent = async (req, res, next) => {
    let dryerId = dryerIdFromRowColumn(req.body.row, req.body.column);
    let active = 1;
    let restarts = parseRestarted(req.body.restarted || 0);
    let errorCode = req.body.error_code || null;
    let timestampCreatedAt = normalizeTime(req.body.createdAt || getCurrentWashDay()).ISOString;
    let working = parseWorking(req.body.working || 0);
    let notes = req.body.notes || "";

    let payload = {
        active: active,
        dryer_id: dryerId,
        restarts: restarts,
        error_code: errorCode,
        created_at: timestampCreatedAt,
        working: working,
        notes: notes
    };

    // returns `id`
    // the autoincrementing PK of the row -- this must be synced with sheets
    let dbResult = await insertEventDb(payload, "events");

    // sync with google sheets
    let sheetsResult = await appendEventGoogleSheets({
                                                         spreadsheetId: spreadsheets.main.spreadsheetId,
                                                         range: spreadsheets.main.sheets.events.ranges.default,
                                                         row: dbResult.dbResult
                                                     });

    res.render("events/eventCard", {
        ...injectCommonViewAttributes(req, res),
        pageTitle: `${laundromat.name} Dryer Event - ${organization.shortName}`,
        dbResult: dbResult,
        sheetsResult: sheetsResult,
        column: req.body.column,
        row: req.body.row == 1 ? "Top" : "Bottom",
        dryerId: dryerId,
        eventsFormRenderUrl: "/events/submit"
    });
};

module.exports = {
    renderForm,
    getEventsByDryerId,
    getAllEvents,
    insertOneEvent
};
