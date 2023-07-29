const express = require("express")
const router = express.Router()
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const {body, validationResult} = require("express-validator")
const {Client} = require("pg")
const indexLog = require("../indexLogs.js")
const fetchDoctor = require("../middleware/fetchDoctor.js")

const client = new Client({
    host : "localhost",
    database : "Patient Schema",
    user : "postgres",
    password : "abdularham123",
    port :  5432
})

client.connect()

router.post("/login", [
    body("email", {error: "Email Required"}).isEmail(),
    body("password", {error: "Password required"}).isLength({min:8, max: 16})
], async (req, res)=>{
    const errors = validationResult(req);

    let num_errors = 0;

    const message = `Login request by doctor with email ${req.body.email}`;
    const timestamp = new Date();
    const request_type = "POST"

    if (!errors.isEmpty()){
        indexLog(message, result="Request Body Fields Error", timestamp, request_type, success=false, errors);
        return res.json({message: "One of the email and password provided is not correct", success: false});
    }

    const doctor = await client.query(`SELECT * FROM "doctors" WHERE email = $1`, [req.body.email]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false});
    });

    if (num_errors>0){
        return;
    }

    if (doctor.rows.length==0){
        indexLog(message, result="No Doctor found with the provided email address", timestamp, request_type, success=false);
        return res.json({message: "One of the email and password provided is not correct", success: false});
    }

    if (doctor.rows[0].deleted=="yes"){
        indexLog(message, result="Doctor Account marked as deleted", timestamp, request_type, success=false);
        return res.json({message: "One of the email and password provided is not correct", success: false});
    }

    const passwordIsCorrect = bcrypt.compare(req.body.password, doctor.rows[0].password);

    if (!passwordIsCorrect){
        indexLog(message, result="Incorrect password provided", timestamp, request_type, success=false);
        return res.json({message: "One of the email and password provided is not correct", success: false});
    }

    const key = {doctor:{id:doctor.rows[0].id}};
    const doctorToken = jwt.sign(key, process.env.JWT_SECRET);
    indexLog(message, result="Login Successful", timestamp, request_type, success=true);
    return res.json({doctorToken, success: true});
})

router.post("/createappointment", fetchDoctor, [
    body("patient_id", {error: "Patent ID not provided"}).isNumeric(),
    body("start_time", {error: "Start Time for the appointment is not mentioned."}).isLength({min: 19}),
    body("end_time", {error: "End Time for the appointment is not mentioned."}).isLength({min:19})
], async (req, res)=>{
    let num_errors = 0;

    const message = `Doctor with id ${req.doctor.id} requested to make an appointment with patient of id ${req.body.patient_id}`
    const timestamp = new Date();
    const request_type = "POST"

    const doctor = await client.query(`SELECT * FROM "doctors" WHERE id = $1 LIMIT 1`, [req.doctor.id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false});
    })

    if (num_errors>0){
        return;
    }

    if (doctor.rows.length==0){
        indexLog(message, result="No Doctor found with the provided doctor id in the request header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    if (doctor.rows[0].deleted=="yes"){
        indexLog(message, result="Doctor Account Marked as deleted in database", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    const errors = validationResult(req);

    if (!errors.isEmpty()){
        indexLog(message, result="Request Body Fields Error", timestamp, request_type, success=false);
        return res.json({message: "One of the required fields is missing", success: false})
    }

    const patient = await client.query(`SELECT * FROM "patients" WHERE id = $1 LIMIT 1`, [req.body.patient_id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false});
    });

    if (num_errors>0){
        return;
    }

    if (patient.rows.length==0){
        indexLog(message, result="No Patient found with the provided Patient ID", timestamp, request_type, success=false);
        return res.json({message: "No Patient found with the provided ID", success: false})
    }

    if (patient.rows[0].deleted=="yes"){
        indexLog(message, result="Patient Account Marked as deleted in the database", timestamp, request_type, success=false);
        return res.json({message: "No Patient found with the provided ID", success: false})
    }

    const data = await client.query(`INSERT INTO "appointments" ("patient_id", "doctor_id", "start_time", "end_time", "status") VALUES ($1, $2, $3, $4, $5) RETURNING id`, 
    [req.body.patient_id, req.doctor.id, req.body.start_time, req.body.end_time, "booked"]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1
        return res.json({message: "Database Error", success: false});
    });

    if (num_errors>0){
        return;
    }

    indexLog(message, result=`Appointment Scheduled Successfully with id ${data.rows[0].id}`, timestamp, request_type, success=true);
    return res.json({message: `Appointment Scheduled Successfully with id ${data.rows[0].id}`, success: true})
})

