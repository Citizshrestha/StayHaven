# Database Schema — Collections / Tables

This file summarizes collections, fields, indexes, relationships, and validation rules.

## Users
- Fields: `_id`, `name`, `email` (unique), `passwordHash`, `phone`, `roleId`, `createdAt`
- Indexes: `{ email: 1 }` unique; `{ roleId: 1 }`
- Validation: `email` required, valid format; `passwordHash` required; `name` required; `phone` optional, normalized.

## Roles
- Fields: `_id`, `name` (unique), `permissions` (array or bitmask)
- Indexes: `{ name: 1 }` unique
- Validation: `name` required

## Hotels
- Fields: `_id`, `name`, `address`, `city`, `country`, `phone`, `ownerId`, `createdAt`
- Indexes: `{ city: 1 }`, `{ name: 1 }`
- Validation: `name`, `address` required

## Rooms
- Fields: `_id`, `hotelId`, `roomNumber`, `type`, `price`, `available`, `amenities`
- Indexes: `{ hotelId: 1, roomNumber: 1 }` unique per hotel; `{ hotelId:1, type:1 }`
- Validation: `hotelId` required, `roomNumber` required, `price >= 0`

## Bookings
- Fields: `_id`, `userId`, `roomId`, `hotelId`, `checkIn`, `checkOut`, `totalPrice`, `status` (reserved/checked-in/cancelled/completed), `createdAt`
- Indexes: `{ userId:1 }`, `{ roomId:1 }`, compound `{ hotelId:1, checkIn:1, checkOut:1 }`
- Validation: `checkIn < checkOut`, `totalPrice >= 0`, `status` in allowed set

## MenuItems
- Fields: `_id`, `hotelId`, `name`, `description`, `price`, `category`, `available`
- Indexes: `{ hotelId:1, category:1 }`
- Validation: `name`, `price >= 0`

## Orders
- Fields: `_id`, `bookingId` (nullable), `userId`, `hotelId`, `items` (array of {menuItemId, qty, price}), `totalAmount`, `status`, `createdAt`
- Indexes: `{ userId:1 }`, `{ hotelId:1 }`, `{ status:1 }`
- Validation: `items` non-empty, `totalAmount == sum(items.price*qty)` (application-enforced), `status` in allowed set

## Staff
- Fields: `_id`, `hotelId`, `userId`, `roleId`, `position`, `active`
- Indexes: `{ hotelId:1, roleId:1 }`
- Validation: `hotelId`, `userId` required

## Notifications
- Fields: `_id`, `userId`, `type`, `message`, `meta`, `read`, `createdAt`
- Indexes: `{ userId:1, read:1 }`, TTL index optional for ephemeral notifications
- Validation: `type` in known set, `message` required

---

## Relationships & Cardinality (summary)
- `Role 1..* -> User` (one role assigned to many users)
- `User 1..* -> Booking` (user can have many bookings)
- `Hotel 1..* -> Room` (hotel has many rooms)
- `Room 1..* -> Booking` (room can have multiple bookings over time)
- `Booking 0..1 -> Order` (booking may have orders)
- `Hotel 1..* -> MenuItem` (menu per hotel)
- `Hotel 1..* -> Staff` (staff work at a hotel)
- `User 1..* -> Notification` (user receives many notifications)

## Indexes & Optimization
- Use compound indexes for common query patterns (e.g., searching available rooms by `hotelId` + `type` + `available`).
- Use unique indexes to enforce business rules (email, roomNumber per hotel).
- Consider TTL for ephemeral notifications and audit logs.
- For heavy read paths (hotel listings), add indexes on `city`, `name`, and use projection to limit fields returned.
- Use aggregation pipelines for analytics (occupancy, revenue).

## Data Validation Rules (high level)
- Enforce referential integrity at application level for `*_id` references (or use DB transactions where supported).
- Validate date ranges (`checkIn < checkOut`) and no overlapping bookings for the same `roomId` within the same date range.
- Validate `totalAmount` on order creation against item prices to prevent tampering.
- Sanitize text fields to prevent injection in secondary systems (emails, notifications).
