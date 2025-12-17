import mongoose from "mongoose"

const shopOrderItemSchema = new mongoose.Schema({
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
        required: true
    },
    name: String,
    price: Number,
    quantity: Number,


}, {
    timestamps: true
})
const shopOrderSchema = new mongoose.Schema({
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop"
    },

    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    subtotal: Number,
    shopOrderItems: [shopOrderItemSchema],
    status: {
        type: String,
        enum: ["pending", "preparing", "out of delivery", "delivered"],
        default: "pending"
    },
    assignment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DeliveryAssignment",
        default: null
    },
    assignedDeliveryBoy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",

    },
    deliveryOtp: {
        type: String,
        default: null

    },
    otpExpires: {
        type: Date,
        default: null

    },
    deliveredAt: {
        type: Date,
        default: null
    },
    earnings: {
        type: Number,
        default: 50
    },
    itemsRated: {
        type: Boolean,
        default: false
    },
    deliveryBoyRated: {
        type: Boolean,
        default: false
    }



}, {
    timestamps: true
})
const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        paymentMethod: {
            type: String,
            enum: ['cod', 'online'],
            required: true,
        },
        deliveryAddress: {
            text: String,
            latitude: Number,
            longitude: Number,
        },
        totalAmount: {
            type: Number,
        },
        couponCode: {
            type: String,
            default: null
        },
        discountAmount: {
            type: Number,
            default: 0
        },
        shopOrders: [
            shopOrderSchema
        ],
        payment: {
            type: Boolean,
            default: false

        },
        razorpayOrderId: {
            type: String,
            default: ""

        },
        razorpayPaymentId: {
            type: String,
            default: ""

        }

    }, {
    timestamps: true
}
)
const Order = mongoose.model("Order", orderSchema);
export default Order;