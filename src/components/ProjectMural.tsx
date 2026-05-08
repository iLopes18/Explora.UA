import { useState, useEffect, FormEvent } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, where } from 'firebase/firestore';
import { Plus, Clock, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ProjectMural() {
  const [projects, setProjects] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProject, setNewProject] = useState({ title: '', description: '', skills: '' });

  useEffect(() => {
    const q = query(collection(db, 'projects'), where('status', '==', 'open'));
    const unsub = onSnapshot(q, (snap) => {
      const dbProjects = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(dbProjects);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      await addDoc(collection(db, 'projects'), {
        title: newProject.title,
        description: newProject.description,
        requiredSkills: newProject.skills.split(',').map(s => s.trim()),
        creatorId: auth.currentUser.uid,
        status: 'open',
        createdAt: new Date().toISOString()
      });
      setShowAddForm(false);
      setNewProject({ title: '', description: '', skills: '' });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 md:space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#141414] pb-8 gap-6">
        <div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase">Mural de Projetos</h2>
          <p className="font-serif italic opacity-60 mt-2 text-base md:text-lg text-[#141414]/60">Lança uma call, encontra a tua equipa.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="w-full md:w-auto bg-[#141414] text-[#E4E3E0] px-8 py-4 uppercase font-bold tracking-widest hover:invert transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> Criar Projeto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <AnimatePresence>
          {projects.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-[#141414]/10">
              <p className="opacity-40 uppercase font-mono text-xs px-4">Nenhum projeto ativo no momento. Sê o primeiro a lançar uma call.</p>
            </div>
          )}
          {projects.map((project, i) => (
            <motion.div 
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group border border-[#141414] p-6 md:p-8 bg-[#E4E3E0] hover:bg-[#141414] hover:text-[#E4E3E0] transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <span className="font-mono text-[9px] uppercase border border-current px-2 py-0.5 opacity-60">OPEN BOUNTY</span>
                  <div className="flex gap-1">
                    {[1, 2, 3].map(dot => <div key={dot} className="w-1 h-1 rounded-full bg-current"></div>)}
                  </div>
                </div>
                <h3 className="text-3xl font-bold uppercase tracking-tighter leading-none mb-4">{project.title}</h3>
                <p className="text-sm opacity-60 group-hover:opacity-100 line-clamp-3 mb-6 font-serif leading-relaxed italic">
                  "{project.description}"
                </p>
                <div className="flex flex-wrap gap-2 mb-8">
                  {project.requiredSkills?.map((skill: string) => (
                    <span key={skill} className="text-[10px] uppercase font-bold underline underline-offset-4 decoration-1">
                      #{skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-current border-opacity-10">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full border border-current flex items-center justify-center">
                    <UserIcon className="w-3 h-3" />
                  </div>
                  <span className="font-mono text-[10px] opacity-60">ID: {project.creatorId.substring(0, 5)}</span>
                </div>
                <div className="flex items-center gap-4 text-[10px] uppercase font-bold opacity-40 group-hover:opacity-100 italic">
                  <Clock className="w-3 h-3" /> 2D AGO
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Project Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-[#E4E3E0]/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#E4E3E0] border border-[#141414] p-10 max-w-2xl w-full shadow-2xl relative"
          >
            <button onClick={() => setShowAddForm(false)} className="absolute top-6 right-6 hover:rotate-90 transition-transform">
              <Plus className="w-6 h-6 rotate-45" />
            </button>
            
            <h2 className="text-4xl font-bold uppercase tracking-tighter mb-8">Lançar Call</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase opacity-60">Título do Projeto</label>
                <input 
                  required
                  value={newProject.title}
                  onChange={e => setNewProject({...newProject, title: e.target.value})}
                  className="w-full bg-white border border-[#141414] p-4 text-sm focus:outline-none focus:bg-[#141414] focus:text-[#E4E3E0] transition-colors"
                  placeholder="EX: CURTA-METRAGEM 'A SOMBRA'..."
                />
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase opacity-60">Descrição</label>
                <textarea 
                  required
                  value={newProject.description}
                  onChange={e => setNewProject({...newProject, description: e.target.value})}
                  className="w-full bg-white border border-[#141414] p-4 text-sm focus:outline-none focus:bg-[#141414] focus:text-[#E4E3E0] transition-colors"
                  rows={4}
                  placeholder="DESCREVE A TUA VISÃO E O QUE PROCURAS..."
                />
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase opacity-60">Competências Necessárias (Separadas por vírgula)</label>
                <input 
                  value={newProject.skills}
                  onChange={e => setNewProject({...newProject, skills: e.target.value})}
                  className="w-full bg-white border border-[#141414] p-4 text-sm focus:outline-none focus:bg-[#141414] focus:text-[#E4E3E0] transition-colors"
                  placeholder="EX: FOTOGRAFIA, PREMIERE, DESIGN..."
                />
              </div>

              <button className="w-full bg-[#141414] text-[#E4E3E0] py-5 uppercase font-bold tracking-widest hover:invert transition-all">
                Publicar no Mural
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
