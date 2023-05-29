const express          = require("express");
const washDaysRoutes   = express.Router();
const washDaysHandlers = require("./washDays.controllers");
const {
          authenticateAnyToken,
          readUserTokensNonBlocking
      }                = require("../../middleware/auth");

// init washday
// any anonymous user can do this, but they can't log in to the washday until they login
washDaysRoutes.get("/new", readUserTokensNonBlocking, washDaysHandlers.createNewWashDay);

// general event submission form
washDaysRoutes.route("/:createdAt/events")
    // prefill from querystring /?personName=firstName%20lastName
              .get(authenticateAnyToken, washDaysHandlers.renderEventForm)
    // receives json body
              .post(authenticateAnyToken, (req, res, next) => {
                  washDaysHandlers.insertEvent(req, res, next);
              });

// specific submission form - fast track for updating already-created bags
washDaysRoutes.route("/:createdAt/bags/:bagId")
    // no prefill - this request does a real lookup of the bag's last state in DB
              .get(authenticateAnyToken, washDaysHandlers.renderBagForm)
    // receives json body
              .post(authenticateAnyToken, (req, res, next) => {
                  washDaysHandlers.insertEvent(req, res, next);
              });

// update person_name for all rows for this person
washDaysRoutes.post("/:createdAt/person/modify", authenticateAnyToken, washDaysHandlers.modifyPerson);

// render personCard
washDaysRoutes.get("/:createdAt/person/:personName", authenticateAnyToken, washDaysHandlers.getEventsByPerson);

// render modifyPerson form
washDaysRoutes.route("/:createdAt/person/:personName/modify")
    // prefill from params :createdAt, :personName
              .get(authenticateAnyToken, washDaysHandlers.renderModifyPersonForm)
    // receives json body
              .post(authenticateAnyToken, (req, res, next) => {
                  washDaysHandlers.modifyPerson(req, res, next);
              });


// washday summarys -- all events occuring at a date organized by
// view person
washDaysRoutes.get("/:createdAt/personOriented",
                   authenticateAnyToken,
                   washDaysHandlers.getAllEventsByCreatedAtPersonOriented);

// view bag
washDaysRoutes.get("/:createdAt/bagOriented",
                   authenticateAnyToken,
                   washDaysHandlers.getAllEventsByCreatedAtBagOriented);

// default view person
washDaysRoutes.get("/:createdAt", authenticateAnyToken, washDaysHandlers.getAllEventsByCreatedAtPersonOriented);

// summary of washdays -- a card for each date where there were >=1 events
washDaysRoutes.get("/", readUserTokensNonBlocking, washDaysHandlers.renderWashdaysView);

module.exports = washDaysRoutes;
