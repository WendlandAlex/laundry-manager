const {
    insertEventDb,
    getEvent
} = require("../../lib/db");
const {
    getCurrentWashDay,
    normalizeTime,
    getWashDayFromMoment
} = require("../../lib/moment-tz");
const {
    spreadsheets,
    bags,
    organization,
} = require("../../../config");
const {
    appendEventGoogleSheets,
} = require("../../lib/google-sheets");
const {} = require("../../utils/dataManipulation");
const {
    aggregateWashDayEventsByPerson,
    getAggregatedWashDayData,
    getWashDays,
} = require("../../services/washDay");
const {
    getPersonHavingBagId,
    changePersonName,
    getNextEventType,
    getNextAvailBagId,
    updateBagById,
    coalesceEvents,
} = require("./washDays.utils");
const {
    camelCaseToSnakeCase,
} = require("../../utils/stringFormatting");
const {
    injectCommonViewAttributes,
    getEventTypeByColumnName
} = require("../../utils/viewRendering");

const renderWashdaysView = async (req, res, next) => {
    let adminUsername = res.locals.adminUsername;
    let userAuthorizedTokens = res.locals.userAuthorizedTokens;
    let userPendingTokens = res.locals.userPendingTokens;

    // get the dates that have any events
    let data = await getWashDays();

    // decide whether we need to prompt the user to create a new wash day for today
    let todayActive;
    let dateCreatedAt = normalizeTime(getCurrentWashDay()).Date;
    for (let washday of data) {
        if (getWashDayFromMoment(washday.created_at) === dateCreatedAt) {
            todayActive = true;
            break;
        }
    }
    // hyrdate each washday object with additional data:
    // - aggregate statistics (e.g., bags washed)
    // - whether the current user has a pending or approved access request in the scope of that washday
    let washDays = [];
    for (const i of data) {
        let requestPending;
        let requestApproved;
        if (adminUsername) {
            requestApproved = true;
        } else {
            if (userAuthorizedTokens && userAuthorizedTokens[i.created_at]) {
                requestApproved = true;
            } else if (userPendingTokens && userPendingTokens[i.created_at]) {
                requestPending = true;
            }
        }

        washDays.push({
                          createdAt: getWashDayFromMoment(i.created_at),
                          requestPending: requestPending,
                          requestApproved: requestApproved,
                          peopleComplete: i.people_complete,
                          peopleIncomplete: i.people_incomplete,
                          bagsAccepted: i.bags_accepted,
                          bagsWashed: i.bags_washed,
                          bagsDried: i.bags_dried,
                          bagsCompleted: i.bags_completed,
                          bagsDelivered: i.bags_delivered,
                      });
    }

    res.render("washDays/washDays", {
        ...injectCommonViewAttributes(req, res),
        pageTitle: `${organization.shortName} - Wash Days`,
        washDayUrl: "/washdays",
        washDays: washDays,
        createdAt: dateCreatedAt,
        todayActive: todayActive,
        initWashDayUrl: "/washdays/new",
        eventTypes: Object.values(bags.eventTypes)
    });
};

const createNewWashDay = async (req, res, next) => {
    let {
        Date: dateCreatedAt,
        ISOString: timestampCreatedAt,
    } = normalizeTime(req.query.createdAt || getCurrentWashDay());

    // NOTE to maintain integrity of incrementing PK `id` we must sync this to google sheets
    // just like a `real` row
    let dbResult = await insertEventDb({
                                           created_at: timestampCreatedAt,
                                           notes: "init washday"
                                       }, "washdays");

    let sheetsResult = await appendEventGoogleSheets({
                                                         spreadsheetId: spreadsheets.main.spreadsheetId,
                                                         range: spreadsheets.main.sheets.washdays.ranges.default,
                                                         row: dbResult.dbResult
                                                     });

    res.redirect(302, `/washdays/${dateCreatedAt}/personOriented`);
};

const modifyPerson = async (req, res, next) => {
    let createdAt = req.params.createdAt;
    let oldPersonName = req.params.personName.trim();
    let newPersonName = req.body.newPersonName.trim();

    await changePersonName(createdAt, oldPersonName, newPersonName);

    res.redirect(302, `/washdays/${createdAt}/person/${newPersonName}`);
};

