const jwt = require("jsonwebtoken");
const {
    jwtAdminSecret,
    adminCookieName,
    userCookieNamePrefix,
    jwtUserCookieMaxAge
} = require("../../config");
const { getCurrentWashDay } = require("../lib/moment-tz");
const {
    getUserRequests,
} = require("../_routes/auth/auth.utils");
const { defaultCookieOpts } = require("../lib/auth");


// regex for token string matching
const userTokenRegex = new RegExp(`^(?:${userCookieNamePrefix})\\.(?<createdAt>\\d{4}-\\d{2}-\\d{2})$`);

// regex for url path params matching
// (router has not parsed params yet at the time middleware is called so we must do this ourselves)
const createdAtRegex = /^\/?(?<createdAt>\d{4}-\d{2}-\d{2})\/?.*/;


// this function should not be opinionated about *which* createdAt dates match
// this allows us to parse *any* valid tokens for overview type routes
const accumulateUserTokens = async (cookies) => {
    userTokens = [];
    for (let [key, value] of Object.entries(cookies)) {
        if (!userTokenRegex.test(key) === true) {
            continue;
        }

        let hydratedTokens = await getUserRequests({
                                                       cookie_value: value
                                                   });

        if (hydratedTokens && hydratedTokens.length) {
            userTokens.push(hydratedTokens[0]);
        }
    }

    return userTokens;
};

// usable by both admin and user
const decodeAndVerifyToken = (token, secret) => {
    if (!token) {
        return {
            err: new Error(),
            data: null
        };
    }
    try {
        let decoded = jwt.verify(token, secret);
        return {
            err: null,
            data: decoded
        };
    } catch (err) {
        return {
            err: err,
            data: null
        };
    }
};

const authenticateAdminToken = (req, res, next) => {
    let {
        err,
        data
    } = decodeAndVerifyToken(req.cookies[adminCookieName], jwtAdminSecret);

    if (err) {
        return res.redirect(302, "/admin/login");
    }

    // attach to every request, so that we may conditionally
    // render UI elements in the non-admin views (e.g., only admins see `delete` button)
    res.locals["adminUsername"] = data.adminUsername;

    // we can let you in as an admin
    next();
};

const authenticateAnyToken = async (req, res, next) => {
    let ip = (req._remoteAddress);
    let ua = (req.headers[`user-agent`]);
    let params = req.path.match(createdAtRegex);
    let createdAt = params.groups.createdAt || getCurrentWashDay();

    // if you have an admin token, you are authorized to take all user actions,
    // no need to evaluate further
    if (req.cookies[adminCookieName]) {
        authenticateAdminToken(req, res, next);
    } else {
        // user tokens are scoped to a particular washday
        // a user may have several active tokens at the same time
        let userTokens = await accumulateUserTokens(req.cookies);

        // see if any of these tokens are scoped to the washday of the resource that was requested
        // see if this user has been approved by an admin
        if (userTokens.length) {
            for (let i of userTokens) {
                if (i.rejected_at || i.rejected_by) {
                    continue;
                }
                // this is a token that has been authorized
                if (i.created_at === createdAt) {
                    if (i.authorized_at && i.authorized_by) {
                        next();
                        // why must I put this return here?
                        // why must I skip the next middleware in the stack?
                        return;

                        // this is the first request for a token that has been authorized, so we need to set it
                    } else {
                        res.cookie(`${userCookieNamePrefix}.${createdAt}`,
                                   i.cookie_value,
                                   {
                                       ...defaultCookieOpts,
                                       maxAge: jwtUserCookieMaxAge
                                   });
                        break;
                    }
                }
            }
        }

        console.log(`auth failed - no token could be found for ${createdAt}`);
        res.redirect(302, "/auth/login" + `/${createdAt}` + `/?redirectTo=${req.path}`);

    }
};

// we want the ability to know what *would* happen if you hit a protected route
// e.g, to surface to the user "your access request was approved"
const readUserTokensNonBlocking = async (req, res, next) => {
    res.locals.userAuthorizedTokens = {};
    res.locals.userPendingTokens = {};
    if (req.cookies[adminCookieName]) {
        let {
            err,
            data
        } = decodeAndVerifyToken(req.cookies[adminCookieName], jwtAdminSecret);

        if (data) {
            res.locals["adminUsername"] = data.adminUsername;
        }

    } else {
        let userTokens = await accumulateUserTokens(req.cookies);
        if (userTokens.length) {
            for (let i of userTokens) {
                if (i.rejected_at || i.rejected_by) {
                    continue;
                }
                if (i.authorized_at && i.authorized_by) {
                    res.locals.userAuthorizedTokens[i.created_at] = true;
                } else {
                    res.locals.userPendingTokens[i.created_at] = true;
                }
            }
        }
    }

    next();
};

module.exports = {
    authenticateAnyToken,
    authenticateAdminToken,
    readUserTokensNonBlocking
};
