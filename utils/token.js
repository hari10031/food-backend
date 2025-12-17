import jwt from 'jsonwebtoken';

const genToken = async (userId) => {
    try {
        const token = await jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
        return token;
    } catch (error) {
        console.log("Error generating token:", error);
    }
}
export default genToken;