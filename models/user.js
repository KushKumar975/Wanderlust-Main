const mongoose = require("mongoose");
const { Schema } = mongoose;
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
    },
    googleId: {
        type: String,
    },
});

userSchema.plugin(passportLocalMongoose, {
    usernameField: "email",   // makes email the unique login key instead
});

module.exports = mongoose.model('User', userSchema);