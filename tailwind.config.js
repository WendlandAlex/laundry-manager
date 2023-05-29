/** @type {import("tailwindcss").Config} */
module.exports = {
    content: ["./src/_views/**/*.{html,handlebars,hbs}"],
    theme: {
        extend: {
            screens: {
                "noScreenshot": { "raw": "()" }
            }
        },
    },
    plugins: [],
};

