import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, Bot, User, ThumbsUp, ThumbsDown, Wrench, MapPin } from 'lucide-react';
import { GlassCard } from '../components/ui';

export default function NewTicketView({ categories, kbArticles, onSubmit }) {
  // STATES: 'greeting' | 'triage' | 'suggestion' | 'form' | 'resolved'
  const [step, setStep] = useState('greeting');
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Good day! I'm Nexus, your 1st line support bot. Please describe your issue." }
  ]);
  const [inputText, setInputText] = useState('');
  const [ticketData, setTicketData] = useState({ subject: '', description: '', category: 'Hardware', location: '' });
  const [foundArticle, setFoundArticle] = useState(null);
  
  const messagesEndRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, step]);

  // --- 1. SMART SEARCH ENGINE ---
  const findBestArticle = (userQuery) => {
    if (!kbArticles || kbArticles.length === 0) return null;

    const cleanQuery = userQuery.toLowerCase().replace(/[^a-z0-9 ]/g, ''); // Remove special chars (e.g. "wi-fi" -> "wifi")
    const queryWords = cleanQuery.split(' ').filter(w => w.length > 3); // Ignore small words like "the", "to"

    let bestMatch = null;
    let maxScore = 0;

    kbArticles.forEach(article => {
      let score = 0;
      const cleanTitle = article.title.toLowerCase().replace(/[^a-z0-9 ]/g, '');
      
      // Check for word matches
      queryWords.forEach(word => {
        if (cleanTitle.includes(word)) score += 10; // High score for title match
        if (article.category.toLowerCase().includes(word)) score += 5; // Medium for category
      });

      // Boost if strict phrase match exists (fallback)
      if (cleanTitle.includes(cleanQuery)) score += 20;

      if (score > maxScore) {
        maxScore = score;
        bestMatch = article;
      }
    });

    // Only return if we have a decent confidence match
    return maxScore > 0 ? bestMatch : null;
  };

  // --- 2. LOGIC ENGINE ---
  const handleSend = () => {
    if (!inputText.trim()) return;

    // Add User Message
    const userQuery = inputText;
    const newMessages = [...messages, { role: 'user', text: userQuery }];
    setMessages(newMessages);
    setInputText('');

    // BRANCHING LOGIC
    if (step === 'greeting') {
      // Capture the description
      setTicketData(prev => ({ 
        ...prev, 
        description: userQuery, 
        subject: userQuery.length > 40 ? userQuery.substring(0, 40) + '...' : userQuery 
      }));
      
      // Run Smart Search
      const hit = findBestArticle(userQuery);

      if (hit) {
        setFoundArticle(hit);
        // Bot suggests fix
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'bot', text: "I found a solution that might help. Please try this:" }]);
          setStep('suggestion');
        }, 600);
      } else {
        // No fix found -> Ask for location
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'bot', text: "I see. To help the technician, which room or location are you in?" }]);
          setStep('location');
        }, 600);
      }
    } 
    else if (step === 'location') {
      setTicketData(prev => ({ ...prev, location: userQuery }));
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'bot', text: "Understood. I'm preparing a ticket for the engineering team now. Please review the details below." }]);
        setStep('form');
      }, 600);
    }
  };

  // --- 3. INTERACTION HANDLERS ---
  const handleSolutionWorked = (worked) => {
    if (worked) {
      setMessages(prev => [...prev, 
        { role: 'user', text: "Yes, that worked!" }, 
        { role: 'bot', text: "Great! I'm glad I could help. Have a wonderful day!" }
      ]);
      setStep('resolved');
    } else {
      setMessages(prev => [...prev, 
        { role: 'user', text: "No, it's still broken." }, 
        { role: 'bot', text: "I'm sorry about that. Let's raise a ticket. Which room/location are you in?" }
      ]);
      setStep('location');
    }
  };

  const handleFinalSubmit = () => {
    onSubmit(ticketData);
  };

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-140px)] flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
      
      {/* CHAT AREA */}
      <GlassCard className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
             <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'bot' ? 'bg-blue-600' : 'bg-slate-600'}`}>
                {msg.role === 'bot' ? <Bot size={20} className="text-white" /> : <User size={20} className="text-white" />}
             </div>
             <div className={`p-4 rounded-2xl max-w-[80%] ${msg.role === 'bot' ? 'bg-white/10 text-slate-200 rounded-tl-none' : 'bg-blue-600 text-white rounded-tr-none'}`}>
                {msg.text}
             </div>
          </div>
        ))}
        
        {/* WIDGET: KB SUGGESTION */}
        {step === 'suggestion' && foundArticle && (
          <div className="ml-14 max-w-[80%] space-y-4 animate-in fade-in slide-in-from-left-2">
            <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl">
               <h4 className="font-bold text-emerald-400 mb-2 flex items-center gap-2"><Wrench size={16}/> Suggested Fix: {foundArticle.title}</h4>
               <p className="text-sm text-slate-300 whitespace-pre-line">{foundArticle.content}</p>
            </div>
            <div className="flex gap-3">
               <button onClick={() => handleSolutionWorked(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm transition-colors"><ThumbsUp size={16}/> It Worked</button>
               <button onClick={() => handleSolutionWorked(false)} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"><ThumbsDown size={16}/> Still Broken</button>
            </div>
          </div>
        )}

        {/* WIDGET: TICKET FORM */}
        {step === 'form' && (
           <div className="ml-14 max-w-[90%] animate-in fade-in slide-in-from-left-2">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                 <h3 className="font-bold text-white border-b border-white/10 pb-2">Confirm Ticket Details</h3>
                 
                 <div>
                   <label className="text-xs text-slate-400 uppercase font-semibold">Description</label>
                   <textarea 
                     className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-sm text-white mt-1 h-24 focus:outline-none focus:border-blue-500/50"
                     value={ticketData.description}
                     onChange={e => setTicketData({...ticketData, description: e.target.value})}
                   />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-xs text-slate-400 uppercase font-semibold">Category</label>
                       <select 
                          className="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-sm text-white mt-1 focus:outline-none focus:border-blue-500/50"
                          value={ticketData.category}
                          onChange={e => setTicketData({...ticketData, category: e.target.value})}
                       >
                          {categories.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
                       </select>
                    </div>
                    <div>
                       <label className="text-xs text-slate-400 uppercase font-semibold">Location</label>
                       <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-lg p-2.5 mt-1 focus-within:border-blue-500/50">
                          <MapPin size={16} className="text-slate-500" />
                          <input 
                            className="bg-transparent text-sm text-white w-full focus:outline-none"
                            value={ticketData.location}
                            onChange={e => setTicketData({...ticketData, location: e.target.value})}
                          />
                       </div>
                    </div>
                 </div>

                 <button onClick={handleFinalSubmit} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all">
                    <Send size={18} /> Submit Ticket
                 </button>
              </div>
           </div>
        )}

        <div ref={messagesEndRef} />
      </GlassCard>

      {/* INPUT AREA */}
      {(step === 'greeting' || step === 'location') && (
        <GlassCard className="p-2 flex gap-2">
          <input 
            type="text" 
            autoFocus
            placeholder="Type your response..." 
            className="flex-1 bg-transparent px-4 py-3 text-white focus:outline-none"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button onClick={handleSend} className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors">
            <Send size={20} />
          </button>
        </GlassCard>
      )}
    </div>
  );
}
