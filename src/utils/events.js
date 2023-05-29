const { bags } = require("../../config");
const getBagLastEvent = (arr) => {
    _top        = arr[0];
    columnNames = Object.values(bags.eventTypes).map(i => i.columnName);


    for (let [event, value] of Object.entries(_top)) {
        // ignore any "metadata only" events like a note,
        // tombstoning an old bag_id that was merged, etc.
        if (!columnNames.includes(event)) {
            continue;
        }
        // if the value is defined at all,
        // this is the "last event"
        if (value != null) {
            return event;
        }
    }

    // if we only found ignorable columns in this event,
    // recurse to the next event for that bag
    // that means, e.g., if you got to `bags_dried` and then
    // afterward only logged comments,
    // we'll drill down until `bags_dried` is reached
    return getBagLastEvent(arr.slice(1));
};

module.exports = {
    getBagLastEvent
};