const renderEventForm = async (req, res, next) => {
    let dateCreatedAt = normalizeTime(req.params.createdAt).Date;
    let personName = req.query.personName ? req.query.personName.trim() : null;
    let bagId = req.query.bagId ? req.query.bagId.trim() : null;
    let lastEventType = req.query.lastEventType ? req.query.lastEventType.trim() : null;

    res.render("washDays/addPersonToWashdayForm", {
        ...injectCommonViewAttributes(req, res),
        pageTitle: "",
        createdAt: dateCreatedAt,
        personName: personName,
        bagId: bagId,
        eventTypes: Object.values(bags.eventTypes),
        lastEventType: lastEventType,
        eventFormSubmitUrl: `/washdays/${dateCreatedAt}/events`
    });
};

const renderBagForm = async (req, res, next) => {
    let bagId = req.params.bagId;
    let dateCreatedAt = normalizeTime(req.params.createdAt).Date;

    let data = await getEvent("washdays", {
        bag_id: bagId
    }, `date(created_at) = '${dateCreatedAt}'`, "desc");

    let splitFromBagId = data[0].split_from_bag_id || null;

    let lastEventType = getEventTypeByColumnName(coalesceEvents(data[0]));

    let splitFromBagLastEventType;
    if (splitFromBagId) {
        let splitFromBagData = await getEvent("washdays", {
            bag_id: splitFromBagId
        }, `date(created_at) = '${dateCreatedAt}'`, "desc");

        splitFromBagLastEventType = getEventTypeByColumnName(coalesceEvents(splitFromBagData[0]));
    }

    // cannot go `next` past the end
    if (lastEventType.columnName === "bags_delivered") {
        let personName = data[0].person_name;
        res.redirect(302, `/washdays/${dateCreatedAt}/person/${personName}`);
        return;
    }

    let nextEventType = getNextEventType(lastEventType);

    // take a next `bag_id` reasonably high above the active range
    // only do something with this `bag_id` if we split a bag
    // if splitting, give it this so it's unlikely to collide with any `bag_id`s a user might be trying to allocate
    let nextAvailSplitBagId = await getNextAvailBagId(dateCreatedAt);

    res.render("washDays/bagCard", {
        ...injectCommonViewAttributes(req, res),
        pageTitle: "",
        createdAt: dateCreatedAt,
        personName: data[0].person_name,
        bagId: bagId,
        splitFromBagId: splitFromBagId,
        splitFromBagLastEventType: splitFromBagLastEventType,
        nextAvailSplitBagId: nextAvailSplitBagId,
        eventTypes: Object.values(bags.eventTypes),
        lastEventType: lastEventType,
        nextEventType: nextEventType,
        moveFormFields: {
            eventFormSubmitUrl: `/washdays/${dateCreatedAt}/events`,
            eventType: nextEventType,
            bagId: bagId,
            splitFromBagId: splitFromBagId,
            personName: data[0].person_name,
            createdAt: dateCreatedAt,
            submitButtonText: `Move`
        },
        splitFormFields: {
            eventFormSubmitUrl: `/washdays/${dateCreatedAt}/events`,
            eventType: lastEventType,
            bagId: nextAvailSplitBagId,
            splitFromBagId: bagId,
            personName: data[0].person_name,
            createdAt: dateCreatedAt,
            submitButtonText: `Split`,
            splitNoteText: lastEventType ? `Split from ${bagId} into ${nextAvailSplitBagId} at ${lastEventType.friendlyName}` : null
        },
        mergeFormFields: {
            eventFormSubmitUrl: `/washdays/${dateCreatedAt}/events`,
            eventType: splitFromBagLastEventType,
            bagId: bagId,
            splitFromBagId: splitFromBagId,
            personName: data[0].person_name,
            createdAt: dateCreatedAt,
            submitButtonText: `Merge`,
            mergeNoteText: splitFromBagLastEventType ? `Merged from ${bagId} into ${splitFromBagId} at ${splitFromBagLastEventType.friendlyName}` : null
        }
    });
};

