import { useEffect, useState } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, getDocFromServer, serverTimestamp } from 'firebase/firestore';
import { X, ExternalLink, Github, Instagram, Linkedin, Mail, Tag, Award, Briefcase, Plus, Save, Trash2, ChevronDown, Globe, UserPlus } from 'lucide-react';
import { 
  LICENCIATURAS, 
  MESTRADOS, 
  DOUTORAMENTOS, 
  AFILIACOES_ACADEMICAS, 
  AFILIACOES_CATEGORIAS,
  INTERESSES_CATEGORIAS,
  getDepartamentoDoCurso 
} from '../constants';

const ALL_COURSES = [...LICENCIATURAS, ...MESTRADOS, ...DOUTORAMENTOS].sort();

interface ProfileCardProps {
  userId: string;
  onClose: () => void;
  isSelf: boolean;
  currentUser: any;
  allConnections: any[];
}

export default function ProfileCard({ userId, onClose, isSelf, currentUser, allConnections }: ProfileCardProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<any>(null);
  const [activeSkillsCat, setActiveSkillsCat] = useState<string | null>(null);
  const [activeAffiliationsCat, setActiveAffiliationsCat] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'accepted' | 'declined'>('none');
  const [isRequester, setIsRequester] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const docRef = doc(db, 'users', userId);
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const fullData = {
            licenciaturas: [],
            mestrados: [],
            doutoramentos: [],
            isAlumni: false,
            ...data
          };
          setProfile(fullData);
          setEditedProfile({ ...fullData });
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [userId]);

  useEffect(() => {
    if (!userId || !currentUser) return;

    const conn = allConnections.find(c => 
      (c.userA === currentUser.uid && c.userB === userId) || 
      (c.userA === userId && c.userB === currentUser.uid)
    );

    if (conn) {
      setConnectionStatus(conn.status);
      setIsRequester(conn.requesterId === currentUser.uid);
    } else {
      setConnectionStatus('none');
      setIsRequester(false);
    }
  }, [userId, currentUser, allConnections]);

  const handleAddConnection = async () => {
    if (!currentUser || !userId) return;
    try {
      await addDoc(collection(db, 'connections'), {
        userA: currentUser.uid,
        userB: userId,
        requesterId: currentUser.uid,
        status: 'pending',
        type: 'friend',
        createdAt: new Date().toISOString()
      });
      alert('Pedido de ligação enviado!');
    } catch (e) {
      console.error(e);
      alert('Erro ao enviar pedido.');
    }
  };

  const handleSave = async () => {
    const path = `users/${userId}`;
    try {
      const mainCourse = editedProfile.licenciaturas?.[0]?.name || editedProfile.mestrados?.[0]?.name || editedProfile.course || '---';

      const docRef = doc(db, 'users', userId);
      
      const updateData: any = { 
        name: editedProfile.name,
        username: editedProfile.username,
        course: mainCourse,
        department: getDepartamentoDoCurso(mainCourse),
        licenciaturas: editedProfile.licenciaturas || [],
        mestrados: editedProfile.mestrados || [],
        doutoramentos: editedProfile.doutoramentos || [],
        skills: editedProfile.skills || [],
        affiliations: editedProfile.affiliations || [],
        contacts: editedProfile.contacts || {},
        bio: editedProfile.bio || '',
        isAlumni: editedProfile.isAlumni || false,
        updatedAt: serverTimestamp() 
      };

      // Check if username changed
      if (editedProfile.username !== profile.username) {
        updateData.lastUsernameChange = serverTimestamp();
      }

      await updateDoc(docRef, updateData);
      setProfile({
        ...profile,
        ...updateData,
        lastUsernameChange: updateData.lastUsernameChange || profile.lastUsernameChange
      });
      setEditing(false);
    } catch (e: any) {
      if (e.code === 'permission-denied') {
        handleFirestoreError(e, OperationType.UPDATE, path);
      } else {
        console.error(e);
      }
    }
  };

  const toggleItem = (listName: string, item: string) => {
    const currentList = editedProfile[listName] || [];
    if (currentList.includes(item)) {
      setEditedProfile({
        ...editedProfile,
        [listName]: currentList.filter((i: string) => i !== item)
      });
    } else {
      setEditedProfile({
        ...editedProfile,
        [listName]: [...currentList, item]
      });
    }
  };

  if (loading) return <div className="p-8 font-mono text-[10px] uppercase">A carregar perfil...</div>;
  if (!profile) return <div className="p-8">Perfil não encontrado.</div>;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#E4E3E0]">
      {/* Header */}
      <div className="p-6 border-b border-[#141414] flex justify-between items-center shrink-0">
        <span className="font-mono text-[10px] uppercase tracking-widest opacity-50">
          {editing ? 'Modo de Edição' : 'Visualizando Nó'}
        </span>
        <button onClick={onClose} className="hover:rotate-90 transition-transform">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Identity Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="text-3xl font-bold tracking-tighter uppercase leading-none truncate flex items-center gap-2">
                {profile.name}
                {profile.isAlumni && (
                  <span className="bg-[#141414] text-white text-[9px] px-2 py-0.5 font-mono tracking-widest align-middle">ALUMNI</span>
                )}
              </h2>
              <p className="font-mono text-[11px] opacity-40 mt-1">@{profile.username || 'nó_sem_identidade'}</p>
            </div>
            {isSelf && !editing && (
              <button 
                onClick={() => setEditing(true)}
                className="text-[10px] uppercase font-bold border border-[#141414] px-3 py-1 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors shrink-0"
              >
                Editar Perfil
              </button>
            )}
            {!isSelf && currentUser && (
              <div className="shrink-0">
                {connectionStatus === 'none' ? (
                  <button 
                    onClick={handleAddConnection}
                    className="flex items-center gap-2 px-3 py-1.5 border border-[#141414] font-mono text-[10px] uppercase font-bold hover:bg-[#141414] hover:text-[#E4E3E0] transition-all"
                  >
                    <UserPlus className="w-4 h-4" /> Adicionar Nó
                  </button>
                ) : (
                  <div className="px-3 py-1.5 bg-[#DCDAD7] border border-[#141414]/20 font-mono text-[10px] uppercase opacity-60">
                    {connectionStatus === 'pending' ? (isRequester ? 'Aguarda Aceitação' : 'Pedido Pendente') : connectionStatus}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-mono text-[9px] uppercase opacity-40">Nome Completo</label>
                    <input 
                      type="text"
                      value={editedProfile.name || ''}
                      onChange={e => setEditedProfile({...editedProfile, name: e.target.value})}
                      className="w-full bg-white border border-[#141414] p-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[9px] uppercase opacity-40">Username (Nó)</label>
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-xs opacity-40">@</span>
                      <input 
                        type="text"
                        value={editedProfile.username || ''}
                        onChange={e => setEditedProfile({...editedProfile, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})}
                        disabled={(() => {
                          if (!profile.lastUsernameChange) return false;
                          const lastChange = new Date(profile.lastUsernameChange);
                          const nextChangeAllowed = new Date(lastChange);
                          nextChangeAllowed.setMonth(nextChangeAllowed.getMonth() + 1);
                          return new Date() < nextChangeAllowed;
                        })()}
                        className={`w-full bg-white border border-[#141414] p-2 pl-6 text-xs focus:outline-none ${(() => {
                          if (!profile.lastUsernameChange) return '';
                          const lastChange = new Date(profile.lastUsernameChange);
                          const nextChangeAllowed = new Date(lastChange);
                          nextChangeAllowed.setMonth(nextChangeAllowed.getMonth() + 1);
                          return new Date() < nextChangeAllowed ? 'opacity-50 cursor-not-allowed' : '';
                        })()}`}
                        placeholder="username"
                      />
                    </div>
                    {(() => {
                      if (!profile.lastUsernameChange) return null;
                      const lastChange = new Date(profile.lastUsernameChange);
                      const nextChangeAllowed = new Date(lastChange);
                      nextChangeAllowed.setMonth(nextChangeAllowed.getMonth() + 1);
                      if (new Date() < nextChangeAllowed) {
                        return <p className="text-[8px] uppercase text-red-500 font-bold mt-1">Username bloqueado até {nextChangeAllowed.toLocaleDateString()}</p>;
                      }
                      return null;
                    })()}
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-[#141414]/5 p-3 border border-[#141414]/10">
                  <input 
                    type="checkbox"
                    id="isAlumni"
                    checked={editedProfile.isAlumni || false}
                    onChange={e => setEditedProfile({...editedProfile, isAlumni: e.target.checked})}
                    className="w-4 h-4 accent-[#141414]"
                  />
                  <label htmlFor="isAlumni" className="font-mono text-[10px] uppercase font-bold cursor-pointer">
                    Estatuto Alumni <span className="opacity-40 italic ml-1 font-normal">(Já não frequento a UA)</span>
                  </label>
                </div>

                <div className="space-y-3 p-4 bg-white/40 border border-[#141414]/10">
                  <h5 className="font-mono text-[9px] uppercase font-bold">Percurso Académico</h5>
                  
                  {/* Licenciaturas */}
                  <div className="space-y-3">
                    <label className="block font-mono text-[8px] uppercase opacity-60">Licenciaturas</label>
                    {(editedProfile.licenciaturas || []).map((lic: any, idx: number) => (
                      <div key={idx} className="space-y-2 pb-3 border-b border-[#141414]/10">
                        <div className="flex gap-2 items-start">
                          <select 
                            value={LICENCIATURAS.includes(lic.name) ? lic.name : (lic.name ? 'Outro' : '')}
                            onChange={e => {
                              const val = e.target.value;
                              const newLic = [...editedProfile.licenciaturas];
                              newLic[idx] = { 
                                ...newLic[idx], 
                                name: val === 'Outro' ? '' : val,
                                institution: val === 'Outro' ? '' : 'Universidade de Aveiro'
                              };
                              setEditedProfile({...editedProfile, licenciaturas: newLic});
                            }}
                            className="flex-1 bg-white border border-[#141414] p-2 text-[11px] focus:outline-none min-w-0"
                          >
                            <option value="">Curso...</option>
                            {LICENCIATURAS.map(c => <option key={c} value={c}>{c}</option>)}
                            <option value="Outro">Outro...</option>
                          </select>
                          <button 
                            onClick={() => {
                              const newLic = editedProfile.licenciaturas.filter((_: any, i: number) => i !== idx);
                              setEditedProfile({...editedProfile, licenciaturas: newLic});
                            }}
                            className="p-2 border border-[#141414] hover:bg-black hover:text-white transition-colors shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {(!LICENCIATURAS.includes(lic.name) || lic.name === '') && (
                          <div className="space-y-2">
                            <input 
                              type="text" 
                              placeholder="Nome da Licenciatura"
                              value={lic.name}
                              onChange={e => {
                                const newLic = [...editedProfile.licenciaturas];
                                newLic[idx].name = e.target.value;
                                setEditedProfile({...editedProfile, licenciaturas: newLic});
                              }}
                              className="w-full bg-white border border-[#141414] p-2 text-[11px] focus:outline-none"
                            />
                            <input 
                              type="text" 
                              placeholder="Universidade / Instituição"
                              value={lic.institution}
                              onChange={e => {
                                const newLic = [...editedProfile.licenciaturas];
                                newLic[idx].institution = e.target.value;
                                setEditedProfile({...editedProfile, licenciaturas: newLic});
                              }}
                              className="w-full bg-white border border-[#141414] p-2 text-[11px] focus:outline-none italic"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                    <button 
                      onClick={() => setEditedProfile({...editedProfile, licenciaturas: [...(editedProfile.licenciaturas || []), { name: '', institution: 'Universidade de Aveiro' }]})}
                      className="w-full py-2 border border-dashed border-[#141414]/30 text-[9px] uppercase font-bold hover:bg-white transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3 h-3" /> Adicionar Licenciatura
                    </button>
                  </div>

                  {/* Mestrados */}
                  <div className="space-y-3 mt-4">
                    <label className="block font-mono text-[8px] uppercase opacity-60">Mestrados (Opcional)</label>
                    {(editedProfile.mestrados || []).map((mst: any, idx: number) => (
                      <div key={idx} className="space-y-2 pb-3 border-b border-[#141414]/10">
                        <div className="flex gap-2 items-start">
                          <select 
                            value={MESTRADOS.includes(mst.name) ? mst.name : (mst.name ? 'Outro' : '')}
                            onChange={e => {
                              const val = e.target.value;
                              const newMst = [...editedProfile.mestrados];
                              newMst[idx] = { 
                                ...newMst[idx], 
                                name: val === 'Outro' ? '' : val,
                                institution: val === 'Outro' ? '' : 'Universidade de Aveiro'
                              };
                              setEditedProfile({...editedProfile, mestrados: newMst});
                            }}
                            className="flex-1 bg-white border border-[#141414] p-2 text-[11px] focus:outline-none min-w-0"
                          >
                            <option value="">Curso...</option>
                            {MESTRADOS.map(c => <option key={c} value={c}>{c}</option>)}
                            <option value="Outro">Outro...</option>
                          </select>
                          <button 
                            onClick={() => {
                              const newMst = editedProfile.mestrados.filter((_: any, i: number) => i !== idx);
                              setEditedProfile({...editedProfile, mestrados: newMst});
                            }}
                            className="p-2 border border-[#141414] hover:bg-black hover:text-white transition-colors shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {(!MESTRADOS.includes(mst.name) || mst.name === '') && (
                          <div className="space-y-2">
                            <input 
                              type="text" 
                              placeholder="Nome do Mestrado"
                              value={mst.name}
                              onChange={e => {
                                const newMst = [...editedProfile.mestrados];
                                newMst[idx].name = e.target.value;
                                setEditedProfile({...editedProfile, mestrados: newMst});
                              }}
                              className="w-full bg-white border border-[#141414] p-2 text-[11px] focus:outline-none"
                            />
                            <input 
                              type="text" 
                              placeholder="Universidade / Instituição"
                              value={mst.institution}
                              onChange={e => {
                                const newMst = [...editedProfile.mestrados];
                                newMst[idx].institution = e.target.value;
                                setEditedProfile({...editedProfile, mestrados: newMst});
                              }}
                              className="w-full bg-white border border-[#141414] p-2 text-[11px] focus:outline-none italic"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                    <button 
                      onClick={() => setEditedProfile({...editedProfile, mestrados: [...(editedProfile.mestrados || []), { name: '', institution: 'Universidade de Aveiro' }]})}
                      className="w-full py-2 border border-dashed border-[#141414]/30 text-[9px] uppercase font-bold hover:bg-white transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3 h-3" /> Adicionar Mestrado
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="mt-4 space-y-3">
                  {profile.licenciaturas?.map((l: any, i: number) => (
                    <div key={i} className="text-xs">
                      <span className="font-mono text-[8px] uppercase opacity-40 block tracking-tight">Licenciatura</span>
                      <span className="font-bold uppercase inline-block">{l.name}</span>
                      <span className="opacity-60 italic block text-[10px]">@ {l.institution}</span>
                    </div>
                  ))}
                  {profile.mestrados?.map((m: any, i: number) => (
                    <div key={i} className="text-xs">
                      <span className="font-mono text-[8px] uppercase opacity-40 block tracking-tight">Mestrado</span>
                      <span className="font-bold uppercase inline-block">{m.name}</span>
                      <span className="opacity-60 italic block text-[10px]">@ {m.institution}</span>
                    </div>
                  ))}
                  {(!profile.licenciaturas?.length && !profile.mestrados?.length) && (
                    <p className="text-sm font-serif italic mt-1 opacity-60">
                      {profile.course}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-[#141414]/5 font-mono text-[9px] opacity-40">
                  <span>/ {getDepartamentoDoCurso(profile.licenciaturas?.[0]?.name || profile.course)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <h4 className="font-mono text-[10px] uppercase opacity-40">Manifesto / Bio</h4>
          {editing ? (
            <textarea 
              value={editedProfile.bio || ''}
              onChange={e => setEditedProfile({...editedProfile, bio: e.target.value})}
              className="w-full bg-white border border-[#141414] p-3 text-xs focus:outline-none"
              rows={4}
              placeholder="O que te move na UA?"
            />
          ) : (
            <p className="text-xs leading-relaxed italic border-l-2 border-[#141414] pl-4 py-2 bg-[#141414]/5">
              "{profile.bio || 'Sem biografia disponível.'}"
            </p>
          )}
        </div>

        {/* Interests Categories */}
        <div className="space-y-4">
          <h4 className="font-mono text-[10px] uppercase opacity-40 flex items-center gap-2">
            <Award className="w-3 h-3" /> Interesses & Competências
          </h4>
          
          {editing ? (
            <div className="space-y-4">
              {Object.entries(INTERESSES_CATEGORIAS).map(([cat, items]) => (
                <div key={cat} className="space-y-2">
                  <button 
                    onClick={() => setActiveSkillsCat(activeSkillsCat === cat ? null : cat)}
                    className="w-full text-left px-3 py-2 border border-[#141414] text-[10px] uppercase font-bold flex justify-between items-center"
                  >
                    {cat}
                    <ChevronDown className={`w-3 h-3 transition-transform ${activeSkillsCat === cat ? 'rotate-180' : ''}`} />
                  </button>
                  {activeSkillsCat === cat && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-white/30 border border-t-0 border-[#141414]">
                      {items.map(item => (
                        <button
                          key={item}
                          onClick={() => toggleItem('skills', item)}
                          className={`px-2 py-1 text-[9px] uppercase font-bold transition-all ${
                            (editedProfile.skills || []).includes(item)
                              ? 'bg-[#141414] text-[#E4E3E0]'
                              : 'border border-[#141414]/20 hover:border-[#141414]'
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(profile.skills || []).length > 0 ? (
                profile.skills.map((s: string) => (
                  <span key={s} className="px-2 py-1 bg-[#141414] text-[#E4E3E0] text-[9px] uppercase font-bold tracking-wider">
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-[10px] opacity-30 italic uppercase">Sem interesses listados</span>
              )}
            </div>
          )}
        </div>

        {/* Affiliations */}
        <div className="space-y-4">
          <h4 className="font-mono text-[10px] uppercase opacity-40 flex items-center gap-2">
            <Building2 className="w-3 h-3" /> Conexões Institucionais / Núcleos
          </h4>
          
          {editing ? (
            <div className="space-y-4">
              {Object.entries(AFILIACOES_CATEGORIAS).map(([cat, items]) => (
                <div key={cat} className="space-y-2">
                  <button 
                    onClick={() => setActiveAffiliationsCat(activeAffiliationsCat === cat ? null : cat)}
                    className="w-full text-left px-3 py-2 border border-[#141414] text-[10px] uppercase font-bold flex justify-between items-center"
                  >
                    {cat}
                    <ChevronDown className={`w-3 h-3 transition-transform ${activeAffiliationsCat === cat ? 'rotate-180' : ''}`} />
                  </button>
                  {activeAffiliationsCat === cat && (
                    <div className="grid grid-cols-2 gap-1.5 p-2 bg-white/30 border border-t-0 border-[#141414] max-h-40 overflow-y-auto">
                      {items.map(af => (
                        <button
                          key={af}
                          onClick={() => toggleItem('affiliations', af)}
                          className={`px-2 py-1.5 text-[9px] uppercase font-bold text-left transition-all ${
                            (editedProfile.affiliations || []).includes(af)
                              ? 'bg-[#141414] text-[#E4E3E0]'
                              : 'hover:bg-[#141414]/10 border border-transparent'
                          }`}
                        >
                          {af}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(AFILIACOES_CATEGORIAS).map(([cat, items]) => {
                const userInCat = (profile.affiliations || []).filter((a: string) => items.includes(a));
                if (userInCat.length === 0) return null;
                return (
                  <div key={cat} className="space-y-2">
                    <span className="font-mono text-[8px] uppercase opacity-40">{cat}</span>
                    <div className="flex flex-wrap gap-2">
                      {userInCat.map((a: string) => (
                        <span key={a} className="px-2 py-1 border border-[#141414] text-[9px] uppercase font-bold">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
              {(profile.affiliations || []).length === 0 && (
                <span className="text-[10px] opacity-30 italic uppercase">Sem afiliações listadas</span>
              )}
            </div>
          )}
        </div>

        {/* Contacts Section */}
        <div className="space-y-4">
          <h4 className="font-mono text-[10px] uppercase opacity-40">Presença Digital / Contactos</h4>
          
          {editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white/40 p-4 border border-[#141414]/10">
              <div className="space-y-1">
                <label className="font-mono text-[8px] uppercase opacity-60 flex items-center gap-1"><Instagram className="w-2.4 h-2.4" /> Instagram</label>
                <input 
                  type="text"
                  placeholder="@username"
                  value={editedProfile.contacts?.instagram || ''}
                  onChange={e => setEditedProfile({...editedProfile, contacts: {...(editedProfile.contacts || {}), instagram: e.target.value}})}
                  className="w-full bg-white border border-[#141414] p-2 text-[10px] focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[8px] uppercase opacity-60 flex items-center gap-1"><Github className="w-2.4 h-2.4" /> GitHub</label>
                <input 
                  type="text"
                  placeholder="github.com/..."
                  value={editedProfile.contacts?.github || ''}
                  onChange={e => setEditedProfile({...editedProfile, contacts: {...(editedProfile.contacts || {}), github: e.target.value}})}
                  className="w-full bg-white border border-[#141414] p-2 text-[10px] focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[8px] uppercase opacity-60 flex items-center gap-1"><Linkedin className="w-2.4 h-2.4" /> LinkedIn</label>
                <input 
                  type="text"
                  placeholder="linkedin.com/in/..."
                  value={editedProfile.contacts?.linkedin || ''}
                  onChange={e => setEditedProfile({...editedProfile, contacts: {...(editedProfile.contacts || {}), linkedin: e.target.value}})}
                  className="w-full bg-white border border-[#141414] p-2 text-[10px] focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[8px] uppercase opacity-60 flex items-center gap-1"><Mail className="w-2.4 h-2.4" /> Email</label>
                <input 
                  type="email"
                  placeholder="email@exemplo.com"
                  value={editedProfile.contacts?.email || ''}
                  onChange={e => setEditedProfile({...editedProfile, contacts: {...(editedProfile.contacts || {}), email: e.target.value}})}
                  className="w-full bg-white border border-[#141414] p-2 text-[10px] focus:outline-none"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="font-mono text-[8px] uppercase opacity-60 flex items-center gap-1"><Globe className="w-2.4 h-2.4" /> Outros</label>
                <input 
                  type="text"
                  placeholder="Website, Behance, etc."
                  value={editedProfile.contacts?.others || ''}
                  onChange={e => setEditedProfile({...editedProfile, contacts: {...(editedProfile.contacts || {}), others: e.target.value}})}
                  className="w-full bg-white border border-[#141414] p-2 text-[10px] focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {profile.contacts?.email && (
                <a href={`mailto:${profile.contacts.email}`} className="flex items-center gap-2 group">
                  <div className="w-8 h-8 rounded-full border border-[#141414] flex items-center justify-center group-hover:bg-[#141414] group-hover:text-[#E4E3E0] transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-tight opacity-0 group-hover:opacity-100 transition-opacity">Email</span>
                </a>
              )}
              {profile.contacts?.instagram && (
                <a href={`https://instagram.com/${profile.contacts.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group">
                  <div className="w-8 h-8 rounded-full border border-[#141414] flex items-center justify-center group-hover:bg-[#141414] group-hover:text-[#E4E3E0] transition-colors">
                    <Instagram className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-tight opacity-0 group-hover:opacity-100 transition-opacity">Instagram</span>
                </a>
              )}
              {profile.contacts?.github && (
                <a href={profile.contacts.github.startsWith('http') ? profile.contacts.github : `https://${profile.contacts.github}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group">
                  <div className="w-8 h-8 rounded-full border border-[#141414] flex items-center justify-center group-hover:bg-[#141414] group-hover:text-[#E4E3E0] transition-colors">
                    <Github className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-tight opacity-0 group-hover:opacity-100 transition-opacity">GitHub</span>
                </a>
              )}
              {profile.contacts?.linkedin && (
                <a href={profile.contacts.linkedin.startsWith('http') ? profile.contacts.linkedin : `https://${profile.contacts.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group">
                  <div className="w-8 h-8 rounded-full border border-[#141414] flex items-center justify-center group-hover:bg-[#141414] group-hover:text-[#E4E3E0] transition-colors">
                    <Linkedin className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-tight opacity-0 group-hover:opacity-100 transition-opacity">LinkedIn</span>
                </a>
              )}
              {profile.contacts?.others && (
                <a href={profile.contacts.others.startsWith('http') ? profile.contacts.others : `https://${profile.contacts.others}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group">
                  <div className="w-8 h-8 rounded-full border border-[#141414] flex items-center justify-center group-hover:bg-[#141414] group-hover:text-[#E4E3E0] transition-colors">
                    <Globe className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-tight opacity-0 group-hover:opacity-100 transition-opacity">Outros</span>
                </a>
              )}
              {(!profile.contacts || Object.values(profile.contacts).every(v => !v)) && (
                <span className="text-[10px] opacity-30 italic uppercase">Sem contactos partilhados</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-6 border-t border-[#141414] bg-[#DCDAD7] shrink-0">
        {editing ? (
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => {
                setEditing(false);
                setEditedProfile({...profile});
              }}
              className="border border-[#141414] py-3 uppercase font-bold text-[10px] tracking-widest hover:bg-white transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              className="bg-[#141414] text-[#E4E3E0] py-3 uppercase font-bold text-[10px] tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all font-mono"
            >
              <Save className="w-4 h-4" /> Guardar
            </button>
          </div>
        ) : (
          <div className="text-center font-mono text-[9px] opacity-40">
            {isSelf ? "Este é o teu perfil tal como aparece na rede." : "Explora as competências deste nó para possíveis colaborações."}
          </div>
        )}
      </div>
    </div>
  );
}

function Building2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}
