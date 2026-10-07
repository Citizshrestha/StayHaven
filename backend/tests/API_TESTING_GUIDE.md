# QR Code API Testing Guide

## Base URL
```
http://localhost:3000/api
```

## Prerequisites
- MongoDB running
- Backend server running (`node server.js`)
- Valid JWT token for authenticated routes

---

## 1. TABLE MANAGEMENT (Authenticated Routes)

### Create a Table
```bash
POST /api/tables
Authorization: Bearer {token}
Content-Type: application/json

{
  "hotelId": "YOUR_HOTEL_ID",
  "tableNumber": "T-01",
  "tableName": "Table 1",
  "capacity": 4,
  "location": "indoor",
  "description": "Near window"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Table created successfully with QR code",
  "table": {
    "_id": "...",
    "tableNumber": "T-01",
    "uniqueToken": "TBL-ABCDEF1234567890",
    "qrCodeData": "http://localhost:5173/guest/table/TBL-ABCDEF1234567890",
    "qrCodeImage": "data:image/png;base64,iVBORw0KGgo..."
  }
}
```

### Get All Tables for a Hotel
```bash
GET /api/tables?hotelId=YOUR_HOTEL_ID
Authorization: Bearer {token}
```

### Batch Create Tables
```bash
POST /api/tables/batch
Authorization: Bearer {token}
Content-Type: application/json

{
  "hotelId": "YOUR_HOTEL_ID",
  "startNumber": 1,
  "endNumber": 10,
  "prefix": "T-",
  "capacity": 4,
  "location": "indoor"
}
```

### Generate/Regenerate QR Code
```bash
POST /api/tables/:tableId/generate-qr
Authorization: Bearer {token}
Content-Type: application/json

{
  "regenerate": true  // Optional: creates new token (old QR becomes invalid)
}
```

### Download QR Code
```bash
GET /api/tables/:tableId/qr-download
Authorization: Bearer {token}
```

---

## 2. ROOM QR MANAGEMENT (Authenticated Routes)

### Get All Rooms for a Hotel
```bash
GET /api/rooms?hotelId=YOUR_HOTEL_ID
Authorization: Bearer {token}
```

### Generate Room QR Code
```bash
POST /api/rooms/:roomId/generate-qr
Authorization: Bearer {token}
Content-Type: application/json

{
  "regenerate": false
}
```

### Batch Generate QR for All Rooms
```bash
POST /api/rooms/batch-generate-qr
Authorization: Bearer {token}
Content-Type: application/json

{
  "hotelId": "YOUR_HOTEL_ID",
  "regenerate": false
}
```

### Get All Room QR Codes for Hotel
```bash
GET /api/rooms/qr-codes/YOUR_HOTEL_ID
Authorization: Bearer {token}
```

---

## 3. GUEST ENDPOINTS (Public - No Auth Required)

### Validate Table QR Token
```bash
GET /api/guest/table/TBL-ABCDEF1234567890
```

**Response:**
```json
{
  "success": true,
  "message": "Table verified successfully",
  "data": {
    "table": {
      "_id": "...",
      "tableNumber": "T-01",
      "capacity": 4,
      "status": "available"
    },
    "hotel": {
      "_id": "...",
      "name": "Hotel Name",
      "location": { ... }
    },
    "orderType": "dineIn"
  }
}
```

### Validate Room QR Token
```bash
GET /api/guest/room/RM-ABCDEF1234567890
```

### Get Menu (After QR Scan)
```bash
GET /api/guest/menu/YOUR_HOTEL_ID
```

### Place Guest Order
```bash
POST /api/guest/order
Content-Type: application/json

{
  "hotelId": "YOUR_HOTEL_ID",
  "tableToken": "TBL-ABCDEF1234567890",
  "orderType": "dineIn",
  "customerName": "John Doe",
  "customerPhone": "9801234567",
  "items": [
    {
      "menuItem": "MENU_ITEM_ID",
      "quantity": 2,
      "notes": "Extra spicy"
    }
  ]
}
```

### Track Order Status
```bash
GET /api/guest/order/:orderId
```

### Call Waiter
```bash
POST /api/guest/call-waiter
Content-Type: application/json

{
  "tableToken": "TBL-ABCDEF1234567890",
  "hotelId": "YOUR_HOTEL_ID",
  "reason": "Need menu"
}
```

### Request Bill
```bash
POST /api/guest/request-bill
Content-Type: application/json

{
  "tableToken": "TBL-ABCDEF1234567890",
  "hotelId": "YOUR_HOTEL_ID"
}
```

---

## 4. TESTING WITH CURL

### Test QR Generation End-to-End

```bash
# 1. Login first
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "owner@test.com", "password": "password123"}'

# Save the token from response

# 2. Create a table
curl -X POST http://localhost:3000/api/tables \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "hotelId": "YOUR_HOTEL_ID",
    "tableNumber": "T-99",
    "capacity": 4
  }'

# 3. Test guest access (no auth needed)
curl http://localhost:3000/api/guest/table/TBL-TOKEN_FROM_STEP_2

# 4. Get menu
curl http://localhost:3000/api/guest/menu/YOUR_HOTEL_ID
```

---

## 5. POSTMAN COLLECTION

Import this as a Postman collection for easier testing:

```json
{
  "info": {
    "name": "QR Code API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    { "key": "baseUrl", "value": "http://localhost:3000/api" },
    { "key": "token", "value": "" },
    { "key": "hotelId", "value": "" }
  ],
  "item": [
    {
      "name": "Tables",
      "item": [
        {
          "name": "Create Table",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/tables",
            "header": [
              { "key": "Authorization", "value": "Bearer {{token}}" },
              { "key": "Content-Type", "value": "application/json" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\"hotelId\": \"{{hotelId}}\", \"tableNumber\": \"T-01\", \"capacity\": 4}"
            }
          }
        }
      ]
    }
  ]
}
```

---

## 6. QR CODE FLOW DIAGRAM

```
┌──────────────────────────────────────────────────────────────┐
│                    ADMIN FLOW                                 │
├──────────────────────────────────────────────────────────────┤
│  1. Admin logs in                                            │
│  2. Creates table → POST /api/tables                         │
│  3. QR code auto-generated and saved to DB                   │
│  4. Downloads QR → GET /api/tables/:id/qr-download           │
│  5. Prints and places QR on physical table                   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    GUEST FLOW                                 │
├──────────────────────────────────────────────────────────────┤
│  1. Guest scans QR code with phone camera                    │
│  2. Opens URL: /guest/table/TBL-XXXXX                        │
│  3. Frontend calls → GET /api/guest/table/:token             │
│  4. Gets table & hotel info                                  │
│  5. Views menu → GET /api/guest/menu/:hotelId                │
│  6. Places order → POST /api/guest/order                     │
│  7. Tracks order → GET /api/guest/order/:orderId             │
│  8. Requests bill → POST /api/guest/request-bill             │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    KITCHEN/WAITER FLOW                        │
├──────────────────────────────────────────────────────────────┤
│  1. New order notification via WebSocket                     │
│  2. Kitchen prepares order                                   │
│  3. Updates status → order appears on waiter dashboard       │
│  4. Waiter delivers to table number from order               │
└──────────────────────────────────────────────────────────────┘
```
