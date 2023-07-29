const express = require("express")
const app = express()
const port = 5000
const connectToClient = require("./db")
const bodyParser = require("body-parser")
const cors = require("cors")
const dotenv = require("dotenv")

dotenv.config()

app.use(cors())

app.use(bodyParser.json());

app.use(`/admin`, require("./routes/admin"));
app.use(`/patient`, require("./routes/patients"));
app.use(`/doctor`, require("./routes/doctors"));

connectToClient()

app.get("/", async (req, res)=>{
    res.send("Hello World")
})

app.listen(port, ()=>{
    console.log(`App is running on Port ${port}`)
})