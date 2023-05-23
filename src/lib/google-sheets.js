const sheet = require("../../config").spreadsheets.main;
const backupsSheet = require("../../config").spreadsheets.backups;
const { makeGoogleAPICLient } = require("./google-cloud");

// `unflatten` the array of values into an array of 1-element arrays
// type.googleapis.com/google.protobuf.ListValue
const _makeListValue = (arr) => {
    let result = [];
    Object.values(arr).map((i) => {
        result.push([i]);
    });
    return result;
};

const _makeSingleRowRangeFromID = (tableName, id) => {
    let aRangeId = id + 1;

    return `${tableName}!A${aRangeId}:Z${aRangeId}`;
};

const appendEventGoogleSheets = async ({
                                           spreadsheetId,
                                           range,
                                           row
                                       }) => {
    let props = {
        spreadsheetId,
        range,
        row
    };

    let sheetsClient = await makeGoogleAPICLient("sheets");


    let res = await sheetsClient.spreadsheets.values.append({
                                                                spreadsheetId: props.spreadsheetId,
                                                                // append() will seek to the first blank line on the
                                                                // page
                                                                range: props.range,
                                                                // RAW: don't parse dates, currency, other strings
                                                                // which can be guessed USER_ENTERED: treat the text
                                                                // like you entered it in the UI (e.g., '2023-12-31'
                                                                // becomes a date)
                                                                valueInputOption: "USER_ENTERED",
                                                                resource: {
                                                                    range: props.range,
                                                                    majorDimension: "COLUMNS",
                                                                    values: _makeListValue(props.row)
                                                                }
                                                            });

    return res;
};

// https://developers.google.com/sheets/api/guides/values#write_multiple_ranges
const updateDiscontinuousRangesOfEventsGoogleSheets = async ({
                                                                 spreadsheetId,
                                                                 tablename,
                                                                 rows
                                                             }) => {
    let props = {
        spreadsheetId,
        tablename,
        rows
    };

    _values = [];
    props.rows.map(i => {
        _values.push({
                         range: _makeSingleRowRangeFromID(tablename, i.id),
                         majorDimension: "COLUMNS",
                         values: _makeListValue(i)
                     });
    });

    let sheetsClient = await makeGoogleAPICLient("sheets");

    let res = await sheetsClient.spreadsheets.values.batchUpdate({
                                                                     spreadsheetId: props.spreadsheetId,
                                                                     // RAW: don't parse dates, currency, other strings
                                                                     // which can be guessed USER_ENTERED: treat the
                                                                     // text like you entered it in the UI (e.g.,
                                                                     // '2023-12-31' becomes a date)
                                                                     resource: {
                                                                         valueInputOption: "USER_ENTERED",
                                                                         data: _values
                                                                     }
                                                                 });

    return res;
};

const copySheetToBackup = async ({
                                     sourceSpreadsheetId,
                                     sheetId,
                                     destinationSpreadsheetId = backupsSheet.spreadsheetId
                                 }) => {
    let props = {
        sourceSpreadsheetId,
        sheetId,
        destinationSpreadsheetId
    };

    let sheetsClient = await makeGoogleAPICLient("sheets");

    let res = await sheetsClient.spreadsheets.sheets.copyTo(
        {
            spreadsheetId: props.sourceSpreadsheetId,
            sheetId: props.sheetId,
            resource: {
                destinationSpreadsheetId: props.destinationSpreadsheetId
            }
        }
    );

    return res;
};

module.exports = {
    appendEventGoogleSheets,
    updateDiscontinuousRangesOfEventsGoogleSheets,
    copySheetToBackup
};
