const config = require("../../config");
const {
    GoogleAuth,
} = require("google-auth-library");
const { google } = require("googleapis");


const makeGoogleAPICLient = async (serviceName) => {
    let serviceClient;

    const auth = new GoogleAuth({
                                    scopes: [config.google.scope_auth, config.google.scope_sheets]
                                });
    const authClient = await auth.getClient();

    google.options({
                       auth: authClient
                   });

    switch (serviceName) {
        case "sheets":
            serviceClient = google.sheets({
                                              version: "v4"
                                          });
            break;
        default:
            console.log(`Error: provided serviceName ${serviceName} was not valid`);
    }

    return serviceClient;
};


module.exports = {
    makeGoogleAPICLient
};
