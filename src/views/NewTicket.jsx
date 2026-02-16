import React, { useState, useEffect } from 'react';
import { Send, Search, ArrowRight, Loader, Wrench, Paperclip, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
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
  
  // DEFLECTION STATE
  const [suggestion, setSuggestion] = useState(null);
  const [deflected, setDeflected] = useState(false);

  // --- 1. SMART MATCHING ENGINE (PRESERVED) ---
  useEffect(() => {
    if (!subject || subject.length < 5 || deflected) {
        setSuggestion(null);
        return;
    }

    const timer = setTimeout(() => {
        const normalize = (str) => str.toLowerCase().replace(/[^\w\s]/g, '');
        const cleanInput = normalize(subject);
        const userWords = cleanInput.split(/\s+/).filter(w => w.length > 3);

        if (userWords.length === 0) return;

        let bestArticle = null;
        let maxScore = 0;
        const articles = Array.isArray(kbArticles) ? kbArticles : [];

        articles.forEach(article => {
            let score = 0;
            const title = normalize(article.title || '');
            const content = normalize(article.content || '');
            const tags = (article.tags || []).map(t => normalize(t));

            if (title.includes(cleanInput)) score += 50; 

            userWords.forEach(word => {
                if (title.includes(word)) score += 20;
                if (tags.includes(word)) score += 15;
                if (content.includes(word)) score += 5;
            });

            if (score > maxScore) {
                maxScore = score;
                bestArticle = article;
            }
        });

        if (maxScore >= 15) {
            setSuggestion(bestArticle);
        } else {
            setSuggestion(null);
        }
    }, 500);

    return () => clearTimeout(timer);
  }, [subject, kbArticles, deflected]);

  // --- 2. HANDLE DEFLECTION (PRESERVED) ---
  const handleDeflection = async () => {
      setDeflected(true);
      setSuggestion(null);
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('tickets').insert({
          subject: `[Deflected] ${subject}`,
          description: `User fixed it with KB Article: "${suggestion.title}"`,
          category: 'General',
          priority: 'Low',
          status: 'Resolved',
          requester_id: user?.id,
          resolved_at: new Date().toISOString()
      });
      alert("Great! We're glad the article helped. No ticket was raised.");
      setSubject('');
      setDescription('');
      setCategory('');
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmitForm = async () => {
    if (!subject.trim() || !description.trim() || !category) {
        alert("Please fill in all required fields.");
        return;
    }
    setUploading(true);
    let attachmentUrl = null;
    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('ticket-attachments').upload(fileName, file);
      if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('ticket-attachments').getPublicUrl(fileName);
          attachmentUrl = publicUrl;
      }
    }
    await onSubmit({ subject, description, category, priority, attachment_url: attachmentUrl });
    setUploading(false);
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 pb-12">
      <div className="text-center md:text-left">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 transition-colors">New Support Request</h2>
        <p className="text-slate-500 dark:text-slate-400">Describe your issue clearly so we can help you faster.</p>
      </div>

      <GlassCard className="p-8 border-t-4 border-t-blue-500 relative overflow-hidden">
          <div className="space-y-6">
              {/* SUBJECT INPUT */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Subject / Issue Summary</label>
                <input 
                    autoFocus
                    type="text" 
                    className="w-full bg-slate-100 dark:bg-black/30 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-4 text-slate-900 dark:text-white text-lg focus:border-blue-500/50 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all" 
                    value={subject} 
                    onChange={e => setSubject(e.target.value)} 
                    placeholder="e.g. WiFi not connecting in Room 101"
                />
              </div>

              {/* SUGGESTION CARD */}
              {suggestion && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 animate-in slide-in-from-top-4">
                      <div className="flex items-start gap-4">
                          <div className="p-3 bg-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400 shrink-0">
                              <Wrench size={24} />
                          </div>
                          <div className="flex-1">
                              <h4 className="text-emerald-700 dark:text-emerald-300 font-bold text-lg mb-1">Wait! This might fix it:</h4>
                              <p className="text-slate-900 dark:text-white font-medium mb-2">{suggestion.title}</p>
                              <p className="text-slate-600 dark:text-slate-300 text-sm mb-4 line-clamp-2">{suggestion.content}</p>
                              <div className="flex gap-3">
                                  <button onClick={handleDeflection} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-900/20 flex items-center gap-2 transition-all">
                                      <CheckCircle2 size={16} /> Yes, it worked!
                                  </button>
                                  <button onClick={() => setSuggestion(null)} className="px-4 py-2 bg-slate-200 dark:bg-black/20 hover:bg-slate-300 dark:hover:bg-black/40 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg text-sm font-medium transition-all">
                                      No, still broken
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* DESCRIPTION */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Detailed Description</label>
                <textarea 
                  className="w-full bg-slate-100 dark:bg-black/30 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-4 text-slate-900 dark:text-white focus:border-blue-500/50 outline-none resize-none h-40 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all" 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Please list any steps you've already tried..."
                />
              </div>

              {/* METADATA GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                  <div className="relative">
                      <select 
                        className="w-full bg-slate-100 dark:bg-black/30 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-blue-500/50 outline-none appearance-none cursor-pointer" 
                        value={category} 
                        onChange={e => setCategory(e.target.value)}
                      >
                        <option value="">Select Category...</option>
                        {categories.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                          <ArrowRight size={14} className="rotate-90" />
                      </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Priority</label>
                  <div className="grid grid-cols-4 gap-2 bg-slate-100 dark:bg-black/30 p-1 rounded-xl border border-slate-300 dark:border-white/10">
                      {['Low', 'Medium', 'High', 'Critical'].map(p => (
                          <button
                            key={p}
                            onClick={() => setPriority(p)}
                            className={`py-2 text-[10px] font-bold rounded-lg transition-all ${
                                priority === p 
                                ? p === 'Critical' ? 'bg-rose-500 text-white' : p === 'High' ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'
                                : 'text-slate-500 hover:bg-white/10 hover:text-slate-900 dark:hover:text-slate-300'
                            }`}
                          >
                              {p}
                          </button>
                      ))}
                  </div>
                </div>
              </div>
              
              {/* FILE ATTACHMENT */}
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Attachment (Optional)</label>
                 {!file ? (
                   <label className="flex items-center justify-center gap-3 w-full bg-slate-100 dark:bg-black/30 border border-dashed border-slate-300 dark:border-white/20 hover:border-blue-500/50 rounded-xl px-4 py-6 cursor-pointer transition-all group">
                     <div className="w-10 h-10 rounded-full bg-white dark:bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                        <Paperclip size={20} className="text-slate-400 group-hover:text-blue-500" />
                     </div>
                     <div className="text-left">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">Click to upload screenshot</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">JPG, PNG, or PDF up to 5MB</p>
                     </div>
                     <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                   </label>
                 ) : (
                   <div className="flex items-center justify-between w-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl px-4 py-3">
                     <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg text-blue-600 dark:text-blue-400">
                            <FileText size={20} />
                        </div>
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-100 truncate max-w-[200px]">{file.name}</span>
                     </div>
                     <button onClick={() => setFile(null)} className="p-2 hover:bg-white/20 rounded-lg text-blue-500 dark:text-blue-300 hover:text-blue-700 dark:hover:text-white transition-colors"><X size={18} /></button>
                   </div>
                 )}
              </div>

              {/* SUBMIT BUTTON */}
              <button 
                onClick={handleSubmitForm} 
                disabled={uploading} 
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-lg shadow-xl shadow-blue-900/20 hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-3 mt-4"
              >
                 {uploading ? <Loader className="animate-spin" /> : <Send size={20} />}
                 {uploading ? 'Uploading...' : 'Submit Request'}
              </button>
          </div>
      </GlassCard>
    </div>
  );
}
