import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();
const transporter = nodemailer.createTransport({
    service: "Gmail",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
    },
});

export const sendOtpMail = async (to, otp) => {
    await transporter.sendMail({
        from: process.env.EMAIL,
        to: to,
        subject: "Reset Your Password ",
        html: `<p>Your OTP for password reset is ${otp}. It is valid for 10 minutes.</p>`,
    });
}
export const sendDeliveryOtpMail = async (user, otp) => {
    await transporter.sendMail({
        from: process.env.EMAIL,
        to: user.email,
        subject: "Delivery OTP ",
        html: `<p>Your OTP for delivery is ${otp}. It is valid for 10 minutes.</p>`,
    });
}