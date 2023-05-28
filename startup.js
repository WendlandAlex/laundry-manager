require("dotenv").config();

const { hydrateSqliteFromSpreadsheet } = require("./src/services/startup");
const { db } = require("./src/lib/db");
const { spreadsheets } = require("./config/index");

async function main() {
    console.log("DOWN");
    await db.migrate.rollback();

    console.log("UP");
    await db.migrate.latest();

    console.log("SEED");
    let results = await hydrateSqliteFromSpreadsheet(Object.keys(spreadsheets.main.sheets));
    results.forEach(i => console.log("[seed]", i));

    console.log("SEED DONE");
    if (process.env.LOCALDEV) {
        process.exit(0);
    }
}

main().then();
