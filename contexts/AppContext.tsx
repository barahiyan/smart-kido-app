

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { ProductCategory, type AppContextType, type Customer, type Language, type Sale, type Payment, type Product, type User, type Supplier, type Purchase, type AppDataBackup } from '../types';
import { translations } from '../utils/translations';
import useLocalStorage from '../hooks/useLocalStorage';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useLocalStorage<Language>('app-language', 'sw');
  const [customers, setCustomers] = useLocalStorage<Customer[]>('app-customers', DUMMY_DATA.customers);
  const [sales, setSales] = useLocalStorage<Sale[]>('app-sales', DUMMY_DATA.sales);
  const [products, setProducts] = useLocalStorage<Product[]>('app-products', DUMMY_DATA.products);
  const [users, setUsers] = useLocalStorage<User[]>('app-users', DUMMY_USERS);
  const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>('app-suppliers', DUMMY_DATA.suppliers);
  const [purchases, setPurchases] = useLocalStorage<Purchase[]>('app-purchases', DUMMY_DATA.purchases);


  const t = useCallback((key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  }, [language]);

  const addCustomer = (customerData: Omit<Customer, 'id'>): Customer => {
    const newCustomer: Customer = {
      ...customerData,
      id: new Date().toISOString() + Math.random(),
    };
    setCustomers(prev => [...prev, newCustomer]);
    return newCustomer;
  };

  const updateCustomer = (updatedCustomer: Customer) => {
    setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
  };

  const deleteCustomer = (customerId: string) => {
    setCustomers(prev => prev.filter(c => c.id !== customerId));
    setSales(prev => prev.filter(s => s.customerId !== customerId));
  };
  
  const addSale = (saleData: Omit<Sale, 'id'>) => {
    const newSale: Sale = {
      ...saleData,
      id: new Date().toISOString() + Math.random(),
    };
    setSales(prev => [...prev, newSale]);
    // Decrement stock
    setProducts(prev => prev.map(p => 
      p.id === newSale.productId ? { ...p, stock: p.stock - newSale.quantity } : p
    ));
  };

  const updateSale = (updatedSale: Sale) => {
    const originalSale = sales.find(s => s.id === updatedSale.id);
    if (!originalSale) return;

    setProducts(prevProducts => {
        const newProducts = [...prevProducts];
        const originalProductIndex = newProducts.findIndex(p => p.id === originalSale.productId);
        const updatedProductIndex = newProducts.findIndex(p => p.id === updatedSale.productId);

        if (originalSale.productId === updatedSale.productId) {
            // Product is the same, just adjust quantity based on difference
            if (originalProductIndex !== -1) {
                const quantityDifference = originalSale.quantity - updatedSale.quantity;
                newProducts[originalProductIndex].stock += quantityDifference;
            }
        } else {
            // Product has changed, revert old stock and apply new stock
            if (originalProductIndex !== -1) {
                newProducts[originalProductIndex].stock += originalSale.quantity;
            }
            if (updatedProductIndex !== -1) {
                newProducts[updatedProductIndex].stock -= updatedSale.quantity;
            }
        }
        return newProducts;
    });

    setSales(prev => prev.map(s => s.id === updatedSale.id ? updatedSale : s));
  };

  const deleteSale = (saleId: string) => {
    const saleToDelete = sales.find(s => s.id === saleId);
    if (!saleToDelete) return;

    // Return items to stock
    setProducts(prev => prev.map(p =>
        p.id === saleToDelete.productId ? { ...p, stock: p.stock + saleToDelete.quantity } : p
    ));

    setSales(prev => prev.filter(s => s.id !== saleId));
  };

  const recordPayment = (saleId: string, paymentData: Omit<Payment, 'id'>) => {
    const newPayment: Payment = {
      ...paymentData,
      id: new Date().toISOString() + Math.random(),
    };
    setSales(prev => prev.map(sale => {
      if (sale.id === saleId) {
        return {
          ...sale,
          payments: [...sale.payments, newPayment]
        };
      }
      return sale;
    }));
  };

  const deletePayment = (saleId: string, paymentId: string) => {
    setSales(prev => prev.map(sale => {
        if (sale.id === saleId) {
            return {
                ...sale,
                payments: sale.payments.filter(p => p.id !== paymentId)
            };
        }
        return sale;
    }));
  };

  const addProduct = (productData: Omit<Product, 'id' | 'stock'>) => {
    const newProduct: Product = {
        ...productData,
        id: new Date().toISOString() + Math.random(),
        stock: 0
    };
    setProducts(prev => [...prev, newProduct]);
  };

  const updateProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => 
      p.id === updatedProduct.id ? 
      { ...p, 
        name: updatedProduct.name, 
        category: updatedProduct.category, 
        costPrice: updatedProduct.costPrice, 
        sellingPrice: updatedProduct.sellingPrice 
      } : p));
  }

  const deleteProduct = (productId: string): boolean => {
    const isInUse = sales.some(s => s.productId === productId) || purchases.some(p => p.productId === productId);
    if (isInUse) {
      return false;
    }
    setProducts(prev => prev.filter(p => p.id !== productId));
    return true;
  }

  const addSupplier = (supplierData: Omit<Supplier, 'id'>): Supplier => {
    const newSupplier: Supplier = {
      ...supplierData,
      id: new Date().toISOString() + Math.random(),
    };
    setSuppliers(prev => [...prev, newSupplier]);
    return newSupplier;
  }

  const updateSupplier = (updatedSupplier: Supplier) => {
    setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
  }

  const deleteSupplier = (supplierId: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== supplierId));
    setPurchases(prev => prev.filter(p => p.supplierId !== supplierId));
  }

  const addPurchase = (purchaseData: Omit<Purchase, 'id'>) => {
    const newPurchase: Purchase = {
        ...purchaseData,
        id: new Date().toISOString() + Math.random(),
    };
    setPurchases(prev => [...prev, newPurchase]);
    // Increment stock
    setProducts(prev => prev.map(p =>
        p.id === newPurchase.productId ? { ...p, stock: p.stock + newPurchase.quantity } : p
    ));
  }

  const updatePurchase = (updatedPurchase: Purchase) => {
    const originalPurchase = purchases.find(p => p.id === updatedPurchase.id);
    if (!originalPurchase) return;

    setProducts(prevProducts => {
        const newProducts = [...prevProducts];
        const originalProductIndex = newProducts.findIndex(p => p.id === originalPurchase.productId);
        const updatedProductIndex = newProducts.findIndex(p => p.id === updatedPurchase.productId);

        if (originalPurchase.productId === updatedPurchase.productId) {
            // Product is the same, just adjust quantity
            if (originalProductIndex !== -1) {
                const quantityDifference = updatedPurchase.quantity - originalPurchase.quantity;
                newProducts[originalProductIndex].stock += quantityDifference;
            }
        } else {
            // Product has changed
            // Revert stock on old product
            if (originalProductIndex !== -1) {
                 newProducts[originalProductIndex].stock -= originalPurchase.quantity;
            }
            // Add stock to new product
            if (updatedProductIndex !== -1) {
                 newProducts[updatedProductIndex].stock += updatedPurchase.quantity;
            }
        }
        return newProducts;
    });

    setPurchases(prev => prev.map(p => p.id === updatedPurchase.id ? updatedPurchase : p));
  };

  const deletePurchase = (purchaseId: string) => {
    const purchaseToDelete = purchases.find(p => p.id === purchaseId);
    if (!purchaseToDelete) return;

    // Remove items from stock
    setProducts(prev => prev.map(p =>
        p.id === purchaseToDelete.productId ? { ...p, stock: p.stock - purchaseToDelete.quantity } : p
    ));

    setPurchases(prev => prev.filter(p => p.id !== purchaseId));
  };

  const recordSupplierPayment = (purchaseId: string, paymentData: Omit<Payment, 'id'>) => {
    const newPayment: Payment = {
        ...paymentData,
        id: new Date().toISOString() + Math.random(),
    };
    setPurchases(prev => prev.map(purchase => {
        if (purchase.id === purchaseId) {
            return {
                ...purchase,
                payments: [...purchase.payments, newPayment]
            };
        }
        return purchase;
    }));
  }

  const deleteSupplierPayment = (purchaseId: string, paymentId: string) => {
    setPurchases(prev => prev.map(purchase => {
        if (purchase.id === purchaseId) {
            return {
                ...purchase,
                payments: purchase.payments.filter(p => p.id !== paymentId)
            };
        }
        return purchase;
    }));
  };

  const updatePassword = (username: string, currentPin: string, newPin: string): boolean => {
    const user = users.find(u => u.username === username);
    if (user && user.pin === currentPin) {
      setUsers(prevUsers => prevUsers.map(u => u.username === username ? { ...u, pin: newPin } : u));
      return true;
    }
    return false;
  };

  const resetData = () => {
    setCustomers([]);
    setSales([]);
    setProducts([]);
    setSuppliers([]);
    setPurchases([]);
  }

  const exportData = () => {
    const backupData: AppDataBackup = {
      customers,
      sales,
      products,
      suppliers,
      purchases
    };
    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `smart-kido-backup-${date}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importData = (data: AppDataBackup) => {
    setCustomers(data.customers || []);
    setSales(data.sales || []);
    setProducts(data.products || []);
    setSuppliers(data.suppliers || []);
    setPurchases(data.purchases || []);
  };

  const getCustomerBalance = useCallback((customerId: string): number => {
    const customerSales = sales.filter(s => s.customerId === customerId);
    return customerSales.reduce((totalDebt, sale) => {
      const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
      return totalDebt + (sale.totalAmount - totalPaid);
    }, 0);
  }, [sales]);

  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat(language === 'sw' ? 'sw-TZ' : 'en-US', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
    }).format(amount);
  }, [language]);

  const formatDate = useCallback((dateString: string): string => {
     return new Date(dateString).toLocaleDateString(language === 'sw' ? 'sw-TZ' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }, [language]);

  const value = useMemo(() => ({
    language, setLanguage, t,
    customers, addCustomer, updateCustomer, deleteCustomer,
    sales, addSale, updateSale, deleteSale, recordPayment, deletePayment,
    getCustomerBalance,
    products, addProduct, updateProduct, deleteProduct,
    users, updatePassword,
    suppliers, addSupplier, updateSupplier, deleteSupplier,
    purchases, addPurchase, updatePurchase, deletePurchase, recordSupplierPayment, deleteSupplierPayment,
    resetData,
    exportData,
    importData,
    formatCurrency, formatDate,
  }), [language, t, customers, sales, products, users, suppliers, purchases, getCustomerBalance, formatCurrency, formatDate]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// --- DUMMY DATA GENERATION ---

const DUMMY_USERS: User[] = [
    { username: 'Owner', pin: '1234' },
    { username: 'Seller', pin: '5678' },
];

const DUMMY_PRODUCTS_SEED: Omit<Product, 'id' | 'stock'>[] = [
    { name: 'Handbag', category: ProductCategory.Clothes, costPrice: 25000, sellingPrice: 35000 },
    { name: 'Face Cream', category: ProductCategory.Cosmetics, costPrice: 10000, sellingPrice: 15000 },
    { name: 'Bluetooth Speaker', category: ProductCategory.Devices, costPrice: 60000, sellingPrice: 80000 },
    { name: 'Blender', category: ProductCategory.HomeItems, costPrice: 90000, sellingPrice: 120000 },
    { name: 'Lipstick', category: ProductCategory.Cosmetics, costPrice: 5000, sellingPrice: 8000 },
];

const DUMMY_CUSTOMERS_SEED: Omit<Customer, 'id'>[] = [
    { name: 'Asha Juma', phone: '0712345678', address: 'Mbezi Beach, Dar es Salaam', paymentType: 'Credit', notes: 'Pays at the end of the month' },
    { name: 'John Doe', phone: '0655123456', address: 'Sinza, Dar es Salaam', paymentType: 'Cash', notes: '' },
    { name: 'Fatuma Hamisi', phone: '0788990011', address: 'Kariakoo, Dar es Salaam', paymentType: 'Credit', notes: 'Buys clothes in bulk' },
];

const DUMMY_SUPPLIERS_SEED: Omit<Supplier, 'id'>[] = [
    { name: 'Kariakoo Supplies', phone: '0711112222', address: 'Kariakoo', notes: 'Main supplier for cosmetics' },
    { name: 'China Town Electronics', phone: '0688998877', address: 'Mlimani City', notes: 'Gadgets supplier' }
];

type PurchaseSeed = Omit<Purchase, 'id' | 'productId' | 'supplierId'> & { productName: string; supplierName?: string; };

const DUMMY_PURCHASES_SEED: PurchaseSeed[] = [
    { productName: 'Handbag', supplierName: 'Kariakoo Supplies', quantity: 20, costPrice: 25000, totalAmount: 500000, date: '2023-10-15T09:00:00Z', purchaseType: 'Credit', payments: [{id: 'pp1', amount: 300000, date: '2023-10-20T09:00:00Z'}] },
    { productName: 'Face Cream', supplierName: 'Kariakoo Supplies', quantity: 50, costPrice: 10000, totalAmount: 500000, date: '2023-10-16T11:00:00Z', purchaseType: 'Cash', payments: [] },
    { productName: 'Bluetooth Speaker', supplierName: 'China Town Electronics', quantity: 10, costPrice: 60000, totalAmount: 600000, date: '2023-10-17T14:00:00Z', purchaseType: 'Credit', payments: [] },
    { productName: 'Blender', quantity: 5, costPrice: 90000, totalAmount: 450000, date: '2023-10-18T10:00:00Z', purchaseType: 'Cash', payments: [] },
    { productName: 'Lipstick', supplierName: 'Kariakoo Supplies', quantity: 50, costPrice: 5000, totalAmount: 250000, date: '2023-10-19T12:00:00Z', purchaseType: 'Credit', payments: [{id: 'pp2', amount: 100000, date: '2023-10-25T12:00:00Z'}]},
];

type SaleSeed = Omit<Sale, 'id' | 'customerId' | 'productId'> & { customerName: string; productName: string; };

const DUMMY_SALES_SEED: SaleSeed[] = [
    { customerName: 'Asha Juma', productName: 'Handbag', quantity: 1, unitPrice: 35000, totalAmount: 35000, date: '2023-10-25T10:00:00Z', payments: [{id: 'p1', amount: 15000, date: '2023-10-25T10:00:00Z'}] },
    { customerName: 'John Doe', productName: 'Face Cream', quantity: 2, unitPrice: 15000, totalAmount: 30000, date: '2023-10-24T14:30:00Z', payments: [{id: 'p2', amount: 30000, date: '2023-10-24T14:30:00Z'}] },
    { customerName: 'Fatuma Hamisi', productName: 'Bluetooth Speaker', quantity: 1, unitPrice: 80000, totalAmount: 80000, date: '2023-10-22T09:00:00Z', payments: [] },
    { customerName: 'Asha Juma', productName: 'Blender', quantity: 1, unitPrice: 120000, totalAmount: 120000, date: '2023-10-20T11:00:00Z', payments: [{id: 'p3', amount: 50000, date: '2023-10-20T11:00:00Z'}, {id: 'p4', amount: 30000, date: '2023-10-28T15:00:00Z'}] },
    { customerName: 'Asha Juma', productName: 'Lipstick', quantity: 2, unitPrice: 8000, totalAmount: 16000, date: '2023-10-29T11:00:00Z', payments: []}
];

const generateInitialData = () => {
    const customers = DUMMY_CUSTOMERS_SEED.map((c, i) => ({ ...c, id: `cust-${i}` }));
    const products = DUMMY_PRODUCTS_SEED.map((p, i) => ({ ...p, id: `prod-${i}`, stock: 0 }));
    const suppliers = DUMMY_SUPPLIERS_SEED.map((s, i) => ({ ...s, id: `supp-${i}`}));

    const purchases = DUMMY_PURCHASES_SEED.map((p, i) => {
        const product = products.find(prod => prod.name === p.productName);
        const supplier = suppliers.find(s => s.name === p.supplierName);
        const { productName, supplierName, ...purchaseData } = p;
        return { ...purchaseData, id: `purch-${i}`, productId: (product && product.id) || '', supplierId: supplier && supplier.id };
    });

    const sales = DUMMY_SALES_SEED.map((s, i) => {
        const customer = customers.find(c => c.name === s.customerName);
        const product = products.find(p => p.name === s.productName);
        const { customerName, productName, ...saleData } = s;
        return { ...saleData, id: `sale-${i}`, customerId: (customer && customer.id) || '', productId: (product && product.id) || '' };
    });

    // Calculate final stock
    const stockMap = new Map<string, number>();
    products.forEach(p => stockMap.set(p.id, 0));

    purchases.forEach(p => {
        stockMap.set(p.productId, (stockMap.get(p.productId) || 0) + p.quantity);
    });
    sales.forEach(s => {
        stockMap.set(s.productId, (stockMap.get(s.productId) || 0) - s.quantity);
    });

    products.forEach(p => {
        p.stock = stockMap.get(p.id) || 0;
    });

    return { customers, products, sales, suppliers, purchases };
}

const DUMMY_DATA = generateInitialData();
