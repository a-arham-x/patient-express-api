const jwt = require("jsonwebtoken");

const fetchAdmin = (req, res, next) => {
    const adminToken = req.header("admin-token");

    if (!adminToken) {
        return res.json({ error: "Please authenticate using a valid token" });
    }

    try {
        const string = jwt.verify(adminToken, process.env.JWT_SECRET);
        req.admin = string.admin;
    } catch (error) {
        return res.status(401).send({ error: "Please authenticate using a valid token" });
    }
    next();
}

module.exports = fetchAdmin;
