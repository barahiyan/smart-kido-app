
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Select from './ui/Select';
import { PlusIcon, EditIcon, TrashIcon } from '../utils/icons';
import { Product, ProductCategory } from '../types';
import { categoryToTranslationKey } from '../utils/helpers';

const ProductForm: React.FC<{onClose: () => void, product?: Product | null}> = ({ onClose, product }) => {
    const { t, addProduct, updateProduct } = useAppContext();
    const [name, setName] = useState(product?.name || '');
    const [category, setCategory] = useState<ProductCategory>(product?.category || ProductCategory.Other);
    const [costPrice, setCostPrice] = useState(product?.costPrice.toString() || '');
    const [sellingPrice, setSellingPrice] = useState(product?.sellingPrice.toString() || '');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const productData = { 
            name, 
            category, 
            costPrice: Number(costPrice) || 0, 
            sellingPrice: Number(sellingPrice) || 0
        };

        if (product) {
            updateProduct({ ...product, ...productData });
        } else {
            addProduct(productData);
        }
        onClose();
    };

    return (
         <form onSubmit={handleSubmit} className="space-y-4">
            <Input id="productName" label={t('productName')} value={name} onChange={e => setName(e.target.value)} required />
            <Select id="category" label={t('category')} value={category} onChange={e => setCategory(e.target.value as ProductCategory)}>
                {Object.values(ProductCategory).map(cat => <option key={cat} value={cat}>{t(categoryToTranslationKey(cat))}</option>)}
            </Select>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input id="costPrice" label={t('costPrice')} type="number" min="0" value={costPrice} onChange={e => setCostPrice(e.target.value)} />
                <Input id="sellingPrice" label={t('sellingPrice')} type="number" min="0" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} />
            </div>
             {product && (
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('stock')}</label>
                    <p className="block w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-md text-sm shadow-sm">{product.stock}</p>
                </div>
             )}
            <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>{t('cancel')}</Button>
                <Button type="submit">{t('save')}</Button>
            </div>
        </form>
    )
}

const Products: React.FC = () => {
    const { t, products, formatCurrency, deleteProduct } = useAppContext();
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProducts = useMemo(() => {
        return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a,b) => a.name.localeCompare(b.name));
    }, [products, searchTerm]);

    const handleAddProduct = () => {
        setSelectedProduct(null);
        setIsProductModalOpen(true);
    }

    const handleEditProduct = (product: Product) => {
        setSelectedProduct(product);
        setIsProductModalOpen(true);
    }

    const handleDelete = () => {
        if (productToDelete) {
            const success = deleteProduct(productToDelete.id);
            if (!success) {
                alert(t('deleteProductError'));
            }
            setProductToDelete(null);
        }
    }
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-dark">{t('products')}</h1>
                <Button onClick={handleAddProduct}>
                <PlusIcon className="mr-2" /> {t('addProduct')}
                </Button>
            </div>

            <Card>
                <div className="mb-4">
                <Input id="search" label={t('search')} placeholder={t('search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="overflow-x-auto">
                <table className="min-w-full w-full text-left">
                    <thead className="bg-slate-50">
                    <tr>
                        <th className="p-3 text-sm font-semibold text-slate-600">{t('productName')}</th>
                        <th className="p-3 text-sm font-semibold text-slate-600">{t('category')}</th>
                        <th className="p-3 text-sm font-semibold text-slate-600">{t('costPrice')}</th>
                        <th className="p-3 text-sm font-semibold text-slate-600">{t('sellingPrice')}</th>
                        <th className="p-3 text-sm font-semibold text-slate-600">{t('stockRemaining')}</th>
                        <th className="p-3 text-sm font-semibold text-slate-600 text-right">{t('actions')}</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredProducts.map(product => (
                        <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-3 font-medium whitespace-nowrap">{product.name}</td>
                            <td className="p-3 text-slate-600 whitespace-nowrap">{t(categoryToTranslationKey(product.category))}</td>
                            <td className="p-3 text-slate-600 whitespace-nowrap">{formatCurrency(product.costPrice)}</td>
                            <td className="p-3 text-slate-600 font-semibold whitespace-nowrap">{formatCurrency(product.sellingPrice)}</td>
                            <td className="p-3 font-bold whitespace-nowrap">
                                <span className={product.stock <= 0 ? 'text-slate-400' : product.stock <= 5 ? 'text-red-500' : 'text-green-600'}>
                                    {product.stock > 0 ? product.stock : t('outOfStock')}
                                </span>
                            </td>
                            <td className="p-3 text-right space-x-2 whitespace-nowrap">
                                <Button size="sm" variant="secondary" onClick={() => handleEditProduct(product)}><EditIcon /></Button>
                                <Button size="sm" variant="danger" onClick={() => setProductToDelete(product)}><TrashIcon /></Button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                {filteredProducts.length === 0 && <p className="text-center text-slate-500 py-8">{t('noData')}</p>}
                </div>
            </Card>

            <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title={selectedProduct ? t('editProduct') : t('newProduct')}>
                <ProductForm onClose={() => setIsProductModalOpen(false)} product={selectedProduct} />
            </Modal>

            <Modal isOpen={!!productToDelete} onClose={() => setProductToDelete(null)} title={t('deleteConfirmation')}>
                <div>
                <p>{t('deleteProductWarning')}</p>
                <div className="flex justify-end space-x-3 pt-4 mt-4">
                    <Button variant="secondary" onClick={() => setProductToDelete(null)}>{t('cancel')}</Button>
                    <Button variant="danger" onClick={handleDelete}>{t('delete')}</Button>
                </div>
                </div>
            </Modal>
        </div>
    );
};

export default Products;
