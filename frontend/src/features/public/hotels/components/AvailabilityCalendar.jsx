/**
 * AvailabilityCalendar Component
 * Visual calendar showing room availability with date selection
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import styles from './AvailabilityCalendar.module.css';

const AvailabilityCalendar = ({ roomId, onDateSelect, selectedCheckIn, selectedCheckOut }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (roomId) {
      loadAvailability();
    }
  }, [roomId, currentMonth]);

  const loadAvailability = async () => {
    try {
      setLoading(true);
      setError(null);

      const year = currentMonth.getFullYear();
      const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
      const monthParam = `${year}-${month}`;

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
      const response = await axios.get(`${apiUrl}/rooms/${roomId}/availability?month=${monthParam}`);

      if (response.data?.success) {
        setAvailability(response.data.calendar || []);
      }
    } catch (err) {
      console.error('Failed to load availability:', err);
      setError('Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (dateStr, status) => {
    if (status !== 'available') return;

    const clickedDate = new Date(dateStr);

    // If no check-in selected, set check-in
    if (!selectedCheckIn) {
      onDateSelect(dateStr, null);
      return;
    }

    // If check-in selected but no check-out, set check-out
    if (selectedCheckIn && !selectedCheckOut) {
      const checkInDate = new Date(selectedCheckIn);

      // Check-out must be after check-in
      if (clickedDate <= checkInDate) {
        // Reset and set new check-in
        onDateSelect(dateStr, null);
        return;
      }

      // Check if all dates between check-in and check-out are available
      const datesInRange = availability.filter(day => {
        const dayDate = new Date(day.date);
        return dayDate > checkInDate && dayDate < clickedDate;
      });

      const allAvailable = datesInRange.every(day => day.status === 'available');

      if (!allAvailable) {
        // Reset and set new check-in
        onDateSelect(dateStr, null);
        return;
      }

      onDateSelect(selectedCheckIn, dateStr);
      return;
    }

    // If both selected, reset and start over
    onDateSelect(dateStr, null);
  };

  const getDateStatus = (dateStr) => {
    const day = availability.find(d => d.date === dateStr);
    if (!day) return 'unavailable';

    if (selectedCheckIn && dateStr === selectedCheckIn) return 'check-in';
    if (selectedCheckOut && dateStr === selectedCheckOut) return 'check-out';

    if (selectedCheckIn && selectedCheckOut) {
      const date = new Date(dateStr);
      const checkIn = new Date(selectedCheckIn);
      const checkOut = new Date(selectedCheckOut);
      if (date > checkIn && date < checkOut) return 'in-range';
    }

    return day.status;
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Week day headers
    weekDays.forEach(day => {
      days.push(
        <div key={`header-${day}`} className={styles.weekDay}>
          {day}
        </div>
      );
    });

    // Empty cells before first day
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className={styles.emptyDay} />);
    }

    // Calendar days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const status = getDateStatus(dateStr);
      const dayData = availability.find(d => d.date === dateStr);

      days.push(
        <div
          key={dateStr}
          className={`${styles.day} ${styles[status]} ${status === 'available' ? styles.clickable : ''}`}
          onClick={() => handleDateClick(dateStr, status)}
          title={dayData ? `${status} - $${dayData.price}` : status}
        >
          <span className={styles.dayNumber}>{day}</span>
          {dayData && status === 'available' && (
            <span className={styles.price}>${dayData.price}</span>
          )}
        </div>
      );
    }

    return days;
  };

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <button onClick={handlePrevMonth} className={styles.navButton} type="button">
          <ChevronLeft size={20} />
        </button>
        <h3 className={styles.monthTitle}>{monthName}</h3>
        <button onClick={handleNextMonth} className={styles.navButton} type="button">
          <ChevronRight size={20} />
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>
          <Loader2 className={styles.spinner} size={32} />
          <p>Loading availability...</p>
        </div>
      ) : error ? (
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={loadAvailability} className={styles.retryButton} type="button">
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {renderCalendar()}
          </div>

          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <span className={`${styles.legendColor} ${styles.available}`} />
              <span>Available</span>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendColor} ${styles.booked}`} />
              <span>Booked</span>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendColor} ${styles.checkIn}`} />
              <span>Check-in</span>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendColor} ${styles.checkOut}`} />
              <span>Check-out</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AvailabilityCalendar;
