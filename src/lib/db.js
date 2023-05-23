const knex = require("knex");
const knex_config = require("../../knexfile");
const {
    getCurrentWashDay,
    getTimestampFromMoment
} = require("./moment-tz");

const db = knex(knex_config.development);

const insertEventDb = async (payload, tableName) => {
    let _payload = { ...payload };
    if (!_payload.created_at) {
        _payload.created_at = getCurrentWashDay();
    }

    // normalize all times to moment.js ISOString
    // if all we have is a date, still cast it to 00:00 on that day
    _payload.created_at = getTimestampFromMoment(_payload.created_at);

    let rows = await db.insert(_payload)
                       .returning("*")
                       .into(tableName);

    return { dbResult: rows[0] };
};

const getEvent = async (tableName, filters = undefined, filtersRaw = "", orderByDirection = "desc") => {
    let _filters = {
        ...filters,
        active: 1
    };

    return db.select("*")
             .from(tableName)
             .where(_filters)
             .andWhereRaw(filtersRaw || "")
             .orderBy("id", orderByDirection);
};

module.exports = {
    db,
    insertEventDb,
    getEvent
};
