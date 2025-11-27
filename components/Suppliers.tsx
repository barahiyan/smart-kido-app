
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Input from './ui/Input';
import { PlusIcon, TrashIcon } from '../utils/icons';
import type { Supplier } from '../types';
import SupplierDetail from './SupplierDetail';
import { SupplierForm } from './SupplierForm';

const Suppliers: React.FC = () => {
  const { t, suppliers, deleteSupplier } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm)
    ).sort((a,b) => a.name.localeCompare(b.name));
  }, [suppliers, searchTerm]);
  
  const handleAdd = () => {
    setIsModalOpen(true);
  }

  const handleDelete = () => {
    if (supplierToDelete) {
      deleteSupplier(supplierToDelete.id);
      setSupplierToDelete(null);
    }
  }

  if (selectedSupplierId) {
    return <SupplierDetail supplierId={selectedSupplierId} onBack={() => setSelectedSupplierId(null)} />;
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-dark">{t('suppliers')}</h1>
        <Button onClick={handleAdd}>
          <PlusIcon className="mr-2" /> {t('addSupplier')}
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
                <th className="p-3 text-sm font-semibold text-slate-600">{t('name')}</th>
                <th className="p-3 text-sm font-semibold text-slate-600">{t('phone')}</th>
                <th className="p-3 text-sm font-semibold text-slate-600">{t('address')}</th>
                 <th className="p-3 text-sm font-semibold text-slate-600 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map(supplier => (
                  <tr key={supplier.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-medium whitespace-nowrap">{supplier.name}</td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{supplier.phone}</td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{supplier.address}</td>
                    <td className="p-3 text-right space-x-2 whitespace-nowrap">
                        <Button variant="secondary" size="sm" onClick={() => setSelectedSupplierId(supplier.id)}>{t('viewDetails')}</Button>
                        <Button variant="danger" size="sm" onClick={() => setSupplierToDelete(supplier)}><TrashIcon /></Button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          {filteredSuppliers.length === 0 && <p className="text-center text-slate-500 py-8">{t('noData')}</p>}
        </div>
      </Card>
      
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('newSupplier')}>
        <SupplierForm onClose={() => setIsModalOpen(false)} />
      </Modal>

      <Modal isOpen={!!supplierToDelete} onClose={() => setSupplierToDelete(null)} title={t('deleteConfirmation')}>
        <div>
          <p>{t('deleteSupplierWarning')}</p>
          <div className="flex justify-end space-x-3 pt-4 mt-4">
            <Button variant="secondary" onClick={() => setSupplierToDelete(null)}>{t('cancel')}</Button>
            <Button variant="danger" onClick={handleDelete}>{t('delete')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Suppliers;
