const express = require("express")
const router = express.Router()
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const {body, validationResult} = require("express-validator")
const fetchAdmin = require("../middleware/fetchAdmin.js")
const indexLog = require("../indexLogs.js");
const searchLogs = require("../searchLogs.js");
const client = require("../db.js");
const createTables = require("../createTables.js")

createTables()

router.post("/login", [
    body("email", {error: "Email not provided"}).isEmail(),
    body("password", {error: "Password required for making login"}).isLength({min: 8, max: 16})
], async(req, res)=>{

    let num_errors = 0;

    const message = `Login request by Admin with email ${req.body.email}`;
    const timestamp = new Date();
    const request_type = "POST";

    const errors = validationResult(req);

    if (!errors.isEmpty()){
        indexLog(message, result="Request Body Field Errors", timestamp, request_type, success=false, errors);
        return res.json({message: "Incorrect Email or Password", success: false})
    }

    const admin = await client.query(`SELECT * FROM public."admin" WHERE "email" = $1 LIMIT 1`, [req.body.email]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message:"Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    if (!admin){
        indexLog(message, result="Request Body Field Errors", timestamp, request_type, success=false);
        return res.json({message: "Incorrect Email or Password", success: false})
    }

    const passwordIsCorrect =  await bcrypt.compare(req.body.password, admin.rows[0].password)

    if (!passwordIsCorrect){
        indexLog(message, result="Incorrect Password Provided", timestamp, request_type, success=false);
        return res.json({message: "Incorrect Email or Password", success: false})
    }

    const key = {admin:{id:admin.rows[0].id}};
    const adminToken = jwt.sign(key, process.env.JWT_SECRET);

    indexLog(message, result="Login Successful", timestamp, request_type, success=true);
    return res.json({adminToken: adminToken, success: true});
})

