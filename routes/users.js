const express = require('express');
const router = express.Router();

const cleanBody = require('../middlewares/cleanbody');
const AuthController = require('../src/users/user.controller');

router.post('/signup', cleanBody, AuthController.Signup);
router.post('/login', cleanBody, AuthController.Login);
router.patch('/activate', cleanBody, AuthController.Activate);
router.patch('/forgot', cleanBody, AuthController.ForgotPassword);
router.patch('/reset', cleanBody, AuthController.ResetPassword);
module.exports = router; 