const renderModifyPersonForm = async (req, res, next) => {
    let createdAt = req.params.createdAt;
    let personName = req.params.personName.trim();

    res.render("washDays/modifyPersonForm", {
        ...injectCommonViewAttributes(req, res),
        pageTitle: "",
        createdAt: createdAt,
        personName: personName,
        modifyPersonFormSubmitUrl: `/washdays/${createdAt}/person/${personName}/modify`
    });
};


const insertEvent = async (req, res, next) => {
    let dateCreatedAt = normalizeTime(req.params.createdAt).Date;
    let personName = req.body.personName.trim();
    let bagId = req.body.bagId || null;
    let splitFromBagId = req.body.splitFromBagId || null;

    // if this is splitting an existing bag, the writes to the DB and Google sheets are the same
    // but we want to know, in case we want to do something different with the redirect
    let isSplitBagEvent = req.body.isSplitBagEvent || null;

    // if this is merging a split bag back into its parent, we need to do a cleanup update
    let isMergeBagEvent = req.body.isMergeBagEvent || null;

    //
    // validate form
    //
    _redirectSlug = `/washdays/${dateCreatedAt}/events/`;

    // bagId field can be null ONLY for `other` event type
    if (!bagId) {
        if (req.body.eventType != "other") {
            if (personName != "") {
                _redirectSlug += `?personName=${req.body.personName}&bagId=Bag+ID+is+required+for+this+event+type`;
            } else {
                _redirectSlug += `?bagId=Bag+ID+is+required+for+this+event+type`;
            }

            // put a return here to make sure express doesn't continue and try to serve the other redirect
            // this will violate HTTP and try to send 2 responses for one request
            // symptom: 'Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client'
            res.redirect(302, _redirectSlug);
            return;
        }
    }

    // if there is a bagId
    // if that bagId has already been allocated, you may only enter events for that bagId by following a redirect, no
    // free entry
    let personAlreadyAllocatedBagId = await getPersonHavingBagId(dateCreatedAt, bagId);

    if (personAlreadyAllocatedBagId && (personAlreadyAllocatedBagId != personName)) {
        _redirectSlug += `?personName=${personName}&bagId=Bag+ID+already+in+use+by+${personAlreadyAllocatedBagId}`;

        // put a return here to make sure express doesn't continue and try to serve the other redirect
        // this will violate HTTP and try to send 2 responses for one request
        // symptom: 'Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client'
        res.redirect(302, _redirectSlug);
        return;
    }

    //
    // form is valid! :congratulations:
    //

    let payload = {
        bag_id: bagId,
        split_from_bag_id: splitFromBagId,
        person_name: personName,
        created_at: req.body.createdAt || null,
        bags_accepted: req.body.bagsAccepted || null,
        bags_washed: req.body.bagsWashed || null,
        washer_id: req.body.washerId || null,
        bags_dried: req.body.bagsDried || null,
        dryer_id: req.body.dryerId || null,
        bags_completed: req.body.bagsCompleted || null,
        bags_delivered: req.body.bagsDelivered || null,
        notes: req.body.notes || null,
    };

    // increment the counter by `one bag` if this is an event that has a bag (i.e., not `notes`)
    // if this is a merge, set the counter to 0
    // on a merge, we want the `most recent event` to be non-null,
    // but we don't want to inflate our stats by counting a merge as a bag
    if (req.body.eventType != "other") {
        payload[camelCaseToSnakeCase(req.body.eventType)] = (isMergeBagEvent) ? 0 : 1;
    }

    // keep this generalized `payload` semantics to enable bulk submission if necessary
    let dbResult = await insertEventDb(payload, "washdays");

    // immediately sync the insert to google sheets
    let sheetsResult = await appendEventGoogleSheets({
                                                         spreadsheetId: spreadsheets.main.spreadsheetId,
                                                         range: spreadsheets.main.sheets.washdays.ranges.default,
                                                         row: dbResult.dbResult
                                                     });

    // if this is a merge, migrate all events under the child bag_id to the parent bag_id
    // additionally, decrease bag quantity for 1 to 0 for all events that occurred under the `child branch`
    // this is because our definition of "complete" vs "incomplete" is accepted <= completed
    // thus if a bag splits at `accepted` it would leave an orphaned accepted count and permanently mark the person as
    // "incomplete"
    if (isMergeBagEvent) {
        await updateBagById(dateCreatedAt, bagId, splitFromBagId);
    }

    // see this person
    res.redirect(302, `/washdays/${dateCreatedAt}/person/${personName}`);
};

