import { useEffect, useState } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { collection, onSnapshot, doc, getDoc, setDoc, getDocFromServer, serverTimestamp } from 'firebase/firestore';
import { Search, Users, Briefcase, Building2, LogIn, LogOut, User as UserIcon, Plus, ChevronDown, ChevronRight, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import NetworkGraph from './components/NetworkGraph';
import ProfileCard from './components/ProfileCard';
import ProjectMural from './components/ProjectMural';
import NucleusProfile from './components/NucleusProfile';
import ConnectionManager from './components/ConnectionManager';

import { ECOSYSTEMS } from './constants';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'graph' | 'mural' | 'nuclei'>('graph');
  const [expandedEcosystem, setExpandedEcosystem] = useState<string | null>('course_groups');
  const [users, setUsers] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [selectedNucleus, setSelectedNucleus] = useState<any>(null);
  const [isConnectionManagerOpen, setIsConnectionManagerOpen] = useState(false);
  const [hasPendingRequests, setHasPendingRequests] = useState(false);

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Ensure user exists in Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          const newUserProfile = {
            uid: user.uid,
            name: user.displayName || 'Estudante UA',
            username: user.email?.split('@')[0].replace(/[^a-z0-9_]/g, '') || 'no_' + user.uid.substring(0, 5),
            email: user.email,
            avatarUrl: user.photoURL,
            createdAt: serverTimestamp(),
            course: 'Universidade de Aveiro',
            bio: 'Novo membro do grafo de talento da UA.',
            skills: [],
            affiliations: [],
            isAlumni: false
          };
          await setDoc(userDocRef, newUserProfile);
          setCurrentUser({ ...user, ...newUserProfile });
        } else {
          setCurrentUser({ ...user, ...userDoc.data() });
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // We only show graph/data when logged in OR we can show Public data?
    // For now let's show anyway but keep it focused on DB
    const qUsers = collection(db, 'users');
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const dbUsers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(dbUsers);
    }, (err) => {
      console.error("Error fetching users:", err);
    });

    const qConnections = collection(db, 'connections');
    const unsubConns = onSnapshot(qConnections, (snap) => {
      const dbConns = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      // Filter for graph: Accepted connections
      const acceptedConns = dbConns.filter(c => c.status === 'accepted');
      setConnections(acceptedConns);

      // Check for pending requests for the current user (where I am recipient)
      if (currentUser) {
        const pending = dbConns.some(c => 
          c.status === 'pending' && 
          (c.userA === currentUser.uid || c.userB === currentUser.uid) && 
          c.requesterId !== currentUser.uid
        );
        setHasPendingRequests(pending);
      }
    }, (err) => {
      console.error("Error fetching connections:", err);
    });

    return () => {
      unsubUsers();
      unsubConns();
    };
  }, [currentUser]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-[#E4E3E0] font-mono text-sm uppercase tracking-widest">
      <motion.div
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Iniciando Grafo de Talento...
      </motion.div>
    </div>
  );

  if (!currentUser) return (
    <div className="h-screen w-full bg-[#E4E3E0] text-[#141414] font-sans flex flex-col overflow-hidden">
      {/* Top Navbar even for public - but limited */}
      <nav className="h-16 border-b border-[#141414] flex items-center justify-between px-4 md:px-6 bg-[#E4E3E0] z-50 shrink-0">
        <h1 className="font-mono text-sm font-bold uppercase tracking-tighter flex items-center gap-2 shrink-0">
          <Users className="w-4 h-4" />
          <span>explora.ua</span>
          <span className="font-normal opacity-40 text-[10px] hidden xs:inline">/ beta</span>
        </h1>
        <button 
          id="btn-login-nav"
          onClick={handleLogin}
          className="px-4 py-1.5 bg-[#141414] text-[#E4E3E0] text-[10px] uppercase font-bold tracking-wider flex items-center gap-2 hover:opacity-90 transition-all"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Entrar UA</span>
        </button>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl space-y-8"
        >
          <div className="space-y-4">
            <h2 className="text-6xl md:text-8xl font-bold tracking-tighter uppercase leading-[0.85]">
              Mapeia o <span className="italic font-serif font-light lowercase">teu</span> lugar.
            </h2>
            <p className="font-serif italic text-xl opacity-60 max-w-md mx-auto">
              O grafo de talento, núcleos e projetos da Universidade de Aveiro.
            </p>
          </div>

          <div className="h-[1px] w-12 bg-[#141414] mx-auto opacity-20" />

          <div className="space-y-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-40">Acesso Restrito à Comunidade UA</p>
            <button 
              onClick={handleLogin}
              className="group relative inline-flex items-center gap-4 bg-[#141414] text-[#E4E3E0] px-8 py-4 text-xs uppercase font-bold tracking-widest hover:pr-12 transition-all"
            >
              Começar Exploração
              <ChevronRight className="w-4 h-4 absolute right-4 opacity-0 group-hover:opacity-100 transition-all" />
            </button>
          </div>
        </motion.div>
      </div>

      <footer className="h-16 border-t border-[#141414] flex items-center justify-center px-4 bg-[#E4E3E0] shrink-0">
        <p className="font-mono text-[9px] uppercase opacity-30 tracking-widest">© 2026 AAUAv • Grafo de Talento</p>
      </footer>
    </div>
  );

  return (
    <div className="h-screen w-full bg-[#E4E3E0] text-[#141414] font-sans flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <nav className="h-16 border-b border-[#141414] flex items-center justify-between px-4 md:px-6 bg-[#E4E3E0] z-50 shrink-0">
        <div className="flex items-center gap-4 md:gap-8 overflow-hidden">
          <h1 className="font-mono text-sm font-bold uppercase tracking-tighter flex items-center gap-2 shrink-0">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">explora.ua</span>
            <span className="sm:hidden">explora</span>
            <span className="font-normal opacity-40 text-[10px] hidden xs:inline">/ beta</span>
          </h1>
          
          <div className="hidden md:flex items-center gap-6 text-[11px] uppercase font-bold tracking-wider opacity-60">
            <button 
              id="nav-tab-graph"
              onClick={() => setActiveTab('graph')}
              className={`hover:opacity-100 transition-opacity ${activeTab === 'graph' ? 'opacity-100 underline decoration-2 underline-offset-4' : ''}`}
            >
              Grafo
            </button>
            <button 
              id="nav-tab-mural"
              onClick={() => setActiveTab('mural')}
              className={`hover:opacity-100 transition-opacity ${activeTab === 'mural' ? 'opacity-100 underline decoration-2 underline-offset-4' : ''}`}
            >
              Mural
            </button>
            <button 
              id="nav-tab-nuclei"
              onClick={() => setActiveTab('nuclei')}
              className={`hover:opacity-100 transition-opacity ${activeTab === 'nuclei' ? 'opacity-100 underline decoration-2 underline-offset-4' : ''}`}
            >
              Ecossistemas
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-40" />
            <input 
              type="text" 
              placeholder="PESQUISAR TALENTOS..." 
              className="bg-transparent border border-[#141414]/20 rounded-none py-1.5 pl-9 pr-4 text-[10px] uppercase font-mono focus:outline-none focus:border-[#141414] w-48 xl:w-64"
            />
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <button 
              id="btn-my-profile"
              onClick={() => {
                setSelectedProfile(currentUser.uid);
                setSelectedNucleus(null);
              }}
              className="flex flex-col items-end"
            >
              <span className="font-mono text-[10px] font-bold uppercase leading-none">{currentUser.name?.split(' ')[0]}</span>
              <span className="font-mono text-[8px] opacity-40 uppercase">@{currentUser.username || 'nó'}</span>
            </button>
            <button 
              id="btn-logout"
              onClick={handleLogout}
              className="opacity-40 hover:opacity-100 transition-opacity ml-2"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden relative pb-16 md:pb-0">
        {/* Main Workspace */}
        <div className="flex-1 relative bg-[#DCDAD7] border-r border-[#141414]/10">
          <AnimatePresence mode="wait">
            {activeTab === 'graph' && (
              <motion.div 
                key="graph"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full"
              >
                <NetworkGraph 
                  users={users} 
                  connections={connections} 
                  onNodeClick={(id) => setSelectedProfile(id)} 
                />
              </motion.div>
            )}

            {activeTab === 'mural' && (
              <motion.div 
                key="mural"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full h-full px-4 py-8 md:p-8 overflow-y-auto"
              >
                <ProjectMural />
              </motion.div>
            )}

            {activeTab === 'nuclei' && (
              <motion.div 
                key="nuclei"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full h-full px-4 py-8 md:p-8 overflow-y-auto"
              >
                <div className="max-w-4xl mx-auto space-y-4">
                  <div className="mb-12">
                    <h2 className="text-6xl font-bold tracking-tighter uppercase">Ecossistema</h2>
                    <p className="font-serif italic opacity-60 text-lg mt-2 font-light">Explora a rede de associações, núcleos e organizações da Universidade de Aveiro.</p>
                  </div>

                  {/* Section: Course Nuclei */}
                  <div className="border border-[#141414]">
                    <button 
                      onClick={() => setExpandedEcosystem(expandedEcosystem === 'course_groups' ? null : 'course_groups')}
                      className={`w-full p-6 flex justify-between items-center bg-[#DCDAD7] text-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-all group ${expandedEcosystem === 'course_groups' ? 'border-b border-[#141414]/10' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <Hash className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                        <h3 className="text-xl font-bold uppercase tracking-tight">Núcleos de Curso</h3>
                      </div>
                      {expandedEcosystem === 'course_groups' ? <ChevronDown /> : <ChevronRight />}
                    </button>
                    <AnimatePresence>
                      {expandedEcosystem === 'course_groups' && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-[#E4E3E0]"
                        >
                          <div className="p-6">
                            <h4 className="font-mono text-[10px] uppercase opacity-40 mb-4 border-b border-[#141414]/10 pb-2">Núcleos de Curso</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {ECOSYSTEMS.course_groups.map(item => (
                                <NucleusCard 
                                  key={item.id} 
                                  name={item.name} 
                                  description={item.description} 
                                  onClick={() => {
                                    setSelectedNucleus({ ...item, category: 'Núcleos de Curso' });
                                    setSelectedProfile(null);
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Section: AAUAv Nuclei */}
                  <div className="border border-[#141414]">
                    <button 
                      onClick={() => setExpandedEcosystem(expandedEcosystem === 'aauav_groups' ? null : 'aauav_groups')}
                      className={`w-full p-6 flex justify-between items-center bg-[#DCDAD7] text-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-all group ${expandedEcosystem === 'aauav_groups' ? 'border-b border-[#141414]/10' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <Hash className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                        <h3 className="text-xl font-bold uppercase tracking-tight">Núcleos da AAUAv</h3>
                      </div>
                      {expandedEcosystem === 'aauav_groups' ? <ChevronDown /> : <ChevronRight />}
                    </button>
                    <AnimatePresence>
                      {expandedEcosystem === 'aauav_groups' && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-[#E4E3E0]"
                        >
                          <div className="p-6">
                            <h4 className="font-mono text-[10px] uppercase opacity-40 mb-4 border-b border-[#141414]/10 pb-2">Núcleos da AAUAv</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {ECOSYSTEMS.aauav_groups.map(item => (
                                <NucleusCard 
                                  key={item.id} 
                                  name={item.name} 
                                  description={item.description} 
                                  onClick={() => {
                                    setSelectedNucleus({ ...item, category: 'Núcleos da AAUAv' });
                                    setSelectedProfile(null);
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Section: Other Associations */}
                  <div className="border border-[#141414]">
                    <button 
                      onClick={() => setExpandedEcosystem(expandedEcosystem === 'other_assoc' ? null : 'other_assoc')}
                      className={`w-full p-6 flex justify-between items-center bg-[#DCDAD7] text-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-all group ${expandedEcosystem === 'other_assoc' ? 'border-b border-[#141414]/10' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <Hash className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                        <h3 className="text-xl font-bold uppercase tracking-tight">Outras Associações</h3>
                      </div>
                      {expandedEcosystem === 'other_assoc' ? <ChevronDown /> : <ChevronRight />}
                    </button>
                    <AnimatePresence>
                      {expandedEcosystem === 'other_assoc' && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-[#E4E3E0]"
                        >
                          <div className="p-6">
                            <h4 className="font-mono text-[10px] uppercase opacity-40 mb-4 border-b border-[#141414]/10 pb-2">Outras Associações</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {ECOSYSTEMS.other_assoc.map(item => (
                                <NucleusCard 
                                  key={item.id} 
                                  name={item.name} 
                                  description={item.description} 
                                  onClick={() => {
                                    setSelectedNucleus({ ...item, category: 'Outras Associações' });
                                    setSelectedProfile(null);
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Info Side Panel */}
        <AnimatePresence>
          {(selectedProfile || selectedNucleus) && (
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full md:w-96 bg-[#E4E3E0] border-l border-[#141414] flex flex-col h-full shadow-2xl z-[120]"
            >
              {selectedProfile ? (
                <ProfileCard 
                  userId={selectedProfile} 
                  onClose={() => setSelectedProfile(null)}
                  isSelf={selectedProfile === currentUser?.uid}
                  currentUser={currentUser}
                  allConnections={connections}
                />
              ) : (
                <NucleusProfile
                  nucleus={selectedNucleus}
                  users={users}
                  onClose={() => setSelectedNucleus(null)}
                  onUserClick={(id) => {
                    setSelectedProfile(id);
                    setSelectedNucleus(null);
                  }}
                />
              )}
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#E4E3E0] border-t border-[#141414] flex items-stretch z-[110]">
          <button 
            onClick={() => setActiveTab('graph')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'graph' ? 'bg-[#141414] text-[#E4E3E0]' : 'opacity-60'}`}
          >
            <Users className="w-4 h-4" />
            <span className="text-[9px] uppercase font-bold tracking-tighter">Grafo</span>
          </button>
          <button 
            onClick={() => setActiveTab('mural')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all border-l border-r border-[#141414]/10 ${activeTab === 'mural' ? 'bg-[#141414] text-[#E4E3E0]' : 'opacity-60'}`}
          >
            <Briefcase className="w-4 h-4" />
            <span className="text-[9px] uppercase font-bold tracking-tighter">Mural</span>
          </button>
          <button 
            onClick={() => setActiveTab('nuclei')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'nuclei' ? 'bg-[#141414] text-[#E4E3E0]' : 'opacity-60'}`}
          >
            <Building2 className="w-4 h-4" />
            <span className="text-[9px] uppercase font-bold tracking-tighter">Redes</span>
          </button>
        </div>

        {/* Floating HUD controls (Desktop only or repositioned) */}
        {currentUser && (
          <div className="absolute bottom-20 md:bottom-8 left-4 md:left-8 flex flex-col gap-2 z-10">
            <button 
              onClick={() => setIsConnectionManagerOpen(true)}
              className="relative w-10 h-10 md:w-12 md:h-12 bg-[#141414] text-[#E4E3E0] flex items-center justify-center rounded-none shadow-xl hover:scale-110 active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5" />
              {hasPendingRequests && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white" />
              )}
            </button>
          </div>
        )}

        <ConnectionManager 
          currentUser={currentUser}
          isOpen={isConnectionManagerOpen}
          onClose={() => setIsConnectionManagerOpen(false)}
        />
      </main>

      {/* Global CSS for Recipe 1 consistency */}
      <style>{`
        .border-bottom { border-bottom: 1px solid #141414; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #141414; }
        @media (max-width: 640px) {
          .text-6xl { font-size: 2.5rem; }
          .text-4xl { font-size: 1.75rem; }
        }
      `}</style>
    </div>
  );
}

function NucleusCard({ name, description, onClick }: { name: string; description: string; key?: string; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="border border-[#141414] p-6 bg-[#E4E3E0] hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-4">
        <Building2 className="w-8 h-8" />
        <span className="font-mono text-[10px] opacity-40 group-hover:opacity-100">EXPLORAR</span>
      </div>
      <h3 className="text-2xl font-bold uppercase tracking-tighter">{name}</h3>
      <p className="text-xs mt-2 opacity-60 group-hover:opacity-100 italic font-serif">{description}</p>
    </div>
  );
}
