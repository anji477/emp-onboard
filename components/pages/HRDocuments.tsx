import React, { useState, useEffect, useContext } from 'react';
import { UserDocument, DocumentStatus, DocumentFilter, BulkAction, DocumentTemplate, DocumentStats, UserRole } from '../../types';
import Card from '../common/Card';
import Icon from '../common/Icon';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Loader from '../common/Loader';
import { UserContext } from '../../App';

const HRDocuments: React.FC = () => {
    const [documents, setDocuments] = useState<UserDocument[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [stats, setStats] = useState<DocumentStats>({ total: 0, pending: 0, uploaded: 0, verified: 0, rejected: 0, overdue: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [bulkAction, setBulkAction] = useState<BulkAction>({ action: 'verify', documentIds: [] });
    const [filters, setFilters] = useState<DocumentFilter>({
        status: 'all',
        user: 'all',
        priority: 'all',
        dateRange: 'all',
        category: 'all'
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'date' | 'status' | 'priority'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);
    const [rejectionReason, setRejectionReason] = useState('');
    const [newTemplate, setNewTemplate] = useState<Partial<DocumentTemplate>>({});
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const auth = useContext(UserContext);

    useEffect(() => {
        if (auth?.user?.role === 'Admin' || auth?.user?.role === 'HR') {
            fetchDocuments();
            fetchUsers();
            fetchTemplates();
            fetchCategories();
            fetchStats();
        }
    }, [auth?.user?.role]);

    const fetchDocuments = async () => {
        try {
            const response = await fetch('/api/documents/all');
            if (response.ok) {
                const data = await response.json();
                setDocuments(data);
            }
        } catch (error) {
            console.error('Error fetching documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users');
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchTemplates = async () => {
        try {
            const response = await fetch('/api/documents/templates');
            if (response.ok) {
                const data = await response.json();
                setTemplates(data);
            }
        } catch (error) {
            console.error('Error fetching templates:', error);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await fetch('/api/documents/categories');
            if (response.ok) {
                const data = await response.json();
                setCategories(data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/documents/analytics');
            if (response.ok) {
                const data = await response.json();
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleBulkAction = async () => {
        if (selectedDocs.length === 0) return;

        try {
            const response = await fetch('/api/documents/bulk-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: bulkAction.action,
                    documentIds: selectedDocs,
                    rejectionReason: rejectionReason
                })
            });

            if (response.ok) {
                setShowBulkModal(false);
                setSelectedDocs([]);
                setRejectionReason('');
                fetchDocuments();
                fetchStats();
            }
        } catch (error) {
            console.error('Error performing bulk action:', error);
        }
    };

    const handleAssignTemplate = async () => {
        if (!selectedTemplate || selectedUsers.length === 0) return;

        try {
            const template = templates.find(t => t.id === selectedTemplate);
            const response = await fetch('/api/documents/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentName: template?.name,
                    userIds: selectedUsers,
                    priority: template?.priority,
                    dueInDays: template?.dueInDays
                })
            });

            if (response.ok) {
                setShowAssignModal(false);
                setSelectedUsers([]);
                setSelectedTemplate('');
                fetchDocuments();
                fetchStats();
            }
        } catch (error) {
            console.error('Error assigning template:', error);
        }
    };

    const handleCreateTemplate = async () => {
        if (!newTemplate.name) return;

        try {
            const response = await fetch('/api/documents/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTemplate)
            });

            if (response.ok) {
                setShowTemplateModal(false);
                setNewTemplate({});
                fetchTemplates();
            }
        } catch (error) {
            console.error('Error creating template:', error);
        }
    };

    const filteredDocuments = documents.filter(doc => {
        const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            doc.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            doc.userEmail?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filters.status === 'all' || doc.status.toLowerCase() === filters.status;
        const matchesUser = filters.user === 'all' || doc.userId === filters.user;
        const matchesPriority = filters.priority === 'all' || doc.priority === filters.priority;

        return matchesSearch && matchesStatus && matchesUser && matchesPriority;
    });

    const sortedDocuments = [...filteredDocuments].sort((a, b) => {
        let aValue, bValue;
        switch (sortBy) {
            case 'name':
                aValue = a.name;
                bValue = b.name;
                break;
            case 'date':
                aValue = a.uploadedAt || a.actionDate || '';
                bValue = b.uploadedAt || b.actionDate || '';
                break;
            case 'status':
                aValue = a.status;
                bValue = b.status;
                break;
            case 'priority':
                const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
                aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
                bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
                break;
            default:
                return 0;
        }

        if (sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });

    const paginatedDocuments = sortedDocuments.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const totalPages = Math.ceil(sortedDocuments.length / itemsPerPage);

    const getStatusColor = (status: DocumentStatus) => {
        switch (status) {
            case DocumentStatus.Verified: return 'bg-green-100 text-green-800';
            case DocumentStatus.Uploaded: return 'bg-blue-100 text-blue-800';
            case DocumentStatus.InReview: return 'bg-yellow-100 text-yellow-800';
            case DocumentStatus.Rejected: return 'bg-red-100 text-red-800';
            case DocumentStatus.Overdue: return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityColor = (priority?: string) => {
        switch (priority) {
            case 'Critical': return 'bg-red-500';
            case 'High': return 'bg-orange-500';
            case 'Medium': return 'bg-yellow-500';
            case 'Low': return 'bg-green-500';
            default: return 'bg-gray-500';
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader text="Loading documents..." /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">HR Documents Management</h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1 text-xs">Manage employee documents and compliance</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setShowTemplateModal(true)} size="sm">
                        <Icon name="document-plus" className="w-4 h-4 mr-1" />
                        Create Template
                    </Button>
                    <Button onClick={() => setShowAssignModal(true)} size="sm">
                        <Icon name="user-plus" className="w-4 h-4 mr-1" />
                        Assign Documents
                    </Button>
                </div>
            </div>

            {/* Statistics Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <Card className="p-4">
                    <div className="text-base font-bold text-blue-600">{stats.total}</div>
                    <div className="text-xs text-gray-600">Total</div>
                </Card>
                <Card className="p-4">
                    <div className="text-base font-bold text-yellow-600">{stats.pending}</div>
                    <div className="text-xs text-gray-600">Pending</div>
                </Card>
                <Card className="p-4">
                    <div className="text-base font-bold text-blue-600">{stats.uploaded}</div>
                    <div className="text-xs text-gray-600">Uploaded</div>
                </Card>
                <Card className="p-4">
                    <div className="text-base font-bold text-green-600">{stats.verified}</div>
                    <div className="text-xs text-gray-600">Verified</div>
                </Card>
                <Card className="p-4">
                    <div className="text-base font-bold text-red-600">{stats.rejected}</div>
                    <div className="text-xs text-gray-600">Rejected</div>
                </Card>
                <Card className="p-4">
                    <div className="text-base font-bold text-orange-600">{stats.overdue}</div>
                    <div className="text-xs text-gray-600">Overdue</div>
                </Card>
            </div>

            {/* Filters and Search */}
            <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
                    <div>
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({...filters, status: e.target.value})}
                        className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="uploaded">Uploaded</option>
                        <option value="verified">Verified</option>
                        <option value="rejected">Rejected</option>
                        <option value="overdue">Overdue</option>
                    </select>
                    <select
                        value={filters.user}
                        onChange={(e) => setFilters({...filters, user: e.target.value})}
                        className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        <option value="all">All Users</option>
                        {users.map(user => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                    </select>
                    <select
                        value={filters.priority}
                        onChange={(e) => setFilters({...filters, priority: e.target.value})}
                        className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        <option value="all">All Priority</option>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        <option value="date">Sort by Date</option>
                        <option value="name">Sort by Name</option>
                        <option value="status">Sort by Status</option>
                        <option value="priority">Sort by Priority</option>
                    </select>
                    <Button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        variant="secondary"
                        size="sm"
                    >
                        <Icon name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} className="w-4 h-4" />
                    </Button>
                </div>

                {/* Bulk Actions */}
                {selectedDocs.length > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                        <span className="text-xs font-medium">{selectedDocs.length} selected</span>
                        <Button onClick={() => { setBulkAction({action: 'verify', documentIds: selectedDocs}); setShowBulkModal(true); }} size="sm">
                            Verify All
                        </Button>
                        <Button onClick={() => { setBulkAction({action: 'reject', documentIds: selectedDocs}); setShowBulkModal(true); }} size="sm" variant="danger">
                            Reject All
                        </Button>
                        <Button onClick={() => setSelectedDocs([])} size="sm" variant="secondary">
                            Clear Selection
                        </Button>
                    </div>
                )}
            </Card>

            {/* Documents Table */}
            <Card>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={selectedDocs.length === paginatedDocuments.length && paginatedDocuments.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedDocs(paginatedDocuments.map(doc => doc.id));
                                            } else {
                                                setSelectedDocs([]);
                                            }
                                        }}
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedDocuments.map(doc => (
                                <tr key={doc.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedDocs.includes(doc.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedDocs([...selectedDocs, doc.id]);
                                                } else {
                                                    setSelectedDocs(selectedDocs.filter(id => id !== doc.id));
                                                }
                                            }}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs font-medium text-gray-900">{doc.userName}</div>
                                        <div className="text-xs text-gray-500">{doc.userEmail}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs text-gray-900">{doc.name}</div>
                                        {doc.fileName && <div className="text-xs text-gray-500">{doc.fileName}</div>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`w-3 h-3 rounded-full ${getPriorityColor(doc.priority)}`} title={doc.priority}></div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(doc.status)}`}>
                                            {doc.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-500">
                                        {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-xs font-medium">
                                        <div className="flex gap-2">
                                            {doc.status === DocumentStatus.Uploaded && (
                                                <>
                                                    <Button size="sm" className="bg-green-100 text-green-700 hover:bg-green-200">
                                                        Verify
                                                    </Button>
                                                    <Button size="sm" className="bg-red-100 text-red-700 hover:bg-red-200">
                                                        Reject
                                                    </Button>
                                                </>
                                            )}
                                            {doc.fileUrl && (
                                                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                                    <Button size="sm" variant="secondary">View</Button>
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t">
                        <div className="text-xs text-gray-700">
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedDocuments.length)} of {sortedDocuments.length} results
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                size="sm"
                                variant="secondary"
                            >
                                Previous
                            </Button>
                            <span className="px-3 py-1 text-xs">{currentPage} of {totalPages}</span>
                            <Button
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                size="sm"
                                variant="secondary"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Bulk Action Modal */}
            {showBulkModal && (
                <Modal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} title={`Bulk ${bulkAction.action}`}>
                    <div className="space-y-4">
                        <p>Are you sure you want to {bulkAction.action} {selectedDocs.length} documents?</p>
                        {bulkAction.action === 'reject' && (
                            <textarea
                                placeholder="Rejection reason..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                rows={3}
                            />
                        )}
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setShowBulkModal(false)}>Cancel</Button>
                            <Button onClick={handleBulkAction}>Confirm</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Assign Documents Modal */}
            {showAssignModal && (
                <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Documents">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Document Template</label>
                            <select
                                value={selectedTemplate}
                                onChange={(e) => setSelectedTemplate(e.target.value)}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            >
                                <option value="">Select template...</option>
                                {templates.map(template => (
                                    <option key={template.id} value={template.id}>{template.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Assign to Users</label>
                            <div className="max-h-48 overflow-y-auto border rounded-md p-2">
                                {users.map(user => (
                                    <label key={user.id} className="flex items-center p-2 hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.includes(user.id.toString())}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedUsers([...selectedUsers, user.id.toString()]);
                                                } else {
                                                    setSelectedUsers(selectedUsers.filter(id => id !== user.id.toString()));
                                                }
                                            }}
                                            className="mr-2"
                                        />
                                        <div>
                                            <div className="text-xs font-medium">{user.name}</div>
                                            <div className="text-xs text-gray-500">{user.email}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setShowAssignModal(false)}>Cancel</Button>
                            <Button onClick={handleAssignTemplate} disabled={!selectedTemplate || selectedUsers.length === 0}>
                                Assign
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Create Template Modal */}
            {showTemplateModal && (
                <Modal isOpen={showTemplateModal} onClose={() => setShowTemplateModal(false)} title="Create Document Template">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Template Name</label>
                            <input
                                type="text"
                                value={newTemplate.name || ''}
                                onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={newTemplate.description || ''}
                                onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                            <select
                                value={newTemplate.category || ''}
                                onChange={(e) => setNewTemplate({...newTemplate, category: e.target.value})}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            >
                                <option value="">Select category...</option>
                                {categories.map(category => (
                                    <option key={category.id} value={category.name}>{category.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                                <select
                                    value={newTemplate.priority || 'Medium'}
                                    onChange={(e) => setNewTemplate({...newTemplate, priority: e.target.value as any})}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Critical">Critical</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Due in Days</label>
                                <input
                                    type="number"
                                    value={newTemplate.dueInDays || ''}
                                    onChange={(e) => setNewTemplate({...newTemplate, dueInDays: parseInt(e.target.value)})}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setShowTemplateModal(false)}>Cancel</Button>
                            <Button onClick={handleCreateTemplate} disabled={!newTemplate.name}>
                                Create Template
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default HRDocuments;