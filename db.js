const {Client} = require("pg")

const client = new Client({
    host : process.env.PG_HOST,
    database : process.env.PG_DATABASE,
    user : process.env.PG_USER,
    password : process.env.PG_PASSWORD,
    port :  5432
})


client.connect()

module.exports = client;

