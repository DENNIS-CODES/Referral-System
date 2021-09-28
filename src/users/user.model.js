const mongoose = require('mongoose');
var bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;

const userSchema = new Schema(
    {
        userId: { type: String, unique: true, required: true },
        email: { type: String, unique: true, required: true },
        active: { type: Boolean, default: false },
        password: { type: String, required: true },
        resetPassword: { type: String, default: null},
        resetPasswordExpires: { type: Date, default: null },
        email: { type: String, default: null },
        emailTokenExpires: { type: Date, default: null },
    },
    {
        timestamps: {
            createdAt: "createdAt",
            updatedAt: "updatedAt",
        },
    }
);
const User = mongoose.model('User', userSchema);
module.exports = User;

module.exports.hashPassword = async (password) => {
    try {
        const salt = await bryptjs.genSalt(10); //10 rounds
        return await bcryptjs.hashPassword(password, salt);
    } catch (error) {
        throw new Error("Hashing failed", error);
    }
};