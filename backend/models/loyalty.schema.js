import mongoose from 'mongoose';

const loyaltySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    tier: {
      type: String,
      enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
      default: 'Bronze',
      index: true
    },
    points: {
      type: Number,
      default: 0,
      min: 0,
      index: true
    },
    lifetimePoints: {
      type: Number,
      default: 0,
      min: 0
    },
    tierProgress: {
      currentPoints: {
        type: Number,
        default: 0,
        min: 0
      },
      pointsToNextTier: {
        type: Number,
        default: 500
      },
      nextTier: {
        type: String,
        enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', null],
        default: 'Silver'
      }
    },
    benefits: {
      earlyCheckIn: {
        type: Boolean,
        default: false
      },
      lateCheckOut: {
        type: Boolean,
        default: false
      },
      freeBreakfast: {
        type: Boolean,
        default: false
      },
      roomUpgrade: {
        type: Boolean,
        default: false
      },
      prioritySupport: {
        type: Boolean,
        default: false
      },
      extraDiscountPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 50
      },
      pointsMultiplier: {
        type: Number,
        default: 1,
        min: 1,
        max: 5
      }
    },
    statistics: {
      totalBookings: {
        type: Number,
        default: 0,
        min: 0
      },
      totalSpent: {
        type: Number,
        default: 0,
        min: 0
      },
      pointsEarned: {
        type: Number,
        default: 0,
        min: 0
      },
      pointsRedeemed: {
        type: Number,
        default: 0,
        min: 0
      },
      lastBookingDate: {
        type: Date,
        default: null
      },
      averageBookingValue: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    pointsHistory: [
      {
        type: {
          type: String,
          enum: ['earned', 'redeemed', 'expired', 'bonus', 'adjustment', 'refund'],
          required: true
        },
        points: {
          type: Number,
          required: true
        },
        description: {
          type: String,
          required: true
        },
        reference: {
          model: {
            type: String,
            enum: ['Booking', 'Order', 'Review', 'Transaction', 'Coupon']
          },
          id: {
            type: mongoose.Schema.Types.ObjectId
          }
        },
        balanceBefore: {
          type: Number,
          required: true
        },
        balanceAfter: {
          type: Number,
          required: true
        },
        expiresAt: {
          type: Date,
          default: null
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    rewards: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reward'
      }
    ],
    tierAchievements: [
      {
        tier: {
          type: String,
          enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
          required: true
        },
        achievedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    expiringPoints: {
      amount: {
        type: Number,
        default: 0
      },
      expiresAt: {
        type: Date,
        default: null
      }
    },
    memberSince: {
      type: Date,
      default: Date.now
    },
    lastActivityDate: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    notes: {
      type: String,
      maxlength: 500
    }
  },
  {
    timestamps: true
  }
);

// Tier thresholds
const TIER_THRESHOLDS = {
  Bronze: 0,
  Silver: 500,
  Gold: 2000,
  Platinum: 5000,
  Diamond: 10000
};

// Points expiration period (12 months)
const POINTS_EXPIRATION_MONTHS = 12;

// Indexes
loyaltySchema.index({ tier: 1, points: -1 });
loyaltySchema.index({ 'statistics.totalBookings': -1 });
loyaltySchema.index({ 'statistics.totalSpent': -1 });
loyaltySchema.index({ lastActivityDate: 1 });
loyaltySchema.index({ 'expiringPoints.expiresAt': 1 });

// Virtual for tier benefits
loyaltySchema.virtual('tierName').get(function () {
  return this.tier;
});

// Pre-save middleware to update tier and benefits
loyaltySchema.pre('save', function (next) {
  if (this.isModified('lifetimePoints')) {
    this.updateTier();
  }
  next();
});

// Method to add points
loyaltySchema.methods.addPoints = function (points, description, reference = null) {
  const balanceBefore = this.points;
  const earnedPoints = Math.round(points * this.benefits.pointsMultiplier);
  
  this.points += earnedPoints;
  this.lifetimePoints += earnedPoints;
  this.statistics.pointsEarned += earnedPoints;
  this.lastActivityDate = new Date();

  // Calculate expiration date
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + POINTS_EXPIRATION_MONTHS);

  // Add to history
  this.pointsHistory.push({
    type: 'earned',
    points: earnedPoints,
    description,
    reference,
    balanceBefore,
    balanceAfter: this.points,
    expiresAt
  });

  return earnedPoints;
};

// Method to redeem points
loyaltySchema.methods.redeemPoints = function (points, description, reference = null) {
  if (this.points < points) {
    throw new Error('Insufficient points balance');
  }

  const balanceBefore = this.points;
  this.points -= points;
  this.statistics.pointsRedeemed += points;
  this.lastActivityDate = new Date();

  this.pointsHistory.push({
    type: 'redeemed',
    points: -points,
    description,
    reference,
    balanceBefore,
    balanceAfter: this.points
  });

  return this.points;
};

// Method to add bonus points
loyaltySchema.methods.addBonusPoints = function (points, description) {
  const balanceBefore = this.points;
  this.points += points;
  this.lifetimePoints += points;
  this.lastActivityDate = new Date();

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + POINTS_EXPIRATION_MONTHS);

  this.pointsHistory.push({
    type: 'bonus',
    points,
    description,
    balanceBefore,
    balanceAfter: this.points,
    expiresAt
  });

  return points;
};

