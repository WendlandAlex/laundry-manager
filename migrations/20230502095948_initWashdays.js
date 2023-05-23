/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema
               .createTable('washdays', (table) => {
                   table.increments('id');
                   table.integer('active')
                        .notNullable()
                        .defaultTo(1);
                   table.text('created_at')
                        .defaultTo('CURRENT_TIMESTAMP');
                   table.text('person_name');
                   table.integer('bag_id')
                        .defaultTo(null);
                   table.integer('split_from_bag_id')
                        .defaultTo(null);
                   table.integer('bags_accepted')
                        .defaultTo(null);
                   table.integer('bags_washed')
                        .defaultTo(null);
                   table.integer('washer_id')
                        .defaultTo(null);
                   table.integer('bags_dried')
                        .defaultTo(null);
                   table.integer('dryer_id')
                        .defaultTo(null);
                   table.integer('bags_completed')
                        .defaultTo(null);
                   table.integer('bags_delivered')
                        .defaultTo(null);
                   table.text('notes')
                        .defaultTo(null);
               });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.raw(`drop table if exists washdays;`);
};
