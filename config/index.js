require("dotenv").config();
const path = require("path");

const jwtAdminSecret = process.env.JWT_ADMIN_SECRET;
const jwtAdminSecretExpiresIn = process.env.JWT_ADMIN_EXPIRES_IN || "6h";
const jwtAdminCookieMaxAge = process.env.JWT_ADMIN_COOKIE_MAX_AGE || 21600000;
const adminCookieName = process.env.JWT_ADMIN_COOKIE_NAME || "laundromat_admin";

const jwtUserSecret = process.env.JWT_USER_SECRET;
const jwtUserSecretExpiresIn = process.env.JWT_USER_EXPIRES_IN || "4h";
const jwtUserCookieMaxAge = process.env.JWT_USER_COOKIE_MAX_AGE || 14400000;
const userCookieNamePrefix = process.env.JWT_USER_COOKIE_PREFIX || "laundromat_user";

// NOTE: if using service account auth, you must `share` the spreadsheet, literally by
// inviting the service account user by email to be `Editor` on the sheet
const spreadsheets = {
    main: (process.env.LOCALDEV) ? // DEV connection
        {
            spreadsheetId: process.env.SHEETS_DEV_SPREADSHEET_MAIN_SPREADSHEET_ID,
            sheets: {
                washdays: {
                    gid: process.env.SHEETS_DEV_SHEET_WASHDAYS_GID,
                    ranges: {
                        default: "washdays!A1:Z1000"
                    },
                    header: {
                        "A1": "id",
                        "B1": "active",
                        "C1": "created_at",
                        "D1": "person_name",
                        "E1": "bag_id",
                        "F1": "split_from_bag_id",
                        "G1": "bags_accepted",
                        "H1": "bags_washed",
                        "I1": "washer_id",
                        "J1": "bags_dried",
                        "K1": "dryer_id",
                        "L1": "bags_completed",
                        "M1": "bags_delivered",
                        "N1": "notes"
                    }
                },
                events: {
                    gid: process.env.SHEETS_DEV_SHEET_EVENTS_GID,
                    ranges: {
                        default: "events!A1:Z1000"
                    },
                    header: {
                        "A1": "id",
                        "B1": "active",
                        "C1": "dryer_id",
                        "D1": "restarts",
                        "E1": "error_code",
                        "F1": "created_at",
                        "G1": "working",
                        "H1": "notes"
                    }
                },
            }
        } : // PROD connection
        {
            spreadsheetId: process.env.SHEETS_PROD_SPREADSHEET_MAIN_SPREADSHEET_ID,
            sheets: {
                events: {
                    gid: process.env.SHEETS_PROD_SHEET_EVENTS_GID,
                    ranges: {
                        default: "events!A1:Z1000"
                    },
                    header: {
                        "A1": "id",
                        "B1": "active",
                        "C1": "dryer_id",
                        "D1": "restarts",
                        "E1": "error_code",
                        "F1": "created_at",
                        "G1": "working",
                        "H1": "notes"
                    }
                },
                washdays: {
                    gid: process.env.SHEETS_PROD_SHEET_WASHDAYS_GID,
                    ranges: {
                        default: "washdays!A1:Z1000"
                    },
                    header: {
                        "A1": "id",
                        "B1": "active",
                        "C1": "created_at",
                        "D1": "person_name",
                        "E1": "bag_id",
                        "F1": "split_from_bag_id",
                        "G1": "bags_accepted",
                        "H1": "bags_washed",
                        "I1": "washer_id",
                        "J1": "bags_dried",
                        "K1": "dryer_id",
                        "L1": "bags_completed",
                        "M1": "bags_delivered",
                        "N1": "notes"
                    }
                },
            }
        },
    backups: (process.env.LOCALDEV) ? // DEV connection
        {
            spreadsheetId: process.env.SHEETS_DEV_SPREADSHEET_BACKUPS_SPREADSHEET_ID
        } : // PROD connection
        {
            spreadsheetId: process.env.SHEETS_PROD_SPREADSHEET_BACKUPS_SPREADSHEET_ID
        }

};

const google = {
    keyfilePath: path.join(process.cwd(), process.env.GOOGLE_KEYFILE),
    tokenPath: path.join(process.cwd(), process.env.GOOGLE_TOKEN),
    scope_auth: "https://www.googleapis.com/auth/cloud-platform",
    scope_sheets: (process.env.GOOGLE_READONLY === "false") ? "https://www.googleapis.com/auth/spreadsheets" : "https://www.googleapis.com/auth/spreadsheets.readonly",
};

const db = {
    connection: (process.env.LOCALDEV) ? { filename: process.env.SQLITE_DB } : ":memory:"
};

console.log(`Using DB:`, db);

const laundryMojis = [
    "🧼", "💦", "👚", "🧦", "🧤", "👕", "👖", "🫧", "🧺", "🧴", "🩳", "👙", "🧥", "✨"
];

const getLaundryMoji = () => {
    return laundryMojis[Math.floor(Math.random() * laundryMojis.length)];
};

const organization = {
    name: process.env.ORGANIZATION_FULL_NAME,
    shortName: process.env.ORGANIZATION_SHORT_NAME,
    aboutUsLink: {
        title: process.env.ORGANIZATION_ABOUTUS_TITLE,
        url: process.env.ORGANIZATION_ABOUTUS_URL
    }
};

const laundromat = {
    name: process.env.LAUNDROMAT_NAME,
    dryers: {
        // there might be weird arrangements where numDryers is
        // not exactly equal to rows/columns, so store this denormalized
        numDryers: process.env.LAUNDROMAT_DRYERS_NUMDRYERS,
        rows: process.env.LAUNDROMAT_DRYERS_ROWS,
        columns: process.env.LAUNDROMAT_DRYERS_COLUMNS
    }
};

const bags = {
    eventTypes: {
        accept: {
            columnName: "bags_accepted",
            eventTypeName: "bagsAccepted",
            friendlyName: "Bags accepted",
            verb: "accept",
            pastTenseVerb: "accepted",
            color: "red-500"
        },
        wash: {
            columnName: "bags_washed",
            eventTypeName: "bagsWashed",
            friendlyName: "Bags washing",
            verb: "wash",
            pastTenseVerb: "washed",
            color: "sky-500"
        },
        dry: {
            columnName: "bags_dried",
            eventTypeName: "bagsDried",
            friendlyName: "Bags drying",
            verb: "dry",
            pastTenseVerb: "dried",
            color: "orange-500"
        },
        complete: {
            columnName: "bags_completed",
            eventTypeName: "bagsCompleted",
            friendlyName: "Bags complete",
            verb: "complete",
            pastTenseVerb: "completed",
            color: "green-500"
        },
        deliver: {
            columnName: "bags_delivered",
            eventTypeName: "bagsDelivered",
            friendlyName: "Bags delivered",
            verb: "deliver",
            pastTenseVerb: "delivered",
            color: "fuchsia-700"
        },
    }
};

module.exports = {
    jwtAdminSecret,
    jwtAdminSecretExpiresIn,
    jwtAdminCookieMaxAge,
    adminCookieName,
    jwtUserSecret,
    jwtUserSecretExpiresIn,
    jwtUserCookieMaxAge,
    userCookieNamePrefix,
    spreadsheets,
    google,
    db,
    laundryMojis,
    getLaundryMoji,
    organization,
    laundromat,
    bags
};
