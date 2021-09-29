const Joi = require('joi');
require('dotenv').config();
const {v4: uuid} = require('uuid');

const { sendEmail } = require('../users/helpers/mailers');
const User = require("../users/user.model")

// validate user schema 
const userSchema = Joi.object().keys({
    email: Joi.string().email({ minDomainSegments: 2 }),
    password: Joi.string().required().min(4),
    confirmPassword: Joi.string().valid(Joi.ref("password")).required(),
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
        const newUser = new User(result.value)
        await newUser.save();

        return res.status(200).json({
            success: true,
            message: "Registration Success✔️✔️✔️",
        });
    } catch (error) {
        console.log("Signup-error", error);
        return res.status(500).json({
            error: true,
            message: "Couldn't signup'"
        });
    }
};
exports.Login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (email || !password) {
            return res.status(400).json({ 
                error: true, 
                message: "Cannot authenticate user❗❗"
            });
        } 
        // 1.Check if account exists on DB
        const user = await User.findOne({ email: email, password: password});
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
        const isValid = await User.comparePasswords(password, user.password);
        if (!isValid) {
            return res.status(400).json({
                error: true, 
                message: "Invalid password❗❗"
            });
        }
        await user.save();
        // success
        return res.send({
            success: true,
            message: "User logged in successfully🔥🔥🔥",
            access_token: token, //send it to the client 
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