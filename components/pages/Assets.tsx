import React, { useState, useContext, useMemo } from 'react';
import { mockUserAssets, mockAllAssets, mockEmployeesForAssignment } from '../../data/mockData';
import { AssetStatus, ITAsset, UserRole } from '../../types';
import Card from '../common/Card';
import Icon from '../common/Icon';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { UserContext } from '../../App';

const getStatusBadge = (status: AssetStatus) => {
    switch (status) {
        case AssetStatus.Assigned:
            return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">Assigned</span>;
        case AssetStatus.PendingReturn:
            return <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-200 rounded-full">Pending Return</span>;
        case AssetStatus.Returned:
            return <span className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 rounded-full">Returned</span>;
        case AssetStatus.Unassigned:
            return <span className="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-200 rounded-full">Unassigned</span>;

    }
};

const AssetDetailItem: React.FC<{ label: string; value?: string }> = ({ label, value }) => {
    if (!value) return null;
    return (
        <div className="grid grid-cols-3 gap-4 py-3">
            <dt className="text-sm font-medium text-gray-500">{label}</dt>
            <dd className="text-sm text-gray-900 col-span-2">{value}</dd>
        </div>
    );
};

interface AssetViewProps {
    assets: ITAsset[];
    onAssetClick: (asset: ITAsset) => void;
    onReturnClick: (asset: ITAsset) => void;
}

