import React, { useState, useRef, useContext, useEffect } from 'react';
import { mockTrainingModules } from '../../data/mockData';
import { TrainingModule, UserRole } from '../../types';
import Card from '../common/Card';
import Icon from '../common/Icon';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { UserContext } from '../../App';

const Training: React.FC = () => {
    const [modules, setModules] = useState<TrainingModule[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);
    const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newModule, setNewModule] = useState({ title: '', type: 'PDF', duration: '' });
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const thumbnailInputRef = useRef<HTMLInputElement>(null);
    const auth = useContext(UserContext);
    const correctAnswer = 'quiz-option-2';

    const isAdmin = auth?.user?.role === UserRole.Admin || auth?.user?.role === UserRole.HR;

    // Fetch training modules from server
    const fetchModules = async () => {
        try {
            const userId = auth?.user?.id || '6';
            const response = await fetch(`/api/training/user/${userId}`);
            if (response.ok) {
                const data = await response.json();
                const formattedModules: TrainingModule[] = data.map((module: any) => ({
                    id: module.id.toString(),
                    title: module.title,
                    type: module.type,
                    duration: module.duration,
                    completed: Boolean(module.completed),
                    thumbnailUrl: module.thumbnail_url,
                    fileUrl: module.file_url
                }));
                setModules(formattedModules);
            } else {
                setModules(mockTrainingModules);
            }
        } catch (error) {
            console.error('Error fetching modules:', error);
            setModules(mockTrainingModules);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchModules();
    }, [auth?.user?.id]);

    const validateFile = (file: File) => {
        const maxSize = 100 * 1024 * 1024; // 100MB
        const allowedTypes = {
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'video/mp4': ['.mp4'],
            'video/avi': ['.avi'],
            'video/quicktime': ['.mov'],
            'video/x-ms-wmv': ['.wmv'],
            'video/x-flv': ['.flv'],
            'video/webm': ['.webm']
        };

        if (file.size > maxSize) {
            return 'File size must be less than 100MB';
        }

        const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
        const isValidType = Object.entries(allowedTypes).some(([mimeType, extensions]) => 
            (file.type === mimeType || file.type === '') && extensions.includes(fileExt)
        );

        if (!isValidType) {
            return 'Invalid file type. Please upload PDF, DOC, DOCX, or video files.';
        }

        return null;
    };

    const validateThumbnail = (file: File) => {
        const maxSize = 2 * 1024 * 1024; // 2MB
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

        if (file.size > maxSize) {
            return 'Thumbnail size must be less than 2MB';
        }

        if (!allowedTypes.includes(file.type)) {
            return 'Thumbnail must be JPG, PNG, or WEBP format';
        }

        return null;
    };

    const handleAddModule = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        setMessage(null);
        
        if (!newModule.title.trim()) {
            setMessage({type: 'error', text: 'Please enter a title'});
            return;
        }
        
        if (!newModule.duration.trim()) {
            setMessage({type: 'error', text: 'Please enter duration'});
            return;
        }
        
        // Validate duration format
        const durationPattern = /^\d+\s*(minutes?|mins?|hours?|hrs?)$/i;
        if (!durationPattern.test(newModule.duration.trim())) {
            setMessage({type: 'error', text: 'Duration must be in time format (e.g., "30 minutes", "1 hour", "45 mins")'});
            return;
        }
        
        if (!fileInputRef.current?.files?.[0]) {
            setMessage({type: 'error', text: 'Please select a file'});
            return;
        }

        const file = fileInputRef.current.files[0];
        const validationError = validateFile(file);
        if (validationError) {
            setMessage({type: 'error', text: validationError});
            return;
        }
        
        // Validate thumbnail if provided
        if (thumbnailInputRef.current?.files?.[0]) {
            const thumbnailFile = thumbnailInputRef.current.files[0];
            const thumbnailError = validateThumbnail(thumbnailFile);
            if (thumbnailError) {
                setMessage({type: 'error', text: thumbnailError});
                return;
            }
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('trainingFile', fileInputRef.current.files[0]);
        formData.append('title', newModule.title);
        formData.append('type', newModule.type);
        formData.append('duration', newModule.duration);
        
        // Add thumbnail if provided
        if (thumbnailInputRef.current?.files?.[0]) {
            formData.append('thumbnail', thumbnailInputRef.current.files[0]);
        }

        try {
            const response = await fetch('/api/training/upload', {
                method: 'POST',
                body: formData
            });

            const responseText = await response.text();
            console.log('Response:', responseText);

            if (response.ok) {
                setMessage({type: 'success', text: 'Training module added successfully!'});
                setTimeout(() => {
                    setShowAddModal(false);
                    setNewModule({ title: '', type: 'PDF', duration: '' });
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
                    setMessage(null);
                    fetchModules();
                }, 2000);
            } else {
                setMessage({type: 'error', text: `Upload failed: ${responseText}`});
            }
        } catch (error) {
            console.error('Upload error:', error);
            setMessage({type: 'error', text: `Upload failed: ${error.message}`});
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteModule = async (moduleId: string) => {
        if (!confirm('Are you sure you want to delete this training module?')) return;

        try {
            const response = await fetch(`/api/training/${moduleId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                fetchModules();
            } else {
                alert('Delete failed');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Delete failed');
        }
    };

    const handleStartModule = (module: TrainingModule) => {
        if (!module.completed) {
            setQuizAnswer(null);
            setQuizSubmitted(false);
            setSelectedModule(module);
        }
    };

    const handleCloseModal = () => {
        setSelectedModule(null);
    };

    const handleCompleteModule = async (moduleId: string) => {
        try {
            const userId = auth?.user?.id || '6';
            const response = await fetch(`/api/training/${moduleId}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId })
            });
            
            if (response.ok) {
                // Refresh modules from server to get updated completion status
                await fetchModules();
                console.log('Training module marked as completed');
            } else {
                console.error('Failed to mark training as completed');
            }
        } catch (error) {
            console.error('Error completing training:', error);
        }
        handleCloseModal();
    };

    const handleQuizSubmit = () => {
        if (quizAnswer) {
            setQuizSubmitted(true);
        }
    };

    const handleQuizRetry = () => {
        setQuizSubmitted(false);
        setQuizAnswer(null);
    };
    
    const getQuizOptionClass = (optionId: string) => {
        if (!quizSubmitted) return 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer';
        if (optionId === correctAnswer) return 'border-green-500 bg-green-50 dark:bg-green-900 dark:border-green-400';
        if (optionId === quizAnswer && optionId !== correctAnswer) return 'border-red-500 bg-red-50 dark:bg-red-900 dark:border-red-400';
        return 'opacity-60 cursor-not-allowed';
    };

    const renderModalContent = () => {
        if (!selectedModule) return null;

        const fileUrl = (selectedModule as any).fileUrl;
        const hasFile = Boolean(fileUrl);
        const fullUrl = hasFile ? fileUrl : null;

        switch (selectedModule.type) {
            case 'Video':
                return (
                    <div className="space-y-4">
                        {hasFile ? (
                            <video 
                                controls 
                                className="w-full aspect-video rounded-lg bg-black"
                                preload="metadata"
                            >
                                <source src={fullUrl} type="video/mp4" />
                                <source src={fullUrl} type="video/webm" />
                                Your browser does not support the video tag.
                            </video>
                        ) : (
                            <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                                <Icon name="play-circle" className="w-20 h-20 text-white opacity-75" />
                                <p className="text-white mt-4">No video file available</p>
                            </div>
                        )}
                        {hasFile && (
                            <a href={fullUrl} download className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm">
                                <Icon name="arrow-down-tray" className="w-4 h-4 mr-2" />Download
                            </a>
                        )}
                    </div>
                );
            case 'PDF':
                return (
                    <div className="space-y-4">
                        {hasFile ? (
                            <iframe src={fullUrl} className="w-full h-96 border rounded-lg" title="PDF Preview" />
                        ) : (
                            <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex flex-col items-center justify-center border">
                                <Icon name="document-text" className="w-20 h-20 text-gray-400" />
                                <p className="text-gray-500 mt-4">No PDF file available</p>
                            </div>
                        )}
                        {hasFile && (
                            <div className="flex gap-2">
                                <a href={fullUrl} target="_blank" className="inline-flex items-center px-3 py-2 border rounded-md text-sm">
                                    <Icon name="eye" className="w-4 h-4 mr-2" />Open
                                </a>
                                <a href={fullUrl} download className="inline-flex items-center px-3 py-2 border rounded-md text-sm">
                                    <Icon name="arrow-down-tray" className="w-4 h-4 mr-2" />Download
                                </a>
                            </div>
                        )}
                    </div>
                );
            case 'DOC':
                return (
                    <div className="space-y-4">
                        <div className="h-64 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-lg flex flex-col items-center justify-center border border-blue-200 dark:border-blue-700">
                            <Icon name="document-text" className="w-20 h-20 text-blue-500 mb-4" />
                            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">Word Document</h3>
                            <p className="text-blue-600 dark:text-blue-300 text-center text-sm">
                                {hasFile ? 'Click "Open" to view in your browser or "Download" for offline access' : 'No document file available'}
                            </p>
                        </div>
                        {hasFile && (
                            <div className="flex gap-2">
                                <a href={fullUrl} target="_blank" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                                    <Icon name="eye" className="w-4 h-4 mr-2" />Open Document
                                </a>
                                <a href={fullUrl} download className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                                    <Icon name="arrow-down-tray" className="w-4 h-4 mr-2" />Download
                                </a>
                            </div>
                        )}
                    </div>
                );
            case 'Quiz':
                const quizOptions = [
                    { id: 'quiz-option-1', text: 'To block all external websites' },
                    { id: 'quiz-option-2', text: 'To protect company and customer data' },
                    { id: 'quiz-option-3', text: 'To monitor employee emails' },
                ];
                return (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-lg text-gray-800 dark:text-gray-200">Quiz: Knowledge Check</h4>
                        <p className="text-gray-700 dark:text-gray-300">What is the primary goal of our IT Security Policy?</p>
                        <div className="space-y-2">
                            {quizOptions.map(option => (
                               <label key={option.id} className={`flex items-center p-3 border rounded-lg transition-colors ${getQuizOptionClass(option.id)}`}>
                                    <input type="radio" value={option.id} name="quiz-option" disabled={quizSubmitted} onChange={(e) => setQuizAnswer(e.target.value)} checked={quizAnswer === option.id} className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                                    <span className="ml-3 text-gray-700 dark:text-gray-300">{option.text}</span>
                                </label>
                            ))}
                        </div>
                        {quizSubmitted && (
                            <div className={`mt-4 text-sm font-medium p-3 rounded-md ${quizAnswer === correctAnswer ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'}`}>
                                {quizAnswer === correctAnswer ? 'Correct! Well done.' : `Not quite. The correct answer is: "${quizOptions.find(o => o.id === correctAnswer)?.text}"`}
                            </div>
                        )}
                    </div>
                );
            default:
                return (
                    <div className="text-center py-8">
                        <Icon name="exclamation-triangle" className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">Training content not available.</p>
                    </div>
                );
        }
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500 dark:text-gray-400">Loading training modules...</div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Training & Orientation</h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">Complete your assigned training modules to learn about our company, tools, and processes.</p>
                </div>
                {isAdmin && (
                    <Button onClick={() => setShowAddModal(true)}>
                        <Icon name="plus" className="w-4 h-4 mr-2" />
                        Add Training Module
                    </Button>
                )}
            </div>

            {modules.length === 0 ? (
                <Card>
                    <div className="text-center py-12">
                        <Icon name="academic-cap" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No training modules found</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            {isAdmin ? 'Create training modules to assign to employees.' : 'No training modules have been assigned to you yet.'}
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modules.map(module => (
                    <Card key={module.id} className="flex flex-col overflow-hidden">
                        <img className="h-48 w-full object-cover" src={module.thumbnailUrl} alt={module.title} />
                        <div className="p-6 flex flex-col flex-grow">
                            <div className="flex justify-between items-start mb-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    module.type === 'Video' ? 'bg-blue-100 text-blue-800' :
                                    module.type === 'PDF' ? 'bg-red-100 text-red-800' :
                                    'bg-purple-100 text-purple-800'
                                }`}>
                                    {module.type}
                                </span>
                                <div className="flex items-center gap-2">
                                    {module.completed && <span className="text-green-600 flex items-center text-sm"><Icon name="check-circle" className="h-4 w-4 mr-1" /> Completed</span>}
                                    {isAdmin && (
                                        <button
                                            onClick={() => handleDeleteModule(module.id)}
                                            className="text-red-500 hover:text-red-700 p-1"
                                            title="Delete module"
                                        >
                                            <Icon name="trash" className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex-grow">{module.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 mb-4">{module.duration}</p>
                            <div className="flex gap-2">
                                <Button onClick={() => handleStartModule(module)} disabled={module.completed} className="flex-1">
                                    {module.completed ? 'Completed' : 'Start Module'}
                                </Button>
                                {(module as any).fileUrl && (
                                    <a
                                        href={(module as any).fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                        title="Download/View file"
                                    >
                                        <Icon name="arrow-down-tray" className="w-4 h-4" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </Card>
                    ))}
                </div>
            )}

            {selectedModule && (
                <Modal 
                    isOpen={!!selectedModule} 
                    onClose={handleCloseModal} 
                    title={selectedModule.title}
                >
                    <div className="space-y-6">
                        {renderModalContent()}
                         <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                             <Button variant="secondary" onClick={handleCloseModal}>Close</Button>
                            {selectedModule.type === 'Quiz' ? (
                                !quizSubmitted ? (
                                    <Button onClick={handleQuizSubmit} disabled={!quizAnswer}>Submit Answer</Button>
                                ) : (
                                    quizAnswer === correctAnswer ?
                                    <Button onClick={() => handleCompleteModule(selectedModule.id)}>Mark as Complete</Button> :
                                    <Button onClick={handleQuizRetry}>Try Again</Button>
                                )
                            ) : (
                                <Button onClick={() => handleCompleteModule(selectedModule.id)}>
                                    Mark as Complete
                                </Button>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Add Training Module Modal */}
            {showAddModal && (
                <Modal isOpen={showAddModal} onClose={() => {setShowAddModal(false); setMessage(null);}} title="Add Training Module">
                    <form onSubmit={handleAddModule} className="space-y-4">
                        {message && (
                            <div className={`p-3 rounded-md ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {message.text}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Title
                            </label>
                            <input
                                type="text"
                                value={newModule.title}
                                onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Type
                            </label>
                            <select
                                value={newModule.type}
                                onChange={(e) => setNewModule({ ...newModule, type: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="PDF">PDF</option>
                                <option value="DOC">DOC</option>
                                <option value="Video">Video</option>
                                <option value="Quiz">Quiz</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Duration
                            </label>
                            <input
                                type="text"
                                value={newModule.duration}
                                onChange={(e) => setNewModule({ ...newModule, duration: e.target.value })}
                                placeholder="e.g., 30 minutes, 1 hour, 45 mins"
                                pattern="^\d+\s*(minutes?|mins?|hours?|hrs?)$"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">Format: "30 minutes", "1 hour", "45 mins"</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                File
                            </label>
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".pdf,.doc,.docx,.mp4,.avi,.mov,.wmv,.flv,.webm"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">Supported: PDF, DOC, DOCX, MP4, AVI, MOV, WMV, FLV, WEBM (Max: 100MB)</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Thumbnail (Optional)
                            </label>
                            <input
                                type="file"
                                ref={thumbnailInputRef}
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP (Max: 2MB). If not provided, a default thumbnail will be used.</p>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={uploading}>
                                {uploading ? 'Uploading...' : 'Add Module'}
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default Training;