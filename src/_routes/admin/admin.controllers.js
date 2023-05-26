const {
    organization,
    spreadsheets
} = require("../../../config");

const {
    bakeAdminCookie,
    validateAdminPassword
} = require("../../lib/auth");
const { getWashDays } = require("../../services/washDay");
const { copySheetToBackup } = require("../../lib/google-sheets");
const { db } = require("../../lib/db");
const { changePersonName } = require("../washDays/washDays.utils");
const { makeFirstName } = require("../../lib/faker-fakes");
const {
    getUserRequestsNotAuthorized,
    rejectExpiredUserRequests,
    authorizeUserRequestsById
} = require("../auth/auth.utils");
const {
    getCurrentTimestamp,
    normalizeTime,
    getCurrentWashDay
} = require("../../lib/moment-tz");
const { injectCommonViewAttributes } = require("../../utils/viewRendering");

const renderAdminLoginForm = async (req, res, next) => {
    res.render("admin/loginForm", {
        ...injectCommonViewAttributes(req, res),
        pageTitle: `${organization.shortName} - Admin Login`,
        submitAdminLoginFormUrl: `/admin/login`
    });
};

const submitAdminLoginForm = async (req, res, next) => {
    let adminIp = (req._remoteAddress);
    let adminUa = (req.headers[`user-agent`]);
    let redirectUrl = req.body.redirectUrl || `/`;

    let {
        adminUsername,
        adminPassword
    } = req.body;

    if (!validateAdminPassword(adminPassword)) {
        res.redirect(302, "/admin/login");
        return;
    }

    let {
        cookieName,
        cookieValue,
        opts
    } = bakeAdminCookie(adminUsername, adminIp, adminUa);

    return res.cookie(cookieName, cookieValue, opts)
              .redirect(302, redirectUrl);

};

const rebootSystem = async (req, res, next) => {
    // by default on fly.io provider,
    // 0 exit code does not restart eagerly, but will restart lazily when a new request comes in
    // nonzero exit code will restart immediately
    process.exit(420);
    return null;
};

const renderApproveWashdayUsersForm = async (req, res, next) => {
    await rejectExpiredUserRequests();
    let userRequests = await getUserRequestsNotAuthorized({
                                                              authorized_at: null,
                                                              authorized_by: null
                                                          });

    res.render("admin/userWaitingRoom", {
        ...injectCommonViewAttributes(req, res),
        pageTitle: `${organization.shortName} - Wash Day Admin - Approve Access Requests`,
        userRequests,
        submitUserWaitingRoomForm: `/admin`
    });
};

const submitApproveWashdayUsersForm = async (req, res, next) => {
    let approvedRequests = req.body;
    let adminUsername = res.locals.adminUsername;
    let timestampCreatedAt = normalizeTime(getCurrentTimestamp()).ISOString;

    let data = await authorizeUserRequestsById(Object.keys(approvedRequests), timestampCreatedAt, adminUsername);

    res.redirect(302, "/admin");
};

const renderWashdayAdminPanel = async (req, res, next) => {
    let dateCreatedAt = normalizeTime(req.params.createdAt).Date;
    let sortColumn = req.query.sortColumn || "person_name";

    let data = await getWashDays(dateCreatedAt);
    data = {
        people: {
            complete: data[0].people_complete,
            incomplete: data[0].people_incomplete
        },
        statuses: {
            bags_accepted: data[0].bags_accepted,
            bags_washed: data[0].bags_washed,
            bags_dried: data[0].bags_dried,
            bags_completed: data[0].bags_completed,
            bags_delivered: data[0].bags_delivered
        }
    };

    res.render("admin/washday", {
        ...injectCommonViewAttributes(req, res),
        pageTitle: `Archive ${organization.shortName} - Wash Day ${req.params.created_at}`,
        createdAt: dateCreatedAt,
        data,
        allowedSortColumns: ["person_name", "bag_id"],
        modifyAllPeopleFormSubmitUrl: `/admin/washdays/${dateCreatedAt}`,
        rebootRunningSystemFormSubmitUrl: `/admin/lol`
    });
};

const modifyAllPeople = async (req, res, next) => {
    let dateCreatedAt = normalizeTime(req.params.createdAt).Date;

    // user has requested to not be responsible for stewarding historical user data. A washday should "end" permanently
    // TODO: instead of backing up to Google Sheets, backup to a local file (csv, sqlite, etc) that can be restored to
    // `undo` and archive until the app restarts/server goes away

    // let backupSheet = await copySheetToBackup({
    //                                               sourceSpreadsheetId: spreadsheets.main.spreadsheetId,
    //                                               sheetId: spreadsheets.main.sheets.washdays.gid,
    //                                               destinationSpreadsheetId: spreadsheets.backups.spreadsheetId
    //                                           });
    //
    // if (backupSheet.status != 200) {
    //     res.send(502);
    //     return;
    // } else {
    //     console.log(backupSheet.data);
    // }

    res.redirect(302, `/washdays/${dateCreatedAt}/personOriented`);

    let personNames = await db.distinct("person_name")
                              .from("washdays")
                              .whereNotNull("person_name")
                              .andWhereRaw(`date(created_at) = '${dateCreatedAt}'`);

    for (const row of personNames) {
        let oldPersonName = row.person_name;
        await changePersonName(dateCreatedAt, oldPersonName, makeFirstName());

    }
};

module.exports = {
    renderAdminLoginForm,
    submitAdminLoginForm,
    rebootSystem,
    renderApproveWashdayUsersForm,
    submitApproveWashdayUsersForm,
    renderWashdayAdminPanel,
    modifyAllPeople,
};
