# Frontend Testing Strategy

> Comprehensive testing approach for the StayHaven React frontend application

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Testing Setup](#testing-setup)
3. [Component Testing](#component-testing)
4. [Hook Testing](#hook-testing)
5. [Integration Testing](#integration-testing)
6. [End-to-End Testing](#end-to-end-testing)
7. [Testing Best Practices](#testing-best-practices)

---

## 🎯 Overview

### Frontend Testing Pyramid

```
                ┌───────────────┐
                │   E2E Tests   │ ← 10% (Critical Flows)
                │   (Cypress)   │
                └───────┬───────┘
                        │
         ┌──────────────┴──────────────┐
         │  Integration Tests          │ ← 30% (Feature Testing)
         │  (Testing Library + MSW)    │
         └──────────────┬──────────────┘
                        │
      ┌─────────────────┴─────────────────┐
      │      Component Tests              │ ← 60% (Unit Level)
      │  (Vitest + Testing Library)       │
      └───────────────────────────────────┘
```

---

## 🛠️ Testing Setup

### 1. Install Dependencies

```bash
cd frontend
npm install --save-dev \
  vitest \
  @vitest/ui \
  jsdom \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  msw \
  cypress \
  @cypress/react
```

### 2. Vitest Configuration

**File**: `vite.config.js`

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.test.{js,jsx}',
        '**/*.spec.{js,jsx}'
      ]
    }
  }
});
```

### 3. Test Setup File

**File**: `src/tests/setup.js`

```javascript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

### 4. Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "cypress open",
    "test:e2e:headless": "cypress run"
  }
}
```

---

## 🧩 Component Testing

### Basic Component Test

**Component**: `HotelCard.jsx`

```jsx
import React from 'react';

export function HotelCard({ hotel, onFavoriteClick }) {
  return (
    <div className="hotel-card" data-testid="hotel-card">
      <img src={hotel.image} alt={hotel.name} />
      <h3>{hotel.name}</h3>
      <p>{hotel.city}, {hotel.country}</p>
      <p className="price">${hotel.price}/night</p>
      <button 
        onClick={() => onFavoriteClick(hotel.id)}
        aria-label="Add to favorites"
      >
        ❤️
      </button>
    </div>
  );
}
```

**Test**: `HotelCard.test.jsx`

```javascript
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HotelCard } from './HotelCard';

describe('HotelCard Component', () => {
  const mockHotel = {
    id: '1',
    name: 'Grand Plaza Hotel',
    city: 'New York',
    country: 'USA',
    price: 150,
    image: 'https://example.com/hotel.jpg'
  };
  
  test('should render hotel information correctly', () => {
    // ARRANGE & ACT
    render(<HotelCard hotel={mockHotel} />);
    
    // ASSERT
    expect(screen.getByText('Grand Plaza Hotel')).toBeInTheDocument();
    expect(screen.getByText('New York, USA')).toBeInTheDocument();
    expect(screen.getByText('$150/night')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', mockHotel.image);
  });
  
  test('should call onFavoriteClick when favorite button is clicked', async () => {
    // ARRANGE
    const user = userEvent.setup();
    const handleFavoriteClick = vi.fn();
    
    render(<HotelCard hotel={mockHotel} onFavoriteClick={handleFavoriteClick} />);
    
    // ACT
    const favoriteButton = screen.getByLabelText('Add to favorites');
    await user.click(favoriteButton);
    
    // ASSERT
    expect(handleFavoriteClick).toHaveBeenCalledTimes(1);
    expect(handleFavoriteClick).toHaveBeenCalledWith('1');
  });
  
  test('should display hotel image with correct alt text', () => {
    // ACT
    render(<HotelCard hotel={mockHotel} />);
    
    // ASSERT
    const image = screen.getByAltText('Grand Plaza Hotel');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', mockHotel.image);
  });
});
```

### Form Component Test

**Component**: `LoginForm.jsx`

```jsx
import { useState } from 'react';

export function LoginForm({ onSubmit, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ email, password });
  };
  
  return (
    <form onSubmit={handleSubmit} aria-label="login form">
      {error && <div role="alert">{error}</div>}
      
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      
      <button type="submit">Login</button>
    </form>
  );
}
```

**Test**: `LoginForm.test.jsx`

```javascript
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

