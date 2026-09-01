export const db = {};
export const auth = {};

export function collection(db, name) {
  return name;
}

export function query(col, ...args) {
  return col;
}

export function where() {
  return null;
}

const getStore = (key) => JSON.parse(localStorage.getItem(key) || '[]');
const setStore = (key, data) => localStorage.setItem(key, JSON.stringify(data));

export async function getDocs(colName) {
  const store = getStore(colName);
  return store.map(item => ({
    id: item.id,
    data: () => item
  }));
}

export function doc(db, colName, id) {
  return { colName, id };
}

export async function getDoc(docRef) {
  if (docRef.colName === 'users') {
    const data = JSON.parse(localStorage.getItem('settings') || '{}');
    return {
      exists: () => Object.keys(data).length > 0,
      data: () => data
    };
  }
  const store = getStore(docRef.colName);
  const item = store.find(i => i.id === docRef.id);
  return {
    exists: () => !!item,
    data: () => item || {}
  };
}

export async function setDoc(docRef, data) {
  if (docRef.colName === 'users') {
    localStorage.setItem('settings', JSON.stringify({ ...data, id: docRef.id, userId: 'local_user' }));
    return;
  }
  
  const store = getStore(docRef.colName);
  const index = store.findIndex(i => i.id === docRef.id);
  const newItem = { ...data, id: docRef.id, userId: 'local_user' };
  
  if (index !== -1) {
    store[index] = newItem;
  } else {
    store.push(newItem);
  }
  setStore(docRef.colName, store);
}

export async function addDoc(colName, data) {
  const id = String(Date.now());
  const store = getStore(colName);
  store.push({ ...data, id, userId: 'local_user' });
  setStore(colName, store);
  return { id };
}

export async function updateDoc(docRef, data) {
  await setDoc(docRef, data);
}

export async function deleteDoc(docRef) {
  if (docRef.colName === 'users') return;
  const store = getStore(docRef.colName);
  const filtered = store.filter(i => i.id !== docRef.id);
  setStore(docRef.colName, filtered);
}

export function writeBatch() {
  const operations = [];
  return {
    update: (docRef, data) => {
      operations.push(updateDoc(docRef, data));
    },
    commit: async () => {
      await Promise.all(operations);
    }
  };
}

// Dummy auth functions
export function onAuthStateChanged(auth, callback) {
  callback({ uid: 'local_user' });
  return () => {};
}
export function signOut() { return Promise.resolve(); }
export function getAuth() { return {}; }
export function getFirestore() { return {}; }
export function initializeApp() { return {}; }
export function getAnalytics() { return {}; }
