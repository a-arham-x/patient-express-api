const jwt = require("jsonwebtoken");
const indexLog = require("../indexLogs.js");

const fetchDoctor = (req, res, next) => {
    const doctorToken = req.header("doctor-token");

    if (!doctorToken) {
        const message = "Someone tried to make a request as doctor";
        const result = "No doctor token provided in request header";
        const timestamp = new Date();
        const request_type = req.method;
        const success= false;
        indexLog(message, result, timestamp, request_type, success);
        return res.json({ error: "Please authenticate using a valid token" });
    }

    try {
        const string = jwt.verify(doctorToken, process.env.JWT_SECRET);
        req.doctor = string.doctor;
    } catch (error) {
        const message = "Someone tried to make a request as doctor";
        const result = "No doctor token provided in request header";
        const timestamp = new Date();
        const request_type = req.method;
        const success= false;
        indexLog(message, result, timestamp, request_type, success);
        return res.status(401).send({ error: "Please authenticate using a valid token" });
    }
    next();
}

module.exports = fetchDoctor;
