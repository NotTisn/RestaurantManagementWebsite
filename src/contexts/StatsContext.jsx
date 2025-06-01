// src/contexts/StatsContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import { db } from '../firebaseConfig';           // ← forward slash
import { collection, getDocs } from 'firebase/firestore';

export const StatsContext = createContext();

export const StatsProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    async function fetchAll() {
      const col = collection(db, 'orders');
      const snap = await getDocs(col);
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }
    fetchAll();
  }, []);

  // helper to filter by timestamp range
  const filterByRange = (start, end) =>
    orders.filter(o => o.timestamp >= start && o.timestamp <= end);

  const getYearlyData = (year) => {
    const monthly = Array(12).fill(0);
    const start = new Date(year, 0, 1).getTime();
    const end = new Date(year + 1, 0, 1).getTime() - 1;
    filterByRange(start, end).forEach(o => {
      const m = new Date(o.timestamp).getMonth();
      monthly[m] += o.total;
    });
    return monthly.map((sales, idx) => ({ month: idx + 1, sales }));
  };

  const getMonthlyData = (year, month) => {
    const days = new Date(year, month, 0).getDate();
    const daily = Array(days).fill(0);
    const start = new Date(year, month - 1, 1).getTime();
    const end = new Date(year, month, 1).getTime() - 1;
    filterByRange(start, end).forEach(o => {
      const d = new Date(o.timestamp).getDate();
      daily[d - 1] += o.total;
    });
    return daily.map((sales, idx) => ({ day: idx + 1, sales }));
  };

// inside StatsContext.jsx

// 3. Top N items by revenue in a time range
const getTopItems = (ordersList, topN = 3) => {
  // { [itemName]: { revenue: number, imageUrl: string } }
  const map = {};

  ordersList.forEach(o => {
    o.items.forEach(item => {
      const key = item.name;
      if (!map[key]) {
        map[key] = {
          revenue: 0,
          imageUrl: item.imageUrl || ''  // capture imageUrl from the first order containing it
        };
      }
      map[key].revenue += item.price * item.quantity;
    });
  });

  return Object.entries(map)
    .map(([name, { revenue, imageUrl }]) => ({ name, revenue, imageUrl }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, topN);
};

  const getTopDailyItems = (y,m,d) => {
    const start = new Date(y, m-1, d).getTime();
    const end   = new Date(y, m-1, d+1).getTime() - 1;
    return getTopItems(filterByRange(start,end));
  };

  const getTopMonthlyItems = (y,m) => {
    const start = new Date(y, m-1, 1).getTime();
    const end   = new Date(y, m, 1).getTime() - 1;
    return getTopItems(filterByRange(start,end));
  };

  return (
    <StatsContext.Provider value={{
      getYearlyData,
      getMonthlyData,
      getTopDailyItems,
      getTopMonthlyItems
    }}>
      {children}
    </StatsContext.Provider>
  );
};
