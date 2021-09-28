var mongoose = require('mongoose')
var UserSchema = new mongoose.Shema({
    accessToken: { type: String, default: null }
});

export default UserSchema;