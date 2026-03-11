# Data Validation Rules

> Mongoose validators, custom validation, and data integrity enforcement in StayHaven

---

## 📋 Table of Contents

1. [Built-in Validators](#built-in-validators)
2. [Custom Validators](#custom-validators)
3. [Validation Error Handling](#validation-error-handling)
4. [Conditional Validation](#conditional-validation)
5. [Async Validation](#async-validation)

---

## ✅ Built-in Validators

### Required Validator

```javascript
// Basic required validation
const userSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: true // Simple boolean
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'] // Custom error message
  },
  
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: function() {
      // Conditional required
      return this.companyRole !== null;
    },
    message: 'Company is required for staff users'
  }
});
```

### String Validators

```javascript
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true, // Remove whitespace
    lowercase: true, // Convert to lowercase
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  
  fullname: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\S+@\S+\.\S+$/,
      'Please provide a valid email address'
    ]
  },
  
  phone: {
    type: String,
    match: [
      /^[\d\s\-\+\(\)]+$/,
      'Please provide a valid phone number'
    ]
  }
});
```

### Number Validators

```javascript
const roomSchema = new mongoose.Schema({
  pricePerNight: {
    type: Number,
    required: [true, 'Price per night is required'],
    min: [0, 'Price cannot be negative'],
    max: [1000000, 'Price cannot exceed 1,000,000']
  },
  
  capacity: {
    type: Number,
    required: true,
    min: [1, 'Capacity must be at least 1'],
    max: [20, 'Capacity cannot exceed 20']
  },
  
  discount: {
    type: Number,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%'],
    default: 0
  }
});
```

### Date Validators

```javascript
const bookingSchema = new mongoose.Schema({
  checkInDate: {
    type: Date,
    required: [true, 'Check-in date is required'],
    validate: {
      validator: function(value) {
        // Check-in must be in the future
        return value >= Date.now();
      },
      message: 'Check-in date must be in the future'
    }
  },
  
  checkOutDate: {
    type: Date,
    required: [true, 'Check-out date is required'],
    validate: {
      validator: function(value) {
        // Check-out must be after check-in
        return value > this.checkInDate;
      },
      message: 'Check-out date must be after check-in date'
    }
  }
});
```

### Enum Validators

```javascript
const userSchema = new mongoose.Schema({
  companyRole: {
    type: String,
    enum: {
      values: ['owner', 'admin', 'manager', 'chief', 'waiter', 'receptionist', 'housekeeping', 'maintenance'],
      message: '{VALUE} is not a valid company role'
    }
  },
  
  accountStatus: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'locked'],
    default: 'pending'
  }
});

const hotelSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'under_maintenance'],
      message: 'Status must be active, inactive, or under_maintenance'
    },
    default: 'active'
  }
});

const roomSchema = new mongoose.Schema({
  roomType: {
    type: String,
    required: true,
    enum: ['single', 'double', 'suite', 'deluxe', 'family', 'presidential']
  },
  
  status: {
    type: String,
    enum: ['available', 'booked', 'maintenance', 'out_of_service'],
    default: 'available'
  }
});
```

### Array Validators

```javascript
const menuItemSchema = new mongoose.Schema({
  images: {
    type: [String],
    validate: {
      validator: function(value) {
        return value.length <= 10;
      },
      message: 'Cannot upload more than 10 images'
    }
  },
  
  allergens: {
    type: [String],
    enum: ['nuts', 'dairy', 'gluten', 'eggs', 'soy', 'shellfish', 'fish']
  }
});

const orderSchema = new mongoose.Schema({
  items: {
    type: [{
      menuItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem',
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1'],
        max: [100, 'Quantity cannot exceed 100']
      },
      price: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative']
      }
    }],
    validate: {
      validator: function(value) {
        return value.length > 0;
      },
      message: 'Order must contain at least one item'
    }
  }
});
```

---

## 🔧 Custom Validators

### Email Validation

```javascript
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(value) {
        // More strict email regex
        return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
      },
      message: 'Please provide a valid email address'
    }
  }
});
```

### Phone Number Validation

```javascript
const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    validate: {
      validator: function(value) {
        // Optional field
        if (!value) return true;
        
        // Remove all non-digit characters
        const cleaned = value.replace(/\D/g, '');
        
        // Check if length is between 10 and 15 digits
        return cleaned.length >= 10 && cleaned.length <= 15;
      },
      message: 'Please provide a valid phone number (10-15 digits)'
    }
  }
});
```

### Password Strength Validation

```javascript
const userSchema = new mongoose.Schema({
  password: {
    type: String,
    required: function() {
      // Password required only for non-Google users
      return !this.isGoogleUser;
    },
    minlength: [6, 'Password must be at least 6 characters'],
    validate: {
      validator: function(value) {
        // Skip validation for Google users
        if (this.isGoogleUser) return true;
        
        // Password must contain:
        // - At least one uppercase letter
        // - At least one lowercase letter
        // - At least one digit
        // - At least one special character
        const hasUppercase = /[A-Z]/.test(value);
        const hasLowercase = /[a-z]/.test(value);
        const hasDigit = /\d/.test(value);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
        
        return hasUppercase && hasLowercase && hasDigit && hasSpecial;
      },
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character'
    }
  }
});
```

### Price Range Validation

```javascript
const roomSchema = new mongoose.Schema({
  pricePerNight: {
    type: Number,
    required: true,
    validate: {
      validator: function(value) {
        // Price must be between 500 and 50,000
        return value >= 500 && value <= 50000;
      },
      message: 'Price per night must be between 500 and 50,000'
    }
  },
  
  discount: {
    type: Number,
    default: 0,
    validate: {
      validator: function(value) {
        // Discount cannot be greater than base price
        if (value === 0) return true;
        return value < this.pricePerNight;
      },
      message: 'Discount cannot be greater than base price'
    }
  }
});
```

### Date Range Validation

```javascript
const bookingSchema = new mongoose.Schema({
  checkInDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        // Check-in must be at least 1 day from now
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        return value >= tomorrow;
      },
      message: 'Check-in date must be at least 1 day from now'
    }
  },
  
  checkOutDate: {
    type: Date,
    required: true,
    validate: [
      {
        validator: function(value) {
          // Check-out must be after check-in
          return value > this.checkInDate;
        },
        message: 'Check-out date must be after check-in date'
      },
      {
        validator: function(value) {
          // Booking duration cannot exceed 30 days
          const diffTime = Math.abs(value - this.checkInDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= 30;
        },
        message: 'Booking duration cannot exceed 30 days'
      }
    ]
  }
});
```

### Unique Combination Validation

```javascript
const roomSchema = new mongoose.Schema({
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  roomNumber: {
    type: String,
    required: true
  }
});

// Compound unique index
roomSchema.index({ hotel: 1, roomNumber: 1 }, { unique: true });

// Custom validation for uniqueness
roomSchema.pre('save', async function(next) {
  const duplicate = await this.constructor.findOne({
    hotel: this.hotel,
    roomNumber: this.roomNumber,
    _id: { $ne: this._id } // Exclude current document
  });
  
  if (duplicate) {
    throw new Error(`Room number ${this.roomNumber} already exists in this hotel`);
  }
  
  next();
});
```

---

## ❌ Validation Error Handling

### Controller Level Error Handling

```javascript
// authController.js - Register user
const registerUser = asyncHandler(async (req, res) => {
  try {
    const { fullname, username, email, password } = req.body;
    
    const user = await User.create({
      fullname,
      username,
      email,
      password
    });
    
    res.status(201).json({
      success: true,
      data: user
    });
    
  } catch (error) {
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }
    
    // Generic error
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});
```

### Global Error Handler

```javascript
// server.js - Error handling middleware
app.use((err, req, res, next) => {
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const value = err.keyValue[field];
    
    return res.status(400).json({
      success: false,
      message: `${field} '${value}' already exists`
    });
  }
  
  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`
    });
  }
  
  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server error'
  });
});
```

### Client-Side Error Display

```javascript
// React component - Display validation errors
const Register = () => {
  const [errors, setErrors] = useState([]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post('/api/auth/register', formData);
      
      if (response.data.success) {
        // Success
      }
      
    } catch (error) {
      if (error.response?.data?.errors) {
        // Display validation errors
        setErrors(error.response.data.errors);
      } else {
        setErrors([error.response?.data?.message || 'Registration failed']);
      }
    }
  };
  
  return (
    <div>
      {errors.length > 0 && (
        <div className="error-container">
          {errors.map((error, index) => (
            <p key={index} className="error-message">
              {typeof error === 'string' ? error : error.message}
            </p>
          ))}
        </div>
      )}
      {/* Form fields */}
    </div>
  );
};
```

---

## 🔀 Conditional Validation

### Password Required for Non-Google Users

```javascript
const userSchema = new mongoose.Schema({
  isGoogleUser: {
    type: Boolean,
    default: false
  },
  
  password: {
    type: String,
    required: function() {
      // Password required only if NOT a Google user
      return !this.isGoogleUser;
    },
    minlength: [6, 'Password must be at least 6 characters']
  },
  
  googleId: {
    type: String,
    required: function() {
      // Google ID required only if Google user
      return this.isGoogleUser;
    },
    unique: true,
    sparse: true // Allow null values for non-Google users
  }
});
```

### Company Required for Staff Users

```javascript
const userSchema = new mongoose.Schema({
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: function() {
      // Company required for staff roles
      const staffRoles = ['owner', 'admin', 'manager', 'chief', 'waiter', 'receptionist', 'housekeeping', 'maintenance'];
      return staffRoles.includes(this.companyRole);
    }
  },
  
  companyRole: {
    type: String,
    enum: ['owner', 'admin', 'manager', 'chief', 'waiter', 'receptionist', 'housekeeping', 'maintenance', null],
    default: null
  }
});
```

### Order Type Validation

```javascript
const orderSchema = new mongoose.Schema({
  orderType: {
    type: String,
    enum: ['room_service', 'restaurant', 'takeaway'],
    required: true
  },
  
  roomNumber: {
    type: String,
    required: function() {
      // Room number required only for room service
      return this.orderType === 'room_service';
    }
  },
  
  tableNumber: {
    type: Number,
    required: function() {
      // Table number required only for restaurant orders
      return this.orderType === 'restaurant';
    }
  }
});
```

---

## ⏳ Async Validation

### Check Username Availability

```javascript
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: async function(value) {
        // Skip validation if username hasn't changed
        if (!this.isModified('username')) return true;
        
        // Check if username exists
        const existingUser = await this.constructor.findOne({
          username: value,
          _id: { $ne: this._id }
        });
        
        return !existingUser;
      },
      message: 'Username is already taken'
    }
  }
});
```

### Check Email Availability

```javascript
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: async function(value) {
        // Skip validation if email hasn't changed
        if (!this.isModified('email')) return true;
        
        // Check if email exists
        const existingUser = await this.constructor.findOne({
          email: value,
          _id: { $ne: this._id }
        });
        
        return !existingUser;
      },
      message: 'Email is already registered'
    }
  }
});
```

### Check Room Availability

```javascript
const bookingSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
    validate: {
      validator: async function(value) {
        // Check if room is available for the selected dates
        const Room = mongoose.model('Room');
        const room = await Room.findById(value);
        
        if (!room) {
          throw new Error('Room not found');
        }
        
        if (room.status !== 'available') {
          throw new Error('Room is not available');
        }
        
        // Check for overlapping bookings
        const Booking = this.constructor;
        const overlappingBooking = await Booking.findOne({
          room: value,
          _id: { $ne: this._id },
          bookingStatus: { $nin: ['cancelled', 'completed'] },
          $or: [
            {
              checkInDate: { $lte: this.checkOutDate },
              checkOutDate: { $gte: this.checkInDate }
            }
          ]
        });
        
        return !overlappingBooking;
      },
      message: 'Room is not available for the selected dates'
    }
  }
});
```

---

## 📊 Validation Summary Table

| Validator Type | Use Case | Example |
|---|---|---|
| **required** | Mandatory fields | `required: [true, 'Email is required']` |
| **unique** | Prevent duplicates | `unique: true` |
| **enum** | Allowed values | `enum: ['active', 'inactive']` |
| **min/max** | Number/Date range | `min: [0, 'Price cannot be negative']` |
| **minlength/maxlength** | String length | `minlength: [6, 'Password too short']` |
| **match** | Regex pattern | `match: [/^\S+@\S+\.\S+$/, 'Invalid email']` |
| **trim** | Remove whitespace | `trim: true` |
| **lowercase/uppercase** | Case conversion | `lowercase: true` |
| **custom** | Custom logic | `validate: { validator: function(v) {...} }` |
| **async** | Database checks | `validate: { validator: async function(v) {...} }` |

---

## 📚 Related Documents

- [Collection Schema Definitions](./collection-schema-definitions.md)
- [Schema Relationships](./schema-relationships.md)
- [Database Overview](./database-overview.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive data validation documentation
