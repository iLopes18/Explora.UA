import { X, Users, Building2, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface NucleusProfileProps {
  nucleus: { id: string; name: string; description: string; category?: string };
  users: any[];
  onClose: () => void;
  onUserClick: (userId: string) => void;
}

export default function NucleusProfile({ nucleus, users, onClose, onUserClick }: NucleusProfileProps) {
  // Filter users that have this nucleus ID or name in their affiliations
  const members = users.filter(u => 
    (u.affiliations || []).some((a: string) => 
      a.toLowerCase() === nucleus.id.toLowerCase() || 
      a.toLowerCase() === nucleus.name.toLowerCase()
    )
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[#141414] flex justify-between items-center bg-[#DCDAD7]">
        <div className="flex flex-col">
          <span className="font-mono text-[9px] uppercase tracking-widest opacity-50">Ecossistema / UA</span>
          {nucleus.category && (
            <span className="font-mono text-[10px] font-bold uppercase text-[#141414]">{nucleus.category}</span>
          )}
        </div>
        <button onClick={onClose} className="hover:rotate-90 transition-transform">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-10">
        {/* Info */}
        <div className="space-y-4">
          <div className="w-16 h-16 bg-[#141414] text-[#E4E3E0] flex items-center justify-center">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-4xl font-bold tracking-tighter uppercase leading-none">{nucleus.name}</h2>
            <p className="font-serif italic mt-3 opacity-60 text-lg">
              {nucleus.description}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-[#141414] p-4">
            <span className="block font-mono text-[10px] uppercase opacity-40 mb-1">Membros na Rede</span>
            <span className="text-2xl font-bold font-mono">{members.length}</span>
          </div>
          <div className="border border-[#141414] p-4 bg-[#141414] text-[#E4E3E0]">
            <span className="block font-mono text-[10px] uppercase opacity-40 mb-1">Status</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">Ativo / Verificado</span>
          </div>
        </div>

        {/* Members List */}
        <div className="space-y-6">
          <h4 className="font-mono text-[10px] uppercase opacity-40 flex items-center gap-2">
            <Users className="w-3 h-3" /> Talentos Ligados
          </h4>
          
          {members.length === 0 ? (
            <div className="p-12 border border-dashed border-[#141414]/20 text-center">
              <p className="text-[10px] font-mono uppercase opacity-30 italic">Ainda não tens conexões neste núcleo.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map(member => (
                <div 
                  key={member.uid} 
                  onClick={() => onUserClick(member.uid)}
                  className="flex items-center justify-between border border-[#141414]/10 p-3 hover:bg-[#141414] hover:text-[#E4E3E0] cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <h5 className="text-[11px] font-bold uppercase leading-tight">{member.name}</h5>
                      <p className="text-[9px] opacity-60">{member.course}</p>
                    </div>
                  </div>
                  <motion.div 
                    initial={{ scale: 0.8 }} 
                    whileHover={{ scale: 1.1 }}
                    className="font-mono text-[9px] opacity-0 group-hover:opacity-100"
                  >
                    VER PERFIL →
                  </motion.div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-6 border-t border-[#141414] bg-[#DCDAD7]">
        <button className="w-full border border-[#141414] py-3 uppercase font-bold text-[10px] tracking-widest hover:bg-[#141414] hover:text-[#E4E3E0] transition-all">
          Sugerir Colaboração Coletiva
        </button>
      </div>
    </div>
  );
}
