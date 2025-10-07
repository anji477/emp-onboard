import React, { useState, useRef, useEffect, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Policy } from '../../types';
import Card from '../common/Card';
import Icon from '../common/Icon';
import Button from '../common/Button';
import Modal from '../common/Modal';
import FileInput from '../common/FileInput';
import { UserContext } from '../../App';

const Policies: React.FC = () => {
    const auth = useContext(UserContext);
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
    const [notification, setNotification] = useState({ message: '', type: 'success' as 'success' | 'error' });
    
    const [formData, setFormData] = useState({
        title: '',
        category: '',
        summary: '',
        content: '',
        version: '1.0',
        effectiveDate: ''
    });
    
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadType, setUploadType] = useState<'text' | 'file'>('text');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isAdminOrHR = auth?.user?.role === 'Admin' || auth?.user?.role === 'HR';

    const [searchParams] = useSearchParams();
    
    useEffect(() => {
        fetchPolicies();
    }, []);
    
    useEffect(() => {
        const policyId = searchParams.get('id');
        if (policyId && policies.length > 0) {
            const policy = policies.find(p => p.id === parseInt(policyId));
            if (policy) {
                setSelectedPolicy(policy);
            }
        }
    }, [searchParams, policies]);

    const fetchPolicies = async () => {
        try {
            console.log('Starting fetchPolicies, isAdminOrHR:', isAdminOrHR);
            
            const response = await fetch('/api/policies', { credentials: 'include' });
            console.log('API response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Raw API data:', data);
                console.log('Data type:', typeof data, 'Is array:', Array.isArray(data));
                
                const policiesData = Array.isArray(data) ? data : [];
                console.log('Setting policies:', policiesData.length, 'items');
                
                setPolicies(policiesData);
                if (policiesData.length > 0 && !selectedPolicy) {
                    setSelectedPolicy(policiesData[0]);
                }
            } else {
                console.error('API error:', response.status, response.statusText);
                setPolicies([]);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            setPolicies([]);
        }
    };

    const handleAddPolicy = async () => {
        try {
            let response;
            
            if (uploadType === 'file' && selectedFile) {
                const formDataUpload = new FormData();
                formDataUpload.append('policyFile', selectedFile);
                formDataUpload.append('title', formData.title);
                formDataUpload.append('category', formData.category);
                formDataUpload.append('summary', formData.summary);
                formDataUpload.append('content', formData.content);
                formDataUpload.append('version', formData.version);
                formDataUpload.append('effectiveDate', formData.effectiveDate);
                
                response = await fetch('/api/policies/upload', {
                    method: 'POST',
                    credentials: 'include',
                    body: formDataUpload
                });
            } else {
                response = await fetch('/api/policies', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(formData)
                });
            }
            
            if (response.ok) {
                const result = await response.json();
                const newPolicy = result.policy || result;
                setPolicies([...policies, newPolicy]);
                setNotification({ message: 'Policy added successfully!', type: 'success' });
                setShowAddModal(false);
                resetForm();
                setTimeout(() => setNotification({ message: '', type: 'success' }), 3000);
            } else {
                const error = await response.json();
                setNotification({ message: `Error: ${error.error || error.message}`, type: 'error' });
                setTimeout(() => setNotification({ message: '', type: 'success' }), 5000);
            }
        } catch (error) {
            console.error('Error adding policy:', error);
            setNotification({ message: 'Error adding policy', type: 'error' });
            setTimeout(() => setNotification({ message: '', type: 'success' }), 3000);
        }
    };

    const handleUpdatePolicy = async () => {
        if (!editingPolicy) return;
        
        try {
            const response = await fetch(`/api/policies/${editingPolicy.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                const updatedPolicy = await response.json();
                setPolicies(policies.map(p => p.id === editingPolicy.id ? updatedPolicy : p));
                if (selectedPolicy?.id === editingPolicy.id) {
                    setSelectedPolicy(updatedPolicy);
                }
                setNotification({ message: 'Policy updated successfully!', type: 'success' });
                setEditingPolicy(null);
                resetForm();
                setTimeout(() => setNotification({ message: '', type: 'success' }), 3000);
            }
        } catch (error) {
            console.error('Error updating policy:', error);
        }
    };

    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
    
    const handleDeletePolicy = async (policyId: number) => {
        try {
            const response = await fetch(`/api/policies/${policyId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (response.ok) {
                setPolicies(policies.filter(p => p.id !== policyId));
                if (selectedPolicy?.id === policyId) {
                    setSelectedPolicy(policies.length > 1 ? policies[0] : null);
                }
                setNotification({ message: 'Policy deleted successfully!', type: 'success' });
                setDeleteConfirm(null);
                setTimeout(() => setNotification({ message: '', type: 'success' }), 3000);
            }
        } catch (error) {
            console.error('Error deleting policy:', error);
            setNotification({ message: 'Error deleting policy', type: 'error' });
            setTimeout(() => setNotification({ message: '', type: 'success' }), 3000);
        }
    };
    


    const resetForm = () => {
        setFormData({ title: '', category: '', summary: '', content: '', version: '1.0', effectiveDate: '' });
        setSelectedFile(null);
        setUploadType('text');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const openEditModal = (policy: Policy) => {
        setEditingPolicy(policy);
        setFormData({
            title: policy.title,
            category: policy.category,
            summary: policy.summary,
            content: policy.content,
            version: policy.version || '1.0',
            effectiveDate: policy.effective_date || ''
        });
    };

    const filteredPolicies = policies.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!auth?.user) {
        return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Loading...</div></div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">Policies & Knowledge Base</h1>
                    <p className="text-gray-600 dark:text-gray-300 text-xs">Access company policies and procedures.</p>
                </div>
                {isAdminOrHR && (
                    <Button onClick={() => setShowAddModal(true)}>
                        <Icon name="plus" className="w-5 h-5 mr-2" />
                        Add Policy
                    </Button>
                )}
            </div>

            {notification.message && (
                <div className={`border-l-4 p-4 rounded-md ${
                    notification.type === 'success' 
                        ? 'bg-green-100 border-green-500 text-green-700' 
                        : 'bg-red-100 border-red-500 text-red-700'
                }`}>
                    {notification.message}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <Card>
                        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Policies</h2>
                        <input
                            type="text"
                            placeholder="Search policies..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {filteredPolicies.length === 0 ? (
                            <div className="text-center py-8">
                                <Icon name="document-magnifying-glass" className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">No policies found</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {isAdminOrHR ? 'Create policies to share with employees.' : 'No policies are available yet.'}
                                </p>
                            </div>
                        ) : (
                            <ul className="space-y-2 h-96 overflow-y-auto">
                                {filteredPolicies.map(policy => (
                                <li key={policy.id}>
                                    <div className={`p-3 rounded-md transition-colors ${selectedPolicy?.id === policy.id ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                        <button
                                            onClick={() => setSelectedPolicy(policy)}
                                            className="w-full text-left"
                                        >
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{policy.title}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{policy.category}</p>
                                        </button>
                                        {isAdminOrHR && (
                                            <div className="flex gap-2 mt-2">
                                                <button
                                                    onClick={() => openEditModal(policy)}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                    title="Edit Policy"
                                                >
                                                    <Icon name="pencil" className="w-4 h-4" />
                                                </button>
                                                {deleteConfirm === policy.id ? (
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => handleDeletePolicy(policy.id)}
                                                            className="text-red-600 hover:text-red-900 text-xs px-2 py-1 bg-red-100 rounded"
                                                            title="Confirm Delete"
                                                        >
                                                            Yes
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirm(null)}
                                                            className="text-gray-600 hover:text-gray-900 text-xs px-2 py-1 bg-gray-100 rounded"
                                                            title="Cancel"
                                                        >
                                                            No
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setDeleteConfirm(policy.id)}
                                                        className="text-red-600 hover:text-red-900"
                                                        title="Delete Policy"
                                                    >
                                                        <Icon name="trash" className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card>
                        {selectedPolicy ? (
                            <div>
                                <h2 className="text-lg font-bold text-gray-800 dark:text-white">{selectedPolicy.title}</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">{selectedPolicy.category}</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-4">{selectedPolicy.summary}</p>
                                {selectedPolicy.file_url ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Icon name="document" className="w-4 h-4" />
                                                <span>File: {selectedPolicy.file_name}</span>
                                                {selectedPolicy.version && <span>• Version: {selectedPolicy.version}</span>}
                                            </div>
                                            <div className="flex gap-2">
                                                <a
                                                    href={selectedPolicy.file_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-indigo-600 hover:text-indigo-900 text-xs"
                                                >
                                                    Open in New Tab
                                                </a>
                                                <a
                                                    href={selectedPolicy.file_url}
                                                    download={selectedPolicy.file_name}
                                                    className="text-green-600 hover:text-green-900 text-xs"
                                                >
                                                    Download
                                                </a>
                                            </div>
                                        </div>
                                        
                                        {selectedPolicy.file_type === 'application/pdf' ? (
                                            <div className="border rounded-md overflow-hidden">
                                                <iframe
                                                    src={selectedPolicy.file_url}
                                                    className="w-full h-96"
                                                    title={selectedPolicy.title}
                                                />
                                            </div>
                                        ) : (
                                            <div className="border rounded-md p-8 text-center bg-gray-50">
                                                <Icon name={selectedPolicy.file_type?.includes('presentation') ? 'presentation-chart-bar' : 'document'} className={`w-16 h-16 mx-auto mb-4 ${selectedPolicy.file_type?.includes('presentation') ? 'text-orange-500' : 'text-blue-500'}`} />
                                                <h3 className="text-base font-medium text-gray-900 mb-2">{selectedPolicy.file_name}</h3>
                                                <p className="text-sm text-gray-600 mb-4">{selectedPolicy.file_type?.includes('presentation') ? 'PowerPoint Presentation' : 'Document'} - Click to download and view</p>
                                                <div className="flex justify-center gap-3">
                                                    <a
                                                        href={selectedPolicy.file_url}
                                                        download={selectedPolicy.file_name}
                                                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                                    >
                                                        <Icon name="arrow-down-tray" className="w-4 h-4 mr-2" />
                                                        Download Document
                                                    </a>
                                                    <a
                                                        href={selectedPolicy.file_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                                                    >
                                                        <Icon name="arrow-top-right-on-square" className="w-4 h-4 mr-2" />
                                                        Open in Browser
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {selectedPolicy.content && (
                                            <div className="mt-6 pt-6 border-t">
                                                <h4 className="text-xs font-medium text-gray-700 mb-2">Additional Notes:</h4>
                                                <div className="prose max-w-none text-sm text-gray-600 dark:text-gray-400">
                                                    <p>{selectedPolicy.content}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="prose max-w-none text-sm text-gray-600 dark:text-gray-400">
                                        <p>{selectedPolicy.content}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <Icon name="document-magnifying-glass" className="h-12 w-12 mx-auto text-gray-400" />
                                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Select a policy to view its details.</p>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Add Policy Modal */}
            {showAddModal && (
                <Modal isOpen={true} onClose={() => { setShowAddModal(false); resetForm(); }} title="Add New Policy">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Policy Type</label>
                            <div className="flex gap-4">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="text"
                                        checked={uploadType === 'text'}
                                        onChange={(e) => setUploadType(e.target.value as 'text' | 'file')}
                                        className="mr-2"
                                    />
                                    Text Policy
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="file"
                                        checked={uploadType === 'file'}
                                        onChange={(e) => setUploadType(e.target.value as 'text' | 'file')}
                                        className="mr-2"
                                    />
                                    Upload File (PDF/DOC/PPT)
                                </label>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({...formData, category: e.target.value})}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                            >
                                <option value="">Select Category</option>
                                <option value="HR">HR</option>
                                <option value="IT">IT</option>
                                <option value="Operations">Operations</option>
                                <option value="Finance">Finance</option>
                                <option value="Legal">Legal</option>
                            </select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Version</label>
                                <input
                                    type="text"
                                    value={formData.version}
                                    onChange={(e) => setFormData({...formData, version: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                                    placeholder="1.0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Effective Date</label>
                                <input
                                    type="date"
                                    value={formData.effectiveDate}
                                    onChange={(e) => setFormData({...formData, effectiveDate: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Summary</label>
                            <input
                                type="text"
                                value={formData.summary}
                                onChange={(e) => setFormData({...formData, summary: e.target.value})}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                            />
                        </div>
                        
                        {uploadType === 'file' ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Policy File</label>
                                <FileInput
                                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                                    placeholder="Upload policy document"
                                    maxSize={10}
                                    onChange={(files) => {
                                        const file = files?.[0];
                                        setSelectedFile(file || null);
                                        if (file && fileInputRef.current) {
                                            // Create a new FileList-like object
                                            const dt = new DataTransfer();
                                            dt.items.add(file);
                                            fileInputRef.current.files = dt.files;
                                        }
                                    }}
                                />
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                                    className="hidden"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Supported formats: PDF, DOC, DOCX, PPT, PPTX (Max 10MB)</p>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Content</label>
                                <textarea
                                    rows={6}
                                    value={formData.content}
                                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                                />
                            </div>
                        )}
                        
                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button variant="secondary" onClick={() => { setShowAddModal(false); resetForm(); }}>
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleAddPolicy} 
                                disabled={!formData.title || !formData.category || (uploadType === 'file' && !selectedFile)}
                            >
                                Add Policy
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Edit Policy Modal */}
            {editingPolicy && (
                <Modal isOpen={true} onClose={() => { setEditingPolicy(null); resetForm(); }} title="Edit Policy">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({...formData, category: e.target.value})}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                            >
                                <option value="HR">HR</option>
                                <option value="IT">IT</option>
                                <option value="Operations">Operations</option>
                                <option value="Finance">Finance</option>
                                <option value="Legal">Legal</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Summary</label>
                            <input
                                type="text"
                                value={formData.summary}
                                onChange={(e) => setFormData({...formData, summary: e.target.value})}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                            />
                        </div>
                        
                        {editingPolicy?.file_url ? (
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">Current File</label>
                                <div className="p-3 bg-gray-50 rounded-md border">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Icon name={editingPolicy.file_type?.includes('presentation') ? 'presentation-chart-bar' : 'document'} className={`w-5 h-5 ${editingPolicy.file_type?.includes('presentation') ? 'text-orange-500' : 'text-blue-500'}`} />
                                            <span className="text-xs font-medium">{editingPolicy.file_name}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <a
                                                href={editingPolicy.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-indigo-600 hover:text-indigo-900 text-xs"
                                            >
                                                View
                                            </a>
                                            <a
                                                href={editingPolicy.file_url}
                                                download={editingPolicy.file_name}
                                                className="text-green-600 hover:text-green-900 text-xs"
                                            >
                                                Download
                                            </a>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500">File type: {editingPolicy.file_type?.includes('presentation') ? 'PowerPoint Presentation' : editingPolicy.file_type?.includes('pdf') ? 'PDF Document' : 'Document'}</p>
                                </div>
                            </div>
                        ) : null}
                        
                        {!editingPolicy?.file_url && (
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Content</label>
                                <textarea
                                    rows={6}
                                    value={formData.content}
                                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                                    placeholder="Policy content"
                                />
                            </div>
                        )}
                        
                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button variant="secondary" onClick={() => { setEditingPolicy(null); resetForm(); }}>
                                Cancel
                            </Button>
                            <Button onClick={handleUpdatePolicy}>
                                Update Policy
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Policies;