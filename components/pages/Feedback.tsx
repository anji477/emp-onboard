
import React from 'react';
import { mockFeedbackSurveys } from '../../data/mockData';
import Card from '../common/Card';
import Icon from '../common/Icon';
import Button from '../common/Button';

const Feedback: React.FC = () => {
    const timelineEvents = [
        { name: 'Day 1', status: 'completed' },
        { name: 'Week 1', status: 'current' },
        { name: 'Month 1', status: 'upcoming' },
        { name: '90 Days', status: 'upcoming' },
    ];

    const getStatusClasses = (status: string) => {
        switch (status) {
            case 'completed': return { bg: 'bg-indigo-600', text: 'text-indigo-600' };
            case 'current': return { bg: 'bg-indigo-600 ring-4 ring-indigo-200', text: 'text-indigo-600 font-bold' };
            default: return { bg: 'bg-gray-300', text: 'text-gray-500' };
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Progress & Feedback</h1>
                <p className="text-gray-600 mt-1">Track your onboarding journey and share your feedback with us.</p>
            </div>

            <Card>
                <h2 className="text-xl font-semibold text-gray-700 mb-8">Your Onboarding Timeline</h2>
                <div className="relative">
                    <div className="absolute left-1/2 top-4 bottom-0 w-0.5 bg-gray-300" style={{ transform: 'translateX(-50%)' }}></div>
                    <div className="grid grid-cols-4">
                        {timelineEvents.map((event) => (
                            <div key={event.name} className="flex flex-col items-center relative">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusClasses(event.status).bg}`}>
                                    {event.status === 'completed' && <Icon name="check" className="w-5 h-5 text-white" />}
                                </div>
                                <p className={`mt-2 text-sm ${getStatusClasses(event.status).text}`}>{event.name}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>
            
            <Card>
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Feedback Surveys</h2>
                <div className="space-y-4">
                    {mockFeedbackSurveys.map(survey => (
                        <div key={survey.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <p className="font-medium text-gray-800">{survey.title}</p>
                                <p className="text-sm text-gray-500">Timeline: {survey.timeline}</p>
                            </div>
                            <Button disabled={survey.completed} size="sm">
                                {survey.completed ? 'Submitted' : 'Start Survey'}
                            </Button>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};

export default Feedback;
