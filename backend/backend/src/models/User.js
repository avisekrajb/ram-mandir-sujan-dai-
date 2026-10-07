const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: function() {
      // Only required for non-Google users
      return !this.googleId;
    },
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: function() {
      // Only required for non-Google users
      return !this.googleId;
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  address: {
    type: String,
    trim: true,
    default: '',
  },
  profilePhoto: {
    type: String,
    default: null,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true, // This is the key fix - allows multiple null values
    index: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user',
  },
  active: {
    type: Boolean,
    default: true,
  },
  isGoogleUser: {
    type: Boolean,
    default: false,
  },
  // True once the person has proven they control this e-mail address (signed in with Google or with
  // an e-mailed code, or used a reset code/link). Sign-up with a password alone proves nothing, so
  // until then a later Google / e-mail-code sign-in replaces any password set at sign-up
  // (see authController.googleLogin and loginCodeController).
  emailVerified: { type: Boolean, default: false },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  // Failed OTP guesses against the current code; the code is voided after 5.
  resetOtpAttempts: { type: Number, default: 0 },

  // ---- Account management ----
  // Admin panel areas an admin may use (see middleware/permissions.js).
  // `undefined` = unrestricted, which is what every admin created before this
  // field existed has; an array (even an empty one) restricts the admin to it.
  permissions: { type: [String], default: undefined },
  // Why an account was suspended (shown to admins, never to the user).
  suspendedReason: { type: String, default: '', trim: true, maxlength: 300 },
  suspendedAt: { type: Date, default: null },
  /*
   * When a timed suspension runs out. While this date is still in the future the
   * account can sign in but is held to the home page (see middleware/restricted.js);
   * once it passes the suspension lifts on its own. Null means "no end time", which
   * is the older behaviour: the account cannot sign in at all until an admin
   * reactivates it.
   */
  suspendedUntil: { type: Date, default: null },
  // Sign-in tracking, written by recordLogin() in authController.
  lastLoginAt: { type: Date, default: null },
  lastLoginIp: { type: String, default: '' },
  loginCount: { type: Number, default: 0 },
  // Tokens issued before this moment are rejected (see middleware/auth.js).
  // Set by revokeSessions(): password resets, "sign out everywhere".
  tokensValidAfter: { type: Date, default: null },
  // Set when a super admin issues a temporary password; cleared as soon as the
  // account chooses its own (any non-new save that modifies `password`).
  mustChangePassword: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Hash password before saving (only if password is modified and not a Google user)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  if (this.googleId && !this.password) return next();
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 12);
    // Choosing a new password satisfies a "must change password" flag, unless
    // the caller is the one issuing the temporary password.
    if (!this.isNew && !this.$locals.keepMustChangePassword) {
      this.mustChangePassword = false;
    }
  }
  next();
});

// Invalidate every session issued so far (the caller still has to save()).
// JWT `iat` has second resolution, so the cut-off is a whole second:
//  - default (rounded down): a token issued right after this call survives. Used
//    when the person doing it is the account holder and gets a fresh token back
//    (password change, "sign out other devices").
//  - strict (rounded up): every token issued up to now is revoked, including one
//    issued earlier in this same second. Used when someone else revokes the
//    account (suspend, reset, role change); their next sign-in is a second later.
userSchema.methods.revokeSessions = function(strict = false) {
  const round = strict ? Math.ceil : Math.floor;
  this.tokensValidAfter = new Date(round(Date.now() / 1000) * 1000);
};

// Never serialise secrets or internal bookkeeping into API responses.
userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.password;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpire;
    delete ret.resetOtpAttempts;
    delete ret.tokensValidAfter;
    // The address is personal data: only accountController (super admin) and the
    // owner's own /admin/profile "security" block expose it, never the generic JSON.
    delete ret.lastLoginIp;
    delete ret.__v;
    // Admins always carry `permissions` (null = unrestricted) so a client that
    // merges this into an older copy of the user also drops a lifted restriction.
    if (ret.role === 'admin') {
      if (!Array.isArray(ret.permissions)) ret.permissions = null;
    } else {
      delete ret.permissions;
    }
    return ret;
  },
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if email exists (static method)
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Check if Google user exists
userSchema.statics.findByGoogleId = function(googleId) {
  return this.findOne({ googleId });
};

// Create or update Google user
userSchema.statics.findOrCreateGoogleUser = async function(profile) {
  let user = await this.findOne({ googleId: profile.id });
  
  if (!user) {
    // Check if email already exists
    const existingUser = await this.findOne({ email: profile.emails[0].value });
    
    if (existingUser) {
      // Link Google account to existing user
      existingUser.googleId = profile.id;
      existingUser.isGoogleUser = true;
      if (!existingUser.profilePhoto) {
        existingUser.profilePhoto = profile.photos?.[0]?.value || null;
      }
      await existingUser.save();
      return existingUser;
    }
    
    // Create new Google user
    user = new this({
      googleId: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName || profile.name?.givenName || 'Google User',
      isGoogleUser: true,
      profilePhoto: profile.photos?.[0]?.value || null,
      // Don't set password for Google users
    });
    
    await user.save();
  }
  
  return user;
};

// Handle duplicate key errors gracefully
userSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    // Duplicate key error
    const field = Object.keys(error.keyPattern)[0];
    next(new Error(`Duplicate ${field}. Please use a different ${field}.`));
  } else {
    next(error);
  }
});

module.exports = mongoose.model('User', userSchema);