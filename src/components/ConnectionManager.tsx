import { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot, getDoc, or, and } from 'firebase/firestore';
import { UserPlus, Check, X, Search, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConnectionManagerProps {
  currentUser: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function ConnectionManager({ currentUser, isOpen, onClose }: ConnectionManagerProps) {
  const [usernameInput, setUsernameInput] = useState('');
  const [searchError, setSearchError] = useState('');
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    // Listen for pending requests where I am part of but NOT the requester
    const q = query(
      collection(db, 'connections'),
      and(
        where('status', '==', 'pending'),
        or(where('userA', '==', currentUser.uid), where('userB', '==', currentUser.uid))
      )
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      const incoming = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(conn => (conn.userA === currentUser.uid || conn.userB === currentUser.uid) && conn.requesterId !== currentUser.uid);
      
      // Fetch user data for each requester
      const withUserInfo = await Promise.all(incoming.map(async (req) => {
        const userDoc = await getDoc(doc(db, 'users', req.requesterId));
        if (userDoc.exists()) {
          return { ...req, requesterInfo: userDoc.data() };
        }
        return req;
      }));
      
      setPendingRequests(withUserInfo);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleSendRequest = async () => {
    if (!usernameInput) return;
    setIsSearching(true);
    setSearchError('');

    try {
      // 1. Find user by username
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', usernameInput.toLowerCase().trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setSearchError('Usuário não encontrado.');
        setIsSearching(false);
        return;
      }

      const targetUser = querySnapshot.docs[0].data();
      const targetUid = querySnapshot.docs[0].id;

      if (targetUid === currentUser.uid) {
        setSearchError('Não podes ligar-te a ti mesmo.');
        setIsSearching(false);
        return;
      }

      // 2. Check if connection already exists
      const connRef = collection(db, 'connections');
      // We check for connections involving the current user
      const qExisting = query(
        connRef, 
        or(where('userA', '==', currentUser.uid), where('userB', '==', currentUser.uid))
      );
      const existingSnap = await getDocs(qExisting);
      const exists = existingSnap.docs.some(doc => {
        const d = doc.data();
        return (d.userA === currentUser.uid && d.userB === targetUid) || 
               (d.userA === targetUid && d.userB === currentUser.uid);
      });

      if (exists) {
        setSearchError('Já existe uma ligação ou pedido pendente.');
        setIsSearching(false);
        return;
      }

      // 3. Create request
      await addDoc(connRef, {
        userA: currentUser.uid,
        userB: targetUid,
        requesterId: currentUser.uid,
        status: 'pending',
        type: 'friend',
        createdAt: new Date().toISOString()
      });

      setUsernameInput('');
      setIsSearching(false);
      alert('Pedido enviado com sucesso!');
    } catch (e) {
      console.error(e);
      setSearchError('Erro ao enviar pedido.');
      setIsSearching(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const docRef = doc(db, 'connections', requestId);
      await updateDoc(docRef, {
        status: 'accepted',
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error(e);
      handleFirestoreError(e, OperationType.UPDATE, `connections/${requestId}`);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      const docRef = doc(db, 'connections', requestId);
      await updateDoc(docRef, {
        status: 'declined',
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-[#E4E3E0] border border-[#141414] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="p-4 border-b border-[#141414] flex justify-between items-center bg-[#DCDAD7]">
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Bell className="w-4 h-4" /> Gestão de Ligações
              </h3>
              <button onClick={onClose} className="hover:rotate-90 transition-transform">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Send Request Section */}
              <div className="space-y-4">
                <h4 className="font-mono text-[10px] uppercase opacity-60">Novo Pedido</h4>
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                    <input 
                      type="text" 
                      placeholder="USERNAME DO NÓ..." 
                      value={usernameInput}
                      onChange={e => setUsernameInput(e.target.value)}
                      className="w-full bg-white border border-[#141414] p-3 pl-10 text-xs font-mono focus:outline-none"
                    />
                  </div>
                  {searchError && <p className="text-[10px] text-red-500 font-bold uppercase">{searchError}</p>}
                  <button 
                    onClick={handleSendRequest}
                    disabled={isSearching || !usernameInput}
                    className="w-full bg-[#141414] text-[#E4E3E0] py-3 text-[10px] uppercase font-bold tracking-widest flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all font-mono"
                  >
                    <UserPlus className="w-4 h-4" /> {isSearching ? 'A PESQUISAR...' : 'ENVIAR CONVITE'}
                  </button>
                </div>
              </div>

              {/* Pending Requests Section */}
              <div className="space-y-4">
                <h4 className="font-mono text-[10px] uppercase opacity-60 flex justify-between items-center">
                  Pedidos Recebidos 
                  <span className="bg-[#141414] text-white px-1.5 py-0.5 rounded-full text-[8px]">{pendingRequests.length}</span>
                </h4>
                
                <div className="space-y-2">
                  {pendingRequests.length > 0 ? (
                    pendingRequests.map(req => (
                      <div key={req.id} className="bg-white/50 border border-[#141414]/10 p-3 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold">
                            {req.requesterInfo?.name || `Nó: ${req.requesterId.substring(0, 8)}...`}
                          </span>
                          <span className="text-[9px] opacity-40 font-mono">
                            @{req.requesterInfo?.username || 'desconhecido'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleAcceptRequest(req.id)}
                            className="p-2 bg-green-500 text-white border border-[#141414]/20 hover:scale-110 transition-transform"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeclineRequest(req.id)}
                            className="p-2 bg-red-500 text-white border border-[#141414]/20 hover:scale-110 transition-transform"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 border border-dashed border-[#141414]/20">
                      <p className="font-serif italic text-xs opacity-40 tracking-tight">Sem pedidos pendentes</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#DCDAD7] border-t border-[#141414] text-center">
              <p className="font-mono text-[8px] opacity-40 uppercase tracking-tighter">Grafo de Talento UA / Sistema de Ligações</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
