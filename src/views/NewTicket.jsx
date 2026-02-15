import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, ThumbsUp, ThumbsDown, ArrowRight, Loader, Wrench, Paperclip, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GlassCard } from '../components/ui';

export default function NewTicketView({ categories, kbArticles, onSubmit }) {
  // FORM STATE
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
   
  // CHAT STATE
  const [messages, setMessages] = useState([
    { id: 1, type: 'bot', text: "Good day! I'm Nexus, your 1st line support bot. Please describe your issue." }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [showForm, setShowForm] = useState(false);
   
  // OPTIMISTIC TRACKING
  const [autoTicketId, setAutoTicketId] = useState(null); 
   
  // BOT IDENTITY
  const [botId, setBotId] = useState(null);
  const messagesEndRef = useRef(null);

  // 1. FETCH BOT ID
  useEffect(() => {
    async function getBotId() {
      const { data } = await supabase.from('profiles').select('id').eq('email', 'bot@nexus.ai').single();
      if (data) setBotId(data.id);
    }
    getBotId();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- SMART MATCHING ENGINE ---
  const findBestMatch = (userInput, articles) => {
    if (!userInput || !articles || articles.length === 0) return null;
    const normalize = (str) => str.toLowerCase().replace(/[^\w\s]/g, '');
    const cleanInput = normalize(userInput);
    const userWords = cleanInput.split(/\s+/).filter(w => w.length > 2); 

    let bestArticle = null;
    let maxScore = 0;

    articles.forEach(article => {
      let score = 0;
      const title = normalize(article.title || '');
      const content = normalize(article.content || '');
      const tags = (article.tags || []).map(t => normalize(t));

      if (title.includes(cleanInput)) score += 50;

      userWords.forEach(word => {
        if (title.includes(word)) score += 10;
        if (tags.includes(word)) score += 10;
        if (content.includes(word)) score += 1;
      });

      if (score > maxScore) {
        maxScore = score;
        bestArticle = article;
      }
    });

    return maxScore >= 5 ? bestArticle : null;
  };

  // 2. HANDLE USER TYPING
  const handleSend = async () => {
    if (!description.trim()) return;

    const userMsg = { id: Date.now(), type: 'user', text: description };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Hide input temporarily while bot thinks
    // We intentionally DON'T clear description here if we are showing the form later,
    // but typically chat interfaces clear input. 
    // However, for the 'Show Form' transition, we want to keep the text.
    // Let's clear it for the chat flow, but restore it if manual form triggers.
    const currentDescription = description; 
    setDescription(''); 

    setTimeout(async () => {
      const safeArticles = Array.isArray(kbArticles) ? kbArticles : [];
      const match = findBestMatch(currentDescription, safeArticles);
      setIsTyping(false);

      if (match) {
        if (botId) {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: newTicket } = await supabase.from('tickets').insert({
              subject: `[Bot Deflection] ${match.title}`,
              description: `User Issue: "${currentDescription}"\n\nAuto-suggested fix: ${match.title}`,
              category: 'Software',
              priority: 'Low',
              status: 'Resolved', 
              assignee_id: botId,
              requester_id: user?.id,
              resolved_at: new Date().toISOString()
            }).select().single();
            if (newTicket) setAutoTicketId(newTicket.id);
        }

        setMessages(prev => [...prev, { 
          id: Date.now() + 1, type: 'bot', text: "I found a solution that might help:", isSuggestion: true, article: match 
        }]);
      } else {
        setMessages(prev => [...prev, { 
          id: Date.now() + 1, type: 'bot', text: "I couldn't find an immediate fix. Let's raise a ticket for a human engineer." 
        }]);
        
        // Restore description for the manual form so user doesn't have to re-type
        setDescription(currentDescription);
        setShowForm(true);
        if (!subject) setSubject(currentDescription.substring(0, 50) + (currentDescription.length > 50 ? '...' : ''));
      }
    }, 1500);
  };

  const handleItWorked = () => {
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', text: "It Worked", isAction: true }, { id: Date.now() + 1, type: 'bot', text: "Excellent. I've kept the incident log for our records." }]);
    setAutoTicketId(null); 
  };

  const handleStillBroken = async () => {
    if (autoTicketId) { await supabase.from('tickets').delete().eq('id', autoTicketId); }
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', text: "Still Broken", isAction: true }, { id: Date.now() + 1, type: 'bot', text: "Understood. Creating a manual ticket now." }]);
    setAutoTicketId(null);
    setShowForm(true);
    // Ensure description is ready for the form
    if (!subject && description) setSubject(description.substring(0, 50) + (description.length > 50 ? '...' : ''));
  };

  // --- FILE UPLOAD LOGIC ---
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmitForm = async () => {
    setUploading(true);
    let attachmentUrl = null;

    // 1. Upload File (if exists)
    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('ticket-attachments')
        .upload(filePath, file);

      if (uploadError) {
        alert('Error uploading file: ' + uploadError.message);
        setUploading(false);
        return;
      }

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(filePath);
       
      attachmentUrl = publicUrl;
    }

    // 2. Submit Ticket with URL
    onSubmit({
      subject,
      description,
      category: category || 'General',
      priority,
      attachment_url: attachmentUrl
    });
    setUploading(false);
  };

  const getArticlePreview = (article) => {
      if (!article) return '';
      const text = article.content || article.body || article.text || article.description || '';
      return text.substring(0, 150) + '...';
  };

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-140px)] flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h2 className="text-2xl font-bold text-white">New Request</h2>
        <p className="text-slate-400">Describe your issue and Nexus will attempt to solve it.</p>
      </div>

      <div className="flex-1 bg-[#1e293b]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 overflow-y-auto custom-scrollbar space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.type === 'bot' ? 'bg-blue-600' : 'bg-slate-700'}`}>
              {msg.type === 'bot' ? <Bot size={20} className="text-white" /> : <User size={20} className="text-slate-300" />}
            </div>
            <div className={`flex flex-col gap-2 max-w-[80%] ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-5 py-3 rounded-2xl text-sm leading-relaxed ${msg.type === 'bot' ? 'bg-[#2d3748] text-slate-200 rounded-tl-none border border-white/5' : msg.isAction ? 'bg-slate-700/50 text-slate-400 italic rounded-tr-none' : 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-900/20'}`}>
                {msg.text}
              </div>
              {msg.isSuggestion && msg.article && (
                <div className="bg-[#0f172a] border border-green-500/30 rounded-xl p-4 w-full mt-2 animate-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <Wrench size={16} /><span className="text-xs font-bold uppercase tracking-wider">Suggested Fix: {msg.article.title}</span>
                  </div>
                  <p className="text-slate-300 text-sm mb-4">{getArticlePreview(msg.article)}</p>
                  {autoTicketId && (
                    <div className="flex gap-3">
                      <button onClick={handleItWorked} className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"><ThumbsUp size={16} /> It Worked</button>
                      <button onClick={handleStillBroken} className="flex-1 py-2 bg-[#1e293b] hover:bg-[#2d3748] border border-white/10 text-slate-300 rounded-lg text-sm font-medium flex items-center justify-center gap-2"><ThumbsDown size={16} /> Still Broken</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-4"><div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0"><Bot size={20} className="text-white" /></div><div className="bg-[#2d3748] px-5 py-4 rounded-2xl rounded-tl-none border border-white/5 flex gap-1"><span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span><span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span><span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span></div></div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {!showForm && (
        <div className="relative">
          <input 
            autoFocus 
            type="text" 
            placeholder="Type your issue here..." 
            className="w-full bg-[#1e293b] border border-white/10 rounded-xl pl-6 pr-14 py-4 text-white focus:outline-none focus:border-blue-500/50 shadow-xl" 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleSend()} 
          />
          <button onClick={handleSend} disabled={!description.trim() || isTyping} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 transition-colors"><Send size={18} /></button>
        </div>
      )}

      {showForm && (
        <GlassCard className="p-6 animate-in slide-in-from-bottom-8 duration-500 border-t-4 border-t-blue-500">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-white">Raise Official Ticket</h3>
            <span className="text-xs text-slate-400 bg-white/5 px-2 py-1 rounded">Human Support</span>
          </div>
          <div className="grid gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Subject</label>
                <input type="text" className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-blue-500/50 outline-none" value={subject} onChange={e => setSubject(e.target.value)} />
              </div>

              {/* RE-INSTATED DESCRIPTION BOX */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                <textarea 
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-blue-500/50 outline-none resize-none h-32" 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Provide more details about the issue..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                  <select className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-blue-500/50 outline-none appearance-none" value={category} onChange={e => setCategory(e.target.value)}><option value="">Select...</option>{categories.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}</select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Priority</label>
                  <select className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-blue-500/50 outline-none appearance-none" value={priority} onChange={e => setPriority(e.target.value)}><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option></select>
                </div>
              </div>
              
              {/* --- FILE ATTACHMENT AREA --- */}
              <div>
                 <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Attachment (Optional)</label>
                 {!file ? (
                   <label className="flex items-center gap-3 w-full bg-black/30 border border-dashed border-white/20 hover:border-blue-500/50 rounded-lg px-4 py-3 cursor-pointer transition-colors group">
                     <Paperclip size={18} className="text-slate-400 group-hover:text-blue-400" />
                     <span className="text-sm text-slate-400 group-hover:text-slate-200">Click to attach screenshot...</span>
                     <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                   </label>
                 ) : (
                   <div className="flex items-center justify-between w-full bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-3">
                     <div className="flex items-center gap-3">
                        <Paperclip size={18} className="text-blue-400" />
                        <span className="text-sm text-blue-100 truncate max-w-[200px]">{file.name}</span>
                     </div>
                     <button onClick={() => setFile(null)} className="text-blue-300 hover:text-white"><X size={16} /></button>
                   </div>
                 )}
              </div>

              <button onClick={handleSubmitForm} disabled={uploading} className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2">
                 {uploading ? 'Uploading...' : 'Submit Ticket'} <ArrowRight size={16} />
              </button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
