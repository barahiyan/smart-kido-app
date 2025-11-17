import React, { useState, useEffect, useRef } from 'react';
import Modal from './ui/Modal';
import { useAppContext } from '../contexts/AppContext';
import { Sale, Product, Customer, Purchase } from '../types';
import { SendIcon, SparklesIcon } from '../utils/icons';
import Button from './ui/Button';
import { getAiResponse } from '../utils/ai';

interface AIAnalystModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  purchases: Purchase[];
}

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

const AIAnalystModal: React.FC<AIAnalystModalProps> = ({ isOpen, onClose, sales, products, customers, purchases }) => {
  const { t } = useAppContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to the bottom of the chat when new messages are added
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Reset the chat when the modal is opened
    if (isOpen) {
      setMessages([]);
      setIsLoading(false);
      setCurrentQuestion('');
    }
  }, [isOpen]);

  const handleSendQuestion = async (question: string) => {
    if (!question.trim() || isLoading) return;

    setIsLoading(true);
    setMessages(prev => [...prev, { sender: 'user', text: question }]);
    setCurrentQuestion('');

    const dataContext = JSON.stringify({ sales, products, customers, purchases });
    
    try {
      const responseText = await getAiResponse(question, dataContext);
      setMessages(prev => [...prev, { sender: 'ai', text: responseText }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { sender: 'ai', text: t('aiError') }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    t('aiQuickQuestion1'),
    t('aiQuickQuestion2'),
    t('aiQuickQuestion3'),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('aiAnalystTitle')}>
      <div className="flex flex-col h-[60vh] md:h-[70vh]">
        {/* Chat Area */}
        <div className="flex-grow overflow-y-auto pr-2 space-y-4">
          {/* Welcome Message */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary-100 text-primary-600 rounded-full">
                <SparklesIcon className="w-6 h-6" />
            </div>
            <div className="bg-slate-100 p-3 rounded-lg rounded-tl-none">
              <p className="text-sm">{t('aiWelcomeMessage')}</p>
            </div>
          </div>

          {/* Chat Messages */}
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
              {msg.sender === 'ai' && (
                 <div className="p-2 bg-primary-100 text-primary-600 rounded-full">
                    <SparklesIcon className="w-6 h-6" />
                 </div>
              )}
               <div className={`p-3 rounded-lg max-w-sm ${msg.sender === 'user' ? 'bg-primary-600 text-white rounded-br-none' : 'bg-slate-100 rounded-tl-none'}`}>
                 <div className="prose prose-sm" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }}></div>
               </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-3">
                <div className="p-2 bg-primary-100 text-primary-600 rounded-full animate-pulse">
                    <SparklesIcon className="w-6 h-6" />
                </div>
                <div className="bg-slate-100 p-3 rounded-lg rounded-tl-none">
                    <p className="text-sm italic">{t('aiLoading')}</p>
                </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="pt-4 border-t mt-4">
            <div className="flex flex-wrap gap-2 mb-3">
                {quickQuestions.map((q, i) => (
                    <Button key={i} size="sm" variant="secondary" onClick={() => handleSendQuestion(q)} disabled={isLoading}>
                        {q}
                    </Button>
                ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSendQuestion(currentQuestion); }} className="flex items-center gap-2">
                <input
                type="text"
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                placeholder={t('typeYourQuestion')}
                className="flex-grow block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading || !currentQuestion.trim()}>
                    <SendIcon className="w-5 h-5" />
                </Button>
            </form>
        </div>
      </div>
    </Modal>
  );
};

export default AIAnalystModal;
