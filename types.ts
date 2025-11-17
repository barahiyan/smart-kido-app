

export enum ProductCategory {
  Cosmetics = 'Cosmetics',
  Clothes = 'Clothes',
  Devices = 'Devices',
  HomeItems = 'Home Items',
  Other = 'Other'
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  costPrice: number;
  sellingPrice: number;
  stock: number;
}

export interface Sale {
  id: string;
  customerId: string;
  productId: string;
  quantity: number;
  unitPrice: number; // Can be different from product's sellingPrice for discounts
  totalAmount: number;
  date: string;
  payments: Payment[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  paymentType: 'Cash' | 'Credit';
  notes: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
}

export interface Purchase {
  id: string;
  productId: string;
  supplierId?: string; // Link to supplier, optional for cash purchases
  quantity: number;
  costPrice: number;
  totalAmount: number;
  date: string;
  purchaseType: 'Cash' | 'Credit';
  payments: Payment[]; // for credit purchases
}

export interface User {
  username: string;
  pin: string;
}

export type Language = 'en' | 'sw';
export type Page = 'dashboard' | 'sales' | 'customers' | 'reports' | 'products' | 'settings' | 'suppliers' | 'purchases';

export interface AppDataBackup {
  customers: Customer[];
  sales: Sale[];
  products: Product[];
  suppliers: Supplier[];
  purchases: Purchase[];
}

export interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id'>) => Customer;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (customerId: string) => void;
  sales: Sale[];
  addSale: (sale: Omit<Sale, 'id'>) => void;
  updateSale: (sale: Sale) => void;
  deleteSale: (saleId: string) => void;
  recordPayment: (saleId: string, payment: Omit<Payment, 'id'>) => void;
  deletePayment: (saleId: string, paymentId: string) => void;
  getCustomerBalance: (customerId: string) => number;
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'stock'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => boolean;
  users: User[];
  updatePassword: (username: string, currentPin: string, newPin: string) => boolean;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Supplier;
  updateSupplier: (supplier: Supplier) => void;
  deleteSupplier: (supplierId: string) => void;
  purchases: Purchase[];
  addPurchase: (purchase: Omit<Purchase, 'id'>) => void;
  updatePurchase: (purchase: Purchase) => void;
  deletePurchase: (purchaseId: string) => void;
  recordSupplierPayment: (purchaseId: string, payment: Omit<Payment, 'id'>) => void;
  deleteSupplierPayment: (purchaseId: string, paymentId: string) => void;
  resetData: () => void;
  exportData: () => void;
  importData: (data: AppDataBackup) => void;
}