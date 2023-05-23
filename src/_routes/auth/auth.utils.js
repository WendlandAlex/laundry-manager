const { db } = require("../../lib/db");
const {
    getCurrentWashDay,
    getCurrentTimestamp,
    getCurrentUnixTimestamp,
    normalizeTime
} = require("../../lib/moment-tz");

const insertUserRequest = async (userUsername, created_at, ip, user_agent, columnOpts = {}) => {
    let dateCreatedAt = normalizeTime(created_at || getCurrentWashDay()).Date;

    let data = await db.insert({
                                   userUsername: userUsername,
                                   created_at: dateCreatedAt,
                                   ip: ip,
                                   user_agent: user_agent,
                                   requested_at: getCurrentTimestamp(), ...columnOpts
                               })
                       .into("washdayUsers")
                       .returning("*");

    return data;
};

const getUserRequestsAuthorized = async (filters = {}, filtersRaw = undefined) => {
    let data = await db.select("*")
                       .from("washdayUsers")
                       .where({
                                  rejected_at: null,
                                  rejected_by: null,
                              })
                       .andWhereRaw(`authorized_by is not null and authorized_at is not null`)
                       .andWhere(filters)
                       .andWhereRaw(filtersRaw || "");

    return data;
};

const getUserRequestsNotAuthorized = async (filters = {}, filtersRaw = undefined) => {
    let data = await db.select("*")
                       .from("washdayUsers")
                       .where({
                                  authorized_at: null,
                                  authorized_by: null,
                                  rejected_at: null,
                                  rejected_by: null,
                              })
                       .andWhere(filters)
                       .andWhereRaw(filtersRaw || "");

    return data;
};

const getUserRequests = async (filters = {}) => {
    let data = await db.select("*")
                       .from("washdayUsers")
                       .where({
                                  rejected_at: null,
                                  rejected_by: null,
                              })
                       .andWhere(filters)
                       .orderBy("userUsername");

    return data;
};

const rejectExpiredUserRequests = async () => {
    let data = await db("washdayUsers").update({
                                                   rejected_at: getCurrentTimestamp(),
                                                   rejected_by: `autoExpire`
                                               })
                                       .where("expires_at", "<", getCurrentUnixTimestamp())
                                       .returning("*");

    return data;
};

const authorizeUserRequestsById = async (ids = [], authorized_at, authorized_by) => {
    let data = await db("washdayUsers").update({
                                                   authorized_at: authorized_at,
                                                   authorized_by: authorized_by
                                               }).whereIn("id", ids)
                                       .returning("*");

    return data;
};

module.exports = {
    insertUserRequest,
    getUserRequests,
    getUserRequestsAuthorized,
    getUserRequestsNotAuthorized,
    rejectExpiredUserRequests,
    authorizeUserRequestsById
};