router.post("/create", fetchAdmin, [
    body("email", {error: "Email not provided"}).isEmail(),
    body("password", {error: "Password Not Provided"}).isLength({max:16, min:8}),
    body("name", {error: "Name of the Amdin not provided"}).isLength({min: 2})
], async (req, res)=>{

    let num_errors = 0;

    const message = `Admin with id ${req.admin.id} requested to make an account with email ${req.body.email}`;
    const timestamp = new Date();
    const request_type = "POST";

    const admin = await client.query(`SELECT * FROM "admin" WHERE "id" = $1 LIMIT 1`, [req.admin.id]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    if (admin.rows.length==0){
        indexLog(message, result="No admin found with the id provided in request header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }
    const errors = validationResult(req);

    if (!errors.isEmpty()){
        indexLog(message, result="Request Body Fields Error", timestamp, request_type, success=false, errors);
        return res.json({message: "One of the fields is not correct", success: false})
    }

    const emailInUse = await client.query(`SELECT * FROM "admin" WHERE "email" = $1 LIMIT 1`, [req.body.email]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message:"Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    if (!emailInUse.rows.length==0){
        indexLog(message, result=`The provided email ${req.body.email} was already in use`, timestamp, request_type, success=false);
        return res.json({message: "The Email you provided is already in use", success: false})
    }

    const name = req.body.name;
    const email = req.body.email;
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    const created_by = req.admin.id;

    const data = await client.query(
        `INSERT into "admin" ("name", "password", "email", "created_by") VALUES ($1, $2, $3, $4) RETURNING id`, [name, hashedPassword, email, created_by]
    ).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    indexLog(message, result=`New Admin Created with id ${data.rows[0].id}`, timestamp, request_type, success=true);
    return res.json({message: `New Admin Created with id ${data.rows[0].id}`, success: true})
})

router.post("/createpatient", fetchAdmin, [
    body("name", {error: "Patient Name not provided"}).isLength({min: 2}),
    body("email", {error: "Patient email not provided"}).isEmail(),
    body("password", {error: "Password is necessary to create account"}).isLength({min:8, max:16})
], async (req, res)=>{

    let num_errors = 0;

    const message = `Admin with id ${req.admin.id} requested to create a Patient Account with Email ${req.body.email}`;
    const timestamp = new Date();
    const request_type = "POST";

    const admin = await client.query(`SELECT * FROM "admin" WHERE "id" = $1 LIMIT 1`, [req.admin.id]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    if (admin.rows.length==0){
        indexLog(message, result="No admin found with id provided in request header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false, admin})
    }
    const errors = validationResult(req);

    if (!errors.isEmpty()){
        indexLog(message, result="Request Body Fields Error", timestamp, request_type, success=false, errors);
        return res.json({message: "One of the fields is not correct", success: false})
    }

    const emailInUse = await client.query(`SELECT * FROM "patients" WHERE "email" = $1 LIMIT 1`, [req.body.email]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message:"Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    if (!emailInUse.rows.length==0){
        if (emailInUse.rows[0].deleted=="yes"){
            const data = await client.query(`UPDATE patients SET deleted = $1 WHERE id = $2 RETURNING id`, ["no", emailInUse.rows[0].id]).catch((err)=>{
                indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
                num_errors += 1;
                return res.json({message: "Database Error", success: false})
            });

            if (num_errors>0){
                return;
            }

            indexLog(message, result=`Patient Account with id ${data.rows[0].id} Reactivated`, timestamp, request_type, success=true)
            return res.json({message: "Patient Account Reactivated", success: true})
        }
        indexLog(message, result="The provided email is already in use", timestamp, request_type, success=false);
        return res.json({message: "The Email you provided is already in use", success: false})
    }

    const name = req.body.name;
    const email = req.body.email;
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    const created_by = req.admin.id;
    const deleted = "no"

    const data = await client.query(
        `INSERT into "patients" ("name", "password", "email", "created_by", "deleted") VALUES ($1, $2, $3, $4, $5) RETURNING id`, [name, hashedPassword, email, created_by, deleted]
    ).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    indexLog(message, result=`New Patient Created with id ${data.rows[0].id}`, timestamp, request_type, success=true);
    return res.json({message: `New Patient Created with id ${data.rows[0].id}`, success: true})
})

router.post("/createdoctor", fetchAdmin, [
    body("name", {error: "Doctor Name not provided"}).isLength({min: 2}),
    body("email", {error: "Doctor email not provided"}).isEmail(),
    body("password", {error: "Password is necessary to create account"}).isLength({min:8, max:16})
], async (req, res)=>{

    let num_errors = 0;

    const message = `Admin with id ${req.admin.id} requested to create a doctor with email ${req.body.email}`;
    const timestamp = new Date();
    const request_type = "POST";

    const admin = await client.query(`SELECT * FROM "admin" WHERE "id" = $1 LIMIT 1`, [req.admin.id]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    if (admin.rows.length==0){
        indexLog(message, result="No Amdin found with amdin id provided in request header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false, admin})
    }
    const errors = validationResult(req);

    if (!errors.isEmpty()){
        indexLog(message, result="Request Body Fields Error", timestamp, request_type, success=false, errors);
        return res.json({message: "One of the fields is not correct", success: false})
    }

    const emailInUse = await client.query(`SELECT * FROM "doctors" WHERE "email" = $1 LIMIT 1`, [req.body.email]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err)
        num_errors += 1;
        return res.json({message:"Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    if (!emailInUse.rows.length==0){
        if (emailInUse.rows[0].deleted=="yes"){
            const data = await client.query(`UPDATE doctors SET deleted = $1 WHERE id = $2`, ["no", emailInUse.rows[0].id]).catch((err)=>{
                indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err)
                num_errors += 1;
                return res.json({message: "Database Error", success: false})
            });
            if (num_errors>0){
                return;
            }

            indexLog(message, result=`Doctor Account with id ${data.rows[0].id} Reactivated`, timestamp, request_type, success=true);
            return res.json({message: `Doctor Account with id ${data.rows[0].id} Reactivated`, success: true})
        }
        indexLog(message, result="The Email you provided is already in use", timestamp, request_type, success=true);
        return res.json({message: "The Email you provided is already in use", success: false})
    }

    const name = req.body.name;
    const email = req.body.email;
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    const created_by = req.admin.id;
    const deleted = "no";
    console.log("working")
    const data = await client.query(
        `INSERT into "doctors" ("name", "password", "email", "created_by", "deleted") VALUES ($1, $2, $3, $4, $5) RETURNING id`, [name, hashedPassword, email, created_by, deleted]
    ).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error)
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }
    
    indexLog(message, result=`New Doctor Created with id ${data.rows[0].id} Created`, timestamp, request_type, success=true);
    return res.json({message: `New Doctor Created with id ${data.rows[0].id} Created`, success: true})
})

router.get("/getadmins", fetchAdmin, async (req, res)=>{

    let num_errors = 0;

    const message = `Admin with id ${req.admin.id} requested to fetch data of all admins`;
    const timestamp = new Date();
    const request_type = "GET";

    const admin = await client.query(`SELECT * FROM "admin" WHERE "id" = $1 LIMIT 1`, [req.admin.id]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    if (admin.rows.length==0){
        indexLog(message, result="No admin found with id provided in request header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    const admins = await client.query(`SELECT * FROM "admin"`).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message:"Database Error", success:false})
    })

    if (num_errors>0){
        return;
    }

    const n = admins.rows.length;

    for (let i=0; i<n; i++){
        delete admins.rows[i].password;
    }

    indexLog(message, result="Get Request Executed Successfully", timestamp, request_type, success=true);
    return res.json({admins, success: true})
})

router.get("/getdoctors", fetchAdmin, async (req, res)=>{

    let num_errors = 0;

    const message = `Admin with id ${req.admin.id} requested to fetch data of all doctors`;
    const timestamp = new Date();
    const request_type = "GET";

    const admin = await client.query(`SELECT * FROM "admin" WHERE "id" = $1 LIMIT 1`, [req.admin.id]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    if (admin.rows.length==0){
        indexLog(message, result="No admin found with id provided in request header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    const doctors = await client.query(`SELECT * FROM "doctors"`).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message:"Database Error", success:false})
    })

    if (num_errors>0){
        return;
    }

    const n = doctors.rows.length;

    
    for (let i=0; i<n; i++){
        delete doctors.rows[i].password;
    }

    indexLog(message, result="Get Request Executed Successfully", timestamp, request_type, success=true);
    return res.json({doctors, success: true})
})

router.get("/getpatients", fetchAdmin, async (req, res)=>{

    let num_errors = 0;

    const message = `Admin with id ${req.admin.id} requested to fetch data of all patients`;
    const timestamp = new Date();
    const request_type = "GET";

    const admin = await client.query(`SELECT * FROM "admin" WHERE "id" = $1 LIMIT 1`, [req.admin.id]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    if (admin.rows.length==0){
        indexLog(message, result="No admin found with id provided in request header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    const patients = await client.query(`SELECT * FROM "patients"`).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        return res.json({message:"Database Error", success:false})
    })

    const n = patients.rows.length;

    
    for (let i=0; i<n; i++){
        delete patients.rows[i].password;
    }

    indexLog(message, result="Get Request Executed Successfully", timestamp, request_type, success=false);
    return res.json({patients, success: true})
})

router.delete("/patient", fetchAdmin, [
    body("id", {error: "Patient id must be provided"}).isNumeric()
], async (req, res)=>{

    let num_errors = 0;

    const message = `Admin with id ${req.admin.id} requested to delete patient account with id ${req.body.id}`;
    const timestamp = new Date();
    const request_type = "DELETE";

    const admin = await client.query(`SELECT * FROM "admin" WHERE "id" = $1 LIMIT 1`, [req.admin.id]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    if (admin.rows.length==0){
        indexLog(message, result="No admin found with id provided in the request header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false, admin})
    }
    const errors = validationResult(req);

    if (!errors.isEmpty()){
        indexLog(message, result="Request Body Fields Error", timestamp, request_type, success=false, errors);
        return res.json({message: "One of the fields is not correct", success: false})
    }

    const patient = await client.query(`SELECT * FROM "patients" WHERE "id" = $1 LIMIT 1`, [req.body.id]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    });

    if (num_errors>0){
        return;
    }

    if (patient.rows[0].deleted=="yes"){
        indexLog(message, result="Patient account was already marked as deleted", timestamp, request_type, success=false);
        return res.json({message: "The patient is already deleted", success: false});
    }

    await client.query(`UPDATE patients SET deleted = $1 WHERE id = $2`, ["yes", req.body.id]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    });

    if (num_errors>0){
        return;
    }

    indexLog(message, result="Patient Account Deleted Successfully", timestamp, request_type, success=false);
    return res.json({message: "Patient Deleted Successfully", success: true})
})

router.delete("/doctor", fetchAdmin, [
    body("id", {error: "Doctor id must be provided"}).isNumeric()
], async (req, res)=>{

    let num_errors = 0;

    const message = `Admin with id ${req.admin.id} requested to delete doctor account with id ${req.body.id}`;
    const timestamp = new Date();
    const request_type = "DELETE";

    const admin = await client.query(`SELECT * FROM "admin" WHERE "id" = $1 LIMIT 1`, [req.admin.id]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    if (admin.rows.length==0){
        indexLog(message, result="No admin found with id provided in the request header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false, admin})
    }
    const errors = validationResult(req);

    if (!errors.isEmpty()){
        indexLog(message, result="Request Body Fields Error", timestamp, request_type, success=false, errors);
        return res.json({message: "One of the fields is not correct", success: false})
    }

    const doctor = await client.query(`SELECT * FROM "doctors" WHERE "id" = $1 LIMIT 1`, [req.body.id]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    });

    if (num_errors>0){
        return;
    }

    if (doctor.rows[0].deleted=="yes"){
        indexLog(message, result="Doctor Account was already marked as deleted", timestamp, request_type, success=false);
        return res.json({message: "The doctor is already deleted", success: false});
    }

    await client.query(`UPDATE doctors SET deleted = $1 WHERE id = $2`, ["yes", req.body.id]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    });

    if (num_errors>0){
        return;
    }

    indexLog(message, result="Doctor Account Deleted Successfully", timestamp, request_type, success=true);
    return res.json({message: "Doctor Account Deleted Successfully", success: true})
})

router.get("/allappointments", fetchAdmin, async (req, res)=>{

    let num_errors = 0;

    const message = `Admin with id ${req.admin.id} requested to fetch data of all appointments`;
    const timestamp = new Date();
    const request_type = "GET";

    const admin = await client.query(`SELECT * FROM "admin" WHERE "id" = $1 LIMIT 1`, [req.admin.id]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    if (admin.rows.length==0){
        indexLog(message, result="No admin found with id provided in request header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false, admin})
    }

    const appointments = await client.query(`SELECT * FROM "appointments"`).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    indexLog(message, result="Get request executed successfully", timestamp, request_type, success=true);
    return res.json({appointments, success: true})
})

router.get("/allvisits", fetchAdmin, async (req, res)=>{

    let num_errors = 0;

    const message = `Admin with id ${req.admin.id} requested to fetch data of all visits`;
    const timestamp = new Date();
    const request_type = "GET";

    const admin = await client.query(`SELECT * FROM "admin" WHERE "id" = $1 LIMIT 1`, [req.admin.id]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    });

    if (num_errors>0){
        return;
    }

    if (admin.rows.length==0){
        indexLog(message, result="No admin found with admin id provided in request header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false, admin})
    }

    const visits = await client.query(`SELECT * FROM "visits"`).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false});
    })

    if (num_errors>0){
        return;
    }

    indexLog(message, result="Get Request Executed Successfully", timestamp, request_type, success=true);
    return res.json({visits, success: true});
})

router.get("/allexams", fetchAdmin, async (req, res)=>{
    
    let num_errors = 0;

    const message = `Admin with id ${req.admin.id} requested to fetch data of all exams`;
    const timestamp = new Date();
    const request_type = "GET";

    const admin = await client.query(`SELECT * FROM "admin" WHERE "id" = $1 LIMIT 1`, [req.admin.id]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    });

    if (num_errors>0){
        return;
    }

    if (admin.rows.length==0){
        indexLog(message, result="No admin found with the id provided in request header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false, admin})
    }

    const exams = await client.query(`SELECT * FROM "exams"`).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false});
    })

    indexLog(message, result="Get Request Executed Successfully", timestamp, request_type, success=true);
    return res.json({exams, success: true});
})

router.post("/getpatientbyid", fetchAdmin, [
    body("id", {error: "Patient ID is required"}).isNumeric()
], async (req, res)=>{

    let num_errors = 0;

    const message = `Admin with id ${req.admin.id} requested to fetch patient with id ${req.body.id}`;
    const timestamp = new Date();
    const request_type = "POST";

    const admin = await client.query(`SELECT * FROM "admin" WHERE "id" = $1 LIMIT 1`, [req.admin.id]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    });

    if (num_errors>0){
        return;
    }

    if (admin.rows.length==0){
        indexLog(message, result="No admin found with the id provided in request header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false, admin})
    }

    const errors = validationResult(req);

    if (!errors.isEmpty()){
        indexLog(message, result="Request Body Fields Error", timestamp, request_type, success=false, errors);
        return res.json({message: "One of the fields is not correct", success: false})
    }

    const data = await client.query(`SELECT "id", "name", "email", "created_by", "deleted" FROM "patients" WHERE "id"=$1 LIMIT 1`, [req.body.id]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: error, success: false})
    })

    if (num_errors>0){
        return;
    }

    indexLog(message, result="Request Executed Successfully", timestamp, request_type, success=true);
    return res.json({patient:data.rows[0], success:true});
})

