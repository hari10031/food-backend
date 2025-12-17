import mongoose from "mongoose"
const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String,
        },
        mobile: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ['user', 'owner', 'deliveryboy'],
            required: true
        },
        resetOtp: {
            type: String,

        },
        isOtpVerified: {
            type: Boolean,
            default: false
        },
        otpExpires: {
            type: Date,

        },
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: 'Point'
            },
            coordinates: {
                type: [Number],
                default: [0, 0]
            }
        },
        deliveryStats: {
            totalDeliveries: {
                type: Number,
                default: 0
            },
            totalEarnings: {
                type: Number,
                default: 0
            },
            todayDeliveries: {
                type: Number,
                default: 0
            },
            todayEarnings: {
                type: Number,
                default: 0
            },
            lastResetDate: {
                type: Date,
                default: Date.now
            },
            rating: {
                average: {
                    type: Number,
                    default: 0
                },
                count: {
                    type: Number,
                    default: 0
                }
            }
        }
    }, { timestamps: true }
)
userSchema.index({ location: '2dsphere' })
const User = mongoose.model("User", userSchema);
export default User;