const getEventsByPerson = async (req, res, next) => {
    let dateCreatedAt = normalizeTime(req.params.createdAt).Date;
    let personName = req.params.personName.trim();

    let data = await getEvent("washdays", {
        person_name: personName,
    }, `date(created_at) = '${dateCreatedAt}'`);

    let aggregatedData = aggregateWashDayEventsByPerson(data);

    res.render("washDays/personCard", {
        ...injectCommonViewAttributes(req, res),
        pageTitle: `${organization.shortName} - Wash Day - ${personName}`,
        data: aggregatedData,
        personName: personName,
        createdAt: dateCreatedAt,
        eventFormUrl: "/washdays" + `/${dateCreatedAt}` + "/events",
        modifyPersonUrl: "/washdays" + `/${dateCreatedAt}` + "/person" + `/${personName}` + "/modify",
        eventTypes: Object.values(bags.eventTypes)
    });
};

const getAllEventsByCreatedAtPersonOriented = async (req, res, next) => {
    let dateCreatedAt = normalizeTime(req.params.createdAt).Date;
    let sortColumn = req.query.bagsSortColumn || "person_name";
    let tileSize = req.query.tileSize || "small";

    let aggregatedData = await getAggregatedWashDayData(dateCreatedAt, sortColumn);

    res.render("washDays/washDaySummaryPersonOriented", {
        ...injectCommonViewAttributes(req, res),
        pageTitle: `${organization.shortName} - Wash Day ${dateCreatedAt}`,
        createdAt: dateCreatedAt,
        getPersonUrl: "/washdays" + `/${dateCreatedAt}` + "/person",
        eventFormUrl: "/washdays" + `/${dateCreatedAt}` + "/events",
        washDaySummaryBagOrientedUrl: "/washdays" + `/${dateCreatedAt}` + "/bagOriented",
        people: aggregatedData,
        eventTypes: Object.values(bags.eventTypes),
        allowedSortColumns: ["person_name", "bag_id"],
        allowedTileSizes: ["small", "medium"],
        tileSize: tileSize
    });
};

const getAllEventsByCreatedAtBagOriented = async (req, res, next) => {
    let dateCreatedAt = normalizeTime(req.params.createdAt).Date;
    let sortColumn = req.query.sortColumn || "person_name";
    let tileSize = req.query.tileSize || "small";

    let aggregatedData = await getAggregatedWashDayData(dateCreatedAt, sortColumn);

    res.render("washDays/washDaySummaryBagOriented", {
        ...injectCommonViewAttributes(req, res),
        pageTitle: `${organization.shortName} - Wash Day ${dateCreatedAt}`,
        createdAt: dateCreatedAt,
        getPersonUrl: "/washdays" + `/${dateCreatedAt}` + "/person",
        eventFormUrl: "/washdays" + `/${dateCreatedAt}` + "/events",
        washDaySummaryPersonOrientedUrl: "/washdays" + `/${dateCreatedAt}` + "/personOriented",
        bags: aggregatedData,
        allowedSortColumns: ["person_name", "bag_id"],
        allowedTileSizes: ["small", "medium"],
        eventTypes: Object.values(bags.eventTypes),
        tileSize: tileSize
    });
};

module.exports = {
    renderWashdaysView,
    createNewWashDay,
    modifyPerson,
    renderEventForm,
    renderBagForm,
    renderModifyPersonForm,
    insertEvent,
    getEventsByPerson,
    getAllEventsByCreatedAtPersonOriented,
    getAllEventsByCreatedAtBagOriented
};
