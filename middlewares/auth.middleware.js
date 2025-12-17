import jwt from 'jsonwebtoken';
const isAuth = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const decodeToken = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decodeToken.id;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expired" });
        }
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ message: "Invalid token" });
        }
        return res.status(500).json({ message: "Auth middleware Error" });
    }
}
export default isAuth;