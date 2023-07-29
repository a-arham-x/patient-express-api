const jwt = require("jsonwebtoken");

const fetchDoctor = (req, res, next) => {
    const doctorToken = req.header("doctor-token");

    if (!doctorToken) {
        return res.json({ error: "Please authenticate using a valid token" });
    }

    try {
        const string = jwt.verify(doctorToken, process.env.JWT_SECRET);
        req.doctor = string.doctor;
    } catch (error) {
        return res.status(401).send({ error: "Please authenticate using a valid token" });
    }
    next();
}

module.exports = fetchDoctor;
