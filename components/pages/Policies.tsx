
import React, { useState, useRef, useEffect } from 'react';
import { mockPolicies } from '../../data/mockData';
import { Policy } from '../../types';
import Card from '../common/Card';
import Icon from '../common/Icon';
import Button from '../common/Button';
import { createChat } from '../../services/geminiService';

const chatService = createChat();

const Policies: React.FC = () => {
    const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(mockPolicies[0]);
    const [searchTerm, setSearchTerm] = useState('');

    // AI Assistant State
    const [aiQuery, setAiQuery] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState<{ author: 'user' | 'ai'; text: string }[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const filteredPolicies = mockPolicies.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAiSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!aiQuery.trim() || isAiLoading) return;
        
        const userMessage = { author: 'user' as const, text: aiQuery };
        setChatHistory(prev => [...prev, userMessage]);
        setAiQuery('');
        setIsAiLoading(true);

        try {
            const response = await chatService.sendMessage({ message: aiQuery });
            const aiMessage = { author: 'ai' as const, text: response.text };
            setChatHistory(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error("AI chat error:", error);
            const errorMessage = { author: 'ai' as const, text: "Sorry, I'm having trouble connecting right now." };
            setChatHistory(prev => [...prev, errorMessage]);
        } finally {
            setIsAiLoading(false);
        }
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Policies & Knowledge Base</h1>
                <p className="text-gray-600 mt-1">Access company policies and get quick answers from our AI assistant.</p>
            </div>

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
                                    <button
                                        onClick={() => setSelectedPolicy(policy)}
                                        className={`w-full text-left p-3 rounded-md transition-colors ${selectedPolicy?.id === policy.id ? 'bg-indigo-100 text-indigo-800' : 'hover:bg-gray-100'}`}
                                    >
                                        <p className="font-medium">{policy.title}</p>
                                        <p className="text-sm text-gray-500">{policy.category}</p>
                                    </button>
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
                                <p className="text-gray-700 font-medium mb-2">{selectedPolicy.summary}</p>
                                <div className="prose max-w-none text-gray-600">
                                    <p>{selectedPolicy.content}</p>
                                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat.</p>
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

            <Card>
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Ask AI about Company Policies</h2>
                <div className="h-80 bg-gray-50 rounded-lg p-4 overflow-y-auto flex flex-col space-y-4">
                    {chatHistory.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-3 ${msg.author === 'user' ? 'justify-end' : ''}`}>
                             {msg.author === 'ai' && <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white flex-shrink-0"><Icon name="sparkles" className="w-5 h-5"/></div>}
                            <div className={`max-w-md p-3 rounded-lg ${msg.author === 'user' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-800'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                     {isAiLoading && (
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white flex-shrink-0"><Icon name="sparkles" className="w-5 h-5"/></div>
                            <div className="p-3 rounded-lg bg-white text-gray-800">
                                <span className="animate-pulse">...</span>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleAiSubmit} className="mt-4 flex gap-2">
                    <input
                        type="text"
                        value={aiQuery}
                        onChange={(e) => setAiQuery(e.target.value)}
                        placeholder="e.g., 'What is the work from home policy?'"
                        className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={isAiLoading}
                    />
                    <Button type="submit" disabled={isAiLoading || !aiQuery.trim()}>
                        {isAiLoading ? 'Thinking...' : 'Ask'}
                    </Button>
                </form>
            </Card>
        </div>
    );
};

export default Policies;
