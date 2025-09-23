import React, { useState, useRef, useContext } from 'react';
import { mockUserDocuments, mockCompanyDocuments } from '../../data/mockData';
import { UserDocument, DocumentStatus, UserRole } from '../../types';
import Card from '../common/Card';
import Icon from '../common/Icon';
import Button from '../common/Button';
import ProgressBar from '../common/ProgressBar';
import Modal from '../common/Modal';
import Loader from '../common/Loader';
import { UserContext } from '../../App';

const getStatusIcon = (status: DocumentStatus) => {
    switch (status) {
        case DocumentStatus.Verified:
            return <Icon name="check-circle" className="h-6 w-6 text-green-500" />;
        case DocumentStatus.Uploaded:
            return <Icon name="clock" className="h-6 w-6 text-yellow-500" />;
        case DocumentStatus.Rejected:
            return <Icon name="x-circle" className="h-6 w-6 text-red-500" />;
        case DocumentStatus.Pending:
            return <Icon name="arrow-up-tray" className="h-6 w-6 text-gray-400" />;
    }
};

interface UploadingFile {
    id: number;
    file: File;
    progress: number;
    error?: string;
}

let uploadIdCounter = 0;

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const Documents: React.FC = () => {
    const [userDocuments, setUserDocuments] = useState<UserDocument[]>([]);
    const [allUserDocuments, setAllUserDocuments] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
    const [targetDocId, setTargetDocId] = useState<string | null>(null);
    const [docToReject, setDocToReject] = useState<UserDocument | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [verifying, setVerifying] = useState<string | null>(null);
    const [rejecting, setRejecting] = useState(false);
    const [selectedUser, setSelectedUser] = useState<string>('all');
    const [documentFilter, setDocumentFilter] = useState<string>('all');
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [newDocumentName, setNewDocumentName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadingDocument, setUploadingDocument] = useState(false);
    const auth = useContext(UserContext);
    
    const singleFileInputRef = useRef<HTMLInputElement>(null);
    const multiFileInputRef = useRef<HTMLInputElement>(null);
    const hrDocumentInputRef = useRef<HTMLInputElement>(null);
    const progressSectionRef = useRef<HTMLDivElement>(null);

    // Fetch user documents from server
    const fetchUserDocuments = async () => {
        if (!auth?.user?.id) return;
        
        try {
            const response = await fetch(`/api/documents/user/${auth.user.id}`);
            if (response.ok) {
                const documents = await response.json();
                const formattedDocs: UserDocument[] = documents.map((doc: any) => ({
                    id: doc.id.toString(),
                    name: doc.name,
                    status: doc.status as DocumentStatus,
                    actionDate: doc.action_date,
                    rejectionReason: doc.rejection_reason
                }));
                setUserDocuments(formattedDocs);
            } else {
                setUserDocuments(mockUserDocuments);
            }
        } catch (error) {
            setUserDocuments(mockUserDocuments);
        } finally {
            setLoading(false);
        }
    };

    // Fetch all user documents for HR panel
    const fetchAllUserDocuments = async () => {
        if (auth?.user?.role !== 'Admin' && auth?.user?.role !== 'HR') return;
        
        try {
            const response = await fetch('/api/documents/all', {
                credentials: 'include'
            });
            if (response.ok) {
                const documents = await response.json();
                setAllUserDocuments(documents);
            }
        } catch (error) {
            console.error('Error fetching all documents:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch users for HR panel
    const fetchUsers = async () => {
        if (auth?.user?.role !== 'Admin' && auth?.user?.role !== 'HR') return;
        
        try {
            const response = await fetch('/api/users', {
                credentials: 'include'
            });
            if (response.ok) {
                const usersData = await response.json();
                setUsers(usersData);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    // Fetch documents on component mount and when user changes
    React.useEffect(() => {
        if (auth?.user?.role === 'Admin' || auth?.user?.role === 'HR') {
            fetchAllUserDocuments();
            fetchUsers();
        } else {
            fetchUserDocuments();
        }
    }, [auth?.user?.id, auth?.user?.role]);

    const handleSingleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && targetDocId) {
            const file = e.target.files[0];
            const targetDoc = userDocuments.find(doc => doc.id === targetDocId);
            if (!targetDoc) return;
            
            const formData = new FormData();
            formData.append('document', file);
            formData.append('userId', auth?.user?.id?.toString() || '6');
            formData.append('documentName', targetDoc.name);
            
            try {
                const response = await fetch('/api/documents/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    fetchUserDocuments();
                }
            } catch (error) {
                console.error('Single file upload error:', error);
            }
        }
        if (e.target) e.target.value = '';
        setTargetDocId(null);
    };

    const triggerSingleUpload = (docId: string) => {
        setTargetDocId(docId);
        singleFileInputRef.current?.click();
    };

    const handleVerification = async (docId: string) => {
        try {
            setVerifying(docId);
            const response = await fetch(`/api/documents/${docId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: 'Verified' })
            });
            
            if (response.ok) {
                fetchAllUserDocuments();
            }
        } catch (error) {
            console.error('Error verifying document:', error);
        } finally {
            setVerifying(null);
        }
    };
    
    const openRejectionModal = (doc: UserDocument) => {
        setDocToReject(doc);
        setRejectionReason('');
    };

    const closeRejectionModal = () => {
        setDocToReject(null);
    };

    const handleConfirmRejection = async () => {
        if (!docToReject || !rejectionReason.trim()) return;

        try {
            setRejecting(true);
            const response = await fetch(`/api/documents/${docToReject.id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ 
                    status: 'Rejected', 
                    rejectionReason: rejectionReason.trim() 
                })
            });
            
            if (response.ok) {
                fetchAllUserDocuments();
            }
            closeRejectionModal();
        } catch (error) {
            console.error('Error rejecting document:', error);
            closeRejectionModal();
        } finally {
            setRejecting(false);
        }
    };

    // Assign document to users
    const handleAssignDocument = async () => {
        if (!newDocumentName.trim() || selectedUsers.length === 0) return;
        
        try {
            const response = await fetch('/api/documents/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    documentName: newDocumentName.trim(),
                    userIds: selectedUsers
                })
            });
            
            if (response.ok) {
                setShowAssignModal(false);
                setNewDocumentName('');
                setSelectedUsers([]);
                fetchAllUserDocuments();
            }
        } catch (error) {
            console.error('Error assigning document:', error);
        }
    };

    // Upload HR document
    const handleHRDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('document', file);
        formData.append('userId', auth?.user?.id?.toString() || '');
        formData.append('documentName', file.name);
        
        try {
            setUploadingDocument(true);
            const response = await fetch('/api/documents/upload', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            
            if (response.ok) {
                fetchAllUserDocuments();
                setShowUploadModal(false);
            }
        } catch (error) {
            console.error('Error uploading HR document:', error);
        } finally {
            setUploadingDocument(false);
            if (e.target) e.target.value = '';
        }
    };

    // Filter and search documents
    const filteredDocuments = allUserDocuments.filter(doc => {
        const userMatch = selectedUser === 'all' || doc.user_id?.toString() === selectedUser;
        const statusMatch = documentFilter === 'all' || doc.status?.toLowerCase() === documentFilter;
        const searchMatch = !searchTerm || 
            doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
        return userMatch && statusMatch && searchMatch;
    });

    // Pagination
    const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
    const paginatedDocuments = filteredDocuments.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Get document statistics
    const getDocumentStats = () => {
        const total = allUserDocuments.length;
        const pending = allUserDocuments.filter(doc => doc.status === 'Uploaded').length;
        const verified = allUserDocuments.filter(doc => doc.status === 'Verified').length;
        const rejected = allUserDocuments.filter(doc => doc.status === 'Rejected').length;
        const overdue = allUserDocuments.filter(doc => doc.status === 'Overdue').length;
        return { total, pending, verified, rejected, overdue };
    };

    // Bulk actions
    const handleBulkVerify = async () => {
        if (selectedDocs.length === 0) return;
        try {
            const response = await fetch('/api/documents/bulk-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ action: 'verify', documentIds: selectedDocs })
            });
            if (response.ok) {
                setSelectedDocs([]);
                fetchAllUserDocuments();
            }
        } catch (error) {
            console.error('Error bulk verifying:', error);
        }
    };

    const handleBulkReject = async () => {
        if (selectedDocs.length === 0 || !rejectionReason.trim()) return;
        try {
            const response = await fetch('/api/documents/bulk-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ action: 'reject', documentIds: selectedDocs, rejectionReason })
            });
            if (response.ok) {
                setSelectedDocs([]);
                setRejectionReason('');
                fetchAllUserDocuments();
            }
        } catch (error) {
            console.error('Error bulk rejecting:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader text="Loading documents..." />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                    {(auth?.user?.role === 'Admin' || auth?.user?.role === 'HR') ? 'HR Documents Management' : 'Documents Hub'}
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                    {(auth?.user?.role === 'Admin' || auth?.user?.role === 'HR') 
                        ? 'Manage employee documents and compliance efficiently' 
                        : 'Manage your documents and access important company files.'}
                </p>
            </div>

            {/* HR Dashboard */}
            {(auth?.user?.role === 'Admin' || auth?.user?.role === 'HR') ? (
                <>
                    {/* Statistics Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        {(() => {
                            const stats = getDocumentStats();
                            return (
                                <>
                                    <Card className="p-4 text-center">
                                        <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                                        <div className="text-sm text-gray-600">Total</div>
                                    </Card>
                                    <Card className="p-4 text-center">
                                        <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                                        <div className="text-sm text-gray-600">Pending</div>
                                    </Card>
                                    <Card className="p-4 text-center">
                                        <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
                                        <div className="text-sm text-gray-600">Verified</div>
                                    </Card>
                                    <Card className="p-4 text-center">
                                        <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                                        <div className="text-sm text-gray-600">Rejected</div>
                                    </Card>
                                    <Card className="p-4 text-center">
                                        <div className="text-2xl font-bold text-orange-600">{stats.overdue}</div>
                                        <div className="text-sm text-gray-600">Overdue</div>
                                    </Card>
                                </>
                            );
                        })()}
                    </div>

                    {/* Controls */}
                    <Card className="p-4 mb-6">
                        <div className="flex flex-wrap gap-4 items-center justify-between">
                            <div className="flex gap-4 items-center">
                                <input
                                    type="text"
                                    placeholder="Search documents, employees..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="px-3 py-2 border rounded-md w-64"
                                />
                                <select
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    className="px-3 py-2 border rounded-md"
                                >
                                    <option value="all">All Users</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>{user.name}</option>
                                    ))}
                                </select>
                                <select
                                    value={documentFilter}
                                    onChange={(e) => setDocumentFilter(e.target.value)}
                                    className="px-3 py-2 border rounded-md"
                                >
                                    <option value="all">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="uploaded">Uploaded</option>
                                    <option value="verified">Verified</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => setShowUploadModal(true)} size="sm" variant="secondary">
                                    <Icon name="arrow-up-tray" className="w-4 h-4 mr-1" />
                                    Upload Document
                                </Button>
                                <Button onClick={() => setShowAssignModal(true)} size="sm">
                                    <Icon name="plus" className="w-4 h-4 mr-1" />
                                    Assign Document
                                </Button>
                            </div>
                        </div>

                        {/* Bulk Actions */}
                        {selectedDocs.length > 0 && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center gap-3">
                                <span className="text-sm font-medium">{selectedDocs.length} selected</span>
                                <Button onClick={handleBulkVerify} size="sm" className="bg-green-600 text-white">
                                    Verify All
                                </Button>
                                <Button onClick={() => setDocToReject({ id: 'bulk', name: 'Multiple Documents' } as UserDocument)} size="sm" className="bg-red-600 text-white">
                                    Reject All
                                </Button>
                                <Button onClick={() => setSelectedDocs([])} size="sm" variant="secondary">
                                    Clear
                                </Button>
                            </div>
                        )}
                    </Card>

                    {/* Documents Table */}
                    <Card>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left">
                                            <input
                                                type="checkbox"
                                                checked={selectedDocs.length === paginatedDocuments.length && paginatedDocuments.length > 0}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedDocs(paginatedDocuments.map(doc => doc.id?.toString() || ''));
                                                    } else {
                                                        setSelectedDocs([]);
                                                    }
                                                }}
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {paginatedDocuments.map(doc => (
                                        <tr key={`${doc.user_id}-${doc.id}`} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDocs.includes(doc.id?.toString() || '')}
                                                    onChange={(e) => {
                                                        const docId = doc.id?.toString() || '';
                                                        if (e.target.checked) {
                                                            setSelectedDocs([...selectedDocs, docId]);
                                                        } else {
                                                            setSelectedDocs(selectedDocs.filter(id => id !== docId));
                                                        }
                                                    }}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm font-medium text-gray-900">{doc.user_name || 'Unknown'}</div>
                                                <div className="text-sm text-gray-500">{doc.user_email}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm text-gray-900">{doc.name}</div>
                                                {doc.file_name && <div className="text-sm text-gray-500">{doc.file_name}</div>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    doc.status === 'Verified' ? 'bg-green-100 text-green-800' :
                                                    doc.status === 'Uploaded' ? 'bg-blue-100 text-blue-800' :
                                                    doc.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                    doc.status === 'Overdue' ? 'bg-orange-100 text-orange-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {doc.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    {doc.status === 'Uploaded' && (
                                                        <>
                                                            <Button 
                                                                onClick={() => handleVerification(doc.id?.toString() || '')} 
                                                                size="sm" 
                                                                className="bg-green-600 text-white hover:bg-green-700"
                                                                disabled={verifying === doc.id?.toString()}
                                                            >
                                                                {verifying === doc.id?.toString() ? 'Verifying...' : 'Verify'}
                                                            </Button>
                                                            <Button 
                                                                onClick={() => openRejectionModal({
                                                                    id: doc.id?.toString() || '',
                                                                    name: doc.name,
                                                                    status: doc.status as DocumentStatus,
                                                                    actionDate: doc.action_date,
                                                                    rejectionReason: doc.rejection_reason
                                                                })} 
                                                                size="sm" 
                                                                className="bg-red-100 text-red-700 hover:bg-red-200"
                                                            >
                                                                Reject
                                                            </Button>
                                                        </>
                                                    )}
                                                    {doc.file_url && (
                                                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
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
                            <div className="flex items-center justify-between px-4 py-3 border-t">
                                <div className="text-sm text-gray-700">
                                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredDocuments.length)} of {filteredDocuments.length} results
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
                                    <span className="px-3 py-1 text-sm">{currentPage} of {totalPages}</span>
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
                </>
            ) : (
                /* Employee View */
                <>
                    {/* Document Progress Overview */}
                    <Card className="mb-6" ref={progressSectionRef}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Document Progress</h2>
                            <div className="text-sm text-gray-500">
                                {userDocuments.filter(doc => doc.status === DocumentStatus.Verified).length} of {userDocuments.length} completed
                            </div>
                        </div>
                        <ProgressBar 
                            progress={userDocuments.length > 0 ? (userDocuments.filter(doc => doc.status === DocumentStatus.Verified).length / userDocuments.length) * 100 : 0} 
                            className="mb-2" 
                        />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div className="text-center p-3 bg-yellow-50 rounded-lg">
                                <div className="text-lg font-bold text-yellow-600">{userDocuments.filter(doc => doc.status === DocumentStatus.Pending).length}</div>
                                <div className="text-xs text-yellow-700">Pending</div>
                            </div>
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                                <div className="text-lg font-bold text-blue-600">{userDocuments.filter(doc => doc.status === DocumentStatus.Uploaded).length}</div>
                                <div className="text-xs text-blue-700">Under Review</div>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                                <div className="text-lg font-bold text-green-600">{userDocuments.filter(doc => doc.status === DocumentStatus.Verified).length}</div>
                                <div className="text-xs text-green-700">Verified</div>
                            </div>
                            <div className="text-center p-3 bg-red-50 rounded-lg">
                                <div className="text-lg font-bold text-red-600">{userDocuments.filter(doc => doc.status === DocumentStatus.Rejected).length}</div>
                                <div className="text-xs text-red-700">Rejected</div>
                            </div>
                        </div>
                    </Card>

                    {/* Required Documents */}
                    <Card className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Required Documents</h2>
                            <div className="text-sm text-gray-500">
                                Upload documents for HR review
                            </div>
                        </div>
                        {userDocuments.length === 0 ? (
                            <div className="text-center py-12">
                                <Icon name="document-text" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No documents assigned</h3>
                                <p className="text-gray-500 dark:text-gray-400">Your HR team hasn't assigned any documents yet. Check back later!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <input type="file" ref={singleFileInputRef} className="hidden" onChange={handleSingleFileUpload} />
                                {userDocuments.map(doc => (
                                    <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start flex-1">
                                                <div className="mt-1 mr-4">{getStatusIcon(doc.status)}</div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-medium text-gray-800 dark:text-gray-200">{doc.name}</h3>
                                                        {doc.priority && (
                                                            <span className={`px-2 py-1 text-xs rounded-full ${
                                                                doc.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                                                                doc.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                                                                doc.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-gray-100 text-gray-700'
                                                            }`}>
                                                                {doc.priority}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                                        Status: {doc.status}{doc.actionDate ? ` • Updated ${new Date(doc.actionDate).toLocaleDateString()}` : ''}
                                                    </p>
                                                    {doc.status === DocumentStatus.Rejected && doc.rejectionReason && (
                                                        <div className="mt-3 p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
                                                            <div className="flex items-start">
                                                                <Icon name="exclamation-triangle" className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-red-600" />
                                                                <div>
                                                                    <span className="font-semibold">Rejection Reason:</span>
                                                                    <p className="mt-1">{doc.rejectionReason}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {doc.fileName && (
                                                        <div className="mt-2 text-sm text-gray-600">
                                                            <Icon name="paper-clip" className="w-4 h-4 inline mr-1" />
                                                            {doc.fileName}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="ml-4 flex flex-col gap-2">
                                                {(doc.status === DocumentStatus.Pending || doc.status === DocumentStatus.Rejected) && (
                                                    <Button onClick={() => triggerSingleUpload(doc.id)} size="sm">
                                                        <Icon name="arrow-up-tray" className="w-4 h-4 mr-2" />
                                                        {doc.status === DocumentStatus.Rejected ? 'Re-upload' : 'Upload'}
                                                    </Button>
                                                )}
                                                {doc.status === DocumentStatus.Uploaded && (
                                                    <Button size="sm" variant="secondary" disabled>
                                                        <Icon name="clock" className="w-4 h-4 mr-2" />
                                                        Under Review
                                                    </Button>
                                                )}
                                                {doc.status === DocumentStatus.Verified && (
                                                    <Button size="sm" className="bg-green-600 text-white" disabled>
                                                        <Icon name="check-circle" className="w-4 h-4 mr-2" />
                                                        Verified
                                                    </Button>
                                                )}
                                                {doc.fileUrl && (
                                                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                                        <Button size="sm" variant="secondary">
                                                            <Icon name="eye" className="w-4 h-4 mr-2" />
                                                            View
                                                        </Button>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Quick Actions & Help */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Quick Actions */}
                        <Card>
                            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Quick Actions</h2>
                            <div className="space-y-3">
                                <button 
                                    onClick={() => window.open('mailto:hr@company.com?subject=Document Help Request', '_blank')}
                                    className="w-full flex items-center p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
                                >
                                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg mr-3 group-hover:bg-blue-200">
                                        <Icon name="question-mark-circle" className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-800">Need Help?</p>
                                        <p className="text-sm text-gray-500">Contact HR for document assistance</p>
                                    </div>
                                </button>
                                <button 
                                    onClick={() => {
                                        progressSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }}
                                    className="w-full flex items-center p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
                                >
                                    <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg mr-3 group-hover:bg-green-200">
                                        <Icon name="clock" className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-800">Check Status</p>
                                        <p className="text-sm text-gray-500">View document review progress</p>
                                    </div>
                                </button>
                                <button 
                                    onClick={() => alert('Document templates feature coming soon! Contact HR for specific forms.')}
                                    className="w-full flex items-center p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
                                >
                                    <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg mr-3 group-hover:bg-purple-200">
                                        <Icon name="document-duplicate" className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-800">Document Templates</p>
                                        <p className="text-sm text-gray-500">Download required forms</p>
                                    </div>
                                </button>
                            </div>
                        </Card>

                        {/* Tips & Guidelines */}
                        <Card>
                            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Document Tips</h2>
                            <div className="space-y-4">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                                        <span className="text-xs font-semibold text-blue-600">1</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">File Format</p>
                                        <p className="text-xs text-gray-500">Upload clear PDF or image files (max 10MB)</p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                                        <span className="text-xs font-semibold text-green-600">2</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">Quality Check</p>
                                        <p className="text-xs text-gray-500">Ensure all text is readable and complete</p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                                        <span className="text-xs font-semibold text-yellow-600">3</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">Review Time</p>
                                        <p className="text-xs text-gray-500">HR typically reviews within 2-3 business days</p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                                        <span className="text-xs font-semibold text-red-600">4</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">Resubmission</p>
                                        <p className="text-xs text-gray-500">Address feedback and re-upload if rejected</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </>
            )}

            {/* Upload Document Modal */}
            {showUploadModal && (
                <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload Document">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Document</label>
                            <input
                                ref={hrDocumentInputRef}
                                type="file"
                                onChange={handleHRDocumentUpload}
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            />
                            <p className="mt-2 text-xs text-gray-500">Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)</p>
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button variant="secondary" onClick={() => setShowUploadModal(false)}>Cancel</Button>
                            <Button onClick={() => hrDocumentInputRef.current?.click()} disabled={uploadingDocument}>
                                {uploadingDocument ? 'Uploading...' : 'Choose File'}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Assign Document Modal */}
            {showAssignModal && (
                <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Document">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Document Name</label>
                            <input
                                type="text"
                                value={newDocumentName}
                                onChange={(e) => setNewDocumentName(e.target.value)}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                placeholder="e.g., ID Card, Resume, Tax Forms"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                    <option value="High">High</option>
                                    <option value="Critical">Critical</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                                <input
                                    type="date"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                                <option value="Onboarding">Onboarding</option>
                                <option value="Compliance">Compliance</option>
                                <option value="Personal">Personal Documents</option>
                                <option value="Legal">Legal</option>
                                <option value="Training">Training</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Users</label>
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
                                            <div className="text-sm font-medium">{user.name}</div>
                                            <div className="text-xs text-gray-500">{user.email}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button variant="secondary" onClick={() => setShowAssignModal(false)}>Cancel</Button>
                            <Button 
                                onClick={handleAssignDocument} 
                                disabled={!newDocumentName.trim() || selectedUsers.length === 0}
                            >
                                Assign Document
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Rejection Modal */}
            {docToReject && (
                <Modal 
                    isOpen={!!docToReject} 
                    onClose={closeRejectionModal} 
                    title={docToReject.id === 'bulk' ? 'Bulk Reject Documents' : `Reject: ${docToReject.name}`}
                >
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="rejection-reason" className="block text-sm font-medium text-gray-700">
                                Reason for Rejection
                            </label>
                            <textarea
                                id="rejection-reason"
                                rows={4}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                placeholder="Provide clear feedback for the employee..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                            />
                            <p className="mt-2 text-xs text-gray-500">This reason will be visible to the employee(s).</p>
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button variant="secondary" onClick={closeRejectionModal}>Cancel</Button>
                            <Button 
                                variant="danger" 
                                onClick={docToReject.id === 'bulk' ? handleBulkReject : handleConfirmRejection} 
                                disabled={!rejectionReason.trim() || rejecting}
                            >
                                {rejecting ? (
                                    <div className="flex items-center">
                                        <Loader size="sm" color="white" />
                                        <span className="ml-2">Rejecting...</span>
                                    </div>
                                ) : 'Confirm Rejection'}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Documents;