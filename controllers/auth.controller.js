import User from "../models/users.model.js";
import bcrypt from "bcryptjs";
import genToken from "../utils/token.js";
import { sendOtpMail } from "../utils/mail.js";
export const signup = async (req, res) => {
    try {
        const { fullName, email, password, mobile, role } = req.body;
        console.log("Signup request body:", fullName);
        let user = await User.findOne({ email });
        console.log("User lookup result:", user);
        if (user) {
            return res.status(400).json({ message: "User already exists" });
        }
        if (!fullName || !email || !password || !mobile || !role) {
            return res.status(400).json({ message: "All fields are required" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }
        if (mobile.length !== 10) {
            return res.status(400).json({ message: "Mobile number must be 10 digits" });
        }
        console.log("All validations passed");
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            fullName, email, password: hashedPassword, mobile, role
        });
        await newUser.save();
        const token = await genToken(newUser._id);
        res.cookie("token", token, {
            secure: false,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true
        });
        res.status(201).json({
            user: newUser
        });
    } catch (error) {
        return res.status(500).json({ message: "SignUp Error", error: error.message });

    }
}
export const signIn = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User doesn't exists" });
        }
        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        console.log("User found:", password);
        const checkPass = await bcrypt.compare(password, user.password);
        if (!checkPass) {
            return res.status(400).json({ message: "Invalid Password" });
        }

        const token = await genToken(user._id);
        res.cookie("token", token, {
            secure: false,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true
        });
        res.status(200).json({
            user,
            "message": "SignIn Success"
        });
    } catch (error) {
        return res.status(500).json({ message: "SignIn Error" });

    }
}
export const signOut = async (req, res) => {
    try {
        res.clearCookie("token");
        return res.status(200).json({ message: "SignOut Success" });
    } catch (error) {
        return res.status(500).json({ message: "SignOut Error" });
    }
}

export const sendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User doesn't exists" });
        }
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        user.resetOtp = otp;
        user.otpExpires = Date.now() + 10 * 60 * 1000;
        user.isOtpVerified = false;
        await user.save();
        await sendOtpMail(email, otp);
        return res.status(200).json({ message: "OTP sent to email" });

    } catch (error) {
        return res.status(500).json({ message: "Send OTP Error ", error: error.message });

    }
}

export const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User doesn't exists" });
        }
        if (user.resetOtp !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }
        if (user.otpExpires < Date.now()) {
            return res.status(400).json({ message: "OTP expired" });
        }
        user.isOtpVerified = true;
        user.resetOtp = undefined;
        user.otpExpires = undefined;
        await user.save();
        return res.status(200).json({ message: "OTP verified successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Verify OTP Error" });
    }
}
export const resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const user = await User.findOne({ email });
        if (!user || !user.isOtpVerified) {
            return res.status(400).json({ message: "User doesn't exists || otp verification reqired" });
        }
        user.password = await bcrypt.hash(newPassword, 10);
        user.isOtpVerified = false;
        await user.save();
        return res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Reset Password Error", error: error.message });
    }
}

export const googleAuth = async (req, res) => {
    try {
        const { fullName, email, role, mobile } = req.body;
        let user = await User.findOne({ email });
        if (!user) {
            console.log("Creating new user from Google Auth");
            user = await User.create({
                fullName,
                email,
                role,
                mobile
            });

        }

        const token = await genToken(user._id);
        res.cookie("token", token, {
            secure: false,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true
        });
        res.status(200).json({
            user,
            "message": "SignIn Success"
        });
    } catch (error) {
        return res.status(500).json({ message: "Google Auth Error", error: error.message });

    }
}