const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  firstname: String,
  lastname: String,
  password: String,
  createon: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
