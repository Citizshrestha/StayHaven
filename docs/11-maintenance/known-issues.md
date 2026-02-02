# Known Issues

> Documented issues, limitations, and workarounds for StayHaven

---

## 📋 Table of Contents

1. [Critical Issues](#critical-issues)
2. [High Priority Issues](#high-priority-issues)
3. [Medium Priority Issues](#medium-priority-issues)
4. [Low Priority Issues](#low-priority-issues)
5. [Limitations](#limitations)
6. [Workarounds](#workarounds)

---

## 🚨 Critical Issues

> Issues that affect core functionality or security

### None Currently

All critical issues have been resolved in v1.0.0.

---

## 🟠 High Priority Issues

### 1. Socket Connection Drops on Heavy Load

**Status**: Open  
**Severity**: High  
**Affected Version**: v1.0.0  
**Component**: Socket.IO  

**Description**:  
WebSocket connections occasionally drop when server is under heavy load (>200 concurrent users).

**Impact**:
- Real-time notifications may not be delivered
- Waiter calls may not be received immediately
- Order updates may be delayed

**Temporary Workaround**:
- Client automatically reconnects
- Implement retry logic on client side
- Poll for updates as fallback

**Planned Fix**:
- Implement Redis adapter for Socket.IO (v1.1.0)
- Add connection pooling
- Implement heartbeat mechanism

**Related Issues**: #45, #67

---

### 2. Image Upload Timeout on Slow Connections

**Status**: Open  
**Severity**: High  
**Affected Version**: v1.0.0  
**Component**: Cloudinary Upload  

**Description**:  
Hotel image uploads timeout on slow internet connections (< 1 Mbps).

**Impact**:
- Users cannot upload images on slow connections
- Hotel listings incomplete without images

**Temporary Workaround**:
- Use smaller image sizes (< 2MB)
- Compress images before upload
- Use better internet connection

**Planned Fix**:
- Implement chunked upload (v1.1.0)
- Add client-side image compression
- Increase upload timeout

**Related Issues**: #89

---

## 🟡 Medium Priority Issues

### 1. Search Performance Degrades with Large Datasets

**Status**: Open  
**Severity**: Medium  
**Affected Version**: v1.0.0  
**Component**: Hotel Search  

**Description**:  
Hotel search becomes slow when database contains >10,000 hotels.

**Impact**:
- Search takes >2 seconds
- Poor user experience

**Temporary Workaround**:
- Limit search results to 50 items
- Use pagination

**Planned Fix**:
- Add database indexes (v1.0.1)
- Implement Elasticsearch (v1.2.0)
- Add caching layer (v1.1.0)

**Related Issues**: #102, #115

---

### 2. Email Delivery Delays

**Status**: Open  
**Severity**: Medium  
**Affected Version**: v1.0.0  
**Component**: Email Service  

**Description**:  
Booking confirmation emails sometimes delayed by 5-10 minutes.

**Impact**:
- Users don't receive immediate confirmation
- Confusion about booking status

**Temporary Workaround**:
- Show confirmation in UI immediately
- Inform users email may be delayed

**Planned Fix**:
- Implement email queue (v1.0.1)
- Use background job processor
- Add retry mechanism

**Related Issues**: #78

---

### 3. Mobile Responsive Issues on Small Screens

**Status**: Open  
**Severity**: Medium  
**Affected Version**: v1.0.0  
**Component**: Frontend  

**Description**:  
Some UI components don't render properly on screens < 375px width.

**Impact**:
- Poor mobile experience on small devices
- Text overflow and layout issues

**Affected Pages**:
- Booking form
- Hotel details page
- Dashboard tables

**Temporary Workaround**:
- Use landscape mode
- Zoom out

**Planned Fix**:
- Responsive design improvements (v1.0.1)
- Mobile-first redesign (v1.2.0)

**Related Issues**: #123, #145

---

## 🔵 Low Priority Issues

### 1. Inconsistent Date Format Display

**Status**: Open  
**Severity**: Low  
**Affected Version**: v1.0.0  
**Component**: Frontend  

**Description**:  
Dates displayed in different formats across the application (MM/DD/YYYY vs DD/MM/YYYY).

**Impact**:
- Minor UX inconsistency
- Potential confusion for international users

**Planned Fix**: v1.0.1

---

### 2. Missing Tooltips on Dashboard Icons

**Status**: Open  
**Severity**: Low  
**Affected Version**: v1.0.0  
**Component**: Frontend  

**Description**:  
Some dashboard icons don't have explanatory tooltips.

**Impact**:
- Users may not understand all features
- Reduced discoverability

**Planned Fix**: v1.0.1

---

## ⛔ Limitations

### Current System Limitations

1. **Maximum File Upload Size**: 5 MB
   - Cloudinary free tier limitation
   - Upgrade to paid plan for larger files

2. **Maximum Concurrent Socket Connections**: 200
   - Current server configuration
   - Requires Redis adapter for scaling

3. **Search Results Limit**: 100 hotels
   - Performance consideration
   - Use filters to narrow results

4. **Email Rate Limit**: 100 emails/hour
   - SMTP provider limitation
   - Upgrade plan for higher limits

5. **Image Formats**: JPEG, PNG, WebP only
   - SVG, GIF not supported
   - Convert before upload

6. **Browser Support**: Modern browsers only
   - Chrome 90+, Firefox 88+, Safari 14+
   - IE11 not supported

---

## 🛠️ Workarounds

### Issue: Socket Connection Drops

```javascript
// Client-side reconnection logic
const socket = io(SERVER_URL, {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

socket.on('disconnect', () => {
  console.log('Disconnected, will retry...');
});

socket.on('connect', () => {
  console.log('Reconnected successfully');
  // Resubscribe to rooms
  socket.emit('join_room', userId);
});
```

### Issue: Image Upload Timeout

```javascript
// Client-side image compression before upload
import imageCompression from 'browser-image-compression';

const options = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true
};

const compressedFile = await imageCompression(file, options);
```

### Issue: Search Performance

```javascript
// Implement debounced search
import { debounce } from 'lodash-es';

const debouncedSearch = debounce((query) => {
  searchHotels(query);
}, 300);
```

---

## 📊 Issue Tracking

### Report New Issues

1. Check if issue already exists
2. Create detailed bug report including:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Environment (browser, OS, version)
   - Screenshots/logs
3. Submit to issue tracker: https://github.com/stayhaven/stayhaven/issues

### Issue Priority Labels

- `critical`: Affects core functionality, immediate fix needed
- `high`: Major feature broken, fix in next patch
- `medium`: Minor feature issue, fix in next minor release
- `low`: Cosmetic issue, fix when convenient

---

## 🔗 Related Documentation

- [Changelog](./changelog.md)
- [Versioning Strategy](./versioning-strategy.md)
- [Future Enhancements](./future-enhancements.md)

---

## 📝 Summary

Known issues:
- **Critical**: None
- **High**: 2 (Socket drops, Image upload timeout)
- **Medium**: 3 (Search performance, Email delays, Mobile responsive)
- **Low**: 2 (Date format, Tooltips)

**Note**: All issues are being actively tracked and will be addressed in upcoming releases.