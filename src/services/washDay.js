const { findLastNonZeroKeyOf } = require("../utils/dataManipulation");
const { db } = require("../lib/db");
const {
    normalizeTime,
} = require("../lib/moment-tz");
const {
    bags
} = require("../../config");

// TODO: can you get this as a SQL query too?
const aggregateWashDayEventsByPerson = (data) => {
    let aggregatedData = {
        // leave these empty for now, once people have been aggregated, scan them and insert
        peopleComplete: [],
        peopleIncomplete: [],
        people: {}
    };

    data.map(row => {
        _personName = row.person_name;

        if (!aggregatedData.people[_personName]) {
            aggregatedData.people[_personName] = {
                createdAt: row.created_at,
                personName: row.person_name,
                aggregates: {
                    bags_accepted: 0,
                    bags_washed: 0,
                    bags_dried: 0,
                    bags_completed: 0,
                    bags_delivered: 0,
                },
                lastStatus: null,
                bags: {},
                bagIds: [],
                notes: [],
                events: [],
            };
        }

        _bagId = row.bag_id;
        if (!row.bag_id) {
            if (row.notes) {
                aggregatedData.people[_personName].notes.push(row.notes);
            }
        } else {
            if (!aggregatedData.people[_personName].bags[_bagId]) {
                aggregatedData.people[_personName].bags[_bagId] = [];
            }
            aggregatedData.people[_personName].bags[_bagId].push(row);
            !aggregatedData.people[_personName].bagIds.includes(row.bag_id) && aggregatedData.people[_personName].bagIds.push(
                row.bag_id);
        }

        _agg = aggregatedData.people[_personName].aggregates;

        for (let bags_x of Object.keys(_agg)) {
            _agg[bags_x] += row[bags_x];
        }

        aggregatedData.people[_personName].lastStatus = findLastNonZeroKeyOf(_agg) || "No bags accepted";
        aggregatedData.people[_personName].aggregateKeys = Object.keys(_agg);
        aggregatedData.people[_personName].events.push(row);
    });

    // what if we receive (or discover) a new accepted bag for a person after already completing
    // their old bags? We would have inserted them into complete but they are now incomplete
    // iterate over the aggregated data to get a time-insensitive count of bags and statuses
    for (let [key, value] of Object.entries(aggregatedData.people)) {
        _personName = key;
        _agg = value.aggregates;

        if (_agg.bags_completed >= _agg.bags_accepted) {
            !aggregatedData.peopleComplete.includes(_personName) && aggregatedData.peopleComplete.push(_personName);
        } else {
            !aggregatedData.peopleIncomplete.includes(_personName) && aggregatedData.peopleIncomplete.push(_personName);
        }
    }

    return aggregatedData;
};

const aggregateWashDayEventsByBag = (data) => {
    let res = {};

    data.map(i => {
        if (!res[i.bag_id]) {
            res[i.bag_id] = {};
        }

        res[i.bag_id] = { ...i };
    });

    return res;
};

const aggregateWashDayEventsByStatus = (data) => {
    let res = {
        "bags_accepted": [],
        "bags_washed": [],
        "bags_dried": [],
        "bags_completed": [],
        "bags_delivered": []
    };

    for (let [bag_id, value] of Object.entries(data)) {
        // handle `other` case? [do we need to]
        // answer WE DON'T because this was making an object `null`: [bag1..bagn] for merge tombstones and breaking
        // everything actually keep it but add a null check :rollsafe:
        if (value.last_status && !res[value.last_status]) {
            res[value.last_status] = [];
        }

        value.last_status && res[value.last_status].push(value);
    }

    return res;
};

const getAggregatedWashDayDataPersonOriented = async (createdAt) => {
    let {
        Date: dateCreatedAt,
    } = normalizeTime(createdAt);

    let personData = await db.select("*")
                             .from("washdays")
        // exclude any "init wash day" events
                             .whereNotNull("person_name")
        // .whereNotNull('bag_id')
                             .whereRaw(`date(created_at) = '${dateCreatedAt}'`)
        // this will have the effect of sorting all UI cards
        // by alpha ascending once the response object
        // is passed to the template
                             .orderBy("person_name", "asc")
                             .orderBy("id", "desc");

    return personData;
};