router.post("/getpatientbyemail", fetchAdmin, [
    body("email", {error: "Patient Email is required"}).isEmail()
], async (req, res)=>{

    let num_errors = 0;

    const message = `Admin with id ${req.admin.id} requested to fetch patient with email ${req.body.email}`;
    const timestamp = new Date();
    const request_type = "POST";

    const admin = await client.query(`SELECT * FROM "admin" WHERE "id" = $1 LIMIT 1`, [req.admin.id]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    });

    if (num_errors>0){
        return;
    }

    if (admin.rows.length==0){
        indexLog(message, result="No admin found with the id provided in request header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false, admin})
    }

    const errors = validationResult(req);

    if (!errors.isEmpty()){
        indexLog(message, result="Request Body Fields Error", timestamp, request_type, success=false, errors);
        return res.json({message: "One of the fields is not correct", success: false})
    }

    const data = await client.query(`SELECT "id", "name", "email", "created_by", "deleted" FROM "patients" WHERE "email"=$1 LIMIT 1`, [req.body.email]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    indexLog(message, result="Request Executed Successfully", timestamp, request_type, success=true);
    return res.json({patient:data.rows[0], success:true});
})

router.post("/getdoctorbyid", fetchAdmin, [
    body("id", {error: "Dcotor ID is required"}).isNumeric()
], async (req, res)=>{

    let num_errors = 0;

    const message = `Admin with id ${req.admin.id} requested to fetch doctor with id ${req.body.id}`;
    const timestamp = new Date();
    const request_type = "POST";

    const admin = await client.query(`SELECT * FROM "admin" WHERE "id" = $1 LIMIT 1`, [req.admin.id]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    });

    if (num_errors>0){
        return;
    }

    if (admin.rows.length==0){
        indexLog(message, result="No admin found with the id provided in request header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false, admin})
    }

    const errors = validationResult(req);

    if (!errors.isEmpty()){
        indexLog(message, result="Request Body Fields Error", timestamp, request_type, success=false, errors);
        return res.json({message: "One of the fields is not correct", success: false})
    }

    const data = await client.query(`SELECT "id", "name", "email", "created_by", "deleted" FROM "doctors" WHERE "id"=$1 LIMIT 1`, [req.body.id]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    indexLog(message, result="Request Executed Successfully", timestamp, request_type, success=true);
    return res.json({doctor:data.rows[0], success:true});
})

router.post("/getdoctorbyemail", fetchAdmin, [
    body("email", {error: "Doctor Email is required"}).isEmail()
], async (req, res)=>{

    let num_errors = 0;

    const message = `Admin with id ${req.admin.id} requested to fetch doctor with email ${req.body.email}`;
    const timestamp = new Date();
    const request_type = "POST";

    const admin = await client.query(`SELECT * FROM "admin" WHERE "id" = $1 LIMIT 1`, [req.admin.id]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    });

    if (num_errors>0){
        return;
    }

    if (admin.rows.length==0){
        indexLog(message, result="No admin found with the id provided in request header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false, admin})
    }

    const errors = validationResult(req);

    if (!errors.isEmpty()){
        indexLog(message, result="Request Body Fields Error", timestamp, request_type, success=false, errors);
        return res.json({message: "One of the fields is not correct", success: false})
    }

    const data = await client.query(`SELECT "id", "name", "email", "created_by", "deleted" FROM "doctors" WHERE "email"=$1 LIMIT 1`, [req.body.email]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    indexLog(message, result="Request Executed Successfully", timestamp, request_type, success=true);
    return res.json({doctor:data.rows[0], success:true});
})

router.post("/getadminbyid", fetchAdmin, [
    body("id", {error: "Admin ID is required"}).isNumeric()
], async (req, res)=>{

    let num_errors = 0;

    const message = `Admin with id ${req.admin.id} requested to fetch admin with id ${req.body.id}`;
    const timestamp = new Date();
    const request_type = "POST";

    const admin = await client.query(`SELECT * FROM "admin" WHERE "id" = $1 LIMIT 1`, [req.admin.id]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    });

    if (num_errors>0){
        return;
    }

    if (admin.rows.length==0){
        indexLog(message, result="No admin found with the id provided in request header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false, admin})
    }

    const errors = validationResult(req);

    if (!errors.isEmpty()){
        indexLog(message, result="Request Body Fields Error", timestamp, request_type, success=false, errors);
        return res.json({message: "One of the fields is not correct", success: false})
    }

    const data = await client.query(`SELECT "id", "name", "email", "created_by" FROM "admin" WHERE "id"=$1 LIMIT 1`, [req.body.id]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    indexLog(message, result="Request Executed Successfully", timestamp, request_type, success=true);
    return res.json({admin:data.rows[0], success:true});
})

router.post("/getadminbyemail", fetchAdmin, [
    body("email", {error: "Admin Email is required"}).isEmail()
], async (req, res)=>{

    let num_errors = 0;

    const message = `Admin with id ${req.admin.id} requested to fetch admin with email ${req.body.email}`;
    const timestamp = new Date();
    const request_type = "POST";

    const admin = await client.query(`SELECT * FROM "admin" WHERE "id" = $1 LIMIT 1`, [req.admin.id]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    });

    if (num_errors>0){
        return;
    }

    if (admin.rows.length==0){
        indexLog(message, result="No admin found with the id provided in request header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false, admin})
    }

    const errors = validationResult(req);

    if (!errors.isEmpty()){
        indexLog(message, result="Request Body Fields Error", timestamp, request_type, success=false, errors);
        return res.json({message: "One of the fields is not correct", success: false})
    }

    const data = await client.query(`SELECT "id", "name", "email", "created_by" FROM "admin" WHERE "email"=$1 LIMIT 1`, [req.body.email]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    indexLog(message, result="Request Executed Successfully", timestamp, request_type, success=true);
    return res.json({admin:data.rows[0], success:true});
})

router.get("/logs", fetchAdmin, async(req, res)=>{

    let num_errors = 0;

    const message = `Admin with id ${req.admin.id} requested to fetch all logs`;
    const timestamp = new Date();
    const request_type = "POST";

    const admin = await client.query(`SELECT * FROM "admin" WHERE "id" = $1 LIMIT 1`, [req.admin.id]).catch((error)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=error);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    });

    if (num_errors>0){
        return;
    }

    if (admin.rows.length==0){
        indexLog(message, result="No admin found with the id provided in request header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false, admin})
    }

    const logs = await searchLogs();
    indexLog(message, result="Get Request Executed Successfully", timestamp, request_type, success=true);
    return res.json({logs:logs.reverse(), success: true})
})

module.exports = router;


