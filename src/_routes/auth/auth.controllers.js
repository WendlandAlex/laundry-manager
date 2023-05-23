const {
    laundromat,
    organization,
} = require("../../../config");
const {
    bakeUserCookie,
    defaultCookieOpts
} = require("../../lib/auth");
const {
    getCurrentWashDay,
    normalizeTime,
} = require("../../lib/moment-tz");
const {
    insertUserRequest,
    getUserRequestsNotAuthorized,
} = require("./auth.utils");
const { injectCommonViewAttributes } = require("../../utils/viewRendering");

const renderUserAccessRequestForm = async (req, res, next) => {
    let dateCreatedAt= normalizeTime(req.params.createdAt || getCurrentWashDay()).Date;

    let redirectTo = req.query.redirectTo;

    res.render("auth/loginForm", {
        ...injectCommonViewAttributes(req, res),
        pageTitle: `${organization.shortName} - User Login`,
        createdAt: dateCreatedAt,
        redirectTo: redirectTo,
        submitUserLoginFormUrl: `/auth/login/${dateCreatedAt}`
    });
};

// enter the queue, but don't immediately get a token back
// an admin must approve a request, and then when they poll for updates
// they will catch or not catch the token [depending on if the request has been approved]
const submitUserAccessRequestForm = async (req, res, next) => {
    let ip = (req._remoteAddress);
    let ua = (req.headers[`user-agent`]);
    let redirectUrl = "/washdays";

    let {
        userUsername,
        createdAt,
        redirectTo
    } = req.body;

    let dateCreatedAt = normalizeTime(createdAt).Date;

    // if this login was a redirect from failing authenticateUserToken() middleware,
    // send them back to where they were trying to go
    if (redirectTo) {
        redirectUrl += redirectTo;
    }

    let userRequests = await getUserRequestsNotAuthorized({
                                                              userUsername: userUsername,
                                                          }, `date(created_at) = '${dateCreatedAt}'`);

    // if this user has not previously requested access
    // - enter a new request
    // - issue a cookie but leave `authorized_by` and `authorized_at` null
    if (!userRequests.length) {
        let userToken = bakeUserCookie(userUsername, dateCreatedAt, ip, ua);

        await insertUserRequest(userUsername, dateCreatedAt, ip, ua, {
            authorized_by: null,
            authorized_at: null,
            expires_at: userToken._decoded.exp,
            cookie_value: userToken.cookieValue
        });

        // set a cookie that will not be sufficient to pass auth middleware until
        // an admin sets `authorized_at` and `authorized_by` on the user request row in the db
        res.cookie(userToken.cookieName, userToken.cookieValue, userToken.opts);
    }

    res.redirect(302, `/washdays`);
};


module.exports = {
    renderUserAccessRequestForm,
    submitUserAccessRequestForm,
};
