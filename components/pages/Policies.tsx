import React, { useState, useRef, useEffect, useContext } from 'react';
import { Policy } from '../../types';
import Card from '../common/Card';
import Icon from '../common/Icon';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { UserContext } from '../../App';

const Policies: React.FC = () => {
    const auth = useContext(UserContext);
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
    const [notification, setNotification] = useState('');
    
    const [formData, setFormData] = useState({
        title: '',
        category: '',
        summary: '',
        content: ''
    });

    const isAdminOrHR = auth?.user?.role === 'Admin' || auth?.user?.role === 'HR';

    useEffect(() => {
        fetchPolicies();
    }, []);

    const fetchPolicies = async () => {
        try {
            const response = await fetch('/api/policies', {
                credentials: 'include'
            });
            const policiesData = await response.json();
            setPolicies(policiesData);
            if (policiesData.length > 0 && !selectedPolicy) {
                setSelectedPolicy(policiesData[0]);
            }
        } catch (error) {
            console.error('Error fetching policies:', error);
        }
    };

    const handleAddPolicy = async () => {
        try {
            const response = await fetch('/api/policies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                const newPolicy = await response.json();
                setPolicies([...policies, newPolicy]);
                setNotification('Policy added successfully!');
                setShowAddModal(false);
                resetForm();
                setTimeout(() => setNotification(''), 3000);
            }
        } catch (error) {
            console.error('Error adding policy:', error);
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
                setNotification('Policy updated successfully!');
                setEditingPolicy(null);
                resetForm();
                setTimeout(() => setNotification(''), 3000);
            }
        } catch (error) {
            console.error('Error updating policy:', error);
        }
    };

    const handleDeletePolicy = async (policyId: number) => {
        if (!confirm('Are you sure you want to delete this policy?')) return;
        
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
                setNotification('Policy deleted successfully!');
                setTimeout(() => setNotification(''), 3000);
            }
        } catch (error) {
            console.error('Error deleting policy:', error);
        }
    };

    const resetForm = () => {
        setFormData({ title: '', category: '', summary: '', content: '' });
    };

    const openEditModal = (policy: Policy) => {
        setEditingPolicy(policy);
        setFormData({
            title: policy.title,
            category: policy.category,
            summary: policy.summary,
            content: policy.content
        });
    };

    const filteredPolicies = policies.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Policies & Knowledge Base</h1>
                    <p className="text-gray-600 mt-1">Access company policies and procedures.</p>
                </div>
                {isAdminOrHR && (
                    <Button onClick={() => { console.log('Add Policy clicked'); alert('Add Policy clicked'); setShowAddModal(true); }}>
                        <Icon name="plus" className="w-5 h-5 mr-2" />
                        Add Policy
                    </Button>
                )}
                <div className="text-sm text-gray-500">User role: {auth?.user?.role} | isAdminOrHR: {isAdminOrHR.toString()}</div>
            </div>

            {notification && (
                <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md">
                    {notification}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <Card>
                        <h2 className="text-xl font-semibold text-gray-700 mb-4">Policies</h2>
                        <input
                            type="text"
                            placeholder="Search policies..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <ul className="space-y-2 h-96 overflow-y-auto">
                            {filteredPolicies.map(policy => (
                                <li key={policy.id}>
                                    <div className={`p-3 rounded-md transition-colors ${selectedPolicy?.id === policy.id ? 'bg-indigo-100 text-indigo-800' : 'hover:bg-gray-100'}`}>
                                        <button
                                            onClick={() => setSelectedPolicy(policy)}
                                            className="w-full text-left"
                                        >
                                            <p className="font-medium">{policy.title}</p>
                                            <p className="text-sm text-gray-500">{policy.category}</p>
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
                                                <button
                                                    onClick={() => handleDeletePolicy(policy.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Delete Policy"
                                                >
                                                    <Icon name="trash" className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card>
                        {selectedPolicy ? (
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">{selectedPolicy.title}</h2>
                                <p className="text-sm text-gray-500 mt-1 mb-4">{selectedPolicy.category}</p>
                                <p className="text-gray-700 font-medium mb-4">{selectedPolicy.summary}</p>
                                <div className="prose max-w-none text-gray-600">
                                    <p>{selectedPolicy.content}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <Icon name="document-magnifying-glass" className="h-12 w-12 mx-auto text-gray-400" />
                                <p className="mt-4 text-gray-600">Select a policy to view its details.</p>
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
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Summary</label>
                            <input
                                type="text"
                                value={formData.summary}
                                onChange={(e) => setFormData({...formData, summary: e.target.value})}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Content</label>
                            <textarea
                                rows={6}
                                value={formData.content}
                                onChange={(e) => setFormData({...formData, content: e.target.value})}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                            />
                        </div>
                        
                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button variant="secondary" onClick={() => { setShowAddModal(false); resetForm(); }}>
                                Cancel
                            </Button>
                            <Button onClick={handleAddPolicy} disabled={!formData.title || !formData.category}>
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
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Content</label>
                            <textarea
                                rows={6}
                                value={formData.content}
                                onChange={(e) => setFormData({...formData, content: e.target.value})}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                            />
                        </div>
                        
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