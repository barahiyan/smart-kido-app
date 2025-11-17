

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { downloadCSV } from '../utils/helpers';
import Button from './ui/Button';
import Card from './ui/Card';
import Input from './ui/Input';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Reports: React.FC = () => {
  const { t, sales, customers, products, purchases, getCustomerBalance, formatCurrency, formatDate } = useAppContext();

  const initialDateRange = useMemo(() => {
    if (sales.length === 0) {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start: firstDay.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      };
    }

    // Use all sales to determine the date range
    const sortedSales = [...sales].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstSaleDate = new Date(sortedSales[0].date);
    
    // Set start date to the beginning of the month of the first sale for a cleaner range
    const startDate = new Date(firstSaleDate.getFullYear(), firstSaleDate.getMonth(), 1);
    const today = new Date();

    return {
      start: startDate.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
    };
  }, [sales]);
  
  const [startDate, setStartDate] = useState(initialDateRange.start);
  const [endDate, setEndDate] = useState(initialDateRange.end);

  const setDateRange = (type: 'thisMonth' | 'last30Days') => {
    const end = new Date();
    const start = new Date();
    if (type === 'thisMonth') {
      start.setDate(1);
    } else { // last30Days
      start.setDate(end.getDate() - 30);
    }
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const reportData = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0,0,0,0);
    const end = new Date(endDate);
    end.setHours(23,59,59,999);

    const filteredSales = sales.filter(s => {
      const saleDate = new Date(s.date);
      return saleDate >= start && saleDate <= end;
    });

    const filteredPurchases = purchases.filter(p => {
        const purchaseDate = new Date(p.date);
        return purchaseDate >= start && purchaseDate <= end;
    });
    
    const totalSales = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalProfit = filteredSales.reduce((sum, sale) => {
        const product = products.find(p => p.id === sale.productId);
        const costOfGoods = product ? product.costPrice * sale.quantity : 0;
        return sum + (sale.totalAmount - costOfGoods);
    }, 0);

    const salesByDay: {[key: string]: { sales: number; profit: number }} = {};
    filteredSales.forEach(sale => {
      const day = sale.date.split('T')[0];
      if (!salesByDay[day]) {
        salesByDay[day] = { sales: 0, profit: 0 };
      }
      const product = products.find(p => p.id === sale.productId);
      const costOfGoods = product ? product.costPrice * sale.quantity : 0;
      salesByDay[day].sales += sale.totalAmount;
      salesByDay[day].profit += (sale.totalAmount - costOfGoods);
    });

    const salesVsProfitData = Object.entries(salesByDay)
      .map(([date, data]) => ({ date, [t('sales')]: data.sales, [t('profit')]: data.profit }))
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const productPerformance: {[key: string]: { name: string, quantitySold: number, totalRevenue: number, totalCost: number, totalProfit: number }} = {};
    filteredSales.forEach(sale => {
      const product = products.find(p => p.id === sale.productId);
      if (!product) return;

      if (!productPerformance[product.id]) {
        productPerformance[product.id] = { name: product.name, quantitySold: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0 };
      }
      
      const perf = productPerformance[product.id];
      perf.quantitySold += sale.quantity;
      perf.totalRevenue += sale.totalAmount;
      const cost = product.costPrice * sale.quantity;
      perf.totalCost += cost;
      perf.totalProfit += (sale.totalAmount - cost);
    });

    const topSellingProducts = Object.values(productPerformance).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);
    const profitabilityByProduct = Object.values(productPerformance).sort((a,b) => b.totalProfit - a.totalProfit);

    return {
      totalSales,
      totalPurchases,
      totalProfit,
      numberOfSales: filteredSales.length,
      salesVsProfitData,
      topSellingProducts,
      profitabilityByProduct
    };

  }, [startDate, endDate, sales, products, purchases, t]);

  const handlePrint = () => {
    window.print();
  }

  const handleDownloadSalesReport = () => {
    const headers = [t('date'), t('productName'), t('category'), t('customer'), t('quantity'), t('unitPrice'), t('totalAmount'), t('profit')].join(',');
    const rows = sales.map(sale => {
      const customer = customers.find(c => c.id === sale.customerId);
      const product = products.find(p => p.id === sale.productId);
      const profit = product ? (sale.unitPrice - product.costPrice) * sale.quantity : 0;
      return [new Date(sale.date).toLocaleDateString(), `"${product?.name || 'N/A'}"`, product?.category || 'N/A', `"${customer?.name || 'N/A'}"`, sale.quantity, sale.unitPrice, sale.totalAmount, profit].join(',');
    }).join('\n');
    downloadCSV(headers + '\n' + rows, 'sales_report.csv');
  };

  const handleDownloadDebtReport = () => {
    const headers = [t('customer'), t('phone'), t('balance')].join(',');
    const debtors = customers.map(c => ({ ...c, balance: getCustomerBalance(c.id) })).filter(c => c.balance > 0);
    const rows = debtors.map(customer => [`"${customer.name}"`, customer.phone, customer.balance].join(',')).join('\n');
    downloadCSV(headers + '\n' + rows, 'debt_report.csv');
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 no-print">
        <h1 className="text-3xl font-bold text-dark">{t('reports')}</h1>
        <div className="flex items-center gap-2">
            <Button onClick={handleDownloadSalesReport} variant="secondary">{t('salesReport')}</Button>
            <Button onClick={handleDownloadDebtReport} variant="secondary">{t('debtReport')}</Button>
            <Button onClick={handlePrint}>{t('printReport')}</Button>
        </div>
      </div>
      
      <Card className="mb-6 no-print">
        <div className="flex flex-wrap items-end gap-4">
          <h3 className="text-lg font-semibold">{t('dateRange')}</h3>
          <Input id="startDate" label={t('from')} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <Input id="endDate" label={t('to')} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          <Button variant="secondary" onClick={() => setDateRange('thisMonth')}>{t('thisMonth')}</Button>
          <Button variant="secondary" onClick={() => setDateRange('last30Days')}>{t('last30Days')}</Button>
        </div>
      </Card>
      
      <div id="print-area">
        <div className="mb-6 block print:block hidden">
            <h1 className="text-2xl font-bold text-center">{t('appName')}</h1>
            <p className="text-center text-slate-600">{t('reportFor')}: {formatDate(startDate)} - {formatDate(endDate)}</p>
        </div>

        {/* --- SUMMARY CARDS --- */}
        <Card title={t('summary')} className="mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <h4 className="text-slate-500 font-medium">{t('totalSales')}</h4>
                    <p className="text-2xl font-bold text-dark mt-1">{formatCurrency(reportData.totalSales)}</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <h4 className="text-slate-500 font-medium">{t('totalProfit')}</h4>
                    <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(reportData.totalProfit)}</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <h4 className="text-slate-500 font-medium">{t('totalPurchases')}</h4>
                    <p className="text-2xl font-bold text-dark mt-1">{formatCurrency(reportData.totalPurchases)}</p>
                </div>
                 <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <h4 className="text-slate-500 font-medium">{t('numberOfSales')}</h4>
                    <p className="text-2xl font-bold text-dark mt-1">{reportData.numberOfSales}</p>
                </div>
            </div>
        </Card>

        {/* --- CHARTS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card title={t('profitVsSales')}>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <LineChart data={reportData.salesVsProfitData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tickFormatter={formatDate} />
                            <YAxis />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                            <Line type="monotone" dataKey={t('sales')} stroke="#0ea5e9" strokeWidth={2} />
                            <Line type="monotone" dataKey={t('profit')} stroke="#16a34a" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </Card>
             <Card title={t('topSellingProducts')}>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <BarChart data={reportData.topSellingProducts} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={120} tick={{fontSize: 12}} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                            <Bar dataKey="totalRevenue" name={t('totalRevenue')} fill="#38bdf8" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>

        {/* --- PROFITABILITY TABLE --- */}
        <Card title={t('profitabilityByProduct')}>
            <div className="overflow-x-auto">
                <table className="min-w-full w-full text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-3 text-sm font-semibold text-slate-600">{t('productName')}</th>
                            <th className="p-3 text-sm font-semibold text-slate-600">{t('quantitySold')}</th>
                            <th className="p-3 text-sm font-semibold text-slate-600">{t('totalRevenue')}</th>
                            <th className="p-3 text-sm font-semibold text-slate-600">{t('totalCost')}</th>
                            <th className="p-3 text-sm font-semibold text-slate-600">{t('totalProfitByProduct')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.profitabilityByProduct.map(p => (
                            <tr key={p.name} className="border-b border-slate-100">
                                <td className="p-3 font-medium whitespace-nowrap">{p.name}</td>
                                <td className="p-3 whitespace-nowrap">{p.quantitySold}</td>
                                <td className="p-3 whitespace-nowrap">{formatCurrency(p.totalRevenue)}</td>
                                <td className="p-3 whitespace-nowrap">{formatCurrency(p.totalCost)}</td>
                                <td className="p-3 font-semibold text-green-700 whitespace-nowrap">{formatCurrency(p.totalProfit)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {reportData.profitabilityByProduct.length === 0 && <p className="text-center text-slate-500 py-8">{t('noData')}</p>}
            </div>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
