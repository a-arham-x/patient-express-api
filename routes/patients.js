const express = require("express")
const router = express.Router()
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const {body, validationResult} = require("express-validator")
const {Client} = require("pg")
const indexLog = require("../indexLogs")
const fetchPatient = require("../middleware/fetchPatient.js")

const client = new Client({
    host : "localhost",
    database : "Patient Schema",
    user : "postgres",
    password : "abdularham123",
    port :  5432
})

client.connect()

router.post("/login", [
    body("email", {error: "Email not provided"}).isEmail(),
    body("password", {error: "Password not provided"}).isLength({min: 1})
], async (req, res)=>{
    const errors = validationResult(req);

    let num_errors = 0;

    const message = `Login request by patient with email ${req.body.email}`;
    const timestamp = new Date();
    const request_type = "POST";

    if (!errors.isEmpty()){
        indexLog(message, result="Request Body Fields Error", timestamp, request_type, success=false, errors);
        return res.json({message: "One of the email and password is not correct", errors, success: false})
    }

    const patient = await client.query(`SELECT * FROM "patients" WHERE "email" = $1 LIMIT 1`, [req.body.email]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    });

    if  (num_errors>0){
        return;
    }

    if (patient.rows.length==0){
        indexLog(message, result="No account found with the provided patient id", timestamp, request_type, success=false);
        return res.json({message: "One of the email and password is not correct", success: false})
    }

    if (patient.rows[0].deleted=="yes"){
        indexLog(message, result="Account was marked deleted in the database", timestamp, request_type, success=false);
        return res.json({message: "One of the email and password is not correct", success: false})
    }

    const passwordIsCorrect = bcrypt.compare(req.body.password, patient.rows[0].password);

    if (!passwordIsCorrect){
        indexLog(message, result="Incorrect Password Entered", timestamp, request_type, success=false);
        return res.json({message: "One of the email and password is not correct", success: false})
    }

    const key = {patient:{id:patient.rows[0].id}};
    const patientToken = jwt.sign(key, process.env.JWT_SECRET);
    indexLog(message, result="Login Successful", timestamp, request_type, success=true);
    return res.json({patientToken, success: true}); 
})

router.post("/createappointment", fetchPatient, [
    body("doctor_id", {error: "Doctor ID not provided"}).isNumeric(),
    body("start_time", {error: "Start Time for the appointment is not mentioned."}).isLength({min: 19}),
    body("end_time", {error: "End Time for the appointment is not mentioned."}).isLength({min:19})
], async (req, res)=>{
    let num_errors = 0
    const message = `Appointment creation request by a patient with patient id ${req.patient.id} with doctor of id ${req.body.doctor_id}`;
    const timestamp = new Date();
    const request_type = "POST";
    const patient = await client.query(`SELECT * FROM "patients" WHERE id = $1 LIMIT 1`, [req.patient.id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false});
    })

    if (num_errors > 0){
        return;
    }

    if (patient.rows.length==0){
        indexLog(message, result="Unable to Authorize the request sender", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    if (patient.rows[0].deleted=="yes"){
        indexLog(message, result="The Patient Account is marked deleted in the database", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    const errors = validationResult(req);

    if (!errors.isEmpty()){
        indexLog(message, result="Request Body Fields Error", timestamp, request_type, success=false, errors);
        return res.json({message: "One of the required fields is missing", success: false})
    }

    const doctor = await client.query(`SELECT * FROM "doctors" WHERE id = $1 LIMIT 1`, [req.body.doctor_id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false});
    });

    if (num_errors > 0){
        return;
    }

    if (doctor.rows.length==0){
        indexLog(message, result="No Doctor found with the provided ID in the request body", timestamp, request_type, success=false);
        return res.json({message: "No Doctor found with the provided ID", success: false})
    }

    if (doctor.rows[0].deleted=="yes"){
        indexLog(message, result="The doctor id provided in request body is marked deleted in database", timestamp, request_type, success=false);
        return res.json({message: "No Doctor found with the provided ID", success: false})
    }

    const data = await client.query(`INSERT INTO "appointments" ("patient_id", "doctor_id", "start_time", "end_time", "status") VALUES ($1, $2, $3, $4, $5) RETURNING id`, 
    [req.patient.id, req.body.doctor_id, req.body.start_time, req.body.end_time, "booked"]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false});
    });

    if (num_errors>0){
        return;
    }

    indexLog(message, result=`Appointment Created Successfully with id ${data.rows[0].id}`, timestamp, request_type, success=true);
    return res.json({message: `Appointment Created Successfully with id ${data.rows[0].id}`, success: true})
})

