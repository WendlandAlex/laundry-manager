const getBagLastEvent = (arr) => {
    for (let [event, value] of Object.entries(arr[0])) {
        if (["id", "active", "created_at", "person_name", "bag_id", "washer_id", "dryer_id", "notes"].includes(event)) {
            continue;
        }
        if (value != null) {
            return event;
        } else {
            return getBagLastEvent(arr.slice(1));
        }
    }
};

module.exports = {
    getBagLastEvent
};
