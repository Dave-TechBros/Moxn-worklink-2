import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json';

let appInstance: App | null = null;
let authInstance: Auth | null = null;

export const getAdminAuth = (): Auth | null => {
  try {
    if (!authInstance) {
      if (!getApps().length) {
        appInstance = initializeApp({
          projectId: firebaseConfig.projectId,
        });
      } else {
        appInstance = getApps()[0];
      }
      authInstance = getAuth(appInstance);
    }
    return authInstance;
  } catch (err) {
    console.warn('Firebase Admin initialization skipped or failed:', err);
    return null;
  }
};

export const adminAuth = new Proxy({} as Auth, {
  get(_target, prop) {
    const instance = getAdminAuth();
    if (!instance) {
      return () => {
        throw new Error('Firebase Admin Auth is not configured.');
      };
    }
    const val = (instance as any)[prop];
    return typeof val === 'function' ? val.bind(instance) : val;
  }
});
