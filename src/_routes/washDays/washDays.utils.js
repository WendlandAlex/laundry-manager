const {
    db
} = require("../../lib/db");
const { updateDiscontinuousRangesOfEventsGoogleSheets } = require("../../lib/google-sheets");
const {
    spreadsheets,
    bags
} = require("../../../config");
const { getRandomStepBetween } = require("../../utils/dataManipulation");
const {
    normalizeTime
} = require("../../lib/moment-tz");

const getPersonHavingBagId = async (createdAt, bagId) => {
    let {
        Date: dateCreatedAt,
        ISOString: timestampCreatedAt,
    } = normalizeTime(createdAt);

    // get the dates that have any events
    let data = await db.select("person_name")
                       .from("washdays")
                       .where({
                                  "bag_id": bagId,
                              })
                       .andWhereRaw(`date(created_at) = '${dateCreatedAt}'`)
                       .groupBy("person_name");

    if (data[0]) {
        return data[0].person_name;
    }
};

const changePersonName = async (createdAt, oldPersonName, newPersonName) => {
    let {
        Date: dateCreatedAt,
        ISOString: timestampCreatedAt,
    } = normalizeTime(createdAt);

    let data = await db("washdays").update({ person_name: newPersonName })
                                   .where({
                                              person_name: oldPersonName
                                          })
                                   .andWhereRaw(`date(created_at) = '${dateCreatedAt}'`)
                                   .returning("*");

    let sheetsResult = await updateDiscontinuousRangesOfEventsGoogleSheets({
                                                                               spreadsheetId: spreadsheets.main.spreadsheetId,
                                                                               tablename: "washdays",
                                                                               rows: data
                                                                           });

    return sheetsResult;
};

const updateBagId = async (createdAt, oldBagId, newBagId) => {
    let {
        Date: dateCreatedAt,
        ISOString: timestampCreatedAt,
    } = normalizeTime(createdAt);

    let data = await db("washdays").update({
                                               bag_id: newBagId, // HACK:
                                               // can't set a `null` in google sheets
                                               // which means we can't send a bulk update which will delete column
                                               // values unless we send an empty string
                                               split_from_bag_id: "",
                                           })
                                   .where({
                                              bag_id: oldBagId,
                                          })
                                   .andWhereRaw(`date(created_at) = '${dateCreatedAt}'`)
                                   .returning("*");

    // insert a `tombstone` so that,
    // after we have modified the bag_id on past rows,
    // future requests for an unused bag_id
    // won't try to use the bag_id that
    // was assigned to this bag while it was alive
    let tombstoneRow = await db("washdays").insert({
                                                       bag_id: oldBagId,
                                                       created_at: timestampCreatedAt,
                                                       notes: "tombstone"
                                                   })
                                           .returning("*");


    let sheetsResult = await updateDiscontinuousRangesOfEventsGoogleSheets({
                                                                               spreadsheetId: spreadsheets.main.spreadsheetId,
                                                                               tablename: "washdays",
                                                                               rows: [...data, tombstoneRow].flat()
                                                                           });

    return sheetsResult;
};

// `coalesce` -- return the first column that is not null
const coalesceEvents = (row = {}) => {
    for (let [k, v] of Object.entries(row)) {
        if (v != null) {
            if (Object.values(bags.eventTypes).map(i => i.columnName).includes(k)) {
                return k;
            }
        }
    }
};

const getNextEventType = (lastEventType) => {
    let currEventTypeIndex;
    Object.values(bags.eventTypes).map((i, index) => {
        if (lastEventType.columnName === i.columnName) {
            currEventTypeIndex = index;
        }
    });

    if (currEventTypeIndex < Object.values(bags.eventTypes).length - 1) {
        return Object.values(bags.eventTypes)[currEventTypeIndex + 1];
    } else {
        return Object.values(bags.eventTypes)[currEventTypeIndex];
    }
};

const getNextAvailBagId = async (createdAt, startingId = null) => {
    let {
        Date: dateCreatedAt,
        ISOString: timestampCreatedAt,
    } = normalizeTime(createdAt);

    if (!startingId) {
        startingId = getRandomStepBetween(222, 777, 11);
    }

    let data = await db.min("bag_id")
                       .from("washdays")
                       .whereRaw(`date(created_at) = '${dateCreatedAt}'`)
                       .andWhere("bag_id", ">", startingId)
                       .limit(1);

    if (!data[0]["max(`bag_id`)"]) {
        return startingId + 1;
    } else {
        return data[0]["max(`bag_id`)"] + 1;
    }
};

const getBagsSplitFromThisBag = async (createdAt, bagId) => {
    let {
        Date: dateCreatedAt,
        ISOString: timestampCreatedAt,
    } = normalizeTime(createdAt);

    let data = await db.select("*")
                       .from("washdays")
                       .where({
                                  active: 1,
                                  split_from_bag_id: bagId
                              })
                       .andWhereRaw(`date(created_at) = '${dateCreatedAt}'`)
                       .orderBy("id", "desc")
                       .groupBy("bag_id");

    return data;
};

module.exports = {
    getPersonHavingBagId,
    changePersonName,
    updateBagId,
    coalesceEvents,
    getNextEventType,
    getNextAvailBagId,
    getBagsSplitFromThisBag
};
