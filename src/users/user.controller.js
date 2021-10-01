const Joi = require('joi');
require('dotenv').config();
const {v4: uuid} = require('uuid');
const { customAlphabet: generate } = require("nanoid");

const { generateJwt } = require('./helpers/generateJwt')
const { sendEmail } = require('../users/helpers/mailers');
const User = require("../users/user.model")

const CHARACTER_SET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const REFERRAL_CODE_LENGTH = 8;
const referralCode = generate(CHARACTER_SET, REFERRAL_CODE_LENGTH);
// validate user schema 
const userSchema = Joi.object().keys({
    email: Joi.string().email({ minDomainSegments: 2 }),
    password: Joi.string().required().min(4),
    confirmPassword: Joi.string().valid(Joi.ref("password")).required(),
    referrer: Joi.string(),
  });
exports.Signup = async (req, res) => {
    try {
        const result = userSchema.validate(req.body);
        if (result.error) {
            console.log(result.error.message);
            return res.json({ 
                error: true,
                status: 400,
                message: result.error.message,
            });
        }
        //Check if email is already registered
        var user = await User.findOne({ 
            email: result.value.email,
        });
        if (user) {
            return res.json({ 
                error: true,
                message: "Email already registered"
            });
        }

        const hash = await User.hashPassword(result.value.password);
        const id = uuid(); //Generate unique id for the user
        result.value.userId = id;

        //remove the cconfirmedPassword field from the result as we dont need to save this in the db.
        delete result.value.confirmPassword;
        result.value.password = hash;

        let code = Math.floor(100000 + Math.random() * 900000); //Generate random 6 digit code
        let expiry = Date.now() + 60 * 1000 * 15; //set expiry to 15min ahead from now

        const sendCode = await sendEmail(result.value.email, code);
        if (sendCode.error) {
            return res.status(500).json({
                error: true,
                message: "⭕Couldn't send verification email⭕",
            });
        }
        result.value.emailToken = code;
        result.value.emailTokenExpires = new Date(expiry);
        // Check if referred and validate sendCode
        if (result.value.hasOwnProperty("referrer")) {
            let referrer = await User.findOne({
                referralCode: result.value.referrer,
            });
        
        if (!referrer) {
            return res.status(400).send({
                error: true,
                message: "invalid referral code.",
            });
        }
    }
    result.value.referralCode = referralCode(); //Generate referral code for the new user
        const newUser = new User(result.value)
        await newUser.save();

        return res.status(200).json({
            success: true,
            message: "Registration Success✔️✔️✔️",
            referralCode: result.value.referralCode,
        });
    } catch (error) {
        console.log("Signup-error", error);
        return res.status(500).json({
            error: true,
            message: "Couldn't signup"
        });
    }
};
exports.Login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ 
                error: true, 
                message: "Cannot authenticate user❗❗"
            });
        } 
        // 1.Check if account exists on DB
        const user = await User.findOne({ email: email });
        //Not found Throw an Error
        if (!user) {
            return res.status(404).json({ 
                error:true, 
                message: "Account not found" 
            });
        }
        // 2.Trow error if user is not activated
        if (!user.active) {
            return res.status(400).json({
                error: true,
                message: "You must verify your email to activate your account"
            });
        }
        //  3. Verify the password is valid
        const isValid = await User.comparePassword(password, user.password);
        if (!isValid) {
            return res.status(400).json({
                error: true, 
                message: "Invalid password❗❗"
            });
        }
        // Generating Access Token
        const { error, token } = await generateJwt(user.email, user.userId);
        if (error) {
            return res.status(500).json({
                error: true,
                message:"Couldn't create access token. Please try again later"
            });
        }
        user.accessToken = token;

        await user.save();
        // success
        return res.send({
            success: true,
            message: "User logged in successfully🔥🔥🔥",
            accessToken: token, 
        });
    } catch (err) {
        console.error("Login Error", err);
        return res.status(500).json({
            error: true,
            message: "invalid login. please try again later❌❌."
        });
    }
};

// Activating Login Request
exports.Activate = async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code ) {
            return res.json({
                error: true,
                status: 400,
                message: "Please make a Valid request❗❗",
            });
        }
        const user = await User.findOne({ 
            email: email,
            emailToken: code,
            emailTokenExpiries: { $gt: Date.now() }, //check if the code is expired
        });
        if (!user) {
            return res.status(400).json({
                error: true,
                message: 'Invalid user details❎❎'
            });
        } else if (user.active)
        return res.send({
            error: true,
            message: '🟢Account already activated✔️✔️',
            status: '400',
        });

        user.emailToken = "";
        user.emailToken = null;
        user.active = true;

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Account activated☑️☑️',
        });
    } catch (error) {
        console.log("Activation error", error);
        return res.status(500).json({
            error: true,
            message: error.message,
        });
    }
};

exports.ForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.send({
                status: 400,
                error: true,
                message: "Cannot be processed"
            });
        }
        const user = await User.findOne({
            email: email,
        });
        if (!user) {
            return res.send({
                success: true,
                message: "if email in Db send reset password message "
            });
        }
        let code = Math.floor(100000 + Math.random() * 900000);
        let response = await sendEmail(user.email, code);

        if (response.error) {
            return res.status(500).json({ 
                error: true,
                message: "could not send mail, Please try again later.",
            });
        }

        let expiry = Date.now() + 60 * 1000 * 15;
        user.resetPasswordToken = code;
        user.resetPasswordExpires = expiry; //15 minutes

        await user.save();
        return res.send({
            success: true,
            message: "if email is db will send an email to reset password",
        });
    } catch (error) {
        console.error("forgot-password-error", error);
        return res.status(500).json({
            error: true,
            message: error.message,
        });
    }
};

exports.ResetPassword = async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;
        if (!token || !newPassword || !confirmPassword) {
            return res.status(403).json({
                error: true,
                message: "Couldn't process request. please provide the mandatory fields↩️"
            });
        }

        const user = await User.findOne({
            resetPasswordToken: req.body.token,
            resetPasswordExpires: { $gt: Date.now() },
        });
        if (!user) {
            return res.send({
                error: true,
                message: "Password reset token is invalid or has expired"
            });
        }
        if (newPassword !== confirmPassword) {
            return res.send(403).json({
                error: true,
                message: "Passwords didn't match⛔"
            });
        }
        const hash = await User.hashPassword(req.body, newPassword);
        user.password = hash;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = "";

        await user.save();

        return res.send({
            success: true,
            message: "Password has been Changed successfully✔️✔️"
        })
    } catch (error) {
        console.error("reset-password-error", error);
        return res.status(500).json({
            error: true,
            message: error.message,
        });
    }
};

exports.ReferredAccounts = async (req, res) => {
    try {
        const { id, referralCode } = req.decode;

        const referredAccounts = await User.find(
            { referrer: referralCode },
            { email: 1, referralCode: 1, _id: 0 }
        );
        return res.send({
            success: true,
            accounts: referredAccounts,
            total: referredAccounts.length,
        });
    } catch (error) {
        console.error("fetch-referred-error", error);
        return res.stat(500).json({
            error: true,
            message: error.message,
        });
    }
};

exports.Logout = async (req, res) => {
    try {
        const { id } = req.decoded;
        let user = await User.findOne({ userId: id });
        user.accessToken = "";
        await user.save();
        return res.send({
            success: true,
            message: "User Logged out successfully",
        });
    } catch (error) {
        console.error("user-logout-error", error);
        return res.sat(500).json({
            error: true,

            message: error.message,
        });
    }
};