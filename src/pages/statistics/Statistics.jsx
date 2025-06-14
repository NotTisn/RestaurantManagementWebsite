import React, { useContext, useState, useEffect } from 'react';
import { StatsContext } from '../../contexts/StatsContext';
import * as XLSX from 'xlsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import styles from './Statistics.module.scss';

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig'; 

const getUserName = async (userId) => {
  if (!userId || userId === 'Guest') return 'Guest';
  
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data().name || 'Unknown';
    }
    return 'Unknown';
  } catch (error) {
    console.error('Error fetching user:', error);
    return 'Unknown';
  }
};

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
    getTopItems, // We'll use this for export
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

  // Excel export states
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateRange, setExportDateRange] = useState({
    startDate: '',
    endDate: ''
  });

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

  // Excel Export Functions
  const formatCurrency = (amount) => `$${(amount || 0).toFixed(2)}`;
  const formatDate = (timestamp) => new Date(timestamp).toLocaleDateString();

  const filterOrdersByDateRange = (start, end) => {
    const startTime = start ? new Date(start).getTime() : 0;
    const endTime = end ? new Date(end + 'T23:59:59').getTime() : Date.now();
    return orders.filter(order => order.timestamp >= startTime && order.timestamp <= endTime);
  };


  const generateExcelReport = async () => {
    setIsExporting(true);

    try {
      const filteredOrders = filterOrdersByDateRange(exportDateRange.startDate, exportDateRange.endDate);
      const workbook = XLSX.utils.book_new();

      // Calculate overall metrics
      const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      const totalSubtotal = filteredOrders.reduce((sum, order) => sum + (order.subtotal || 0), 0);
      const totalTax = filteredOrders.reduce((sum, order) => sum + (order.tax || 0), 0);
      const totalDiscount = filteredOrders.reduce((sum, order) => sum + (order.discountAmount || 0), 0);
      const totalOrders = filteredOrders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const completedOrders = filteredOrders.filter(o => o.status === 'completed');
      const pendingOrders = filteredOrders.filter(o => o.status === 'pending');
      const paidOrders = filteredOrders.filter(o => o.paymentStatus === 'paid');
      const unpaidOrders = filteredOrders.filter(o => o.paymentStatus === 'unpaid');

      // 1. EXECUTIVE SUMMARY SHEET
      const summaryData = [
        ['COMPREHENSIVE RESTAURANT SALES REPORT', '', '', ''],
        ['Report Period:', exportDateRange.startDate || 'All Time', 'to', exportDateRange.endDate || 'Current'],
        ['Generated:', new Date().toLocaleString(), '', ''],
        ['', '', '', ''],

        ['FINANCIAL OVERVIEW', '', '', ''],
        ['Gross Revenue (before discounts)', formatCurrency(totalSubtotal + totalTax), '', ''],
        ['Total Discounts Applied', formatCurrency(totalDiscount), '', ''],
        ['Net Revenue (after discounts)', formatCurrency(totalRevenue), '', ''],
        ['Tax Collected', formatCurrency(totalTax), '', ''],
        ['Revenue excluding Tax', formatCurrency(totalRevenue - totalTax), '', ''],
        ['', '', '', ''],

        ['ORDER METRICS', '', '', ''],
        ['Total Orders', totalOrders.toLocaleString(), '', ''],
        ['Completed Orders', completedOrders.length.toLocaleString(), `${((completedOrders.length / totalOrders) * 100).toFixed(1)}%`, ''],
        ['Pending Orders', pendingOrders.length.toLocaleString(), `${((pendingOrders.length / totalOrders) * 100).toFixed(1)}%`, ''],
        ['Average Order Value', formatCurrency(avgOrderValue), '', ''],
        ['', '', '', ''],

        ['PAYMENT ANALYSIS', '', '', ''],
        ['Paid Orders', paidOrders.length.toLocaleString(), `${((paidOrders.length / totalOrders) * 100).toFixed(1)}%`, ''],
        ['Unpaid Orders', unpaidOrders.length.toLocaleString(), `${((unpaidOrders.length / totalOrders) * 100).toFixed(1)}%`, ''],
        ['', '', '', ''],

        ['VOUCHER USAGE', '', '', ''],
        ['Orders with Vouchers', filteredOrders.filter(o => o.appliedVoucherDetails).length.toLocaleString(), '', ''],
        ['Total Voucher Savings', formatCurrency(totalDiscount), '', '']
      ];

      const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWS['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, summaryWS, "Executive Summary");

      // 2. DETAILED TRANSACTIONS SHEET
      const transactionData = await Promise.all(
        filteredOrders.map(async (order) => {
        const customerName = await getUserName(order.userId);
        return {
        'Date': formatDate(order.timestamp),
        'Time': new Date(order.timestamp).toLocaleTimeString(),
        'Order ID': order.id?.substring(0, 8) || 'N/A',
        'Status': order.status || 'N/A',
        'Payment Status': order.paymentStatus || 'N/A',
        'Payment Method': order.paymentMethod || 'N/A',
        'Items Count': order.items?.length || 0,
        'Subtotal': formatCurrency(order.subtotal),
        'Tax': formatCurrency(order.tax),
        'Discount': formatCurrency(order.discountAmount),
        'Total': formatCurrency(order.total),
        'Voucher Code': order.appliedVoucherDetails?.code || '',
        'Voucher Type': order.appliedVoucherDetails?.type || '',
        'Voucher Value': order.appliedVoucherDetails?.value || '',
        'Customer ID': order.userId || 'Guest',
        'Customer Name': customerName 
    };
  })
);

      const transactionWS = XLSX.utils.json_to_sheet(transactionData);
      transactionWS['!cols'] = [
        { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 10 },
        { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
        { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 20 }
      ];
      XLSX.utils.book_append_sheet(workbook, transactionWS, "Detailed Transactions");

      // 3. COMPREHENSIVE ITEM PERFORMANCE ANALYSIS
      const itemPerformanceMap = new Map();

      filteredOrders.forEach(order => {
        order.items?.forEach(item => {
          const key = item.name;
          if (!itemPerformanceMap.has(key)) {
            itemPerformanceMap.set(key, {
              name: item.name,
              imageUrl: item.imageUrl,
              totalQuantity: 0,
              totalRevenue: 0,
              totalOrders: 0,
              avgPrice: 0,
              orderIds: new Set()
            });
          }

          const itemData = itemPerformanceMap.get(key);
          itemData.totalQuantity += item.quantity || 0;
          itemData.totalRevenue += item.subtotal || 0;
          itemData.orderIds.add(order.id);
          itemData.avgPrice = itemData.totalRevenue / itemData.totalQuantity;
        });
      });

      const itemPerformanceArray = Array.from(itemPerformanceMap.values())
        .map(item => ({
          ...item,
          totalOrders: item.orderIds.size,
          revenuePercentage: (item.totalRevenue / totalRevenue) * 100
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      const itemData = itemPerformanceArray.map((item, index) => ({
        'Rank': index + 1,
        'Item Name': item.name,
        'Total Quantity Sold': item.totalQuantity.toLocaleString(),
        'Total Revenue': formatCurrency(item.totalRevenue),
        'Revenue %': item.revenuePercentage.toFixed(2) + '%',
        'Avg Price per Unit': formatCurrency(item.avgPrice),
        'Appeared in Orders': item.totalOrders.toLocaleString(),
        'Avg Qty per Order': (item.totalQuantity / item.totalOrders).toFixed(1)
      }));

      const itemWS = XLSX.utils.json_to_sheet(itemData);
      itemWS['!cols'] = [
        { wch: 6 }, { wch: 25 }, { wch: 12 }, { wch: 12 },
        { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(workbook, itemWS, "Item Performance Analysis");

      // 4. PAYMENT METHOD BREAKDOWN
      const paymentMethodMap = new Map();
      filteredOrders.forEach(order => {
        const method = order.paymentMethod || 'Unknown';
        if (!paymentMethodMap.has(method)) {
          paymentMethodMap.set(method, { count: 0, revenue: 0 });
        }
        const data = paymentMethodMap.get(method);
        data.count += 1;
        data.revenue += order.total || 0;
      });

      const paymentData = Array.from(paymentMethodMap.entries()).map(([method, data]) => ({
        'Payment Method': method.toUpperCase(),
        'Number of Orders': data.count.toLocaleString(),
        'Percentage of Orders': ((data.count / totalOrders) * 100).toFixed(2) + '%',
        'Total Revenue': formatCurrency(data.revenue),
        'Percentage of Revenue': ((data.revenue / totalRevenue) * 100).toFixed(2) + '%',
        'Average Order Value': formatCurrency(data.revenue / data.count)
      }));

      const paymentWS = XLSX.utils.json_to_sheet(paymentData);
      paymentWS['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, paymentWS, "Payment Method Analysis");

      // 5. VOUCHER USAGE ANALYSIS
      const voucherOrders = filteredOrders.filter(o => o.appliedVoucherDetails);
      if (voucherOrders.length > 0) {
        const voucherMap = new Map();

        voucherOrders.forEach(order => {
          const code = order.appliedVoucherDetails.code;
          if (!voucherMap.has(code)) {
            voucherMap.set(code, {
              code,
              type: order.appliedVoucherDetails.type,
              value: order.appliedVoucherDetails.value,
              usageCount: 0,
              totalSavings: 0,
              ordersAffected: []
            });
          }
          const voucherData = voucherMap.get(code);
          voucherData.usageCount += 1;
          voucherData.totalSavings += order.discountAmount || 0;
          voucherData.ordersAffected.push(order.id);
        });

        const voucherData = Array.from(voucherMap.values()).map(voucher => ({
          'Voucher Code': voucher.code,
          'Type': voucher.type,
          'Value': voucher.type === 'fixed' ? formatCurrency(voucher.value) : voucher.value + '%',
          'Times Used': voucher.usageCount.toLocaleString(),
          'Total Savings Given': formatCurrency(voucher.totalSavings),
          'Avg Savings per Use': formatCurrency(voucher.totalSavings / voucher.usageCount)
        }));

        const voucherWS = XLSX.utils.json_to_sheet(voucherData);
        voucherWS['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(workbook, voucherWS, "Voucher Usage Analysis");
      }

      // 6. DAILY SALES TREND
      const dailySalesMap = new Map();
      filteredOrders.forEach(order => {
        const date = new Date(order.timestamp).toDateString();
        if (!dailySalesMap.has(date)) {
          dailySalesMap.set(date, {
            date,
            orderCount: 0,
            revenue: 0,
            itemsSold: 0
          });
        }
        const dayData = dailySalesMap.get(date);
        dayData.orderCount += 1;
        dayData.revenue += order.total || 0;
        dayData.itemsSold += order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
      });

      const dailyData = Array.from(dailySalesMap.values())
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(day => ({
          'Date': day.date,
          'Orders': day.orderCount.toLocaleString(),
          'Revenue': formatCurrency(day.revenue),
          'Items Sold': day.itemsSold.toLocaleString(),
          'Avg Order Value': formatCurrency(day.revenue / day.orderCount)
        }));

      const dailyWS = XLSX.utils.json_to_sheet(dailyData);
      dailyWS['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, dailyWS, "Daily Sales Trend");

      // 7. ORDER ITEMS DETAIL (Every item from every order)
      const orderItemsDetail = [];
      filteredOrders.forEach(order => {
        order.items?.forEach(item => {
          orderItemsDetail.push({
            'Order Date': formatDate(order.timestamp),
            'Order ID': order.id?.substring(0, 8) || 'N/A',
            'Order Status': order.status,
            'Item Name': item.name,
            'Unit Price': formatCurrency(item.price),
            'Quantity': item.quantity,
            'Item Subtotal': formatCurrency(item.subtotal),
            'Order Total': formatCurrency(order.total),
            'Payment Method': order.paymentMethod,
            'Voucher Used': order.appliedVoucherDetails?.code || 'None'
          });
        });
      });

      const orderItemsWS = XLSX.utils.json_to_sheet(orderItemsDetail);
      orderItemsWS['!cols'] = [
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
        { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 10 },
        { wch: 12 }, { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(workbook, orderItemsWS, "Order Items Detail");

      // Generate filename
      const startStr = exportDateRange.startDate || 'all-time';
      const endStr = exportDateRange.endDate || 'current';
      const filename = `Comprehensive_Restaurant_Report_${startStr}_to_${endStr}.xlsx`;

      // Export the file
      XLSX.writeFile(workbook, filename);

      console.log(`📊 Comprehensive Excel report exported: ${filename}`);
      setShowExportModal(false);

    } catch (error) {
      console.error('Export error:', error);
      alert('Error generating comprehensive report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };
  const quickExportCurrentView = async () => {
    setIsExporting(true);

    try {
      let filteredOrders;
      let filename;
      let periodName;

      if (month === '') {
        // Export full year
        const start = new Date(year, 0, 1).getTime();
        const end = new Date(year + 1, 0, 1).getTime() - 1;
        filteredOrders = orders.filter(o => o.timestamp >= start && o.timestamp <= end);
        filename = `Quick_Comprehensive_Report_${year}.xlsx`;
        periodName = `Full Year ${year}`;
      } else {
        // Export specific month
        const start = new Date(year, +month - 1, 1).getTime();
        const end = new Date(year, +month, 1).getTime() - 1;
        filteredOrders = orders.filter(o => o.timestamp >= start && o.timestamp <= end);
        filename = `Quick_Comprehensive_Report_${months[+month]}_${year}.xlsx`;
        periodName = `${months[+month]} ${year}`;
      }

      const workbook = XLSX.utils.book_new();

      // Calculate all metrics
      const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      const totalSubtotal = filteredOrders.reduce((sum, order) => sum + (order.subtotal || 0), 0);
      const totalTax = filteredOrders.reduce((sum, order) => sum + (order.tax || 0), 0);
      const totalDiscount = filteredOrders.reduce((sum, order) => sum + (order.discountAmount || 0), 0);
      const totalOrders = filteredOrders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const completedOrders = filteredOrders.filter(o => o.status === 'completed');
      const paidOrders = filteredOrders.filter(o => o.paymentStatus === 'paid');
      const voucherOrders = filteredOrders.filter(o => o.appliedVoucherDetails);

      // 1. EXECUTIVE SUMMARY
      const summaryData = [
        ['QUICK COMPREHENSIVE RESTAURANT REPORT', '', '', ''],
        ['Period:', periodName, '', ''],
        ['Generated:', new Date().toLocaleString(), '', ''],
        ['', '', '', ''],

        ['FINANCIAL OVERVIEW', '', '', ''],
        ['Net Revenue (after discounts)', formatCurrency(totalRevenue), '', ''],
        ['Gross Revenue (before discounts)', formatCurrency(totalSubtotal + totalTax), '', ''],
        ['Total Discounts Applied', formatCurrency(totalDiscount), '', ''],
        ['Tax Collected', formatCurrency(totalTax), '', ''],
        ['Revenue excluding Tax', formatCurrency(totalRevenue - totalTax), '', ''],
        ['', '', '', ''],

        ['ORDER METRICS', '', '', ''],
        ['Total Orders', totalOrders.toLocaleString(), '', ''],
        ['Completed Orders', completedOrders.length.toLocaleString(), `${totalOrders > 0 ? ((completedOrders.length / totalOrders) * 100).toFixed(1) : 0}%`, ''],
        ['Paid Orders', paidOrders.length.toLocaleString(), `${totalOrders > 0 ? ((paidOrders.length / totalOrders) * 100).toFixed(1) : 0}%`, ''],
        ['Orders with Vouchers', voucherOrders.length.toLocaleString(), `${totalOrders > 0 ? ((voucherOrders.length / totalOrders) * 100).toFixed(1) : 0}%`, ''],
        ['Average Order Value', formatCurrency(avgOrderValue), '', '']
      ];

      const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWS['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, summaryWS, "Executive Summary");

      // 2. SALES TREND DATA (Enhanced)
      const trendWS = XLSX.utils.json_to_sheet(chartData.map(item => ({
        [hasMonth ? 'Day' : 'Month']: item[hasMonth ? 'day' : 'month'],
        'Sales Revenue': formatCurrency(item.sales),
        'Sales Amount': item.sales,
        'Period': hasMonth ? `${year}-${String(month).padStart(2, '0')}-${String(item.day).padStart(2, '0')}` : `${year}-${String(item.month).padStart(2, '0')}`
      })));
      trendWS['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, trendWS, hasMonth ? "Daily Sales Trend" : "Monthly Sales Trend");

      // 3. COMPREHENSIVE ITEM PERFORMANCE
      const itemPerformanceMap = new Map();

      filteredOrders.forEach(order => {
        order.items?.forEach(item => {
          const key = item.name;
          if (!itemPerformanceMap.has(key)) {
            itemPerformanceMap.set(key, {
              name: item.name,
              totalQuantity: 0,
              totalRevenue: 0,
              orderIds: new Set(),
              pricePoints: []
            });
          }

          const itemData = itemPerformanceMap.get(key);
          itemData.totalQuantity += item.quantity || 0;
          itemData.totalRevenue += item.subtotal || 0;
          itemData.orderIds.add(order.id);
          itemData.pricePoints.push(item.price || 0);
        });
      });

      const itemAnalysisData = Array.from(itemPerformanceMap.values())
        .map(item => ({
          name: item.name,
          totalQuantity: item.totalQuantity,
          totalRevenue: item.totalRevenue,
          totalOrders: item.orderIds.size,
          revenuePercentage: (item.totalRevenue / totalRevenue) * 100,
          avgPrice: item.totalRevenue / item.totalQuantity,
          avgQuantityPerOrder: item.totalQuantity / item.orderIds.size
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .map((item, index) => ({
          'Rank': index + 1,
          'Item Name': item.name,
          'Total Quantity Sold': item.totalQuantity.toLocaleString(),
          'Total Revenue': formatCurrency(item.totalRevenue),
          'Revenue Percentage': item.revenuePercentage.toFixed(2) + '%',
          'Average Price per Unit': formatCurrency(item.avgPrice),
          'Appeared in Orders': item.totalOrders.toLocaleString(),
          'Avg Qty per Order': item.avgQuantityPerOrder.toFixed(1)
        }));

      const itemWS = XLSX.utils.json_to_sheet(itemAnalysisData);
      itemWS['!cols'] = [
        { wch: 6 }, { wch: 25 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(workbook, itemWS, "Complete Item Analysis");

      // 4. ALL TRANSACTIONS DETAIL
      const transactionData = await Promise.all(
        filteredOrders.map(async (order) => {
        const customerName = await getUserName(order.userId);
        return {
        'Date': formatDate(order.timestamp),
        'Time': new Date(order.timestamp).toLocaleTimeString(),
        'Order ID': order.id?.substring(0, 8) || 'N/A',
        'Status': order.status || 'N/A',
        'Payment Status': order.paymentStatus || 'N/A',
        'Payment Method': order.paymentMethod || 'N/A',
        'Items Count': order.items?.length || 0,
        'Subtotal': formatCurrency(order.subtotal),
        'Tax': formatCurrency(order.tax),
        'Discount': formatCurrency(order.discountAmount),
        'Total': formatCurrency(order.total),
        'Voucher Code': order.appliedVoucherDetails?.code || 'None',
        'Customer ID': order.userId || 'Guest',
        'Customer Name': customerName 
    };
  })
);

      const transactionWS = XLSX.utils.json_to_sheet(transactionData);
      transactionWS['!cols'] = [
        { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
        { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 10 },
        { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 20 }
      ];
      XLSX.utils.book_append_sheet(workbook, transactionWS, "All Transactions");

      // 5. PAYMENT METHOD BREAKDOWN
      const paymentMethodMap = new Map();
      filteredOrders.forEach(order => {
        const method = order.paymentMethod || 'Unknown';
        if (!paymentMethodMap.has(method)) {
          paymentMethodMap.set(method, { count: 0, revenue: 0 });
        }
        const data = paymentMethodMap.get(method);
        data.count += 1;
        data.revenue += order.total || 0;
      });

      const paymentData = Array.from(paymentMethodMap.entries()).map(([method, data]) => ({
        'Payment Method': method.toUpperCase(),
        'Order Count': data.count.toLocaleString(),
        'Order Percentage': ((data.count / totalOrders) * 100).toFixed(2) + '%',
        'Total Revenue': formatCurrency(data.revenue),
        'Revenue Percentage': ((data.revenue / totalRevenue) * 100).toFixed(2) + '%',
        'Average Order Value': formatCurrency(data.revenue / data.count)
      }));

      const paymentWS = XLSX.utils.json_to_sheet(paymentData);
      paymentWS['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, paymentWS, "Payment Analysis");

      XLSX.writeFile(workbook, filename);
      console.log(`📊 Quick comprehensive export completed: ${filename}`);

    } catch (error) {
      console.error('Quick comprehensive export error:', error);
      alert('Error generating quick comprehensive export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };


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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className={styles.realtimeIndicator}>
            <span className={styles.liveDot}></span>
            <span>Live Data ({orders.length} orders)</span>
          </div>

          {/* Export Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={quickExportCurrentView}
              disabled={isExporting || chartData.length === 0}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#10B981',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: isExporting ? 'wait' : 'pointer',
                fontSize: '0.875rem',
                opacity: (isExporting || chartData.length === 0) ? 0.6 : 1
              }}
            >
              {isExporting ? '⏳ Exporting...' : '📊 Quick Export'}
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#3B82F6',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              📁 Custom Export
            </button>
          </div>
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
                      <strong>{it.name}</strong><br />
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
                      <strong>{it.name}</strong><br />
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

      {/* Export Modal */}
      {showExportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '0.5rem',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 'bold' }}>
              📁 Custom Excel Export
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Start Date (optional):
              </label>
              <input
                type="date"
                value={exportDateRange.startDate}
                onChange={(e) => setExportDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.375rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                End Date (optional):
              </label>
              <input
                type="date"
                value={exportDateRange.endDate}
                onChange={(e) => setExportDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.375rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowExportModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6B7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                onClick={generateExcelReport}
                disabled={isExporting}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3B82F6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: isExporting ? 'wait' : 'pointer',
                  opacity: isExporting ? 0.6 : 1
                }}
              >
                {isExporting ? '⏳ Generating...' : '📊 Generate Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}