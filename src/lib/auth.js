const jwt = require("jsonwebtoken");
const {
          jwtAdminSecret,
          jwtAdminSecretExpiresIn,
          jwtUserSecret,
          jwtUserSecretExpiresIn,
          adminCookieName,
          userCookieNamePrefix,
          jwtAdminCookieMaxAge,
          jwtUserCookieMaxAge
      }   = require("../../config");


const defaultCookieOpts = {
    httpOnly: true,
    secure: process.env.LOCALDEV ? true : false
};

const validateAdminPassword = (adminPassword) => {
    return adminPassword === process.env.ACCEPTED_ADMIN_PASSWORD;
};

const bakeAdminCookie = (adminUsername, adminUa, adminIp) => {
    const adminToken = jwt.sign({
                                    adminUsername: adminUsername,
                                    adminIp: adminIp,
                                    adminUa: adminUa,
                                }, jwtAdminSecret, { expiresIn: jwtAdminSecretExpiresIn });

    return {
        cookieName: adminCookieName,
        cookieValue: adminToken,
        opts: {
            ...defaultCookieOpts,
            maxAge: jwtAdminCookieMaxAge
        }
    };
};

const bakeUserCookie = (userUsername, createdAt, ip, ua) => {
    const userToken = jwt.sign({
                                   userUsername: userUsername,
                                   createdAt: createdAt,
                                   ip: ip,
                                   ua: ua,
                               }, jwtUserSecret, { expiresIn: jwtUserSecretExpiresIn });

    return {
        cookieName: userCookieNamePrefix + "." + createdAt,
        cookieValue: userToken,
        opts: {
            ...defaultCookieOpts,
            maxAge: jwtUserCookieMaxAge
        },
        _decoded: jwt.verify(userToken, jwtUserSecret)
    };
};

module.exports = {
    validateAdminPassword,
    bakeAdminCookie,
    bakeUserCookie,
    defaultCookieOpts
};
