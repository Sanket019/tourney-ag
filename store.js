import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "./firebase.js";

function createNewTournamentObj({
  name = "BGMI WOW Championship",
  mode = "4v4",
  format = "playoffs",
  numTeams = 10,
  prizePool = 1000,
  registrationFee = 50,
  inviteCode = "WOW2026"
} = {}) {
  const teamsCount = Number(numTeams) || 10;
  const playersPerTeam = mode === "2v2" ? 2 : (mode === "3v3" ? 3 : 4);
  const requiredPlayers = teamsCount * playersPerTeam;

  return {
    id: "tourney_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
    name: name || "BGMI WOW Championship",
    mode: mode || "4v4",
    format: format || "playoffs",
    numTeams: teamsCount,
    requiredPlayers: requiredPlayers,
    prizePool: Number(prizePool) || 1000,
    registrationFee: Number(registrationFee) || 50,
    inviteCode: inviteCode ? inviteCode.trim() : "WOW2026",
    createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    biddersCategory: null,
    auctionLotCategory: null,
    auctionState: {
      currentLotPlayerId: null,
      currentBid: 0,
      highestCaptains: [],
      isTied: false,
      bidLog: []
    },
    fixtures: { groupA: [], groupB: [] },
    standings: { groupA: {}, groupB: {} }
  };
}

