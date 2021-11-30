const express = require('express');
const router = express.Router();
const { validateToken } = require("../middlewares/validateToken");
const cleanBody = require('../middlewares/cleanbody');
const AuthController = require('../src/users/user.controller');

router.post("/signup", cleanBody, AuthController.Signup, (request, response) => {
    const signedUpuser = new signUpTemplateCopy({
        fullName: request.body.fullName,
        username: request.body.username,
        email: request.body.email,
        password: request.body.password
    })
    signedUpuser.save()
    .then(data => {
        response.json(data)
    })
    .catch(error => {
        response.json(error)
    })
});

router.patch("/activate", cleanBody, AuthController.Activate);

router.post("/login", cleanBody, AuthController.Login);

router.patch("/forgot", cleanBody, AuthController.ForgotPassword);

router.patch("/reset", cleanBody, AuthController.ResetPassword);

router.get("/referred", validateToken, AuthController.ReferredAccounts);

router.get("/logout", validateToken, AuthController.Logout);


module.exports = router; 