// Method to update tier based on lifetime points
loyaltySchema.methods.updateTier = function () {
  const oldTier = this.tier;
  let newTier = 'Bronze';

  if (this.lifetimePoints >= TIER_THRESHOLDS.Diamond) {
    newTier = 'Diamond';
  } else if (this.lifetimePoints >= TIER_THRESHOLDS.Platinum) {
    newTier = 'Platinum';
  } else if (this.lifetimePoints >= TIER_THRESHOLDS.Gold) {
    newTier = 'Gold';
  } else if (this.lifetimePoints >= TIER_THRESHOLDS.Silver) {
    newTier = 'Silver';
  }

  if (oldTier !== newTier) {
    this.tier = newTier;
    this.tierAchievements.push({
      tier: newTier,
      achievedAt: new Date()
    });
    this.updateBenefits();
  }

  // Update tier progress
  this.updateTierProgress();
};

// Method to update tier progress
loyaltySchema.methods.updateTierProgress = function () {
  const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
  const currentIndex = tiers.indexOf(this.tier);

  if (currentIndex === tiers.length - 1) {
    // Already at max tier
    this.tierProgress.nextTier = null;
    this.tierProgress.pointsToNextTier = 0;
    this.tierProgress.currentPoints = 0;
  } else {
    const nextTier = tiers[currentIndex + 1];
    const currentThreshold = TIER_THRESHOLDS[this.tier];
    const nextThreshold = TIER_THRESHOLDS[nextTier];

    this.tierProgress.nextTier = nextTier;
    this.tierProgress.currentPoints = this.lifetimePoints - currentThreshold;
    this.tierProgress.pointsToNextTier = nextThreshold - this.lifetimePoints;
  }
};

// Method to update benefits based on tier
loyaltySchema.methods.updateBenefits = function () {
  switch (this.tier) {
    case 'Bronze':
      this.benefits = {
        earlyCheckIn: false,
        lateCheckOut: false,
        freeBreakfast: false,
        roomUpgrade: false,
        prioritySupport: false,
        extraDiscountPercentage: 0,
        pointsMultiplier: 1
      };
      break;
    case 'Silver':
      this.benefits = {
        earlyCheckIn: true,
        lateCheckOut: false,
        freeBreakfast: false,
        roomUpgrade: false,
        prioritySupport: false,
        extraDiscountPercentage: 5,
        pointsMultiplier: 1.2
      };
      break;
    case 'Gold':
      this.benefits = {
        earlyCheckIn: true,
        lateCheckOut: true,
        freeBreakfast: true,
        roomUpgrade: false,
        prioritySupport: true,
        extraDiscountPercentage: 10,
        pointsMultiplier: 1.5
      };
      break;
    case 'Platinum':
      this.benefits = {
        earlyCheckIn: true,
        lateCheckOut: true,
        freeBreakfast: true,
        roomUpgrade: true,
        prioritySupport: true,
        extraDiscountPercentage: 15,
        pointsMultiplier: 2
      };
      break;
    case 'Diamond':
      this.benefits = {
        earlyCheckIn: true,
        lateCheckOut: true,
        freeBreakfast: true,
        roomUpgrade: true,
        prioritySupport: true,
        extraDiscountPercentage: 20,
        pointsMultiplier: 2.5
      };
      break;
  }
};

