const express = require("express");
const { readUserTokensNonBlocking } = require("../../middleware/auth");

const authRoutes = express.Router();
const authControllers = require("./auth.controllers");

authRoutes.route("/login/:createdAt")
          .get(readUserTokensNonBlocking, authControllers.renderUserAccessRequestForm)
          .post((req, res, next) => {
              authControllers.submitUserAccessRequestForm(req, res, next);
          });

module.exports = authRoutes;