const EmployeeAssetView: React.FC<AssetViewProps> = ({ assets, onAssetClick, onReturnClick }) => {
    const hardwareAssets = assets.filter(asset => asset.type === 'Hardware');
    const softwareAssets = assets.filter(asset => asset.type === 'Software');
    
    return (
        <>
            <Card>
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Hardware</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Asset Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Serial Number</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {hardwareAssets.map(asset => (
                                <tr key={asset.id} onClick={() => onAssetClick(asset)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{asset.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{asset.serialNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(asset.status)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        {asset.status === AssetStatus.Assigned && (
                                            <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onReturnClick(asset); }}>
                                                <Icon name="arrow-uturn-left" className="w-4 h-4 mr-2" />
                                                Return
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card>
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Software & Licenses</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Software/Service</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">License Key / User ID</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {softwareAssets.map(asset => (
                                <tr key={asset.id} onClick={() => onAssetClick(asset)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{asset.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{asset.serialNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(asset.status)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        {asset.status === AssetStatus.Assigned && (
                                            <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onReturnClick(asset); }}>
                                                <Icon name="arrow-uturn-left" className="w-4 h-4 mr-2" />
                                                Return
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </>
    )
};


const AdminAssetView: React.FC<{ allAssets: ITAsset[]; onAssetClick: (asset: ITAsset) => void; onReturnClick: (asset: ITAsset) => void; }> = ({ allAssets, onAssetClick, onReturnClick }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [employeeFilter, setEmployeeFilter] = useState('');

    const filteredAssets = useMemo(() => {
        return allAssets.filter(asset => {
            const searchMatch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                asset.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
            const statusMatch = !statusFilter || asset.status === statusFilter;
            const typeMatch = !typeFilter || asset.type === typeFilter;
            const employeeMatch = !employeeFilter || asset.assignedTo === employeeFilter;
            return searchMatch && statusMatch && typeMatch && employeeMatch;
        });
    }, [searchTerm, statusFilter, typeFilter, employeeFilter, allAssets]);

    return (
        <Card>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div className="relative flex-grow">
                     <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                         <Icon name="magnifying-glass" className="h-5 w-5 text-gray-500" />
                    </span>
                    <input 
                        type="text" 
                        placeholder="Search by name or serial..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                        <option value="">All Statuses</option>
                        {Object.values(AssetStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                        <option value="">All Types</option>
                        <option value="Hardware">Hardware</option>
                        <option value="Software">Software</option>
                    </select>
                     <select value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)} className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                        <option value="">All Employees</option>
                        {mockEmployeesForAssignment.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                    </select>
                </div>
            </div>

             <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Asset</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Assigned To</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredAssets.map(asset => (
                             <tr key={asset.id} onClick={() => onAssetClick(asset)} className="cursor-pointer hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{asset.name}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{asset.serialNumber}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{asset.type}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{asset.assignedTo || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(asset.status)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end space-x-2">
                                        {asset.status === AssetStatus.Assigned && (
                                             <button className="text-gray-600 hover:text-indigo-600" title="Initiate Return" onClick={(e) => { e.stopPropagation(); onReturnClick(asset); }}>
                                                <Icon name="arrow-uturn-left" className="w-5 h-5"/>
                                            </button>
                                        )}
                                        <button className="text-indigo-600 hover:text-indigo-900" title="Edit Asset" onClick={(e) => { e.stopPropagation(); setEditingAsset(asset); }}>
                                            <Icon name="pencil" className="w-5 h-5"/>
                                        </button>
                                         <button className="text-red-600 hover:text-red-900" title="Delete Asset" onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset.id); }}>
                                            <Icon name="trash" className="w-5 h-5"/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};


const Assets: React.FC = () => {
    const [userAssets, setUserAssets] = useState<ITAsset[]>([]);
    const [allAssets, setAllAssets] = useState<ITAsset[]>([]);
    const [selectedAsset, setSelectedAsset] = useState<ITAsset | null>(null);
    const [assetToReturn, setAssetToReturn] = useState<ITAsset | null>(null);
    const [showAddAssetModal, setShowAddAssetModal] = useState(false);
    const [editingAsset, setEditingAsset] = useState<ITAsset | null>(null);
    const [notification, setNotification] = useState('');
    const auth = useContext(UserContext);
    const isAdmin = auth?.user?.role === UserRole.Admin;
    
    // Fetch assets on component mount
    React.useEffect(() => {
        fetchAssets();
    }, []);
    
    const fetchAssets = async () => {
        try {
            const response = await fetch('/api/assets', {
                credentials: 'include'
            });
            const assets = await response.json();
            setAllAssets(assets);
            setUserAssets(assets);
        } catch (error) {
            console.error('Error fetching assets:', error);
        }
    };
    
    const [newAsset, setNewAsset] = useState({
        name: '',
        type: 'Hardware' as 'Hardware' | 'Software',
        serialNumber: '',
        purchaseDate: '',
        warrantyInfo: '',
        licenseExpiry: '',
        location: ''
    });

    const handleRowClick = (asset: ITAsset) => {
        setSelectedAsset(asset);
    };

    const handleCloseModal = () => {
        setSelectedAsset(null);
    };

    const handleReturnClick = (asset: ITAsset) => {
        setAssetToReturn(asset);
    };

    const handleConfirmReturn = () => {
        if (!assetToReturn) return;

        const updateAssetStatus = (asset: ITAsset) =>
            asset.id === assetToReturn.id
                ? { ...asset, status: AssetStatus.PendingReturn }
                : asset;

        setUserAssets(prev => prev.map(updateAssetStatus));
        setAllAssets(prev => prev.map(updateAssetStatus));

        setNotification(`Return process for "${assetToReturn.name}" has been initiated. IT has been notified.`);
        setAssetToReturn(null);
        setTimeout(() => setNotification(''), 5000);
    };
    
    const handleUpdateAsset = async () => {
        if (!editingAsset) return;
        
        try {
            const response = await fetch(`/api/assets/${editingAsset.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    name: editingAsset.name,
                    serialNumber: editingAsset.serialNumber,
                    status: editingAsset.status
                })
            });
            
            if (response.ok) {
                const updatedAsset = await response.json();
                setAllAssets(prev => prev.map(asset => asset.id === editingAsset.id ? updatedAsset : asset));
                setUserAssets(prev => prev.map(asset => asset.id === editingAsset.id ? updatedAsset : asset));
                setNotification('Asset updated successfully.');
                setEditingAsset(null);
                setTimeout(() => setNotification(''), 3000);
            } else {
                setNotification('Error updating asset. Please try again.');
            }
        } catch (error) {
            console.error('Error updating asset:', error);
            setNotification('Error updating asset. Please try again.');
        }
    };
    
    const handleDeleteAsset = async (assetId: number) => {
        console.log('handleDeleteAsset called with ID:', assetId);
        if (!confirm('Are you sure you want to delete this asset?')) return;
        
        try {
            const response = await fetch(`/api/assets/${assetId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (response.ok) {
                setAllAssets(prev => prev.filter(asset => asset.id !== assetId));
                setUserAssets(prev => prev.filter(asset => asset.id !== assetId));
                setNotification('Asset deleted successfully.');
                setTimeout(() => setNotification(''), 3000);
            } else {
                setNotification('Error deleting asset. Please try again.');
            }
        } catch (error) {
            console.error('Error deleting asset:', error);
            setNotification('Error deleting asset. Please try again.');
        }
    };
    
    const handleAddAsset = async () => {
        try {
            const response = await fetch('/api/assets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    name: newAsset.name,
                    type: newAsset.type,
                    serialNumber: newAsset.serialNumber,
                    purchaseDate: newAsset.purchaseDate,
                    warrantyInfo: newAsset.warrantyInfo,
                    licenseExpiry: newAsset.licenseExpiry,
                    location: newAsset.location
                })
            });
            
            if (response.ok) {
                const savedAsset = await response.json();
                setAllAssets(prev => [...prev, savedAsset]);
                setUserAssets(prev => [...prev, savedAsset]);
                setNotification(`Asset "${savedAsset.name}" has been added successfully.`);
                setShowAddAssetModal(false);
                setNewAsset({
                    name: '',
                    type: 'Hardware',
                    serialNumber: '',
                    purchaseDate: '',
                    warrantyInfo: '',
                    licenseExpiry: '',
                    location: ''
                });
                setTimeout(() => setNotification(''), 5000);
            } else {
                setNotification('Error adding asset. Please try again.');
            }
        } catch (error) {
            console.error('Error adding asset:', error);
            setNotification('Error adding asset. Please try again.');
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{isAdmin ? 'IT Asset Management' : 'IT Assets'}</h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">{isAdmin ? 'Filter, track, and manage all company assets.' : 'View your assigned hardware and software assets.'}</p>
                </div>
                <Button onClick={() => setShowAddAssetModal(true)}>
                    <Icon name="plus" className="w-5 h-5 mr-2" />
                    {isAdmin ? 'Add New Asset' : 'Request Asset'}
                </Button>
            </div>

            {notification && (
                <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md relative" role="alert">
                    <div className="flex">
                        <div className="py-1"><Icon name="check-circle" className="h-6 w-6 text-green-500 mr-4"/></div>
                        <div>
                            <p className="font-bold">Success</p>
                            <p className="text-sm">{notification}</p>
                        </div>
                    </div>
                </div>
            )}

            {isAdmin 
                ? <AdminAssetView allAssets={allAssets} onAssetClick={handleRowClick} onReturnClick={handleReturnClick} /> 
                : <EmployeeAssetView assets={userAssets} onAssetClick={handleRowClick} onReturnClick={handleReturnClick} />}
            
            {selectedAsset && (
                 <Modal isOpen={!!selectedAsset} onClose={handleCloseModal} title={`Details for ${selectedAsset.name}`}>
                    <dl className="divide-y divide-gray-200">
                        <AssetDetailItem label="Asset Name" value={selectedAsset.name} />
                        <AssetDetailItem label="Type" value={selectedAsset.type} />
                        <AssetDetailItem label="Serial Number / ID" value={selectedAsset.serialNumber} />
                        <AssetDetailItem label="Status" value={selectedAsset.status} />
                        <AssetDetailItem label="Assigned Date" value={selectedAsset.assignedDate} />
                        
                        {selectedAsset.type === 'Hardware' ? (
                            <>
                                <AssetDetailItem label="Assigned To" value={selectedAsset.assignedTo} />
                                <AssetDetailItem label="Purchase Date" value={selectedAsset.purchaseDate} />
                                <AssetDetailItem label="Warranty" value={selectedAsset.warrantyInfo} />
                                <AssetDetailItem label="Location" value={selectedAsset.location} />
                            </>
                        ) : (
                            <>
                                <AssetDetailItem label="Assigned To" value={selectedAsset.assignedTo} />
                                <AssetDetailItem label="License Expiry" value={selectedAsset.licenseExpiry} />
                            </>
                        )}
                    </dl>
                </Modal>
            )}

            {assetToReturn && (
                <Modal isOpen={!!assetToReturn} onClose={() => setAssetToReturn(null)} title="Confirm Asset Return">
                    <div className="space-y-4">
                        <p className="text-gray-600">
                            Are you sure you want to initiate the return process for <strong>{assetToReturn.name}</strong> (S/N: {assetToReturn.serialNumber})?
                        </p>
                        <p className="text-sm text-gray-500">
                            This will notify the IT department to coordinate the return. This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button variant="secondary" onClick={() => setAssetToReturn(null)}>Cancel</Button>
                            <Button variant="danger" onClick={handleConfirmReturn}>Confirm Return</Button>
                        </div>
                    </div>
                </Modal>
            )}
            
            {showAddAssetModal && (
                <Modal isOpen={showAddAssetModal} onClose={() => setShowAddAssetModal(false)} title="Add New Asset">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
                            <input
                                type="text"
                                value={newAsset.name}
                                onChange={(e) => setNewAsset(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                placeholder="e.g., MacBook Pro 16"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                                value={newAsset.type}
                                onChange={(e) => setNewAsset(prev => ({ ...prev, type: e.target.value as 'Hardware' | 'Software' }))}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            >
                                <option value="Hardware">Hardware</option>
                                <option value="Software">Software</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number / License Key</label>
                            <input
                                type="text"
                                value={newAsset.serialNumber}
                                onChange={(e) => setNewAsset(prev => ({ ...prev, serialNumber: e.target.value }))}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                placeholder="e.g., C02F1234ABCD"
                            />
                        </div>
                        
                        {newAsset.type === 'Hardware' ? (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                                    <input
                                        type="date"
                                        value={newAsset.purchaseDate}
                                        onChange={(e) => setNewAsset(prev => ({ ...prev, purchaseDate: e.target.value }))}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Info</label>
                                    <input
                                        type="text"
                                        value={newAsset.warrantyInfo}
                                        onChange={(e) => setNewAsset(prev => ({ ...prev, warrantyInfo: e.target.value }))}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                        placeholder="e.g., AppleCare+ until 2026-08-15"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                    <input
                                        type="text"
                                        value={newAsset.location}
                                        onChange={(e) => setNewAsset(prev => ({ ...prev, location: e.target.value }))}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                        placeholder="e.g., Office, Warehouse"
                                    />
                                </div>
                            </>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">License Expiry</label>
                                <input
                                    type="date"
                                    value={newAsset.licenseExpiry}
                                    onChange={(e) => setNewAsset(prev => ({ ...prev, licenseExpiry: e.target.value }))}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                />
                            </div>
                        )}
                        
                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button variant="secondary" onClick={() => setShowAddAssetModal(false)}>Cancel</Button>
                            <Button onClick={handleAddAsset} disabled={!newAsset.name || !newAsset.serialNumber}>Add Asset</Button>
                        </div>
                    </div>
                </Modal>
            )}
            
            {/* Edit Asset Modal */}
            {editingAsset && (
                <Modal isOpen={!!editingAsset} onClose={() => setEditingAsset(null)} title="Edit Asset">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
                            <input
                                type="text"
                                value={editingAsset.name}
                                onChange={(e) => setEditingAsset(prev => prev ? { ...prev, name: e.target.value } : null)}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                            <input
                                type="text"
                                value={editingAsset.serialNumber}
                                onChange={(e) => setEditingAsset(prev => prev ? { ...prev, serialNumber: e.target.value } : null)}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                value={editingAsset.status}
                                onChange={(e) => setEditingAsset(prev => prev ? { ...prev, status: e.target.value as AssetStatus } : null)}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            >
                                <option value="Unassigned">Unassigned</option>
                                <option value="Assigned">Assigned</option>
                                <option value="PendingReturn">Pending Return</option>
                                <option value="Returned">Returned</option>
                            </select>
                        </div>
                        
                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button variant="secondary" onClick={() => setEditingAsset(null)}>Cancel</Button>
                            <Button onClick={() => handleUpdateAsset()}>Update Asset</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Assets;