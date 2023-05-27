const dryerIdFromRowColumn = (row, column) => {
    if (!row && !column) {return null;}

    switch (row) {
        case "top":
        case "Top":
        case 1:
        case "1":
            row = 1;
            break;
        case "bottom":
        case "Bottom":
        case 0:
        case "0":
            row = 0;
            break;
    }

    if (row === 1) {
        return column * 2;
    } else {
        return (column * 2) - 1;
    }
};

const rowColumnFromDryerId = (dryerId) => {
    if (dryerId % 2 === 0) {
        _row = 1;
        _column = (dryerId / 2);
    } else {
        _row = 0;
        _column = Math.ceil(dryerId / 2);
    }

    return {
        row: _row,
        column: _column
    };
};

module.exports = {
    dryerIdFromRowColumn,
    rowColumnFromDryerId
};
