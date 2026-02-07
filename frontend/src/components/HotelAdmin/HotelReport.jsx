import React, { useState } from 'react';
import './HotelReport.css';

const HotelReport = () => {
  const [dateRange, setDateRange] = useState('month');
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedChart, setSelectedChart] = useState(null);

  // KPI Data
  const kpiData = [
    { id: 1, title: 'Occupancy Rate', value: '75%', trend: '+5%', icon: '🏨', color: '#17a2b8' },
    { id: 2, title: 'Average Daily Rate', value: '$150', trend: '+10%', icon: '💰', color: '#20c997' },
    { id: 3, title: 'Total Revenue', value: '$50,000', trend: '+8%', icon: '📈', color: '#ffc107' },
  ];

  // Financial Data
  const monthlyRevenueData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    values: [8500, 10200, 9800, 12000, 11500, 12500],
  };

  const expenseBreakdown = {
    labels: ['Salaries', 'Supplies', 'Utilities', 'Marketing'],
    values: [2500, 1200, 800, 500],
  };

  // Occupancy Data
  const roomOccupancy = {
    labels: ['Single', 'Double', 'Suite'],
    values: [65, 80, 75],
  };

  // Guest Demographics
  const guestDemographics = [
    { name: 'Business', percentage: 40, color: '#17a2b8' },
    { name: 'Leisure', percentage: 35, color: '#20c997' },
    { name: 'Family', percentage: 20, color: '#ffc107' },
    { name: 'Group', percentage: 5, color: '#fd7e14' },
  ];

  // Staff Performance
  const staffPerformance = [
    { department: 'Front Desk', rating: 4.5 },
    { department: 'Housekeeping', rating: 4.8 },
    { department: 'Food & Beverage', rating: 4.3 },
    { department: 'Maintenance', rating: 4.6 },
  ];

  const handleKPIClick = (kpi) => {
    setSelectedMetric(kpi);
    setShowDetailModal(true);
  };

  const handleChartClick = (chartName) => {
    setSelectedChart(chartName);
    setShowDetailModal(true);
  };

  const handleExportReport = (format) => {
    alert(`Exporting report as ${format.toUpperCase()}...`);
  };

  const handleGenerateReport = () => {
    alert('Generating comprehensive report...');
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    alert(`Report filtered for: ${range}`);
  };

  return (
    <div className="hotel-report-container">
      <div className="report-header">
        <h1>Reports & Analytics</h1>
        <p>Generate and view detailed reports on hotel performance, occupancy, and more.</p>
      </div>

      {/* Date Range and Export Controls */}
      <div className="report-controls">
        <div className="date-range-selector">
          <label>Select Date Range:</label>
          <div className="date-buttons">
            <button
              className={`date-btn ${dateRange === 'week' ? 'active' : ''}`}
              onClick={() => handleDateRangeChange('week')}
            >
              This Week
            </button>
            <button
              className={`date-btn ${dateRange === 'month' ? 'active' : ''}`}
              onClick={() => handleDateRangeChange('month')}
            >
              This Month
            </button>
            <button
              className={`date-btn ${dateRange === 'quarter' ? 'active' : ''}`}
              onClick={() => handleDateRangeChange('quarter')}
            >
              This Quarter
            </button>
            <button
              className={`date-btn ${dateRange === 'year' ? 'active' : ''}`}
              onClick={() => handleDateRangeChange('year')}
            >
              This Year
            </button>
          </div>
        </div>

        <div className="export-buttons">
          <button className="btn-export" onClick={() => handleExportReport('pdf')}>
            📄 Export PDF
          </button>
          <button className="btn-export" onClick={() => handleExportReport('excel')}>
            📊 Export Excel
          </button>
          <button className="btn-generate" onClick={handleGenerateReport}>
            ⚙️ Generate Report
          </button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <section className="report-section">
        <h2>Key Performance Indicators</h2>
        <div className="kpi-grid">
          {kpiData.map((kpi) => (
            <div
              key={kpi.id}
              className="kpi-card clickable"
              onClick={() => handleKPIClick(kpi)}
              style={{ borderLeftColor: kpi.color }}
            >
              <div className="kpi-icon" style={{ backgroundColor: kpi.color }}>
                {kpi.icon}
              </div>
              <div className="kpi-content">
                <p className="kpi-title">{kpi.title}</p>
                <div className="kpi-value">{kpi.value}</div>
                <div className="kpi-trend positive">{kpi.trend}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Financial Reports */}
      <section className="report-section">
        <h2>Financial Reports</h2>
        <div className="financial-grid">
          {/* Monthly Revenue Chart */}
          <div className="chart-card clickable" onClick={() => handleChartClick('monthly-revenue')}>
            <div className="chart-header">
              <h3>Monthly Revenue</h3>
              <span className="trend positive">Last 12 Months +15%</span>
            </div>
            <div className="chart-value">$12,500</div>
            <div className="chart-placeholder">
              <svg viewBox="0 0 400 120" className="line-chart">
                <polyline
                  points="0,80 60,60 120,70 180,40 240,50 280,30 400,20"
                  fill="none"
                  stroke="#17a2b8"
                  strokeWidth="3"
                />
              </svg>
              <div className="chart-labels">
                {monthlyRevenueData.labels.map((label, i) => (
                  <span key={i}>{label}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Expense Breakdown Chart */}
          <div className="chart-card clickable" onClick={() => handleChartClick('expense-breakdown')}>
            <div className="chart-header">
              <h3>Expense Breakdown</h3>
              <span className="trend negative">Current Month -5%</span>
            </div>
            <div className="chart-value">$5,000</div>
            <div className="chart-placeholder">
              <div className="bar-chart">
                {expenseBreakdown.labels.map((label, i) => (
                  <div key={i} className="bar-item">
                    <div className="bar" style={{ height: `${(expenseBreakdown.values[i] / 3000) * 100}%` }}></div>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Occupancy and Guest Demographics */}
      <section className="report-section">
        <h2>Occupancy and Guest Demographics</h2>
        <div className="occupancy-grid">
          {/* Room Occupancy */}
          <div className="chart-card clickable" onClick={() => handleChartClick('room-occupancy')}>
            <div className="chart-header">
              <h3>Room Occupancy by Type</h3>
              <span className="trend positive">Current Month +10%</span>
            </div>
            <div className="chart-value">80%</div>
            <div className="chart-placeholder">
              <div className="bar-chart">
                {roomOccupancy.labels.map((label, i) => (
                  <div key={i} className="bar-item">
                    <div className="bar" style={{ height: `${roomOccupancy.values[i]}%` }}></div>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Guest Demographics */}
          <div className="chart-card clickable" onClick={() => handleChartClick('guest-demographics')}>
            <div className="chart-header">
              <h3>Guest Demographics</h3>
              <span className="trend positive">Last 6 Months +5%</span>
            </div>
            <div className="chart-value">45%</div>
            <div className="chart-placeholder">
              <div className="horizontal-bar-chart">
                {guestDemographics.map((demo, i) => (
                  <div key={i} className="h-bar-item">
                    <span className="label">{demo.name}</span>
                    <div className="h-bar-container">
                      <div
                        className="h-bar"
                        style={{ width: `${demo.percentage}%`, backgroundColor: demo.color }}
                      ></div>
                    </div>
                    <span className="percentage">{demo.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Staff Performance */}
      <section className="report-section">
        <h2>Staff Performance</h2>
        <div className="staff-performance-card clickable" onClick={() => handleChartClick('staff-performance')}>
          <div className="card-header">
            <h3>Staff Performance Ratings</h3>
            <span className="trend positive">Last Quarter +2%</span>
          </div>
          <div className="overall-rating">
            <div className="rating-value">4.5</div>
            <div className="rating-stars">★★★★☆</div>
          </div>
          <div className="staff-bars">
            {staffPerformance.map((staff, i) => (
              <div key={i} className="staff-bar-item">
                <span className="staff-name">{staff.department}</span>
                <div className="rating-bar-container">
                  <div className="rating-bar" style={{ width: `${(staff.rating / 5) * 100}%` }}></div>
                </div>
                <span className="rating-value-small">{staff.rating}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Detail Modal */}
      {showDetailModal && selectedMetric && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Metric Details: {selectedMetric.title}</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Current Value</label>
                  <p className="detail-value">{selectedMetric.value}</p>
                </div>
                <div className="detail-item">
                  <label>Trend</label>
                  <p className="detail-value positive">{selectedMetric.trend}</p>
                </div>
                <div className="detail-item">
                  <label>Metric Type</label>
                  <p>{selectedMetric.title}</p>
                </div>
                <div className="detail-item">
                  <label>Last Updated</label>
                  <p>Today at {new Date().toLocaleTimeString()}</p>
                </div>
                <div className="detail-item full-width">
                  <label>Performance Summary</label>
                  <p>This metric shows strong performance with positive trend growth this month.</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => handleExportReport('pdf')}>
                Export Details
              </button>
              <button className="btn-primary" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chart Detail Modal */}
      {showDetailModal && selectedChart && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Chart Details: {selectedChart.replace('-', ' ').toUpperCase()}</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="chart-detail">
                <p>Detailed analytics and insights for {selectedChart.replace('-', ' ')} will be displayed here.</p>
                <div className="detail-actions">
                  <button className="btn-secondary" onClick={() => alert('Downloading chart data...')}>
                    Download Data
                  </button>
                  <button className="btn-secondary" onClick={() => alert('Comparing with previous period...')}>
                    Compare Periods
                  </button>
                  <button className="btn-primary" onClick={() => handleExportReport('pdf')}>
                    Export as PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelReport;
