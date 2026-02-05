# Frontend Performance

> React/Vite optimization strategies for StayHaven

---

## 📋 Table of Contents

1. [Bundle Optimization](#bundle-optimization)
2. [Code Splitting](#code-splitting)
3. [React Performance](#react-performance)
4. [Image Optimization](#image-optimization)
5. [Caching Strategies](#caching-strategies)
6. [Web Vitals](#web-vitals)

---

## 📦 Bundle Optimization

### Vite Configuration

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    // Analyze bundle size
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ],
  build: {
    // Output directory
    outDir: 'dist',
    
    // Generate sourcemaps for debugging
    sourcemap: false,
    
    // Minification
    minify: 'esbuild',
    
    // Target browsers
    target: 'es2015',
    
    // Chunk size warnings
    chunkSizeWarningLimit: 500,
    
    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks: {
          // React ecosystem
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // UI libraries
          'ui-vendor': ['@headlessui/react', '@heroicons/react'],
          
          // Utilities
          'utils-vendor': ['axios', 'date-fns', 'zustand']
        }
      }
    }
  },
  
  // Development optimizations
  server: {
    port: 3000,
    open: true,
    // Fast refresh
    hmr: true
  }
});
```

### Tree Shaking

```javascript
// ❌ Bad: Imports entire library
import _ from 'lodash';

// ✅ Good: Import only what's needed
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';

// ✅ Even better: Use named imports
import { debounce, throttle } from 'lodash-es';
```

---

## ✂️ Code Splitting

### Route-based Splitting

```javascript
// src/App.jsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load routes
const Home = lazy(() => import('./pages/Home'));
const Hotels = lazy(() => import('./pages/Hotels'));
const HotelDetails = lazy(() => import('./pages/HotelDetails'));
const Booking = lazy(() => import('./pages/Booking'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/hotels" element={<Hotels />} />
          <Route path="/hotels/:id" element={<HotelDetails />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

### Component-level Splitting

```javascript
// Lazy load heavy components
import { lazy, Suspense } from 'react';

const HeavyChart = lazy(() => import('./components/HeavyChart'));
const ImageGallery = lazy(() => import('./components/ImageGallery'));

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      
      <Suspense fallback={<div>Loading chart...</div>}>
        <HeavyChart />
      </Suspense>
      
      <Suspense fallback={<div>Loading gallery...</div>}>
        <ImageGallery />
      </Suspense>
    </div>
  );
}
```

---

## ⚡ React Performance

### Memoization

```javascript
import { memo, useMemo, useCallback } from 'react';

// Memoize expensive computations
function HotelList({ hotels, filters }) {
  const filteredHotels = useMemo(() => {
    return hotels.filter(hotel => {
      return hotel.price >= filters.minPrice &&
             hotel.price <= filters.maxPrice &&
             hotel.rating >= filters.minRating;
    });
  }, [hotels, filters]);

  return (
    <div>
      {filteredHotels.map(hotel => (
        <HotelCard key={hotel.id} hotel={hotel} />
      ))}
    </div>
  );
}

// Memoize components
const HotelCard = memo(function HotelCard({ hotel }) {
  return (
    <div className="hotel-card">
      <h3>{hotel.name}</h3>
      <p>${hotel.price}/night</p>
    </div>
  );
});

// Memoize callbacks
function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('');

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    onSearch(query);
  }, [query, onSearch]);

  return (
    <form onSubmit={handleSubmit}>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
    </form>
  );
}
```

### Virtual Scrolling

```javascript
import { useVirtualizer } from '@tanstack/react-virtual';

function HotelList({ hotels }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: hotels.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimated item height
    overscan: 5 // Render 5 items outside viewport
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`
            }}
          >
            <HotelCard hotel={hotels[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Debounce Input

```javascript
import { useState, useEffect } from 'react';
import { debounce } from 'lodash-es';

function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    const debouncedSearch = debounce(async (searchQuery) => {
      if (searchQuery) {
        const response = await fetch(`/api/search?q=${searchQuery}`);
        const data = await response.json();
        setResults(data);
      }
    }, 300); // Wait 300ms after user stops typing

    debouncedSearch(query);

    return () => debouncedSearch.cancel();
  }, [query]);

  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search hotels..."
    />
  );
}
```

---

## 🖼️ Image Optimization

### Lazy Loading Images

```javascript
function HotelCard({ hotel }) {
  return (
    <div className="hotel-card">
      <img
        src={hotel.image}
        alt={hotel.name}
        loading="lazy" // Browser-native lazy loading
        decoding="async"
      />
    </div>
  );
}
```

### Responsive Images

```javascript
function HotelImage({ hotel }) {
  return (
    <picture>
      {/* WebP for modern browsers */}
      <source
        srcSet={`
          ${hotel.image_small}.webp 400w,
          ${hotel.image_medium}.webp 800w,
          ${hotel.image_large}.webp 1200w
        `}
        type="image/webp"
      />
      
      {/* Fallback to JPEG */}
      <source
        srcSet={`
          ${hotel.image_small}.jpg 400w,
          ${hotel.image_medium}.jpg 800w,
          ${hotel.image_large}.jpg 1200w
        `}
        type="image/jpeg"
      />
      
      <img
        src={hotel.image_medium}
        alt={hotel.name}
        loading="lazy"
      />
    </picture>
  );
}
```

### Image CDN

```javascript
// utils/imageOptimizer.js
export const optimizeImage = (url, options = {}) => {
  const {
    width = 800,
    quality = 85,
    format = 'webp'
  } = options;

  // Cloudinary transformation
  return url.replace(
    '/upload/',
    `/upload/w_${width},q_${quality},f_${format}/`
  );
};

// Usage
function HotelCard({ hotel }) {
  return (
    <img
      src={optimizeImage(hotel.image, { width: 400, quality: 80 })}
      alt={hotel.name}
    />
  );
}
```

---

## 💾 Caching Strategies

### Service Worker (PWA)

```javascript
// vite.config.js
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Cache API responses
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.stayhaven\.com\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300 // 5 minutes
              }
            }
          },
          {
            urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 86400 // 24 hours
              }
            }
          }
        ]
      }
    })
  ]
});
```

### React Query Caching

```javascript
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false
    }
  }
});

function HotelList() {
  const { data: hotels } = useQuery({
    queryKey: ['hotels'],
    queryFn: () => fetch('/api/hotels').then(res => res.json()),
    staleTime: 5 * 60 * 1000
  });

  return (
    <div>
      {hotels?.map(hotel => <HotelCard key={hotel.id} hotel={hotel} />)}
    </div>
  );
}
```

---

## 📊 Web Vitals

### Measuring Performance

```javascript
// src/utils/reportWebVitals.js
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

function sendToAnalytics({ name, value, id }) {
  // Send to analytics service
  console.log({ name, value, id });
  
  // Example: Google Analytics
  // gtag('event', name, {
  //   value: Math.round(name === 'CLS' ? value * 1000 : value),
  //   event_label: id,
  //   non_interaction: true
  // });
}

export function reportWebVitals() {
  onCLS(sendToAnalytics);
  onFID(sendToAnalytics);
  onFCP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}

// src/main.jsx
import { reportWebVitals } from './utils/reportWebVitals';

reportWebVitals();
```

### Performance Observer

```javascript
// Monitor long tasks
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      console.warn('Long task detected:', entry);
    }
  }
});

observer.observe({ entryTypes: ['longtask'] });
```

---

## 📝 Summary

Frontend optimizations:
- **Bundle**: Code splitting, tree shaking
- **React**: Memoization, virtual scrolling
- **Images**: Lazy loading, CDN, responsive
- **Caching**: Service worker, React Query
- **Monitoring**: Web vitals tracking

**Goal**: LCP < 2.5s, FID < 100ms, CLS < 0.1.