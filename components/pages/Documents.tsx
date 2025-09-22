import React, { useState, useRef, useContext } from 'react';
import { mockUserDocuments, mockCompanyDocuments } from '../../data/mockData';
import { UserDocument, DocumentStatus, UserRole } from '../../types';
import Card from '../common/Card';
import Icon from '../common/Icon';
import Button from '../common/Button';
import ProgressBar from '../common/ProgressBar';
import Modal from '../common/Modal';
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
    const [loading, setLoading] = useState(true);
    const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
    const [targetDocId, setTargetDocId] = useState<string | null>(null);
    const [docToReject, setDocToReject] = useState<UserDocument | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const auth = useContext(UserContext);
    
    const singleFileInputRef = useRef<HTMLInputElement>(null);
    const multiFileInputRef = useRef<HTMLInputElement>(null);

    // Fetch user documents from server
    const fetchUserDocuments = async () => {
        if (!auth?.user?.id) return;
        
        try {
            const response = await fetch(`/api/documents/user/${auth.user.id}`);
            if (response.ok) {
                const documents = await response.json();
                console.log('Fetched documents:', documents);
                
                // Convert server response to frontend format
                const formattedDocs: UserDocument[] = documents.map((doc: any) => ({
                    id: doc.id.toString(),
                    name: doc.name,
                    status: doc.status as DocumentStatus,
                    actionDate: doc.action_date,
                    rejectionReason: doc.rejection_reason
                }));
                
                setUserDocuments(formattedDocs);
            } else {
                console.error('Failed to fetch documents:', response.statusText);
                // Fallback to mock data if server fails
                setUserDocuments(mockUserDocuments);
            }
        } catch (error) {
            console.error('Error fetching documents:', error);
            // Fallback to mock data if server fails
            setUserDocuments(mockUserDocuments);
        } finally {
            setLoading(false);
        }
    };

    // Fetch documents on component mount and when user changes
    React.useEffect(() => {
        fetchUserDocuments();
    }, [auth?.user?.id]);

    const handleSingleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && targetDocId) {
            const file = e.target.files[0];
            console.log(`Uploading ${file.name} for document ID ${targetDocId}`);
            
            // Find the document name for this ID
            const targetDoc = userDocuments.find(doc => doc.id === targetDocId);
            if (!targetDoc) {
                console.error('Target document not found');
                return;
            }
            
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
                    console.log('Single file upload successful');
                    // Refresh documents from server
                    fetchUserDocuments();
                } else {
                    console.error('Single file upload failed:', response.statusText);
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
    
    const startUpload = (upload: UploadingFile) => {
        const interval = setInterval(() => {
            setUploadingFiles(prev =>
                prev.map(f => {
                    if (f.id === upload.id && !f.error) {
                         // Simulate a random failure (reduced rate)
                        if (Math.random() < 0.05 && f.progress > 20 && f.progress < 90) {
                            clearInterval(interval);
                            return { ...f, error: "Upload failed. Please retry." };
                        }

                        const newProgress = f.progress + 5 + 10 * Math.random();
                        if (newProgress >= 100) {
                            clearInterval(interval);
                            
                            setTimeout(() => {
                                setUploadingFiles(prevUploading => prevUploading.filter(uf => uf.id !== upload.id));
                                setUserDocuments(prevDocs => {
                                    const newDoc: UserDocument = {
                                        id: `ud-${Date.now()}-${upload.file.name}`,
                                        name: upload.file.name,
                                        status: DocumentStatus.Uploaded,
                                        actionDate: new Date().toISOString().split('T')[0],
                                        rejectionReason: undefined
                                    };
                                    const updatedDocs = [...prevDocs];
                                    const existingPendingIndex = updatedDocs.findIndex(doc => doc.name.toLowerCase() === newDoc.name.toLowerCase() && (doc.status === DocumentStatus.Pending || doc.status === DocumentStatus.Rejected));
                                    
                                    if (existingPendingIndex > -1) {
                                        updatedDocs[existingPendingIndex] = { ...newDoc, id: prevDocs[existingPendingIndex].id };
                                        return updatedDocs;
                                    }
                                    
                                    return [...prevDocs, newDoc];
                                });
                            }, 500);

                            return { ...f, progress: 100, error: undefined };
                        }
                        return { ...f, progress: newProgress, error: undefined };
                    }
                    return f;
                })
            );
        }, 200);
    };

    const handleRetryUpload = (fileId: number) => {
        const fileToRetry = uploadingFiles.find(f => f.id === fileId);
        if (fileToRetry) {
            const newFileToRetry = { ...fileToRetry, progress: 0, error: undefined };
            setUploadingFiles(prev => prev.map(f => f.id === fileId ? newFileToRetry : f));
            startUpload(newFileToRetry);
        }
    };

    const handleMultiFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const newUploads: UploadingFile[] = files.map(file => ({
                id: uploadIdCounter++,
                file,
                progress: 0,
                error: undefined
            }));

            setUploadingFiles(prev => [...prev, ...newUploads]);
            newUploads.forEach(upload => {
                console.log('Queuing upload for:', upload.file.name);
                uploadFileToServer(upload);
            });
            if (e.target) e.target.value = '';
        }
    };

    const uploadFileToServer = async (upload: UploadingFile) => {
        const formData = new FormData();
        formData.append('document', upload.file);
        formData.append('userId', auth?.user?.id?.toString() || '6');
        formData.append('documentName', upload.file.name);

        console.log('Starting upload for:', upload.file.name, 'User ID:', auth?.user?.id?.toString() || '6');

        try {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const progress = (event.loaded / event.total) * 100;
                    console.log(`Upload progress for ${upload.file.name}: ${progress.toFixed(1)}%`);
                    setUploadingFiles(prev => 
                        prev.map(f => f.id === upload.id ? { ...f, progress } : f)
                    );
                }
            };

            xhr.onload = () => {
                console.log('Upload completed with status:', xhr.status);
                console.log('Response:', xhr.responseText);
                
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        console.log('Upload successful:', response);
                        
                        // Remove from uploading files and add to user documents
                        setUploadingFiles(prev => prev.filter(f => f.id !== upload.id));
                        
                        // Refresh the documents list from server
                        fetchUserDocuments();
                    } catch (parseError) {
                        console.error('Error parsing response:', parseError);
                        setUploadingFiles(prev => 
                            prev.map(f => f.id === upload.id ? { ...f, error: 'Upload completed but response invalid' } : f)
                        );
                    }
                } else {
                    console.error('Upload failed with status:', xhr.status, xhr.responseText);
                    setUploadingFiles(prev => 
                        prev.map(f => f.id === upload.id ? { ...f, error: `Upload failed (${xhr.status})` } : f)
                    );
                }
            };

            xhr.onerror = () => {
                console.error('Upload network error');
                setUploadingFiles(prev => 
                    prev.map(f => f.id === upload.id ? { ...f, error: 'Network error' } : f)
                );
            };

            xhr.open('POST', '/api/documents/upload');
            xhr.send(formData);
        } catch (error) {
            console.error('Upload error:', error);
            setUploadingFiles(prev => 
                prev.map(f => f.id === upload.id ? { ...f, error: 'Upload failed' } : f)
            );
        }
    };

    const handleVerification = async (docId: string) => {
        try {
            console.log('Verifying document ID:', docId);
            const response = await fetch(`/api/documents/${docId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ status: 'Verified' })
            });
            console.log('Verify response status:', response.status);
            
            if (response.ok) {
                console.log('Document verified successfully');
                fetchUserDocuments(); // Refresh from server
            } else {
                console.error('Failed to verify document:', response.statusText);
                // Fallback to local update
                setUserDocuments(docs => docs.map(doc => 
                    doc.id === docId 
                    ? { ...doc, status: DocumentStatus.Verified, actionDate: new Date().toISOString().split('T')[0], rejectionReason: undefined } 
                    : doc
                ));
            }
        } catch (error) {
            console.error('Error verifying document:', error);
            // Fallback to local update
            setUserDocuments(docs => docs.map(doc => 
                doc.id === docId 
                ? { ...doc, status: DocumentStatus.Verified, actionDate: new Date().toISOString().split('T')[0], rejectionReason: undefined } 
                : doc
            ));
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
            console.log('Rejecting document ID:', docToReject.id);
            const response = await fetch(`/api/documents/${docToReject.id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ 
                    status: 'Rejected', 
                    rejectionReason: rejectionReason.trim() 
                })
            });
            console.log('Reject response status:', response.status);
            
            if (response.ok) {
                console.log('Document rejected successfully');
                fetchUserDocuments(); // Refresh from server
            } else {
                console.error('Failed to reject document:', response.statusText);
                // Fallback to local update
                setUserDocuments(docs => docs.map(doc => 
                    doc.id === docToReject.id 
                    ? { ...doc, status: DocumentStatus.Rejected, actionDate: new Date().toISOString().split('T')[0], rejectionReason: rejectionReason.trim() } 
                    : doc
                ));
            }
            
            closeRejectionModal();
        } catch (error) {
            console.error('Error rejecting document:', error);
            // Fallback to local update
            setUserDocuments(docs => docs.map(doc => 
                doc.id === docToReject.id 
                ? { ...doc, status: DocumentStatus.Rejected, actionDate: new Date().toISOString().split('T')[0], rejectionReason: rejectionReason.trim() } 
                : doc
            ));
            closeRejectionModal();
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500 dark:text-gray-400">Loading documents...</div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Documents Hub</h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">Manage your documents and access important company files.</p>
            </div>

            <Card>
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Your Required Documents</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Please upload these specific documents. Our HR team will review them shortly.</p>
                {userDocuments.length === 0 ? (
                    <div className="text-center py-8">
                        <Icon name="document-text" className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No documents found</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            No documents have been assigned to you yet.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                         <input 
                            type="file" 
                            ref={singleFileInputRef} 
                            className="hidden" 
                            onChange={handleSingleFileUpload} 
                        />
                        {userDocuments.map(doc => (
                        <div key={doc.id} className="flex items-start justify-between py-4 flex-wrap gap-2">
                            <div className="flex items-start">
                                <div className="mt-1">{getStatusIcon(doc.status)}</div>
                                <div className="ml-4">
                                    <p className="font-medium text-gray-800 dark:text-gray-200">{doc.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{doc.status}{doc.actionDate ? ` on ${doc.actionDate}` : ''}</p>
                                    {doc.status === DocumentStatus.Rejected && doc.rejectionReason && (
                                        <div className="mt-2 p-3 text-sm text-red-800 bg-red-100 rounded-md flex items-start">
                                            <Icon name="exclamation-triangle" className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <span className="font-semibold">Reason for Rejection:</span> {doc.rejectionReason}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="pt-1">
                                {(() => {
                                    const isAdmin = auth?.user?.role === UserRole.Admin;
                                    if (isAdmin && doc.status === DocumentStatus.Uploaded) {
                                        return (
                                            <div className="flex items-center gap-2">
                                                <Button onClick={() => handleVerification(doc.id)} size="sm" className="bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-500">
                                                    <Icon name="check" className="w-4 h-4 mr-1" />
                                                    Verify
                                                </Button>
                                                <Button onClick={() => openRejectionModal(doc)} size="sm" className="bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-500">
                                                    <Icon name="x-mark" className="w-4 h-4 mr-1" />
                                                    Reject
                                                </Button>
                                            </div>
                                        );
                                    }

                                    if (doc.status === DocumentStatus.Pending || doc.status === DocumentStatus.Rejected) {
                                        return (
                                            <Button onClick={() => triggerSingleUpload(doc.id)} size="sm">
                                                <Icon name="arrow-up-tray" className="w-4 h-4 mr-2" />
                                                {doc.status === DocumentStatus.Rejected ? 'Re-upload' : 'Upload'}
                                            </Button>
                                        );
                                    }

                                    return (
                                        <Button size="sm" variant="secondary" disabled>{doc.status}</Button>
                                    );
                                })()}
                            </div>
                        </div>
                        ))}
                    </div>
                )}
            </Card>
            
            <Card>
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Upload Additional Documents</h2>
                 <input 
                    type="file" 
                    multiple 
                    ref={multiFileInputRef} 
                    className="hidden" 
                    onChange={handleMultiFileSelect} 
                    accept="image/*,.pdf,.doc,.docx"
                />
                <div 
                    onClick={() => multiFileInputRef.current?.click()}
                    className="flex justify-center w-full px-6 py-10 mt-2 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md cursor-pointer hover:border-indigo-500 bg-gray-50 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-gray-600 transition-colors"
                >
                    <div className="space-y-1 text-center">
                         <Icon name="document-text" className="w-12 h-12 mx-auto text-gray-400" />
                        <div className="flex text-sm text-gray-600 dark:text-gray-300">
                            <span className="relative font-semibold text-indigo-600">
                                Click to upload files
                            </span>
                            <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">PDF, DOCX, PNG, JPG up to 10MB</p>
                    </div>
                </div>
                {uploadingFiles.length > 0 && (
                    <div className="mt-6 space-y-4">
                        <h3 className="font-medium text-gray-700 dark:text-gray-300">Uploading...</h3>
                        {uploadingFiles.map(upload => (
                            <div key={upload.id}>
                                <div className="flex justify-between items-center text-sm">
                                    <p className="font-medium text-gray-800 dark:text-gray-200 truncate pr-4">{upload.file.name}</p>
                                    <p className="text-gray-500 dark:text-gray-400">{formatFileSize(upload.file.size)}</p>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <ProgressBar progress={upload.progress} small hasError={!!upload.error} />
                                    {upload.error ? (
                                        <button onClick={() => handleRetryUpload(upload.id)} title="Retry upload" className="text-gray-500 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded">
                                            <Icon name="arrow-path" className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <span className="text-sm font-medium text-gray-600 w-10 text-right">{Math.round(upload.progress)}%</span>
                                    )}
                                </div>
                                {upload.error && (
                                    <p className="text-xs text-red-600 mt-1">{upload.error}</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Card>
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Company Documents</h2>
                <div className="space-y-3">
                    {mockCompanyDocuments.map(doc => (
                        <a key={doc.id} href={doc.url} download className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                            <div className="flex items-center">
                                <Icon name="document-text" className="h-6 w-6 text-indigo-600" />
                                <div className="ml-3">
                                    <p className="font-medium text-gray-800 dark:text-gray-200">{doc.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{doc.category}</p>
                                </div>
                            </div>
                            <Icon name="arrow-down-tray" className="h-5 w-5 text-gray-400" />
                        </a>
                    ))}
                </div>
            </Card>

            {docToReject && (
                <Modal 
                    isOpen={!!docToReject} 
                    onClose={closeRejectionModal} 
                    title={`Reject: ${docToReject.name}`}
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
                            <p className="mt-2 text-xs text-gray-500">This reason will be visible to the employee.</p>
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button variant="secondary" onClick={closeRejectionModal}>Cancel</Button>
                            <Button variant="danger" onClick={handleConfirmRejection} disabled={!rejectionReason.trim()}>
                                Confirm Rejection
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Documents;