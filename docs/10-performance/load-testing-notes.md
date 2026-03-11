# Load Testing Notes

> Performance testing strategies and results for StayHaven

---

## 📋 Table of Contents

1. [Testing Tools](#testing-tools)
2. [Test Scenarios](#test-scenarios)
3. [Load Testing with Artillery](#load-testing-with-artillery)
4. [Stress Testing](#stress-testing)
5. [Results Analysis](#results-analysis)
6. [Performance Baselines](#performance-baselines)

---

## 🛠️ Testing Tools

### Artillery (Recommended)

```bash
npm install -D artillery
```

### Alternative Tools

- **k6**: Modern load testing tool
- **Apache JMeter**: Java-based, GUI available
- **Gatling**: Scala-based, great reporting
- **Locust**: Python-based, distributed testing

---

## 🎯 Test Scenarios

### 1. Normal Load Test

**Goal**: Verify system handles expected traffic

```
Users: 50 concurrent
Duration: 10 minutes
Ramp-up: 2 minutes
Expected: < 500ms response time
```

### 2. Peak Load Test

**Goal**: Test system at maximum expected load

```
Users: 200 concurrent
Duration: 15 minutes
Ramp-up: 5 minutes
Expected: < 1000ms response time
```

### 3. Stress Test

**Goal**: Find breaking point

```
Users: Start at 50, increase by 50 every 2 minutes
Duration: Until failure
Expected: Identify max capacity
```

### 4. Spike Test

**Goal**: Test sudden traffic increase

```
Users: 50 → 500 → 50
Duration: 5 minutes
Expected: Graceful handling of spikes
```

---

## 🎯 Load Testing with Artillery

### Installation

```bash
npm install -D artillery
```

### Basic Test Configuration

```yaml
# tests/load/basic-load-test.yml
config:
  target: "http://localhost:5000"
  phases:
    # Warm-up phase
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    
    # Ramp-up phase
    - duration: 120
      arrivalRate: 5
      rampTo: 50
      name: "Ramp up"
    
    # Sustained load
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
  
  # Default headers
  defaults:
    headers:
      Content-Type: "application/json"

scenarios:
  # Scenario 1: Browse hotels
  - name: "Browse Hotels"
    weight: 40
    flow:
      - get:
          url: "/api/hotels"
          capture:
            - json: "$.hotels[0].id"
              as: "hotelId"
      
      - get:
          url: "/api/hotels/{{ hotelId }}"
      
      - think: 2 # Wait 2 seconds
  
  # Scenario 2: User authentication
  - name: "User Login"
    weight: 30
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
            password: "password123"
          capture:
            - json: "$.accessToken"
              as: "token"
      
      - get:
          url: "/api/users/profile"
          headers:
            Authorization: "Bearer {{ token }}"
  
  # Scenario 3: Create booking
  - name: "Create Booking"
    weight: 20
    flow:
      # Login first
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
            password: "password123"
          capture:
            - json: "$.accessToken"
              as: "token"
      
      # Get hotel
      - get:
          url: "/api/hotels"
          capture:
            - json: "$.hotels[0].id"
              as: "hotelId"
      
      # Create booking
      - post:
          url: "/api/bookings"
          headers:
            Authorization: "Bearer {{ token }}"
          json:
            hotelId: "{{ hotelId }}"
            checkIn: "2024-12-20"
            checkOut: "2024-12-25"
            guests: 2
  
  # Scenario 4: Search
  - name: "Search Hotels"
    weight: 10
    flow:
      - get:
          url: "/api/hotels?city=New York&minPrice=50&maxPrice=200"
```

### Run Tests

```bash
# Run basic test
artillery run tests/load/basic-load-test.yml

# Run with output report
artillery run --output report.json tests/load/basic-load-test.yml

# Generate HTML report
artillery report report.json
```

---

## 🔥 Stress Testing

### Stress Test Configuration

```yaml
# tests/load/stress-test.yml
config:
  target: "http://localhost:5000"
  phases:
    # Gradually increase load
    - duration: 120
      arrivalRate: 1
      rampTo: 50
    
    - duration: 120
      arrivalRate: 50
      rampTo: 100
    
    - duration: 120
      arrivalRate: 100
      rampTo: 200
    
    - duration: 120
      arrivalRate: 200
      rampTo: 400
    
    # Maintain peak load
    - duration: 180
      arrivalRate: 400

scenarios:
  - name: "Heavy Load"
    flow:
      - get:
          url: "/api/hotels"
      - get:
          url: "/api/bookings"
```

---

## 📊 Results Analysis

### Metrics to Track

```
1. Response Time:
   - Median (p50)
   - 95th percentile (p95)
   - 99th percentile (p99)
   - Maximum

2. Throughput:
   - Requests per second
   - Successful requests
   - Failed requests

3. Error Rate:
   - HTTP 4xx errors
   - HTTP 5xx errors
   - Timeouts

4. Resource Usage:
   - CPU utilization
   - Memory usage
   - Database connections
   - Network bandwidth
```

### Sample Results

```
All virtual users finished
Summary report @ 14:30:25(+0200)

Scenarios launched:  3000
Scenarios completed: 3000
Requests completed:  12000

Response time (msec):
  min: 45
  max: 1523
  median: 187
  p95: 421
  p99: 856

Scenario counts:
  Browse Hotels: 1200 (40%)
  User Login: 900 (30%)
  Create Booking: 600 (20%)
  Search Hotels: 300 (10%)

Codes:
  200: 11500
  201: 400
  400: 50
  500: 50

Errors:
  ETIMEDOUT: 10
  ECONNREFUSED: 5
```

### Analysis

```
✅ Good:
- Median response time: 187ms (< 500ms target)
- 95th percentile: 421ms (acceptable)
- Error rate: 0.83% (< 1% target)

⚠️ Concerns:
- p99: 856ms (should be < 1000ms)
- Max: 1523ms (investigate slow requests)
- Some timeouts and connection errors

🚨 Action Items:
- Optimize slow endpoints
- Increase connection pool
- Add caching for frequent queries
```

---

## 📊 Performance Baselines

### Baseline Metrics (Dec 2024)

| Endpoint | p50 | p95 | p99 | RPS |
|----------|-----|-----|-----|-----|
| GET /api/hotels | 120ms | 300ms | 650ms | 50 |
| GET /api/hotels/:id | 85ms | 200ms | 450ms | 30 |
| POST /api/auth/login | 150ms | 350ms | 700ms | 10 |
| POST /api/bookings | 250ms | 600ms | 1200ms | 5 |
| GET /api/users/profile | 90ms | 220ms | 480ms | 20 |

### Target Improvements

```
Phase 1 (Q1 2025):
- Reduce p95 by 20%
- Reduce p99 by 30%
- Handle 100 RPS total

Phase 2 (Q2 2025):
- Reduce p95 by 40%
- Reduce p99 by 50%
- Handle 200 RPS total
```

---

## 📝 Testing Checklist

### Before Testing

- [ ] Test in staging environment first
- [ ] Database has realistic data volume
- [ ] Monitoring tools enabled
- [ ] Backups created
- [ ] Team notified

### During Testing

- [ ] Monitor server resources (CPU, memory)
- [ ] Watch database performance
- [ ] Check error logs
- [ ] Track response times
- [ ] Note any anomalies

### After Testing

- [ ] Analyze results
- [ ] Compare to baselines
- [ ] Identify bottlenecks
- [ ] Document findings
- [ ] Create action items

---

## 📝 Summary

Load testing strategy:
- **Tools**: Artillery for HTTP load testing
- **Scenarios**: Normal, peak, stress, spike
- **Metrics**: Response time, throughput, errors
- **Baselines**: Track improvements over time

**Goal**: Identify and fix performance issues before production.