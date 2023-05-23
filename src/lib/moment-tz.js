const moment = require("moment-timezone");
moment.tz.setDefault("America/Chicago");

const getCurrentWashDay = () => {
    return moment().format("YYYY-MM-DD");
};

const getCurrentTimestamp = () => {
    return moment().toISOString();
};

const getWashDayFromMoment = (timestamp) => {
    return moment(timestamp).format("YYYY-MM-DD");
};

const getTimestampFromMoment = (timestamp) => {
    return moment(timestamp).toISOString();
};

const getFriendlyTimeFromUnixTimestamp = (timestamp) => {
    return moment.unix(timestamp).format("MMM D h:mma");
};

const getFriendlyTimeFromMoment = (timestamp) => {
    return moment(timestamp).format("MMM D h:mma");
};

const getCurrentUnixTimestamp = () => {
    return moment().unix();
};

const normalizeTime = (timestamp) => {
    return {
        ISOString: getTimestampFromMoment(timestamp),
        Date: getWashDayFromMoment(timestamp),
        HumanTime: getFriendlyTimeFromMoment(timestamp)
    };
};

module.exports = {
    moment,
    getCurrentWashDay,
    getCurrentTimestamp,
    getWashDayFromMoment,
    getTimestampFromMoment,
    getFriendlyTimeFromUnixTimestamp,
    getCurrentUnixTimestamp,
    normalizeTime
};
