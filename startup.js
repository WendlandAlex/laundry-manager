require('dotenv').config()

const {dbCheck, hydrateSqliteFromSpreadsheet} = require('./src/services/startup')
const {db} = require("./src/lib/db");
const {sheets} = require('./config/index').spreadsheets.main
console.log(Object.keys(sheets))

if (require.main === module) {
  // pull down the google sheets backend and insert it into a local sqlite database
  console.log('SEED')
    hydrateSqliteFromSpreadsheet(Object.keys(sheets)).then(() => {
    }).then(() => {
      db.select('*').from('events').then((query) => {
      })
      console.log('SEED DONE')
    }).then(() => {
      process.exit(0)
    })
}