router.post("/createvisit", fetchDoctor, [
    body("patient_id"),
    body("start_time"),
    body("end_time"),
    body("appointment_id")
], async (req, res)=>{
    let num_errors = 0;

    const message = `Doctor with id ${req.doctor.id} requested to create a visit with patient of patient id ${req.body.patient_id}`;
    const timestamp  = new Date();
    const request_type = "POST";

    const doctor = await client.query(`SELECT * FROM "doctors" WHERE id = $1 LIMIT 1`, [req.doctor.id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err)
        num_errors += 1;
        return res.json({message: "Database Error", success: false});
    })

    if (num_errors>0){
        return;
    }

    if (doctor.rows.length==0){
        indexLog(message, result="No Doctor found with the doctor id provided in the request header", timestamp, request_type, success=false)
        return res.json({message: "Authorization Failed", success: false})
    }

    if (doctor.rows[0].deleted=="yes"){
        indexLog(message, result="Doctor Account marked as deleted in the database", timestamp, request_type, success=false)
        return res.json({message: "Authorization Failed", success: false})
    }

    let start_time;
    let end_time;
    let patient_id
    if (req.body.appointment_id){
        const appointment = await client.query(`SELECT * FROM "appointments" WHERE id = $1 LIMIT 1`, [req.body.appointment_id]).catch((err)=>{
            indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err)
            num_errors += 1;
            return res.json({message: "Database Error", success: false})
        })

        if (num_errors>0){
            return;
        }

        if (appointment.rows.length==0){
            indexLog(message, result="No appointment found with the provided appointment id", timestamp, request_type, success=false)
            return res.json({message: "No appointment with the given id found", success: false});
        }else{
            if (appointment.rows[0].visit_id!=null){
                indexLog(message, result="The appointment already is associated with a visit", timestamp, request_type, success=false)
                return res.json({message: "The appointment already is associted with a visit", success: false});
            }else{
                if (appointment.rows[0].doctor_id != req.doctor.id){
                    indexLog(message, result=`The appointment does not belong to the doctor with id ${req.doctor.id}`, timestamp, request_type, success=false)
                    return res.json({message: "Cannot Schedule the visit", success: false})
                }
                patient_id = appointment.rows[0].patient_id;
                start_time = appointment.rows[0].start_time;
                end_time = appointment.rows[0].end_time;
            }
        }
    }else{
        if (!req.body.patient_id){
            indexLog(message, result="Neither Appointment ID has been provided neither the patient id", timestamp, request_type, success=false)
            return res.json({message: 'Patient ID of the Patient is not provided', success: false})
        }
        if (!req.body.start_time){
            indexLog(message, result="Neither Appointment ID has been provided nor the start time", timestamp, request_type, success=false)
            return res.json({message: "Start Time for the visit is not provided.", success: false})
        }
        if (!req.body.end_time){
            indexLog(message, result="Neither the Appointment ID has been provided nor the end time", timestamp, request_type, success=false)
            return res.json({message: "End Time for the visit is not provided", success: false})
        }
        patient_id = req.body.patient_id
        start_time = req.body.start_time;
        end_time = req.body.end_time;

        if (appointment.rows[0].status=="cancelled" || appointment.rows[0].status=="completed"){
            indexLog(message, result=`Cannot make a visit for ${appointment.rows[0].status} appointment`)
            return res.json({message: `Cannot make a visit for ${appointment.rows[0].status} appointment`, success: false});
        }
    }

    const patient = await client.query(`SELECT * FROM "patients" WHERE id = $1 LIMIT 1`, [patient_id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err)
        num_errors += 1;
        return res.json({message: "Database Error", success: false});
    });

    if (patient.rows.length==0){
        indexLog(message, result="The Patient ID provided is not found in database", timestamp, request_type, success=false)
        return res.json({message: "No Patient found with the provided Patient ID", success: false})
    }

    if (patient.rows[0].deleted=="yes"){
        indexLog(message, result="The patient id provided is marked as deleted", timestamp, request_type, success=false)
        return res.json({message: "No Patient found with the provided Patient ID", success: false})
    }

    const data = await client.query(`INSERT INTO "visits" ("patient_id", "doctor_id", "start_time", "end_time", "appointment_id") VALUES ($1, $2, $3, $4, $5) RETURNING id`, 
    [patient_id, req.doctor.id, start_time, end_time, req.body.appointment_id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    await client.query(`UPDATE "appointments" SET visit_id = $1 WHERE id = $2`, [data.rows[0].id, req.body.appointment_id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    indexLog(message, result=`Visit Successfully Created with ID ${data.rows[0].id}`, timestamp, request_type, success=true);
    return res.json({message: `Visit Successfully Created with ID ${data.rows[0].id}`, succes: true})
})

router.post("/updatestatus", fetchDoctor, [
    body("status", {error: "Appointment Status Required"}).isAlpha(),
    body("appointment_id", {error: "Appointment ID is required"}).isNumeric()
], async (req, res)=>{

    let num_errors = 0;

    const message = `Doctor with ID ${req.doctor.id} requested to update status of appointment of id ${req.body.appointment_id}`;
    const timestamp = new Date();
    const request_type = "POST"

    const doctor = await client.query(`SELECT * FROM "doctors" WHERE id = $1 LIMIT 1`, [req.doctor.id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false});
    })

    if (num_errors>0){
        return;
    }

    if (doctor.rows.length==0){
        indexLog(message, result="No Doctor found with the provided doctor id in the request header", timestamp, request_type, success=false)
        return res.json({message: "Authorization Failed", success: false})
    }

    if (doctor.rows[0].deleted=="yes"){
        indexLog(message, result="The Doctor making request is marked as deleted in database", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    const errors = validationResult(req);

    if (!errors.isEmpty()){
        indexLog(message, result="Request Body Fields Error", timestamp, request_type, success=false)
        return res.json({message: "One of the required fields is not correctly provided", success: false})
    }

    const appointment = await client.query(`SELECT * FROM "appointments" WHERE id = $1`, [req.body.appointment_id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    });

    if (num_errors>0){
        return;
    }

    if (appointment.rows.length==0){
        indexLog(message, result=`No Appointment Present With the given appointment id ${req.body.appointment_id}`, timestamp, request_type, success=false, server_err=err)
        return res.json({message: "No Appointment Present With the given appointment id", success: false})
    }

    if (appointment.rows[0].doctor_id != req.doctor.id){
        indexLog(message, result="The appointment does not belong to the requesting doctor", timestamp, request_type, success=false)
        return res.json({message: "Unauthorized for making this visit", success: false});
    }

    await client.query(`UPDATE "appointments" SET status = $1 WHERE id = $2`, [req.body.status, req.body.appointment_id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err)
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    });

    if (num_errors>0){
        return;
    }

    indexLog(message, result="Appointment Status Updated Successfully", timestamp, request_type, success=true)
    return res.json({message: "Appointment Status updated successfully", success: true})
})

router.post("/createexam", fetchDoctor, [
    body("visit_id", {error: "Visit ID is not provided"}).isNumeric(),
    body("doctor_comment")
], async (req, res)=>{

    let num_errors = 0;

    const message = `Doctor with ID ${req.doctor.id} requested to create an exam`;
    const timestamp = new Date();
    const request_type = "POST"

    const doctor = await client.query(`SELECT * FROM "doctors" WHERE id = $1 LIMIT 1`, [req.doctor.id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false});
    })

    if (num_errors>0){
        return;
    }

    if (doctor.rows.length==0){
        indexLog(message, result="No Doctor found with the provided id", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    if (doctor.rows[0].deleted=="yes"){
        indexLog(message, result="Doctor is marked as deleted in the database", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    const errors = validationResult(req);

    if (!errors.isEmpty()){
        indexLog(message, result="Request Body Fields Error", timestamp, request_type, success=false);
        return res.json({errors, success: false})
    }

    const visit = await client.query(`SELECT * FROM "visits" WHERE id = $1`, [req.body.visit_id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false});
    })

    if (num_errors>0){
        return;
    }

    if (visit.rows.length==0){
        indexLog(message, result=`No Visit Found with the provided visit id ${req.body.visit_id}`, timestamp, request_type, success=false);
        return res.json({message: "No visit found with the provided visit id", success: false})
    }

    if (visit.rows[0].doctor_id != req.doctor.id){
        indexLog(message, result=`The Visit with id ${req.body.visit_id} does not belong to this doctor`, timestamp, request_type, success=false);
        return res.json({message: "Unauthorized for making the exam"});
    }

    const appointment = await client.query(`SELECT * FROM "appointments" WHERE visit_id = $1`, [req.body.visit_id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false});
    })

    if (num_errors>0){
        return;
    }

    if (appointment.rows.length!=0){
        if (appointment.rows[0].status=="cancelled"){
            indexLog(message, result="Exams cannot be created for cancel appointments", timestamp, request_type, success=false);
            return res.json({message: "Exams cannot be created for cancel appointments", success: false});
        }
    }

    const data = await client.query(`INSERT INTO "exams" ("visit_id", "doctor_comment") VALUES ($1, $2) RETURNING id`, [req.body.visit_id, req.body.doctor_comment]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false});
    })

    if (num_errors>0){
        return;
    }

    indexLog(message, result=`Exam Successfully Created with Exam ID ${data.rows[0].id}`, timestamp, request_type, success=true);
    return res.json({message: `Exam Successfully Created with Exam ID ${data.rows[0].id}`, success: true})
})

