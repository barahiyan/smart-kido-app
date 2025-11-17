import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { useAppContext } from '../contexts/AppContext';
import Card from './ui/Card';
import Button from './ui/Button';
import { ProductCategory } from '../types';
import { ClothesIcon, CosmeticsIcon, DevicesIcon, HomeItemsIcon, OtherIcon, SparklesIcon } from '../utils/icons';
import { categoryToTranslationKey } from '../utils/helpers';
import AIAnalystModal from './AIAnalystModal';

const Dashboard: React.FC = () => {
  const { t, sales, customers, products, purchases, getCustomerBalance, formatCurrency, formatDate } = useAppContext();
  const [isAnalystModalOpen, setIsAnalystModalOpen] = useState(false);

  const { totalSales, totalDebt, totalPayable, totalProfit, bestSellingCategory, salesTrendData, salesByCategoryData } = useMemo(() => {
    const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    
    const totalDebt = customers
      .filter(c => c.paymentType === 'Credit')
      .reduce((sum, customer) => sum + getCustomerBalance(customer.id), 0);

    const totalPayable = purchases
      .filter(p => p.purchaseType === 'Credit')
      .reduce((total, purchase) => {
          const paid = purchase.payments.reduce((sum, pay) => sum + pay.amount, 0);
          return total + (purchase.totalAmount - paid);
      }, 0);
    
    const totalProfit = sales.reduce((sum, sale) => {
        const product = products.find(p => p.id === sale.productId);
        const costOfGoods = product ? product.costPrice * sale.quantity : 0;
        return sum + (sale.totalAmount - costOfGoods);
    }, 0);

    const categoryCounts: { [key in ProductCategory]: number } = {
        [ProductCategory.Cosmetics]: 0,
        [ProductCategory.Clothes]: 0,
        [ProductCategory.Devices]: 0,
        [ProductCategory.HomeItems]: 0,
        [ProductCategory.Other]: 0,
    };
    
    sales.forEach(sale => {
        const product = products.find(p => p.id === sale.productId);
        if (product) {
          categoryCounts[product.category] += sale.quantity;
        }
    });
    
    const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
    const bestSellingCategory = sortedCategories.length > 0 ? sortedCategories[0][0] : 'N/A';
    
    const salesTrend: { [key: string]: number } = {};
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        salesTrend[key] = 0;
    }
    sales.forEach(sale => {
        const saleDate = sale.date.split('T')[0];
        if (salesTrend[saleDate] !== undefined) {
            salesTrend[saleDate] += sale.totalAmount;
        }
    });
    const salesTrendData = Object.entries(salesTrend).map(([date, total]) => ({
        date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        [t('sales')]: total
    }));
    
    const salesByCategoryData = Object.entries(categoryCounts)
        .map(([name, value]) => ({ name: t(categoryToTranslationKey(name)), value }))
        .filter(item => item.value > 0);

    return { totalSales, totalDebt, totalPayable, totalProfit, bestSellingCategory, salesTrendData, salesByCategoryData };
  }, [sales, customers, products, purchases, getCustomerBalance, t]);

  const recentSales = sales.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  const debtors = customers.map(c => ({...c, balance: getCustomerBalance(c.id)})).filter(c => c.balance > 0).sort((a,b) => b.balance - a.balance).slice(0, 5);
  const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= 5).sort((a,b) => a.stock - b.stock);

  const CategoryIcons: { [key: string]: React.ReactNode } = {
    [ProductCategory.Cosmetics]: <CosmeticsIcon className="w-5 h-5" />,
    [ProductCategory.Clothes]: <ClothesIcon className="w-5 h-5" />,
    [ProductCategory.Devices]: <DevicesIcon className="w-5 h-5" />,
    [ProductCategory.HomeItems]: <HomeItemsIcon className="w-5 h-5" />,
    [ProductCategory.Other]: <OtherIcon className="w-5 h-5" />,
  };
  
  const COLORS = ['#0ea5e9', '#84cc16', '#f97316', '#a855f7', '#64748b'];

  const renderActiveShape = (props: any) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="font-bold">
          {payload.name}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`${t('quantity')}: ${value}`}</text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
          {`(Rate ${(percent * 100).toFixed(2)}%)`}
        </text>
      </g>
    );
  };
  
  const [activeIndex, setActiveIndex] = React.useState(0);
  const onPieEnter = React.useCallback((_: any, index: number) => {
    setActiveIndex(index);
  }, []);


  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-dark">{t('dashboard')}</h1>
        <Button onClick={() => setIsAnalystModalOpen(true)}>
            <SparklesIcon className="mr-2" /> {t('askAIAnalyst')}
        </Button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <h4 className="text-slate-500 font-medium">{t('totalSales')}</h4>
          <p className="text-2xl sm:text-3xl font-bold text-dark mt-2">{formatCurrency(totalSales)}</p>
        </Card>
        <Card>
          <h4 className="text-slate-500 font-medium">{t('totalDebt')}</h4>
          <p className="text-2xl sm:text-3xl font-bold text-red-500 mt-2">{formatCurrency(totalDebt)}</p>
        </Card>
        <Card>
          <h4 className="text-slate-500 font-medium">{t('totalPayable')}</h4>
          <p className="text-2xl sm:text-3xl font-bold text-orange-500 mt-2">{formatCurrency(totalPayable)}</p>
        </Card>
        <Card>
          <h4 className="text-slate-500 font-medium">{t('totalProfit')}</h4>
          <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-2">{formatCurrency(totalProfit)}</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <Card className="lg:col-span-3" title={t('salesTrend')}>
           <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={salesTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="date" tick={{fontSize: 12}} />
                <YAxis tickFormatter={(value) => `${value/1000}k`} tick={{fontSize: 12}}/>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey={t('sales')} fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="lg:col-span-2" title={t('salesByCategory')}>
            <div style={{ width: '100%', height: 300 }}>
             <ResponsiveContainer>
                <PieChart>
                    <Pie 
                        activeIndex={activeIndex}
                        activeShape={renderActiveShape}
                        data={salesByCategoryData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={60}
                        outerRadius={80} 
                        fill="#8884d8"
                        dataKey="value"
                        onMouseEnter={onPieEnter}
                    >
                        {salesByCategoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                </PieChart>
             </ResponsiveContainer>
            </div>
        </Card>
      </div>

      {/* Recent Sales & Debtors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title={t('recentSales')} className="lg:col-span-1">
            <div className="divide-y divide-slate-100">
                {recentSales.length > 0 ? recentSales.map(sale => {
                    const customer = customers.find(c => c.id === sale.customerId);
                    const product = products.find(p => p.id === sale.productId);
                    return (
                        <div key={sale.id} className="py-3 flex items-center justify-between">
                            <div className="flex items-center">
                                <span className="p-2 bg-primary-100 text-primary-600 rounded-full mr-3">{CategoryIcons[(product && product.category) || 'Other']}</span>
                                <div>
                                    <p className="font-semibold">{(product && product.name) || 'N/A'}</p>
                                    <p className="text-sm text-slate-500">{(customer && customer.name) || 'N/A'} - {formatDate(sale.date)}</p>
                                </div>
                            </div>
                            <span className="font-bold text-dark">{formatCurrency(sale.totalAmount)}</span>
                        </div>
                    )
                }) : <p className="text-slate-500 text-center py-4">{t('noData')}</p>}
            </div>
        </Card>
        <Card title={t('debtors')} className="lg:col-span-1">
            <div className="divide-y divide-slate-100">
                {debtors.length > 0 ? debtors.map(customer => (
                     <div key={customer.id} className="py-3 flex items-center justify-between">
                        <div>
                            <p className="font-semibold">{customer.name}</p>
                            <p className="text-sm text-slate-500">{customer.phone}</p>
                        </div>
                        <span className="font-bold text-red-500">{formatCurrency(customer.balance)}</span>
                    </div>
                )) : <p className="text-slate-500 text-center py-4">{t('noData')}</p>}
            </div>
        </Card>
        <Card title={t('lowStockAlert')} className="lg:col-span-1">
            <div className="divide-y divide-slate-100">
                {lowStockProducts.length > 0 ? lowStockProducts.map(product => (
                     <div key={product.id} className="py-3 flex items-center justify-between">
                        <div>
                            <p className="font-semibold">{product.name}</p>
                            <p className="text-sm text-slate-500">{t(categoryToTranslationKey(product.category))}</p>
                        </div>
                        <span className="font-bold text-orange-500">{product.stock} {t('stockRemaining')}</span>
                    </div>
                )) : <p className="text-slate-500 text-center py-4">{t('noData')}</p>}
            </div>
        </Card>
      </div>
      
      <AIAnalystModal 
        isOpen={isAnalystModalOpen} 
        onClose={() => setIsAnalystModalOpen(false)}
        sales={sales}
        products={products}
        customers={customers}
        purchases={purchases}
      />
    </div>
  );
};

export default Dashboard;
