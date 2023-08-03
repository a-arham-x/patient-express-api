const jwt = require("jsonwebtoken");
const indexLog = require("../indexLogs.js");

const fetchAdmin = (req, res, next) => {
    const adminToken = req.header("admin-token");

    if (!adminToken) {
        const message = "Someone tried to make a request as the admin";
        const result = "No admin token provided in request header";
        const timestamp = new Date();
        const request_type = req.method;
        const success= false;
        indexLog(message, result, timestamp, request_type, success);
        return res.json({ message: "Please authenticate using a valid token", success: false });
    }

    try {
        const string = jwt.verify(adminToken, process.env.JWT_SECRET);
        req.admin = string.admin;
    } catch (error) {
        const message = "Someone tried to make a request as the admin";
        const result = "No admin token provided in request header";
        const timestamp = new Date();
        const request_type = req.method;
        const success= false;
        indexLog(message, result, timestamp, request_type, success);
        return res.status(401).send({ message: "Please authenticate using a valid token", success: false });
    }
    next();
}

module.exports = fetchAdmin;
