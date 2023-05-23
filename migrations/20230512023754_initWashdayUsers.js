/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema
               .createTable('washdayUsers', (table) => {
                   table.increments('id');
                   table.text('userUsername');
                   table.text('created_at');
                   table.text('ip')
                        .defaultTo(null);
                   table.text('user_agent')
                        .defaultTo(null);
                   table.text('requested_at')
                        .defaultTo('CURRENT_TIMESTAMP');
                   table.text('expires_at')
                        .defaultTo(null);
                   table.text('cookie_value')
                        .defaultTo(null);
                   table.text('authorized_at')
                        .defaultTo(null);
                   table.text('authorized_by')
                        .defaultTo(null);
                   table.text('rejected_at')
                        .defaultTo(null);
                   table.text('rejected_by')
                        .defaultTo(null);
               });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.raw(`drop table if exists washdayUsers;`);
};
