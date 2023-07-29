const {Client} = require("pg")
const bcrypt = require("bcrypt")
const rd = require("readline-sync")

const client = new Client({
    host : "localhost",
    database : "Patient Schema",
    user : "postgres",
    password : "abdularham123",
    port :  5432
})

async function connectToClient(){
    await client.connect()
    console.log("Connected to client")
}

// // This function is meant to create the first admin
async function createAdmin(){
    connectToClient()   
    const name = rd.question("Enter Admin name: ")
    const password = rd.question("Enter Password: ")
    const email = rd.question("Enter Email: ")
    const hashedPassword = await bcrypt.hash(password, 10)
    console.log(typeof(hashedPassword))
    await client.query(
        `INSERT into "admin" ("name", "password", "email", "created_by") VALUES ($1, $2, $3, $4)`, [name, hashedPassword, email, 0]
    ).then(()=>{
        console.log("Admin Created")
    }).catch((err)=>{
        console.log(err)
    })
    await client.end()
}

// createAdmin()

module.exports = connectToClient;

