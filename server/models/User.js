
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
    
verificationTokenHash: {
  type: String,
  default: undefined,
},
verificationTokenExpires: {
  type: Date,
  default: undefined,
},
realName: {
  type: String,
  trim: true,
  maxlength: 80,
},

year: {
  type: String,
  enum: ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'],
},

branch: {
  type: String,
  trim: true,
  maxlength: 100,
},

bio: {
  type: String,
  trim: true,
  maxlength: 160,
  default: '',
},
gender:{
  type: String,
  enum: ['Male', 'Female', 'Other']
},
partnerPreference: {
      type: String,
      enum: ['Male', 'Female', 'Other', 'Any'],
      default: 'Any',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
