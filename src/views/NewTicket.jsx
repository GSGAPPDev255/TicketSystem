import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, ThumbsUp, ThumbsDown, Wrench, MapPin, CheckCircle } from 'lucide-react';
import { GlassCard } from '../components/ui';

export default function NewTicketView({ categories, kbArticles, onSubmit }) {
  const [step, setStep] = useState('greeting');
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Good day! I'm Nexus, your 1st line support bot. Please describe your issue." }
  ]);
  const [inputText, setInputText] = useState('');
  const [ticketData, setTicketData] = useState({ subject: '', description: '', category: 'Hardware', location: '' });
  const [foundArticle, setFoundArticle] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, step]);

  // --- SMART SEARCH ---
  const findBestArticle = (userQuery) => {
    if (!kbArticles || kbArticles.length === 0) return null;
    const cleanQuery = userQuery.toLowerCase().replace(/[^a-z0-9 ]/g, '');
    const queryWords = cleanQuery.split(' ').filter(w => w.length > 3);
    
    let bestMatch = null;
    let maxScore = 0;

    kbArticles.forEach(article => {
      let score = 0;
      const cleanTitle = article.title.toLowerCase();
      queryWords.forEach(word => {
        if (cleanTitle.includes(word)) score += 10;
        if (article.category.toLowerCase().includes(word)) score += 5;
      });
      if (cleanTitle.includes(cleanQuery)) score += 20;
      if (score > maxScore) { maxScore = score; bestMatch = article; }
    });
    return maxScore > 0 ? bestMatch : null;
  };

  // --- HANDLERS ---
  const handleSend = () => {
    if (!inputText.trim()) return;
    const userQuery = inputText;
    const newMessages = [...messages, { role: 'user', text: userQuery }];
    setMessages(newMessages);
    setInputText('');

    if (step === 'greeting') {
      // Initialize Ticket Data
      setTicketData(prev => ({ 
        ...prev, 
        description: userQuery, 
        subject: userQuery.length > 40 ? userQuery.substring(0, 40) + '...' : userQuery 
      }));
      
      const hit = findBestArticle(userQuery);
      if (hit) {
        setFoundArticle(hit);
        // Pre-set category based on KB article if found
        setTicketData(prev => ({ ...prev, category: hit.category }));
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'bot', text: "I found a solution that might help:" }]);
          setStep('suggestion');
        }, 600);
      } else {
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'bot', text: "I see. To help the technician, which room or location are you in?" }]);
          setStep('location');
        }, 600);
      }
    } else if (step === 'location') {
      setTicketData(prev => ({ ...prev, location: userQuery }));
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'bot', text: "Understood. Please confirm the details below to raise the ticket." }]);
        setStep('form');
      }, 600);
    }
  };

  // --- AUTO-LOG RESOLVED TICKETS ---
  const handleSolutionWorked = (worked) => {
    if (worked) {
      // 1. Log success message
      setMessages(prev => [...prev, 
        { role: 'user', text: "Yes, that worked!" }, 
        { role: 'bot', text: "Great! I've logged this as a resolved incident for our records. Have a wonderful day!" }
      ]);
      setStep('resolved');

      // 2. SILENTLY CREATE RESOLVED TICKET (Data Analytics)
      onSubmit({
        subject: `[Resolved by Bot] ${ticketData.subject}`,
        description: `User Issue: ${ticketData.description}\n\nSolution: Applied KB Article "${foundArticle.title}" successfully.`,
        category: ticketData.category || 'Hardware',
        location: 'Remote / Chat',
        status: 'Resolved', // <--- This goes straight to "Resolved" tab
        priority: 'Low'
      });

    } else {
      setMessages(prev => [...prev, 
        { role: 'user', text: "No, it's still broken." }, 
        { role: 'bot', text: "I'm sorry about that. Let's get an engineer to look at this. Which room are you in?" }
      ]);
      setStep('location');
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
      
      {/* CHAT STREAM */}
      <GlassCard className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
             <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'bot' ? 'bg-blue-600' : 'bg-slate-600'}`}>
                {msg.role === 'bot' ? <Bot size={20} className="text-white" /> : <User size={20} className="text-white" />}
             </div>
             <div className={`p-4 rounded-2xl max-w-[80%] text-sm md:text-base ${msg.role === 'bot' ? 'bg-white/10 text-slate-200 rounded-tl-none' : 'bg-blue-600 text-white rounded-tr-none'}`}>
                {msg.text}
             </div>
          </div>
        ))}

        {/* KB WIDGET */}
        {step === 'suggestion' && foundArticle && (
          <div className="ml-14 max-w-[90%] md:max-w-[70%] animate-in fade-in slide-in-from-left-2 space-y-3">
             <div className="p-5 bg-emerald-900/20 border border-emerald-500/30 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                <h4 className="font-bold text-emerald-400 mb-2 flex items-center gap-2"><Wrench size={16}/> Suggested Fix: {foundArticle.title}</h4>
                <p className="text-slate-300 text-sm whitespace-pre-line leading-relaxed">{foundArticle.content}</p>
             </div>
             <div className="flex gap-3">
               <button onClick={() => handleSolutionWorked(true)} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"><ThumbsUp size={16}/> It Worked</button>
               <button onClick={() => handleSolutionWorked(false)} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"><ThumbsDown size={16}/> Still Broken</button>
             </div>
          </div>
        )}

        {/* TICKET FORM WIDGET */}
        {step === 'form' && (
           <div className="ml-0 md:ml-14 max-w-full md:max-w-[80%] animate-in fade-in slide-in-from-left-2">
              <div className="bg-[#1e293b]/80 border border-blue-500/30 rounded-xl p-6 space-y-4 shadow-2xl">
                 <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="font-bold text-white">Confirm Ticket Details</h3>
                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">New Ticket</span>
                 </div>
                 
                 <div>
                   <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Description</label>
                   <textarea 
                     className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white mt-1 h-20 focus:outline-none focus:border-blue-500/50 resize-none"
                     value={ticketData.description}
                     onChange={e => setTicketData({...ticketData, description: e.target.value})}
                   />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Category</label>
                       <select 
                          className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white mt-1 focus:outline-none focus:border-blue-500/50"
                          value={ticketData.category}
                          onChange={e => setTicketData({...ticketData, category: e.target.value})}
                       >
                          {categories.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
                       </select>
                    </div>
                    <div>
                       <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Location</label>
                       <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg p-2.5 mt-1 focus-within:border-blue-500/50">
                          <MapPin size={14} className="text-slate-500" />
                          <input 
                            className="bg-transparent text-sm text-white w-full focus:outline-none"
                            value={ticketData.location}
                            onChange={e => setTicketData({...ticketData, location: e.target.value})}
                          />
                       </div>
                    </div>
                 </div>

                 <button onClick={() => onSubmit(ticketData)} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]">
                    <Send size={16} /> Submit Ticket
                 </button>
              </div>
           </div>
        )}
        
        {step === 'resolved' && (
           <div className="flex justify-center py-4 opacity-50">
              <span className="text-xs text-slate-500 flex items-center gap-1"><CheckCircle size={12}/> Ticket automatically logged as Resolved</span>
           </div>
        )}

        <div ref={messagesEndRef} />
      </GlassCard>

      {/* INPUT BAR */}
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
          <button onClick={handleSend} className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors shadow-lg">
            <Send size={20} />
          </button>
        </GlassCard>
      )}
    </div>
  );
}
