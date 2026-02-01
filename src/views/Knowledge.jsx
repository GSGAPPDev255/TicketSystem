import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Trash2, Edit2, FileText, X } from 'lucide-react';
import { GlassCard, Modal, getIcon } from '../components/ui';

export default function KnowledgeView({ articles, categories, onUpdate }) {
  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Hardware',
    content: ''
  });

  // --- ACTIONS ---

  const openNewModal = () => {
    setEditingArticle(null);
    setFormData({ title: '', category: categories[0]?.label || 'Hardware', content: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (article) => {
    setEditingArticle(article);
    setFormData({ 
      title: article.title, 
      category: article.category, 
      content: article.content || '' 
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.category) return;

    if (editingArticle) {
      // UPDATE
      const { error } = await supabase
        .from('kb_articles')
        .update({
          title: formData.title,
          category: formData.category,
          content: formData.content
        })
        .eq('id', editingArticle.id);
      
      if (error) alert(error.message);
    } else {
      // CREATE
      const { error } = await supabase
        .from('kb_articles')
        .insert({
          title: formData.title,
          category: formData.category,
          content: formData.content,
          views: 0
        });

      if (error) alert(error.message);
    }

    setIsModalOpen(false);
    onUpdate(); // Refresh App Data
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this article permanently?")) return;

    const { error } = await supabase.from('kb_articles').delete().eq('id', id);
    if (!error) onUpdate();
  };

  // --- FILTERING ---
  const filteredArticles = articles.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Knowledge Base</h2>
          <p className="text-slate-400">Manage guides and documentation</p>
        </div>
        <div className="flex gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 group-focus-within:text-blue-400" />
            <input 
              type="text" 
              placeholder="Search articles..." 
              className="bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 w-64 transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={openNewModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-900/20"
          >
            <Plus size={16} /> Add Article
          </button>
        </div>
      </div>

      {/* CATEGORY PILLS */}
      <div className="flex gap-4 overflow-x-auto pb-2">
         {categories.map(cat => (
           <GlassCard key={cat.id} className="min-w-[140px] p-4 flex flex-col items-center gap-2 hover:bg-white/5 cursor-pointer transition-colors">
              <div className={`p-3 rounded-full ${cat.bg || 'bg-slate-500/10'} ${cat.color || 'text-slate-400'}`}>
                {getIcon(cat.icon)}
              </div>
              <span className="text-sm font-medium text-slate-300">{cat.label}</span>
           </GlassCard>
         ))}
      </div>

      {/* ARTICLE GRID */}
      <div className="grid gap-4">
        {filteredArticles.map(article => (
          <GlassCard 
            key={article.id} 
            className="p-5 flex items-start justify-between group hover:border-white/20 transition-all cursor-pointer"
            onClick={() => openEditModal(article)}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg">
                <FileText size={20} />
              </div>
              <div>
                <h4 className="font-medium text-slate-200 group-hover:text-indigo-300 transition-colors">{article.title}</h4>
                <p className="text-xs text-slate-500 mt-1">{article.category} • {article.views || 0} views</p>
                {article.content && (
                  <p className="text-sm text-slate-400 mt-2 line-clamp-2 max-w-2xl">{article.content}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <button onClick={(e) => { e.stopPropagation(); openEditModal(article); }} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg">
                 <Edit2 size={16} />
               </button>
               <button onClick={(e) => handleDelete(e, article.id)} className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg">
                 <Trash2 size={16} />
               </button>
            </div>
          </GlassCard>
        ))}
        {filteredArticles.length === 0 && (
          <div className="text-center py-12 text-slate-500 border border-white/5 rounded-xl border-dashed">
            <p>No articles found matching your search.</p>
          </div>
        )}
      </div>

      {/* ADD/EDIT MODAL */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingArticle ? "Edit Article" : "New Article"}
      >
        <div className="space-y-4">
           <div>
             <label className="block text-xs font-medium text-slate-400 mb-1.5">Article Title</label>
             <input 
               type="text" 
               className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500/50"
               value={formData.title}
               onChange={e => setFormData({...formData, title: e.target.value})}
               placeholder="e.g. How to replace toner"
             />
           </div>
           
           <div>
             <label className="block text-xs font-medium text-slate-400 mb-1.5">Category</label>
             <select 
               className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
               value={formData.category}
               onChange={e => setFormData({...formData, category: e.target.value})}
             >
               {categories.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
             </select>
           </div>

           <div>
             <label className="block text-xs font-medium text-slate-400 mb-1.5">Content / Solution</label>
             <textarea 
               rows={6}
               className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500/50 resize-none"
               value={formData.content}
               onChange={e => setFormData({...formData, content: e.target.value})}
               placeholder="Step 1..."
             />
           </div>

           <button 
             onClick={handleSave} 
             className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg shadow-blue-900/20 transition-all"
           >
             {editingArticle ? 'Update Article' : 'Publish Article'}
           </button>
        </div>
      </Modal>
    </div>
  );
}
