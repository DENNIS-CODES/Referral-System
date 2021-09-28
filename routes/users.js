const express = require('express');
const router = express.router();

const cleanBody = require('..middlewares/cleanbody');
const AuthController = require('../src/users/user.controller');

router.post('users/signup', cleanBody, AuthController.Signup);
router.post('/login', cleanBody, AuthController.Login);
router.patch('/activate', cleanBody, AuthController.Activate);
module.exports = router; 