describe('LoginForm Component', () => {
  test('should render email and password inputs', () => {
    render(<LoginForm onSubmit={vi.fn()} />);
    
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });
  
  test('should submit form with entered credentials', async () => {
    // ARRANGE
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    
    render(<LoginForm onSubmit={handleSubmit} />);
    
    // ACT
    await user.type(screen.getByPlaceholderText('Email'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));
    
    // ASSERT
    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });
  
  test('should display error message when provided', () => {
    render(<LoginForm onSubmit={vi.fn()} error="Invalid credentials" />);
    
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
  });
  
  test('should clear error when re-submitting', async () => {
    // ARRANGE
    const user = userEvent.setup();
    const { rerender } = render(
      <LoginForm onSubmit={vi.fn()} error="Invalid credentials" />
    );
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
    
    // ACT - Re-render without error
    rerender(<LoginForm onSubmit={vi.fn()} />);
    
    // ASSERT
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
```

---

## 🪝 Hook Testing

### Custom Hook Example

**Hook**: `useAuth.js`

```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const login = async (credentials) => {
    try {
      const response = await axios.post('/api/auth/login', credentials);
      setUser(response.data.user);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    }
  };
  
  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
      setUser(null);
    } catch (err) {
      setError(err.message);
    }
  };
  
  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        const response = await axios.get('/api/users/profile');
        setUser(response.data.user);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  return { user, loading, error, login, logout };
}
```

**Test**: `useAuth.test.js`

```javascript
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import axios from 'axios';
import { useAuth } from './useAuth';

vi.mock('axios');

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  test('should initialize with loading state', () => {
    axios.get.mockResolvedValue({ data: { user: null } });
    
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });
  
  test('should fetch user on mount', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    axios.get.mockResolvedValue({ data: { user: mockUser } });
    
    const { result } = renderHook(() => useAuth());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.user).toEqual(mockUser);
  });
  
  test('should login successfully', async () => {
    axios.get.mockResolvedValue({ data: { user: null } });
    axios.post.mockResolvedValue({
      data: {
        user: { id: '1', email: 'test@example.com' },
        accessToken: 'token123'
      }
    });
    
    const { result } = renderHook(() => useAuth());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    await result.current.login({
      email: 'test@example.com',
      password: 'password123'
    });
    
    expect(result.current.user).toEqual({
      id: '1',
      email: 'test@example.com'
    });
  });
  
  test('should handle login error', async () => {
    axios.get.mockResolvedValue({ data: { user: null } });
    axios.post.mockRejectedValue({
      response: { data: { message: 'Invalid credentials' } }
    });
    
    const { result } = renderHook(() => useAuth());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    await expect(result.current.login({
      email: 'wrong@example.com',
      password: 'wrongpass'
    })).rejects.toThrow();
    
    expect(result.current.error).toBe('Invalid credentials');
  });
  
  test('should logout successfully', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    axios.get.mockResolvedValue({ data: { user: mockUser } });
    axios.post.mockResolvedValue({});
    
    const { result } = renderHook(() => useAuth());
    
    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });
    
    await result.current.logout();
    
    expect(result.current.user).toBeNull();
  });
});
```

---

## 🔗 Integration Testing with MSW

### Setup MSW (Mock Service Worker)

**File**: `src/tests/mocks/handlers.js`

```javascript
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Login endpoint
  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = await request.json();
    
    if (email === 'test@example.com' && password === 'password123') {
      return HttpResponse.json({
        success: true,
        data: {
          user: {
            id: '1',
            email: 'test@example.com',
            fullName: 'Test User'
          },
          accessToken: 'mock_access_token'
        }
      });
    }
    
    return HttpResponse.json(
      { success: false, message: 'Invalid credentials' },
      { status: 401 }
    );
  }),
  
  // Get hotels endpoint
  http.get('/api/hotels', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: '1',
          name: 'Grand Plaza Hotel',
          city: 'New York',
          price: 150
        },
        {
          id: '2',
          name: 'Sunset Resort',
          city: 'Los Angeles',
          price: 200
        }
      ]
    });
  }),
  
  // Create booking endpoint
  http.post('/api/bookings', async ({ request }) => {
    const booking = await request.json();
    
    return HttpResponse.json({
      success: true,
      data: {
        id: 'booking123',
        ...booking,
        status: 'confirmed'
      }
    }, { status: 201 });
  })
];
```

**File**: `src/tests/mocks/server.js`

```javascript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

**File**: `src/tests/setup.js` (update)

```javascript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from './mocks/server';

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset handlers after each test
afterEach(() => {
  cleanup();
  server.resetHandlers();
});

// Close server after all tests
afterAll(() => server.close());
```

### Integration Test with MSW

**Test**: `HotelList.integration.test.jsx`