const getAggregatedWashDayDataBagOriented = async (createdAt, sortColumn) => {
    let {
        Date: dateCreatedAt,
    } = normalizeTime(createdAt);

    let bagStatuses = await db.raw(`
SELECT
${Object.values(bags.eventTypes).map(i => {
        return `COUNT(1) FILTER (WHERE ${i.columnName} IS NOT NULL) AS ${i.columnName}`;
    }).join("," + "\n")}
FROM washdays
WHERE active = 1
AND date(created_at) = :dateCreatedAt`, { dateCreatedAt: dateCreatedAt });

    bagStatuses = bagStatuses[0];

    let bagsLastStatuses = await db.raw(`
SELECT washdays.bag_id,
   washdays.created_at,
   washdays.person_name,
   CASE
   ${Object.values(bags.eventTypes).map(i => {
        return `WHEN washdays.${i.columnName} IS NOT NULL THEN '${i.columnName}'`;
    }).join("\n")}
   END AS last_status

FROM washdays
JOIN (SELECT bag_id, max(id) as latest_id
  FROM washdays
  GROUP BY bag_id) subq
  ON washdays.bag_id = subq.bag_id
  AND washdays.id = subq.latest_id

WHERE washdays.active = 1
AND date(washdays.created_at) = :dateCreatedAt
ORDER BY washdays.${sortColumn}`, { dateCreatedAt: dateCreatedAt });

    // get the latest event for each bag
    return {
        bagStatuses,
        bagsLastStatuses
    };
};

const getAggregatedWashDayData = async (createdAt, sortColumn) => {
    let {
        Date: dateCreatedAt,
    } = normalizeTime(createdAt);

    if (!sortColumn) {
        sortColumn = "person_name";
    }

    let personData = await getAggregatedWashDayDataPersonOriented(dateCreatedAt);
    let {
        bagStatuses,
        bagsLastStatuses
    } = await getAggregatedWashDayDataBagOriented(dateCreatedAt, sortColumn);

    let result = {
        bags: aggregateWashDayEventsByBag(bagsLastStatuses),
        statuses: aggregateWashDayEventsByStatus(bagsLastStatuses), ...aggregateWashDayEventsByPerson(personData)
    };

    return {
        bagStatuses: bagStatuses, ...result
    };
};
const getWashDays = async (createdAt = undefined) => {
    if (createdAt) {
        createdAt = normalizeTime(createdAt).Date;
    }

    return db.raw(`
WITH cte AS (
    SELECT date(washdays.created_at) AS created_at,
${Object.values(bags.eventTypes).map(i => {
        return `COUNT(1) FILTER (WHERE ${i.columnName} IS NOT NULL) AS ${i.columnName}`;
    }).join("," + "\n")}
      FROM washdays
      WHERE active = 1
      AND person_name IS NOT NULL
      ${createdAt ? `AND date(washdays.created_at) = '${createdAt}'` : ""}  
      GROUP BY date(created_at)
    ),
    cte_personName AS (
    SELECT date(subq.created_at) AS created_at,
        COUNT(CASE
                WHEN subq.bags_completed >= subq.bags_accepted AND subq.bags_accepted > 0 THEN 1 END) AS people_complete,
        COUNT(CASE
                WHEN subq.bags_completed < subq.bags_accepted AND subq.bags_accepted > 0 THEN 1 END) AS people_incomplete
    FROM (
        SELECT date(created_at) AS created_at,
            COUNT(CASE WHEN washdays.bags_accepted IS NOT NULL THEN 1 END)  AS bags_accepted,
            COUNT(CASE WHEN washdays.bags_completed IS NOT NULL THEN 1 END) AS bags_completed
        FROM washdays
        WHERE active = 1
        AND person_name IS NOT NULL
        ${createdAt ? `AND date(washdays.created_at) = '${createdAt}'` : ""} 
        GROUP BY created_at, person_name
        ) AS subq
      GROUP BY subq.created_at
    )

 SELECT cte.*, people_complete, people_incomplete
 FROM cte
 LEFT JOIN cte_personName ON cte.created_at = cte_personName.created_at
 ORDER BY cte.created_at DESC;
`);
};

module.exports = {
    aggregateWashDayEventsByPerson,
    getAggregatedWashDayDataPersonOriented,
    getAggregatedWashDayDataBagOriented,
    getAggregatedWashDayData,
    getWashDays
};
