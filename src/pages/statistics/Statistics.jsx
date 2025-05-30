// File: src/pages/statistics/Statistics.jsx
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
    getTopMonthlyItems
  } = useContext(StatsContext);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState('');    // "" means “All”
  const [day, setDay] = useState(now.getDate());

  const [chartData, setChartData] = useState([]);
  const [topDaily, setTopDaily] = useState([]);
  const [topMonthly, setTopMonthly] = useState([]);

  useEffect(() => {
    if (month === '') {
      // Yearly view
      setChartData(getYearlyData(year));
      setTopDaily([]);
      setTopMonthly([]);
    } else {
      // Monthly view
      const m = +month;
      setChartData(getMonthlyData(year, m));
      setTopDaily(getTopDailyItems(year, m, day));
      setTopMonthly(getTopMonthlyItems(year, m));
    }
  }, [
    year,
    month,
    day,
    getYearlyData,
    getMonthlyData,
    getTopDailyItems,
    getTopMonthlyItems
  ]);

  // Helper to check if a real month is selected
  const hasMonth = Number(month) >= 1;

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Statistics</h1>

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
            {/* “All” option */}
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
            <Tooltip />
            <Bar dataKey="sales" fill="#10B981" />  {/* emerald green */}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top-3 Panels, only when month is selected */}
{hasMonth && (
  <div className={styles.panels}>
    <div className={styles.panel}>
      <h2>Top 3 Items on {day}/{month}/{year}</h2>
      <ol>
        {topDaily.map((it, i) => (
          <li key={i} className={styles.itemRow}>
            <img
              src={it.imageUrl}
              alt={it.name}
              className={styles.itemImage}
            />
            <div className={styles.itemDetails}>
              <strong>{it.name}</strong><br/>
              ${it.revenue.toFixed(2)}
            </div>
          </li>
        ))}
      </ol>
    </div>

    <div className={styles.panel}>
      <h2>Top 3 Items in {months[+month]} {year}</h2>
      <ol>
        {topMonthly.map((it, i) => (
          <li key={i} className={styles.itemRow}>
            <img
              src={it.imageUrl}
              alt={it.name}
              className={styles.itemImage}
            />
            <div className={styles.itemDetails}>
              <strong>{it.name}</strong><br/>
              ${it.revenue.toFixed(2)}
            </div>
          </li>
        ))}
      </ol>
    </div>
  </div>
)}
  </div>
  );
}
