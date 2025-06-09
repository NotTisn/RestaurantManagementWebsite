import React, { useContext, useState, useEffect } from 'react';
import { StatsContext } from '../../contexts/StatsContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import styles from './Statistics.module.scss';

const months = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

export default function Statistics() {
  const {
    getYearlyData,
    getMonthlyData,
    getTopDailyItems,
    getTopMonthlyItems,
    loading,
    error,
    orders
  } = useContext(StatsContext);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState('');    // "" means "All"
  const [day, setDay] = useState(now.getDate());

  const [chartData, setChartData] = useState([]);
  const [topDaily, setTopDaily] = useState([]);
  const [topMonthly, setTopMonthly] = useState([]);

  // Real-time update effect - runs whenever orders data changes
  useEffect(() => {
    // Don't calculate if we're still loading or have no orders
    if (loading || orders.length === 0) {
      setChartData([]);
      setTopDaily([]);
      setTopMonthly([]);
      return;
    }

    if (month === '') {
      // Yearly view
      setChartData(getYearlyData(year));
      setTopDaily([]);
      setTopMonthly([]);
    } else {
      // Monthly view
      const m = +month;
      setChartData(getMonthlyData(year, m));
      setTopDaily(getTopDailyItems(year, m, day).slice(0, 3));
      setTopMonthly(getTopMonthlyItems(year, m).slice(0, 3));
    }
  }, [
    year,
    month,
    day,
    orders, // This will trigger updates when orders change in real-time
    loading,
    getYearlyData,
    getMonthlyData,
    getTopDailyItems,
    getTopMonthlyItems
  ]);

  // Helper to check if a real month is selected
  const hasMonth = Number(month) >= 1;

  // Show loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.heading}>Statistics</h1>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading real-time statistics...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={styles.container}>
        <h1 className={styles.heading}>Statistics</h1>
        <div className={styles.errorContainer}>
          <p className={styles.error}>❌ Error: {error}</p>
          <p>Please check your connection and try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerContainer}>
        <h1 className={styles.heading}>Statistics</h1>
        <div className={styles.realtimeIndicator}>
          <span className={styles.liveDot}></span>
          <span>Live Data ({orders.length} orders)</span>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <label>
          Year:
          <input
            type="number"
            value={year}
            onChange={e => setYear(+e.target.value)}
            min="2000"
            max="2100"
          />
        </label>

        <label>
          Month:
          <select value={month} onChange={e => setMonth(e.target.value)}>
            {/* "All" option */}
            <option value="">All</option>
            {/* Months 1–12 */}
            {months.slice(1).map((m, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>

        {/* Only show Day picker when a month is chosen */}
        {hasMonth && (
          <label>
            Day:
            <input
              type="number"
              value={day}
              onChange={e => setDay(+e.target.value)}
              min="1"
              max={new Date(year, +month, 0).getDate()}
            />
          </label>
        )}
      </div>

      {/* Chart */}
      <div className={styles.chart}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey={hasMonth ? 'day' : 'month'} />
            <YAxis />
            <Tooltip 
              formatter={(value) => [`$${value.toLocaleString()}`, 'Sales']}
              labelFormatter={(label) => hasMonth ? `Day ${label}` : `Month ${label}`}
            />
            <Bar dataKey="sales" fill="#10B981" />  {/* emerald green */}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Show message if no data for selected period */}
      {chartData.length === 0 && !loading && (
        <div className={styles.noDataMessage}>
          <p>📊 No sales data found for the selected period.</p>
        </div>
      )}

      {/* Top-3 Panels, only when month is selected */}
      {hasMonth && (
        <div className={styles.panels}>
          <div className={styles.panel}>
            <h2>Top 3 Items on {day}/{month}/{year}</h2>
            {topDaily.length > 0 ? (
              <ol>
                {topDaily.map((it, i) => (
                  <li key={i} className={styles.itemRow}>
                    <img
                      src={it.imageUrl}
                      alt={it.name}
                      className={styles.itemImage}
                      onError={(e) => {
                        e.target.src = '/placeholder-food.png'; // fallback image
                      }}
                    />
                    <div className={styles.itemDetails}>
                      <strong>{it.name}</strong><br/>
                      ${it.revenue.toFixed(2)}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.noItems}>No items sold on this day.</p>
            )}
          </div>

          <div className={styles.panel}>
            <h2>Top 3 Items in {months[+month]} {year}</h2>
            {topMonthly.length > 0 ? (
              <ol>
                {topMonthly.map((it, i) => (
                  <li key={i} className={styles.itemRow}>
                    <img
                      src={it.imageUrl}
                      alt={it.name}
                      className={styles.itemImage}
                      onError={(e) => {
                        e.target.src = '/placeholder-food.png'; // fallback image
                      }}
                    />
                    <div className={styles.itemDetails}>
                      <strong>{it.name}</strong><br/>
                      ${it.revenue.toFixed(2)}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.noItems}>No items sold this month.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}