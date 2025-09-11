import React, { useState } from 'react';
import { mockTrainingModules } from '../../data/mockData';
import { TrainingModule } from '../../types';
import Card from '../common/Card';
import Icon from '../common/Icon';
import Button from '../common/Button';
import Modal from '../common/Modal';

const Training: React.FC = () => {
    const [modules, setModules] = useState<TrainingModule[]>(mockTrainingModules);
    const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);
    const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const correctAnswer = 'quiz-option-2'; // Mock correct answer

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

    const handleCompleteModule = (moduleId: string) => {
        setModules(prevModules =>
            prevModules.map(m => (m.id === moduleId ? { ...m, completed: true } : m))
        );
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
        if (!quizSubmitted) return 'hover:bg-gray-50 cursor-pointer';
        if (optionId === correctAnswer) return 'border-green-500 bg-green-50';
        if (optionId === quizAnswer && optionId !== correctAnswer) return 'border-red-500 bg-red-50';
        return 'opacity-60 cursor-not-allowed';
    };

    const renderModalContent = () => {
        if (!selectedModule) return null;

        switch (selectedModule.type) {
            case 'Video':
                return (
                    <div className="space-y-4">
                        <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                            <Icon name="play-circle" className="w-20 h-20 text-white opacity-75" />
                        </div>
                        <p className="text-gray-600">This is a placeholder for the training video. In a real application, a video player component would be used here.</p>
                    </div>
                );
            case 'PDF':
                return (
                    <div className="space-y-4">
                         <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center border">
                            <Icon name="document-text" className="w-20 h-20 text-gray-400" />
                        </div>
                        <p className="text-gray-600">This is a placeholder for the PDF document viewer. Users would be able to scroll through the document content here.</p>
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
                        <h4 className="font-semibold text-lg text-gray-800">Quiz: Knowledge Check</h4>
                        <p className="text-gray-700">What is the primary goal of our IT Security Policy?</p>
                        <div className="space-y-2">
                            {quizOptions.map(option => (
                               <label key={option.id} className={`flex items-center p-3 border rounded-lg transition-colors ${getQuizOptionClass(option.id)}`}>
                                    <input type="radio" value={option.id} name="quiz-option" disabled={quizSubmitted} onChange={(e) => setQuizAnswer(e.target.value)} checked={quizAnswer === option.id} className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                                    <span className="ml-3 text-gray-700">{option.text}</span>
                                </label>
                            ))}
                        </div>
                        {quizSubmitted && (
                            <div className={`mt-4 text-sm font-medium p-3 rounded-md ${quizAnswer === correctAnswer ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {quizAnswer === correctAnswer ? 'Correct! Well done.' : `Not quite. The correct answer is: "${quizOptions.find(o => o.id === correctAnswer)?.text}"`}
                            </div>
                        )}
                    </div>
                );
            default:
                return <p>Training content not available.</p>;
        }
    };


    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Training & Orientation</h1>
                <p className="text-gray-600 mt-1">Complete your assigned training modules to learn about our company, tools, and processes.</p>
            </div>

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
                                {module.completed && <span className="text-green-600 flex items-center text-sm"><Icon name="check-circle" className="h-4 w-4 mr-1" /> Completed</span>}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 flex-grow">{module.title}</h3>
                            <p className="text-sm text-gray-500 mt-2 mb-4">{module.duration}</p>
                            <Button onClick={() => handleStartModule(module)} disabled={module.completed}>
                                {module.completed ? 'Completed' : 'Start Module'}
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            {selectedModule && (
                <Modal 
                    isOpen={!!selectedModule} 
                    onClose={handleCloseModal} 
                    title={selectedModule.title}
                >
                    <div className="space-y-6">
                        {renderModalContent()}
                         <div className="pt-4 mt-4 border-t flex justify-end gap-2">
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
        </div>
    );
};

export default Training;