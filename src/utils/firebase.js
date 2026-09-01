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

export async function getDocs(colName) {
  try {
    const res = await fetch(`https://invorator.fly.dev/api/${colName}?userId=local_user`);
    const data = await res.json();
    return data.map(item => ({
      id: item.id,
      data: () => item
    }));
  } catch (err) {
    return [];
  }
}

export function doc(db, colName, id) {
  return { colName, id };
}

export async function getDoc(docRef) {
  if (docRef.colName === 'users') {
    const res = await fetch('https://invorator.fly.dev/api/settings?userId=local_user');
    const data = await res.json();
    return {
      exists: () => Object.keys(data).length > 0,
      data: () => data
    };
  }
  return { exists: () => false, data: () => ({}) };
}

export async function setDoc(docRef, data) {
  await fetch(`https://invorator.fly.dev/api/${docRef.colName === 'users' ? 'settings' : docRef.colName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, id: docRef.id, userId: 'local_user' })
  });
}

export async function addDoc(colName, data) {
  const id = String(Date.now());
  await fetch(`https://invorator.fly.dev/api/${colName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, id, userId: 'local_user' })
  });
}

export async function updateDoc(docRef, data) {
  await fetch(`https://invorator.fly.dev/api/${docRef.colName === 'users' ? 'settings' : docRef.colName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, id: docRef.id, userId: 'local_user' })
  });
}

export async function deleteDoc(docRef) {
  await fetch(`https://invorator.fly.dev/api/${docRef.colName}/${docRef.id}`, { method: 'DELETE' });
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
