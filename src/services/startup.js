const sheet = require("../../config").spreadsheets.main;
const { db } = require("../lib/db");
const { makeGoogleAPICLient } = require("../lib/google-cloud");
const {
    arrayElementsComparison,
    partitionArray
} = require("../utils/dataManipulation");

const dbCheck = async () => {
    let queryResult = await db("dryers").count("id");
    let numDryers = queryResult
        .at(0)
        ["count(`id`)"];

    // is the number of dryers even?
    return (numDryers > 0 && numDryers % 2 === 0);
};

const hydrateSqliteFromSpreadsheet = async (sheets = []) => {
    // sqlite has a max of 500 rows for bulk import
    let rowCounter = 0
    let results = []

    let sheetsClient = await makeGoogleAPICLient("sheets");
    for (const sheetName of sheets) {
        console.log(sheet.sheets[sheetName].ranges.default);
        let res = await sheetsClient.spreadsheets.values.get({
                                                                 spreadsheetId: sheet.spreadsheetId,
                                                                 range: sheet.sheets[sheetName].ranges.default
                                                             });

        let data = res.data.values;

        if (!data || data.length === 0) {
            return;
        }
        let header = data[0];

        let arraysIdentical = arrayElementsComparison(header, Object.values(sheet.sheets[sheetName].header));

        if (arraysIdentical !== true) {
            throw new Error(`Schema mismatch on ${sheetName}: remote was ${JSON.stringify(header)}, local was ${JSON.stringify(
                Object.values(sheet.sheets[sheetName].header))}`);
        }

        // ignore the header
        let rows = data.slice(1);

        let toInsert = rows.map((row) => {
            let _row = {};
            row.map((column, index) => {
                _row[header[index]] = column || null;
            });
            return _row;
        });

        if (toInsert.length) {
            let chunks = partitionArray(toInsert, 500)

            for (let chunk of chunks) {
                let dbInsert = await db(sheetName).insert(chunk).returning("id");
                rowCounter += dbInsert.length
            }

            results.push(`inserted ${rowCounter} rows into ${sheetName}`)
        }
    }

    return results;
};

module.exports = {
    dbCheck,
    hydrateSqliteFromSpreadsheet,
};
