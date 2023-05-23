const { moment } = require("../../lib/moment-tz");
const { db } = require("../../lib/db");

const fetchUsersPendingAuthorization = async (createdAt) => {
    let data = await db.select("*")
                       .from("washdayUsers")
                       .where({
                                  created_at: createdAt,
                                  authorized_by: null,
                              })
                       .orderBy("requested_at", "desc");

    return data;
};

const authorizeUser = async (userUsername, createdAt, ip, ua, adminUsername) => {
    let payload = {
        userUsername: userUsername,
        created_at: createdAt,
        ip: ip,
        ua: ua,
        authorized_at: moment().toISOString(),
        authorized_by: adminUsername,
    };

    let data = await db.insert(payload)
                       .into("washdayUsers")
                       .returning("*");

    return data;
};

module.exports = {
    authorizeUser,
    fetchUsersPendingAuthorization
};