export const store = {
  state: {
    activeTournamentId: null,
    tournaments: {}
  },
  unsubscribes: [],

  init() {
    // Unsubscribe from previous listeners
    this.unsubscribes.forEach(unsub => unsub());
    this.unsubscribes = [];
    
    if (!auth.currentUser) {
       this.state.tournaments = {};
       this.state.activeTournamentId = null;
       window.dispatchEvent(new Event('stateChanged'));
       return;
    }

    // Listen to all tournaments
    const tRef = collection(db, "tournaments");
    this.unsubscribes.push(onSnapshot(tRef, (snap) => {
      snap.docChanges().forEach(change => {
        const data = change.doc.data();
        const id = change.doc.id;
        if (change.type === "added" || change.type === "modified") {
          if (!this.state.tournaments[id]) {
            this.state.tournaments[id] = { ...data, players: [], captains: [], bids: [] };
            this.listenToSubcollections(id);
          } else {
            this.state.tournaments[id] = { ...this.state.tournaments[id], ...data };
          }
          if (!this.state.activeTournamentId) this.state.activeTournamentId = id;
        }
        if (change.type === "removed") {
          delete this.state.tournaments[id];
          if (this.state.activeTournamentId === id) {
            this.state.activeTournamentId = Object.keys(this.state.tournaments)[0] || null;
          }
        }
      });
      window.dispatchEvent(new Event('stateChanged'));
    });
  },

  listenToSubcollections(tourneyId) {
    const pRef = collection(db, "tournaments", tourneyId, "players");
    this.unsubscribes.push(onSnapshot(pRef, (snap) => {
      this.state.tournaments[tourneyId].players = snap.docs.map(d => d.data());
      window.dispatchEvent(new Event('stateChanged'));
    }));

    const cRef = collection(db, "tournaments", tourneyId, "captains");
    this.unsubscribes.push(onSnapshot(cRef, (snap) => {
      this.state.tournaments[tourneyId].captains = snap.docs.map(d => d.data());
      window.dispatchEvent(new Event('stateChanged'));
    }));

    const bRef = collection(db, "tournaments", tourneyId, "bids");
    this.unsubscribes.push(onSnapshot(bRef, (snap) => {
      this.state.tournaments[tourneyId].bids = snap.docs.map(d => d.data());
      
      if (window.currentUserIsAdmin) {
        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
            const bid = change.doc.data();
            // Process the bid
            if (bid.type === 'place') {
              store.placeBidForCaptain(bid.captainId);
            } else if (bid.type === 'match') {
              store.matchBidForCaptain(bid.captainId);
            }
            // Delete the bid document after processing to act as a queue
            deleteDoc(change.doc.ref).catch(e => console.error("Failed to delete bid doc", e));
          }
        });
      }

      window.dispatchEvent(new Event('stateChanged'));
    }));
  },

  getActiveTournament() {
    if (!this.state.tournaments) this.state.tournaments = {};
    if (this.state.activeTournamentId && this.state.tournaments[this.state.activeTournamentId]) {
      return this.state.tournaments[this.state.activeTournamentId];
    }
    const tIds = Object.keys(this.state.tournaments);
    if (tIds.length > 0) {
      this.state.activeTournamentId = tIds[0];
      return this.state.tournaments[tIds[0]];
    }
    return null;
  },

  async createTournament(params) {
    if (!auth.currentUser || !auth.currentUser.uid) return alert('Not logged in');
    const newT = createNewTournamentObj(params);
    await setDoc(doc(db, "tournaments", newT.id), newT);
  },

  setActiveTournament(id) {
    if (this.state.tournaments && this.state.tournaments[id]) {
      this.state.activeTournamentId = id;
      window.dispatchEvent(new Event('stateChanged'));
    }
  },

  async deleteTournament(id) {
    if (!auth.currentUser) return;
    await deleteDoc(doc(db, "tournaments", id));
  },

  async updateTournament(id, updates) {
    if (!auth.currentUser) return;
    const t = this.state.tournaments[id];
    if (t) {
      const teamsCount = Number(updates.numTeams || t.numTeams) || 10;
      const playersPerTeam = (updates.mode || t.mode) === "2v2" ? 2 : ((updates.mode || t.mode) === "3v3" ? 3 : 4);
      updates.requiredPlayers = teamsCount * playersPerTeam;
      await updateDoc(doc(db, "tournaments", id), updates);
    }
  },

  async registerPlayer({ name, method, inviteCode, category = "PENDING", rating = 0 }) {
    if (!auth.currentUser) return { success: false, error: "Must be logged in to register." };
    const tourney = this.getActiveTournament();
    if (!tourney) return { success: false, error: "No active tournament selected" };

    const teamsCount = tourney.numTeams || 10;
    const playersPerTeam = tourney.mode === "2v2" ? 2 : (tourney.mode === "3v3" ? 3 : 4);
    const requiredPlayers = tourney.requiredPlayers || (teamsCount * playersPerTeam);

    if ((tourney.players || []).length >= requiredPlayers) {
      return { success: false, error: "Slots are full! No more registrations allowed." };
    }

    const cleanName = name.trim();
    if ((tourney.players || []).some(p => p.name.toLowerCase() === cleanName.toLowerCase())) {
      return { success: false, error: "A player with this name is already registered!" };
    }

    const newPlayer = {
      id: auth.currentUser.uid,
      ownerUid: auth.currentUser.uid,
      name: cleanName,
      category: "PENDING", 
      rating: 0, 
      feePaid: false, 
      registrationMethod: method,
      inviteCodeUsed: inviteCode || "",
      teamId: null,
      bidAmount: 0,
      registeredAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
      await setDoc(doc(db, "tournaments", tourney.id, "players", auth.currentUser.uid), newPlayer);
      return { success: true, player: newPlayer };
    } catch(err) {
      return { success: false, error: err.message };
    }
  },

  async updatePlayer(id, updates) {
    if (!auth.currentUser) return;
    const tourney = this.getActiveTournament();
    if (!tourney) return;
    await updateDoc(doc(db, "tournaments", tourney.id, "players", id), updates);
  },

  async removePlayer(id) {
    if (!auth.currentUser) return;
    const tourney = this.getActiveTournament();
    if (!tourney) return;
    await deleteDoc(doc(db, "tournaments", tourney.id, "players", id));
  },

  async setBiddersCategory(category) {
    if (!auth.currentUser) return;
    const tourney = this.getActiveTournament();
    if (!tourney) return;

    await updateDoc(doc(db, "tournaments", tourney.id), {
      biddersCategory: category,
      "auctionState.currentLotPlayerId": null,
      "auctionState.currentBid": 0,
      "auctionState.highestCaptains": [],
      "auctionState.isTied": false
    });

    const bidderPlayers = (tourney.players || []).filter(p => p.category === category);
    for (const p of bidderPlayers) {
      const capId = "cap_" + p.id;
      await setDoc(doc(db, "tournaments", tourney.id, "captains", capId), {
        id: capId,
        playerId: p.id,
        ownerUid: p.ownerUid || p.id,
        name: p.name,
        teamName: "Team " + p.name,
        category: p.category,
        rating: p.rating,
        budget: 100,
        colorIndex: Math.floor(Math.random() * 4)
      });
    }
  },

  async drawRandomAuctionPlayer(category) {
    if (!auth.currentUser) return null;
    const tourney = this.getActiveTournament();
    if (!tourney) return null;

    const eligible = (tourney.players || []).filter(p => {
      const isCorrectCat = p.category === category;
      const notSold = !p.teamId;
      const notBidder = p.category !== tourney.biddersCategory;
      return isCorrectCat && notSold && notBidder;
    });

    if (eligible.length === 0) {
      await updateDoc(doc(db, "tournaments", tourney.id), {
        "auctionState.currentLotPlayerId": null
      });
      return null;
    }

    const randomIndex = Math.floor(Math.random() * eligible.length);
    const chosenPlayer = eligible[randomIndex];

    await updateDoc(doc(db, "tournaments", tourney.id), {
      auctionLotCategory: category,
      "auctionState.currentLotPlayerId": chosenPlayer.id,
      "auctionState.currentBid": 0,
      "auctionState.highestCaptains": [],
      "auctionState.isTied": false,
      "auctionState.bidLog": [{
        text: `Lot opened for ${chosenPlayer.name} (${chosenPlayer.category} • Rating ${chosenPlayer.rating})`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]
    });
    return chosenPlayer;
  },

  async placeBidForCaptain(captainId) {
    if (!auth.currentUser) return { success: false, error: "Not logged in" };
    const tourney = this.getActiveTournament();
    if (!tourney || !tourney.auctionState || !tourney.auctionState.currentLotPlayerId) return { success: false, error: "No active lot" };

    const captain = (tourney.captains || []).find(c => c.id === captainId);
    if (!captain) return { success: false, error: "Captain not found" };

    const nextBid = tourney.auctionState.currentBid === 0 ? 5 : tourney.auctionState.currentBid + 5;

    if (captain.budget < nextBid) {
      return { success: false, error: `${captain.name} only has ₹${captain.budget} left (needs ₹${nextBid})!` };
    }

    // Captain creates a bid document. Admin observes this or we just directly update tournament if we have admin rights.
    // If the caller is admin, they can update tourney doc directly. If caller is captain, they can create bid doc.
    const isAdmin = window.currentUserIsAdmin; // We will set this in main.js
    if (isAdmin) {
        const newLog = [...tourney.auctionState.bidLog];
        newLog.unshift({
            text: `${captain.name} bid ₹${nextBid} (+5)`,
            captainId: captain.id,
            amount: nextBid,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        await updateDoc(doc(db, "tournaments", tourney.id), {
            "auctionState.currentBid": nextBid,
            "auctionState.highestCaptains": [captain.id],
            "auctionState.isTied": false,
            "auctionState.bidLog": newLog
        });
    } else {
        await addDoc(collection(db, "tournaments", tourney.id, "bids"), {
            captainUid: auth.currentUser.uid,
            captainId: captain.id,
            amount: nextBid,
            type: "place",
            timestamp: serverTimestamp()
        });
        // We leave it to the admin client (or cloud function) to apply this bid to auctionState.
    }
    return { success: true, nextBid };
  },

  async matchBidForCaptain(captainId) {
    if (!auth.currentUser) return { success: false, error: "Not logged in" };
    const tourney = this.getActiveTournament();
    if (!tourney || !tourney.auctionState || !tourney.auctionState.currentLotPlayerId) return { success: false, error: "No active lot" };

    const captain = (tourney.captains || []).find(c => c.id === captainId);
    if (!captain) return { success: false, error: "Captain not found" };

    const currentBid = tourney.auctionState.currentBid;
    if (currentBid === 0) return { success: false, error: "No bids to match yet" };

    if (captain.budget < currentBid) {
      return { success: false, error: `${captain.name} does not have enough purse (needs ₹${currentBid})!` };
    }

    const isAdmin = window.currentUserIsAdmin;
    if (isAdmin) {
        const newHighest = [...(tourney.auctionState.highestCaptains || [])];
        if (!newHighest.includes(captain.id)) newHighest.push(captain.id);
        const newLog = [...tourney.auctionState.bidLog];
        newLog.unshift({
            text: `⚔️ ${captain.name} MATCHED BID of ₹${currentBid} (AUTOMATIC TIE!)`,
            captainId: captain.id,
            amount: currentBid,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        await updateDoc(doc(db, "tournaments", tourney.id), {
            "auctionState.highestCaptains": newHighest,
            "auctionState.tiedCaptains": newHighest,
            "auctionState.isTied": true,
            "auctionState.bidLog": newLog
        });
    } else {
        await addDoc(collection(db, "tournaments", tourney.id, "bids"), {
            captainUid: auth.currentUser.uid,
            captainId: captain.id,
            amount: currentBid,
            type: "match",
            timestamp: serverTimestamp()
        });
    }
    return { success: true };
  },

  async setAuctionTie(captainIds = null) {
    if (!auth.currentUser) return;
    const tourney = this.getActiveTournament();
    if (!tourney || !tourney.auctionState) return;

    let tiedIds = captainIds;
    if (!tiedIds || tiedIds.length < 2) {
      if (tourney.auctionState.highestCaptains && tourney.auctionState.highestCaptains.length > 1) {
        tiedIds = tourney.auctionState.highestCaptains;
      } else {
        const recent = [];
        (tourney.auctionState.bidLog || []).forEach(log => {
          if (log.captainId && !recent.includes(log.captainId)) {
            recent.push(log.captainId);
          }
        });
        if (recent.length >= 2) {
          tiedIds = recent.slice(0, 2);
        } else {
          tiedIds = (tourney.captains || []).slice(0, 2).map(c => c.id);
        }
      }
    }

    await updateDoc(doc(db, "tournaments", tourney.id), {
        "auctionState.highestCaptains": tiedIds,
        "auctionState.tiedCaptains": tiedIds,
        "auctionState.isTied": true
    });
  },

  async sellCurrentLot(winningCaptainId, finalPrice) {
    if (!auth.currentUser) return;
    const tourney = this.getActiveTournament();
    if (!tourney || !tourney.auctionState || !tourney.auctionState.currentLotPlayerId) return;

    const playerId = tourney.auctionState.currentLotPlayerId;
    const player = (tourney.players || []).find(p => p.id === playerId);
    const captain = (tourney.captains || []).find(c => c.id === winningCaptainId);

    if (player && captain) {
      const price = Number(finalPrice) || tourney.auctionState.currentBid || 5;
      
      // Update player
      await updateDoc(doc(db, "tournaments", tourney.id, "players", playerId), {
          teamId: captain.id,
          bidAmount: price
      });
      // Update captain budget
      await updateDoc(doc(db, "tournaments", tourney.id, "captains", captain.id), {
          budget: captain.budget - price
      });

      const newLog = [...tourney.auctionState.bidLog];
      newLog.unshift({
        text: `🔨 SOLD! ${player.name} joined ${captain.teamName} for ₹${price}!`,
        sold: true,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      await updateDoc(doc(db, "tournaments", tourney.id), {
          "auctionState.currentLotPlayerId": null,
          "auctionState.currentBid": 0,
          "auctionState.highestCaptains": [],
          "auctionState.isTied": false,
          "auctionState.bidLog": newLog
      });
    }
  },

  async skipCurrentLot() {
    if (!auth.currentUser) return;
    const tourney = this.getActiveTournament();
    if (!tourney || !tourney.auctionState) return;
    await updateDoc(doc(db, "tournaments", tourney.id), {
        "auctionState.currentLotPlayerId": null,
        "auctionState.currentBid": 0,
        "auctionState.highestCaptains": [],
        "auctionState.isTied": false
    });
  }
};

// Instead of init on load, we will init it after auth is loaded in main.js
// store.init();