router.post("/createvisit", fetchPatient, [
    body("doctor_id"),
    body("start_time"),
    body("end_time"),
    body("appointment_id")
], async (req, res)=>{
    let num_errors = 0;

    const message = `Visit creation request by a patient with patient id ${req.patient.id} with a doctor of doctor id ${req.body.doctor_id}`;
    const timestamp = new Date();
    const request_type = "POST";

    const patient = await client.query(`SELECT * FROM "patients" WHERE id = $1 LIMIT 1`, [req.patient.id]).catch((err)=>{
        num_errors += 1; 
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        return res.json({err, success: false});
    })

    if (num_errors>0){
        return;
    }

    if (patient.rows.length==0){
        indexLog(message, result="No Patient present with the provided Patient Id", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    if (patient.rows[0].deleted=="yes"){
        indexLog(message, result="Patient is marked as deleted in the database", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    const errors = validationResult(req);

    if (!errors.isEmpty()){
        indexLog(message, result="Request Body Fields Error", timestamp, request_type, success=false, errors);
        return res.json({errors, success: false})
    }

    let start_time;
    let end_time;
    let doctor_id;
    if (req.body.appointment_id){
        const appointment = await client.query(`SELECT * FROM "appointments" WHERE id = $1 LIMIT 1`, [req.body.appointment_id]).catch((err)=>{
            indexLog(message, result="Database Error", timestamp, request_type, success=false);
            num_errors += 1
            return res.json({message: "Database Error", success: false})
        })

        if (num_errors>0){
            return;
        }

        if (appointment.rows.length==0){
            indexLog(message, result="No appointment with the provided id found", timestamp, request_type, success=false);
            return res.json({message: "No appointment with the given id found", success: false});
        }else{
            if (appointment.rows[0].visit_id!=null){
                indexLog(message, result="The appointment is already  associated to a visit", timestamp, request_type, success=false);
                return res.json({message: "The appointment already is associted with a visit", success: false});
            }else{
                if (appointment.rows[0].patient_id != req.patient.id){
                    indexLog(message, result="The patient was trying to make visit for an appointment that is registered with another id", timestamp, request_type, success=false);
                    return res.json({message: "Cannot schedule the visit", success: false})
                }
                doctor_id = appointment.rows[0].doctor_id
                start_time = appointment.rows[0].start_time;
                end_time = appointment.rows[0].end_time;
            }
        }
    }else{
        if (!req.body.doctor_id){
            indexLog(message, result="Doctor ID was not provoded neither appointment id", timestamp, request_type, success=false);
            return res.json({message: "Doctor ID is not provided.", success: false})
        }
        if (!req.body.start_time){
            indexLog(message, result="Start Time was not provided neither appointment id", timestamp, request_type, success=false);
            return res.json({message: "Start Time for the visit is not provided.", success: false})
        }
        if (!req.body.end_time){
            indexLog(message, result="Neither End Time was provided nor appointment id", timestamp, request_type, success=false);
            return res.json({message: "End Time for the visit is not provided", success: false})
        }
        
        doctor_id = req.body.doctor_id
        start_time = req.body.start_time;
        end_time = req.body.end_time;

        if (appointment.rows[0].status=="cancelled" || appointment.rows[0].status=="completed"){
            indexLog(message, result=`The appointment was already ${appointment.rows[0].status}`, timestamp, request_type, success=false);
            return res.json({message: `Cannot make a visit for a ${appointment.rows[0].status} appointment.`, success: false});
        }
    }

    const doctor = await client.query(`SELECT * FROM "doctors" WHERE id = $1 LIMIT 1`, [doctor_id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        return res.json({message: "Database Error", success: false});
    });

    if (doctor.rows.length==0){
        indexLog(message, result="No Doctor found with the provided ID", timestamp, request_type, success=false);
        return res.json({message: "No Doctor found with the provided Doctor ID", success: false})
    }

    if (doctor.rows[0].deleted=="yes"){
        indexLog(message, result="The provided doctor id was marked deleted in the database", timestamp, request_type, success=false);
        return res.json({message: "No Doctor found with the provided Doctor ID", success: false})
    }

    const data = await client.query(`INSERT INTO "visits" ("patient_id", "doctor_id", "start_time", "end_time", "appointment_id") VALUES ($1, $2, $3, $4, $5) RETURNING id`, 
    [req.patient.id, doctor_id, start_time, end_time, req.body.appointment_id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    await client.query(`UPDATE "appointments" SET visit_id = $1 WHERE id = $2`, [data.rows[0].id, req.body.appointment_id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    indexLog(message, result=`Visit Scheduled Successfully with id ${data.rows[0].id}`, timestamp, request_type, success=false);
    return res.json({message: `Visit Scheduled Successfully with id ${data.rows[0].id}`, succes: true})
})

router.post("/updatestatus", fetchPatient, [
    body("status", {error: "Appointment Status Required"}).isAlpha(),
    body("appointment_id", {error: "Appointment ID is required"}).isNumeric()
], async (req, res)=>{
    
    let num_errors = 0;

    const message = `Patient with id ${req.patient.id} requested to update the status of an appointment of id ${req.body.appointment_id} to ${req.body.status}`
    const timestamp = new Date();
    const request_type = "POST"

    const patient = await client.query(`SELECT * FROM "patients" WHERE id = $1 LIMIT 1`, [req.patient.id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false});
    })

    if (num_errors>0){
        return;
    }

    if (patient.rows.length==0){
        indexLog(message, result="No Patient found with the provided patient id", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    if (patient.rows[0].deleted=="yes"){
        indexLog(message, result="Provided Patient id is marked deleted in the database", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    const errors = validationResult(req);

    if (!errors.isEmpty()){
        indexLog(message, result="Request Body field Errors", timestamp, request_type, success=false, errors);
        return res.json({errors, success: false})
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
        indexLog(message, result="No Appointment found With the given appointment id", timestamp, request_type, success=false);
        return res.json({message: "No Appointment Present With the given appointment id", success: false})
    }

    if (appointment.rows[0].patient_id != req.patient.id){
        indexLog(message, result="The provided appointment id is not an appointment of the Requesting Patient", timestamp, request_type, success=false);
        return res.json({message: "Unauthorized for making this visit", success: false});
    }

    await client.query(`UPDATE "appointments" SET status = $1 WHERE id = $2`, [req.body.status, req.body.appointment_id]).catch((err)=>{
        indexLog(message, result=`Database Error`, timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    });

    if (num_errors>0){
        return;
    }

    if (appointment.rows[0].status == req.body.status){
        indexLog(message, result=`Appointment Status was already set to ${req.body.status}`, timestamp, request_type, success=false);
        return res.json({message: `Appointment Status was already set to ${req.body.status}`, success: false})
    }

    indexLog(message, result=`Appointment Status successfully updated to ${req.body.status}`, timestamp, request_type, success=true);
    return res.json({message: `Appointment Status successfully updated to ${req.body.status}`, success: false})
})

router.get("/allappointments", fetchPatient, async (req, res)=>{

    let num_errors = 0;

    const message = `Patient with patient id ${req.patient.id} requested to get all the appointments that belong to the patient`
    const timestamp = new Date();
    const request_type = "GET";

    const patient = await client.query(`SELECT * FROM "patients" WHERE id = $1 LIMIT 1`, [req.patient.id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false});
    })

    if (num_errors > 0){
        return;
    }

    if (patient.rows.length==0){
        indexLog(message, result="No Patient Found with the patient id in the request header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    if (patient.rows[0].deleted=="yes"){
        indexLog(message, result="Patient marked as deleted in the database", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    const all_appointments = await client.query(`SELECT * FROM "appointments" WHERE patient_id = $1`, [req.patient.id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    indexLog(message, result="Get request executed successfully", timestamp, request_type, success=true);
    return res.json({all_appointments: all_appointments.rows, success: true})
})

router.get("/allvisits", fetchPatient, async (req, res)=>{

    let num_errors = 0;

    const message = `Patient with patient id ${req.patient.id} requested to get all the visits that belong to the patient`
    const timestamp = new Date();
    const request_type = "GET";    

    const patient = await client.query(`SELECT * FROM "patients" WHERE id = $1 LIMIT 1`, [req.patient.id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false});
    })

    if (num_errors > 0){
        return;
    }

    if (patient.rows.length==0){
        indexLog(message, result="No patient found with the patient id in the request header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    if (patient.rows[0].deleted=="yes"){
        indexLog(message, result="Patient is marked as deleted in the database", timestamp, request_type, success=false)
        return res.json({message: "Authorization Failed", success: false})
    }

    const all_visits = await client.query(`SELECT * FROM "visits" WHERE patient_id = $1`, [req.patient.id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1
        return res.json({message: "Database Error", success: false})
    })

    if (num_errors>0){
        return;
    }

    indexLog(message, result="Get request executed successfully", timestamp, request_type, success=true);
    return res.json({all_visits: all_visits.rows, success: true})
})

router.get("/allexams", fetchPatient, async (req, res)=>{

    let num_errors = 0;

    const message = `Patient with patient id ${req.patient.id} requested to get all the exams that belong to the patient`
    const timestamp = new Date();
    const request_type = "GET"; 

    const patient = await client.query(`SELECT * FROM "patients" WHERE id = $1 LIMIT 1`, [req.patient.id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false});
    })

    if (num_errors>0){
        return;
    }

    if (patient.rows.length==0){
        indexLog(message, result="No Patient found with the patient id in the request header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    if (patient.rows[0].deleted=="yes"){
        indexLog(message, result="Patient is marked as deleted in the database", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    const all_exams = await client.query(`SELECT * FROM "exams" INNER JOIN visits ON exams.visit_id = visits.id WHERE patient_id = $1`, [req.patient.id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err)
        num_errors += 1;
        return res.json({message: "Database Error", success: false})
    })    

    if (num_errors>0){
        return;
    }

    indexLog(message, result="Get request executed successfully", timestamp, request_type, success=true)
    return res.json({all_exams: all_exams.rows, success: true})
})

router.post("/delete", fetchPatient, async (req, res)=>{

    let num_errors = 0;

    const message = `Patient with patient id ${req.patient.id} requested to delete account`
    const timestamp = new Date();
    const request_type = "POST"; 

    const patient = await client.query(`SELECT * FROM "patients" WHERE id = $1 LIMIT 1`, [req.patient.id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err);
        num_errors += 1;
        return res.json({message: "Database Error", success: false});
    })

    if (num_errors> 0){
        return;
    }

    if (patient.rows.length==0){
        indexLog(message, result="No Patient found with the patient id in the request header", timestamp, request_type, success=false);
        return res.json({message: "Authorization Failed", success: false})
    }

    if (patient.rows[0].deleted=="yes"){
        indexLog(message, result="Patient marked as deleted in the database", timestamp, request_type, success=false)
        return res.json({message: "Authorization Failed", success: false})
    }

    await client.query(`UPDATE "patients" SET deleted = $1 WHERE id = $2`, ["yes", req.patient.id]).catch((err)=>{
        indexLog(message, result="Database Error", timestamp, request_type, success=false, server_err=err)
        num_errors += 1;
        return res.json({message: "Database Error", success: false});
    })

    if (num_errors>0){
        return;
    }

    indexLog(message, result="Account marked as deleted in the database", timestamp, request_type, success=true)
    return res.json({message: "Account Deleted Successfully", success: false});
})

module.exports = router;