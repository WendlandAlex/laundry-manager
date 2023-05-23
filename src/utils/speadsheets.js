const sheet = require("../../config").spreadsheets.main;

const tableToRange = (data, sheetName) => {
    _header = sheet.sheets[sheetName].header || {};

    return true;
};

module.exports = {
    tableToRange
};
