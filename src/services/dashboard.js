const { db }             = require("../lib/db");
const {
          rowColumnFromDryerId,
          dryerIdFromRowColumn
      }                  = require("../utils/dryers");
const { getLaundryMoji } = require("../../config");

// keep as legacy example of what the logic *would do* if we
// used sql to materialize the dashboard
const getLastStatusAllDryers = async () => {
    let res  = {};
    let rows = await db.raw(
        `select e.dryer_id, e.working as working
        from events e
        join (
            select dryer_id, max(id) as latest_id
            from events
            group by dryer_id
        ) e2
        on e.dryer_id = e2.dryer_id
        and e.id = e2.latest_id
        order by e.dryer_id;`
    );

    rows.forEach(i => {
        res[i.dryer_id] = i.working;
    });

    return res;
};

const partitionBy = (arr, size) => {
    let res       = [];
    let chunkSize = Math.floor(arr.length / size);

    for (let i = 0; i < arr.length; i += chunkSize) {
        res.push(
            arr.slice(i, i + chunkSize)
        );
    }

    return res;
};

const buildDashboard = (dryers, arrChunkSize) => {
    let topBottomTable = {
        headerColumns: [],
        topRow: [],
        bottomRow: []
    };

    for (const dryer of dryers) {
        !topBottomTable.headerColumns.includes(dryer.column) && topBottomTable.headerColumns.push(dryer.column);

        if (dryer.top === true) {
            topBottomTable.topRow.push(dryer.working);
        } else {
            topBottomTable.bottomRow.push(dryer.working);
        }
    }

    chunkedTable = [];

    for (let each of [
        {
            reference: topBottomTable.headerColumns,
            name: "headerColumns"
        },
        {
            reference: topBottomTable.topRow,
            name: "topRow"
        },
        {
            reference: topBottomTable.bottomRow,
            name: "bottomRow"
        }
    ]) {
        partitionBy(each.reference, arrChunkSize).forEach((value, index) => {
            if (!chunkedTable[index]) {
                chunkedTable[index] = {};
            }
            chunkedTable[index][each.name] = value;
        });
    }

    chunkedTable.map(i => i.laundryMoji = getLaundryMoji());

    return { "chunkedTable": chunkedTable };
};

module.exports = {
    buildDashboard
};
