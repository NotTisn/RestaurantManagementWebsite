import messaging from '@react-native-firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';  

export async function saveFcmToken(userId) {
  try {
    const token = await messaging().getToken();
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { fcmToken: token });
  } catch (err) {
    console.error('Error saving FCM token:', err);
  }
}