router.get("/allappointments", fetchDoctor, async (req, res)=>{

    let num_errors = 0;

    const message = `Doctor with id ${req.doctor.id} requested to fetch all the appointments that belong to the doctor`;
    const timestamp = new Date();
    const request_type = "GET";

    const doctor = await client.query(`SELECT * FROM "doctors" WHERE id = $1 LIMIT 1`, [req.doctor.id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false});
    })

    if (num_errors>0){
        return;
    }

    if (doctor.rows.length==0){
        indexLog(message, result="No Doctor Found with the doctor id provided in the request header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    if (doctor.rows[0].deleted=="yes"){
        indexLog(message, result="The Doctor account is marked as deleted in the database", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    const all_appointments = await client.query(`SELECT * FROM "appointments" WHERE doctor_id = $1`, [req.doctor.id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    indexLog(message, result="Get Request Executed Successfully", timestamp, request_type, success=true);
    return res.json({all_appointments: all_appointments.rows, success: true})
})

router.get("/allvisits", fetchDoctor, async (req, res)=>{

    let num_errors = 0;

    const message = `Doctor with id ${req.doctor.id} requested to fetch all the visits that belong to the doctor`;
    const timestamp = new Date();
    const request_type = "GET";

    const doctor = await client.query(`SELECT * FROM "doctors" WHERE id = $1 LIMIT 1`, [req.doctor.id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false});
    })

    if (num_errors>0){
        return;
    }

    if (doctor.rows.length==0){
        indexLog(message, result="No Doctor found with the doctor id provided in the reqest header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    if (doctor.rows[0].deleted=="yes"){
        indexLog(message, result="Doctor marked as deleted in database", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    const all_visits = await client.query(`SELECT * FROM "visits" WHERE doctor_id = $1`, [req.doctor.id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    indexLog(message, result="Get Request Executed Successfully", timestamp, request_type, success=true);
    return res.json({all_visits: all_visits.rows, success: true})
})

router.get("/allexams", fetchDoctor, async (req, res)=>{

    let num_errors = 0;

    const message = `Doctor with id ${req.doctor.id} requested to get all the exams that belong to the doctor`;
    const timestamp = new Date();
    const request_type = "GET";

    const doctor = await client.query(`SELECT * FROM "doctors" WHERE id = $1 LIMIT 1`, [req.doctor.id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false});
    })

    if (num_errors>0){
        return;
    }

    if (doctor.rows.length==0){
        indexLog(message, result="No Doctor found with the Doctor ID provided in the Request Header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    if (doctor.rows[0].deleted=="yes"){
        indexLog(message, result="Doctor is marked as deleted in the database", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    const all_exams = await client.query(`SELECT * FROM "exams" INNER JOIN visits ON exams.visit_id = visits.id WHERE doctor_id = $1`, [req.doctor.id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })    

    if (num_errors>0){
        return;
    }

    indexLog(message, result="Get Request Executed Successfully", timestamp, request_type, success=true);
    return res.json({all_exams: all_exams.rows, success: true});
})

router.post("/delete", fetchDoctor, async (req, res)=>{

    let num_errors = 0;

    const message = `Doctor with id ${req.doctor.id} requested to delete account`;
    const timestamp = new Date();
    const request_type = "POST";

    const doctor = await client.query(`SELECT * FROM "doctors" WHERE id = $1 LIMIT 1`, [req.doctor.id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false});
    })

    if (num_errors>0){
        return;
    }

    if (doctor.rows.length==0){
        indexLog(message, result="No Doctor found with doctor id provided in request header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    if (doctor.rows[0].deleted=="yes"){
        indexLog(message, result="Doctor Account is marked as deleted in database", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    await client.query(`UPDATE "doctors" SET deleted = $1 WHERE id = $2`, ["yes", req.doctor.id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    indexLog(message, result="Account Deleted Successfully", timestamp, request_type, success=true);
    return res.json({message: "Account Successfully Deleted", success: true})
})

module.exports = router;