// Method to record booking
loyaltySchema.methods.recordBooking = function (bookingAmount, bookingId) {
  this.statistics.totalBookings += 1;
  this.statistics.totalSpent += bookingAmount;
  this.statistics.lastBookingDate = new Date();
  this.statistics.averageBookingValue = 
    this.statistics.totalSpent / this.statistics.totalBookings;

  // Calculate points earned (1 point per currency unit spent)
  const pointsEarned = this.addPoints(
    Math.floor(bookingAmount),
    `Points earned from booking`,
    {
      model: 'Booking',
      id: bookingId
    }
  );

  return pointsEarned;
};

// Method to expire points
loyaltySchema.methods.expirePoints = async function () {
  const now = new Date();
  let totalExpired = 0;

  // Find expired points
  const expiredEntries = this.pointsHistory.filter(
    entry => 
      entry.type === 'earned' && 
      entry.expiresAt && 
      entry.expiresAt <= now &&
      entry.points > 0
  );

  expiredEntries.forEach(entry => {
    const pointsToExpire = entry.points;
    if (this.points >= pointsToExpire) {
      const balanceBefore = this.points;
      this.points -= pointsToExpire;
      totalExpired += pointsToExpire;

      this.pointsHistory.push({
        type: 'expired',
        points: -pointsToExpire,
        description: 'Points expired after 12 months',
        balanceBefore,
        balanceAfter: this.points
      });

      // Mark as expired
      entry.points = 0;
    }
  });

  if (totalExpired > 0) {
    this.lastActivityDate = new Date();
  }

  // Update expiring points info
  this.updateExpiringPoints();

  return totalExpired;
};

// Method to update expiring points
loyaltySchema.methods.updateExpiringPoints = function () {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const expiringEntries = this.pointsHistory.filter(
    entry => 
      entry.type === 'earned' && 
      entry.expiresAt && 
      entry.expiresAt > now &&
      entry.expiresAt <= thirtyDaysFromNow &&
      entry.points > 0
  );

  if (expiringEntries.length > 0) {
    const totalExpiringPoints = expiringEntries.reduce(
      (sum, entry) => sum + entry.points, 
      0
    );
    const earliestExpiration = expiringEntries.reduce(
      (earliest, entry) => 
        !earliest || entry.expiresAt < earliest ? entry.expiresAt : earliest,
      null
    );

    this.expiringPoints = {
      amount: totalExpiringPoints,
      expiresAt: earliestExpiration
    };
  } else {
    this.expiringPoints = {
      amount: 0,
      expiresAt: null
    };
  }
};

// Method to get points value in currency
loyaltySchema.methods.getPointsValue = function (points = null) {
  const pointsToConvert = points || this.points;
  // Conversion rate: 100 points = 1 currency unit
  return pointsToConvert / 100;
};

// Method to calculate points needed for amount
loyaltySchema.methods.getPointsForAmount = function (amount) {
  // 100 points = 1 currency unit
  return Math.ceil(amount * 100);
};

// Static method to get tier requirements
loyaltySchema.statics.getTierRequirements = function () {
  return TIER_THRESHOLDS;
};

// Static method to find users by tier
loyaltySchema.statics.findByTier = function (tier) {
  return this.find({ tier, isActive: true }).populate('user', 'name email');
};

// Static method to get top loyalty members
loyaltySchema.statics.getTopMembers = function (limit = 10) {
  return this.find({ isActive: true })
    .sort({ lifetimePoints: -1 })
    .limit(limit)
    .populate('user', 'name email');
};

export const Loyalty = mongoose.model('Loyalty', loyaltySchema);

