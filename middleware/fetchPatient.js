const jwt = require("jsonwebtoken");

const fetchPatient = (req, res, next) => {
    const patientToken = req.header("patient-token");

    if (!patientToken) {
        return res.json({ error: "Please authenticate using a valid token" });
    }

    try {
        const string = jwt.verify(patientToken, process.env.JWT_SECRET);
        req.patient = string.patient;
    } catch (error) {
        return res.status(401).send({ error: "Please authenticate using a valid token" });
    }
    next();
}

module.exports = fetchPatient;
