const { bags } = require("../../config");
const {
          getWashDayFromMoment,
          normalizeTime,
          getFriendlyTimeFromUnixTimestamp
      }        = require("../lib/moment-tz");

const isNotNull = (arg) => {
    return arg != null;
};

const jsonify = (obj) => {
    return JSON.stringify(obj, null, 2);
};

const isNumeric = (str) => {
    return parseInt(str);
};

const workingify = (bool) => {
    if (bool === true) {
        return `Working ✅`;
    } else {
        return `Not Working ❌`;
    }
};

const stringEquals = (str1, str2) => {
    return str1 == str2;
};

const arrayIncludes = (arr, ...arguments) => {
    for (let term of arguments) {
        if (arr.includes(term)) {
            return true;
        }
    }
};

const arrayLength = (arr) => {
    return arr.length;
};

const getBagLastEvent = (arr) => {
    _top        = arr[0];
    columnNames = Object.values(bags.eventTypes).map(i => i.columnName);

    for (let [event, value] of Object.entries(_top)) {
        if (!columnNames.includes(event)) {
            continue;
        }
        if (value != null) {
            return event;
        }
    }
};

const extractNotes = (arr) => {
    res = [];
    arr.forEach(i => {
        if (i.notes) {
            res.push(i.notes);
        }
    });

    return res;
};

// thank you https://stackoverflow.com/a/20891435
const preselectSelect = (option, passedValue) => {
    if (option === passedValue) {
        return " selected";
    } else {
        return "";
    }
};

const dateFromISOString = (ISOString) => {
    return getWashDayFromMoment(ISOString);
};

const humanTimeFromISOString = (ISOString) => {
    return normalizeTime(ISOString).HumanTime;
};

const humanTimeFromUnix = (timestamp) => {
    return getFriendlyTimeFromUnixTimestamp(timestamp);
};

module.exports = {
    isNotNull,
    jsonify,
    isNumeric,
    workingify,
    stringEquals,
    arrayIncludes,
    arrayLength,
    getBagLastEvent,
    extractNotes,
    preselectSelect,
    dateFromISOString,
    humanTimeFromISOString,
    humanTimeFromUnix
};
