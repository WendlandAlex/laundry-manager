const { laundromat } = require("../../config");
const { db } = require("../lib/db");
const {
    dryerIdFromRowColumn,
    rowColumnFromDryerId
} = require("../utils/dryers");

const getAllDryers = async () => {
    let data = await db.select("*")
                       .from("events")
        // ignore any bad data (`column` as not provided, or was a typo and dryer_id is out of range)
                       .whereBetween("dryer_id", [1, laundromat.dryers.numDryers])
                       .where("active", 1)
                       .orderBy("id", "desc");

    // TODO: extract this
    // scan over the events in the log, aggregate events by `dryer_id`
    let groupedBy = data.reduce((accumulator, currentValue) => {
        if (!accumulator[currentValue.dryer_id]) {
            accumulator[currentValue.dryer_id] = [];
        }
        accumulator[currentValue.dryer_id].push(currentValue);

        return accumulator;
    }, {});

    let res = [];
    for (let [dryerId, entries] of Object.entries(groupedBy)) {
        res.push(formatDryerEntry(entries));
    }
    return res;
};

const formatDryerEntry = (arrData) => {
    let res = {};
    // invariant
    res.dryer_id = arrData[0].dryer_id;
    let {
        row,
        column
    } = rowColumnFromDryerId(arrData[0].dryer_id);
    res.column = column;
    res.rowInt = row;
    res.top = row === 1;
    res.row = res.top ? "Top" : "Bottom";

    // top one of
    res.working = arrData[0].working === 1;
    res.last_updated = arrData[0].created_at;

    // aggregated
    res.error_codes = [];
    res.error_codes_summary = {};
    res.notes = [];
    arrData.map(i => {
        if (i.error_code && i.error_code !== "null") {
            res.error_codes.push({
                                     "created_at": i.created_at,
                                     "error_code": i.error_code
                                 });
            if (!res.error_codes_summary[i.error_code]) {
                res.error_codes_summary[i.error_code] = 0;
            }
            res.error_codes_summary[i.error_code] += 1;
        }
        if (i.notes) {
            notesPayload = {};
            notesPayload.created_at = i.created_at;
            notesPayload.note = i.notes;
            if (i.error_code && i.error_code !== "null") {
                notesPayload.error_code = i.error_code;
            }
            res.notes.push(notesPayload);
        }
    });

    return res;
};

module.exports = {
    formatDryerEntry,
    getAllDryers
};
