import React, { createContext, useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';

export const StatsContext = createContext();

export const StatsProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    // Clean up any existing listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    setLoading(true);
    setError(null);

    // Set up real-time listener for orders collection
    const ordersCollection = collection(db, 'orders');
    
    const unsubscribe = onSnapshot(
      ordersCollection,
      (snapshot) => {
        try {
          const ordersData = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            
            // Convert Firestore timestamp to JavaScript timestamp if needed
            let timestamp = data.timestamp;
            if (timestamp && typeof timestamp === 'object' && timestamp.toDate) {
              timestamp = timestamp.toDate().getTime();
            } else if (timestamp && typeof timestamp !== 'number') {
              timestamp = new Date(timestamp).getTime();
            }
            
            ordersData.push({
              id: doc.id,
              ...data,
              timestamp
            });
          });
          
          setOrders(ordersData);
          setLoading(false);
          setError(null);
          
          console.log(`📊 Real-time stats updated: ${ordersData.length} orders loaded`);
        } catch (err) {
          console.error('Error processing orders snapshot:', err);
          setError('Error processing orders data');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error in orders listener:', err);
        setError(`Error fetching orders: ${err.message}`);
        setLoading(false);
      }
    );

    unsubscribeRef.current = unsubscribe;

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
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
      monthly[m] += o.total || 0;
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
      daily[d - 1] += o.total || 0;
    });
    return daily.map((sales, idx) => ({ day: idx + 1, sales }));
  };

  // Updated to get top 6 items by revenue in a time range
  const getTopItems = (ordersList, topN = 6) => {
    // { [itemName]: { revenue: number, imageUrl: string } }
    const map = {};

    ordersList.forEach(o => {
      if (o.items && Array.isArray(o.items)) {
        o.items.forEach(item => {
          const key = item.name;
          if (!map[key]) {
            map[key] = {
              revenue: 0,
              imageUrl: item.imageUrl || ''  // capture imageUrl from the first order containing it
            };
          }
          map[key].revenue += (item.price || 0) * (item.quantity || 0);
        });
      }
    });

    return Object.entries(map)
      .map(([name, { revenue, imageUrl }]) => ({ name, revenue, imageUrl }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, topN);
  };

  const getTopDailyItems = (y, m, d) => {
    const start = new Date(y, m - 1, d).getTime();
    const end = new Date(y, m - 1, d + 1).getTime() - 1;
    return getTopItems(filterByRange(start, end));
  };

  const getTopMonthlyItems = (y, m) => {
    const start = new Date(y, m - 1, 1).getTime();
    const end = new Date(y, m, 1).getTime() - 1;
    return getTopItems(filterByRange(start, end));
  };

  // Function to update popular foods based on monthly top 6
  const updatePopularFoods = async (year, month) => {
    try {
      // Get top 6 items for the specified month
      const topItems = getTopMonthlyItems(year, month);
      const topItemNames = topItems.map(item => item.name);

      // Get all food documents from Firestore
      const foodsCollection = collection(db, 'food');
      const foodsSnapshot = await getDocs(foodsCollection);
      
      // Update each food document
      const updatePromises = foodsSnapshot.docs.map(async (foodDoc) => {
        const foodData = foodDoc.data();
        const isInTop6 = topItemNames.includes(foodData.name);
        
        // Only update if the isPopular status needs to change
        if (foodData.isPopular !== isInTop6) {
          const foodRef = doc(db, 'food', foodDoc.id);
          await updateDoc(foodRef, {
            isPopular: isInTop6
          });
        }
      });

      await Promise.all(updatePromises);
      console.log(`✅ Updated popular foods for ${month}/${year}. Top 6:`, topItemNames);
      
    } catch (error) {
      console.error('❌ Error updating popular foods:', error);
    }
  };

  return (
    <StatsContext.Provider value={{
      orders,
      loading,
      error,
      getYearlyData,
      getMonthlyData,
      getTopItems,
      getTopDailyItems,
      getTopMonthlyItems,
      updatePopularFoods
    }}>
      {children}
    </StatsContext.Provider>
  );
};