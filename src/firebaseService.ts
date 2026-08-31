import firebaseService, { db, auth, FIRESTORE_DATABASE_ID, handleFirestoreError, OperationType } from "./lib/firebaseService";

export { db, auth, FIRESTORE_DATABASE_ID, handleFirestoreError, OperationType };
export default firebaseService;
