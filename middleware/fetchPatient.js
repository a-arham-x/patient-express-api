const jwt = require("jsonwebtoken");
const indexLog = require("../indexLogs.js");

const fetchPatient = (req, res, next) => {
    const patientToken = req.header("patient-token");

    if (!patientToken) {
        const message = "Someone tried to make a request as patient";
        const result = "No patient token provided in request header";
        const timestamp = new Date();
        const request_type = req.method;
        const success= false;
        indexLog(message, result, timestamp, request_type, success);
        return res.json({ error: "Please authenticate using a valid token" });
    }

    try {
        const string = jwt.verify(patientToken, process.env.JWT_SECRET);
        req.patient = string.patient;
    } catch (error) {
        const message = "Someone tried to make a request as patient";
        const result = "No patient token provided in request header";
        const timestamp = new Date();
        const request_type = req.method;
        const success= false;
        indexLog(message, result, timestamp, request_type, success);
        return res.status(401).send({ error: "Please authenticate using a valid token" });
    }
    next();
}

module.exports = fetchPatient;