```javascript
import { describe, test, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { HotelList } from './HotelList';

describe('HotelList Integration Test', () => {
  test('should fetch and display hotels', async () => {
    // ACT
    render(<HotelList />);
    
    // ASSERT - Loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    
    // Wait for hotels to load
    await waitFor(() => {
      expect(screen.getByText('Grand Plaza Hotel')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Sunset Resort')).toBeInTheDocument();
    expect(screen.getAllByTestId('hotel-card')).toHaveLength(2);
  });
  
  test('should handle fetch error', async () => {
    // ARRANGE - Override handler to return error
    server.use(
      http.get('/api/hotels', () => {
        return HttpResponse.json(
          { success: false, message: 'Server error' },
          { status: 500 }
        );
      })
    );
    
    // ACT
    render(<HotelList />);
    
    // ASSERT
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

---

## 🎭 End-to-End Testing with Cypress

### Cypress Configuration

**File**: `cypress.config.js`

```javascript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },
});
```

### E2E Test Example

**File**: `cypress/e2e/booking-flow.cy.js`

```javascript
describe('Hotel Booking Flow', () => {
  beforeEach(() => {
    // Reset database or use test data
    cy.visit('/');
  });
  
  it('should complete full booking workflow', () => {
    // 1. Search for hotels
    cy.get('[data-testid="search-input"]').type('New York');
    cy.get('[data-testid="search-button"]').click();
    
    // 2. Wait for search results
    cy.get('[data-testid="hotel-card"]').should('have.length.greaterThan', 0);
    
    // 3. Click on first hotel
    cy.get('[data-testid="hotel-card"]').first().click();
    
    // 4. Verify hotel details page
    cy.url().should('include', '/hotels/');
    cy.get('h1').should('exist');
    
    // 5. Select room
    cy.get('[data-testid="room-card"]').first().within(() => {
      cy.get('button').contains('Book Now').click();
    });
    
    // 6. Fill booking form
    cy.get('input[name="checkIn"]').type('2024-12-01');
    cy.get('input[name="checkOut"]').type('2024-12-05');
    cy.get('select[name="guests"]').select('2');
    
    // 7. Submit booking
    cy.get('button[type="submit"]').contains('Confirm Booking').click();
    
    // 8. Verify booking confirmation
    cy.get('[data-testid="booking-success"]').should('be.visible');
    cy.get('[data-testid="booking-id"]').should('exist');
  });
  
  it('should require login before booking', () => {
    cy.visit('/hotels/hotel123');
    
    cy.get('button').contains('Book Now').click();
    
    // Should redirect to login
    cy.url().should('include', '/login');
    cy.get('[data-testid="login-form"]').should('be.visible');
  });
});
```

---

## ✅ Testing Best Practices

### 1. Test User Behavior, Not Implementation

```javascript
// ✅ GOOD: Test what user sees
test('should show error when login fails', async () => {
  const user = userEvent.setup();
  render(<LoginPage />);
  
  await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
  await user.type(screen.getByLabelText(/password/i), 'wrongpass');
  await user.click(screen.getByRole('button', { name: /login/i }));
  
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
});

// ❌ BAD: Test implementation details
test('should call setError when login fails', () => {
  const setError = vi.fn();
  // Testing internal state setter
});
```

### 2. Use Accessible Queries

```javascript
// ✅ GOOD: Accessible queries
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText(/email/i)
screen.getByText(/welcome/i)

// ❌ BAD: Brittle queries
screen.getByClassName('submit-button')
screen.getByTestId('email-input') // Use sparingly
```

### 3. Avoid Testing Library Implementation

```javascript
// ✅ GOOD: Test React Router behavior
test('should navigate to dashboard after login', async () => {
  render(<App />, { wrapper: MemoryRouter });
  
  // Perform login
  
  expect(screen.getByText('Dashboard')).toBeInTheDocument();
});

// ❌ BAD: Don't test React Router itself
test('should call navigate with /dashboard', () => {
  // Testing library's internal behavior
});
```

---

## 📊 Running Tests

```bash
# Unit & Integration tests
npm test                    # Watch mode
npm run test:coverage       # With coverage

# E2E tests
npm run test:e2e           # Interactive mode
npm run test:e2e:headless  # CI mode
```

---

## 📌 Summary

StayHaven frontend testing strategy:

- **Component Tests**: Vitest + React Testing Library
- **Integration Tests**: MSW for API mocking
- **E2E Tests**: Cypress for critical workflows
- **Coverage Target**: 80%+ for components
- **Best Practices**: Test user behavior, accessibility-first

**Goal**: Ensure UI works correctly from user perspective.
