import { Router } from "express";
import { signIn, signOut, signup, sendOtp, verifyOtp, resetPassword, googleAuth } from "../controllers/auth.controller.js";

const Authrouter = Router();

Authrouter.post('/signup', signup);
Authrouter.post('/signin', signIn);
Authrouter.get('/signout', signOut);
Authrouter.post('/send-otp', sendOtp);
Authrouter.post('/verify-otp', verifyOtp);
Authrouter.post('/reset-password', resetPassword);
Authrouter.post('/google-auth', googleAuth);

export default Authrouter;