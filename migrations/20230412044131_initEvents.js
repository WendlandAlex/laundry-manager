/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex, Promise) {
    return knex.schema
               .createTable('events', (table) => {
                   table.increments('id');
                   table.integer('active')
                        .notNullable()
                        .defaultTo(1);
                   table.integer('dryer_id')
                        .notNullable();
                   table.integer('restarts')
                        .notNullable()
                        .defaultTo(0);
                   table.text('error_code');
                   table.text('created_at')
                        .defaultTo('CURRENT_TIMESTAMP');
                   table.integer('working')
                        .notNullable()
                        .defaultTo(1);
                   table.text('notes');
               });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.raw(`drop table if exists events;`);
};
