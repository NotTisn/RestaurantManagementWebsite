import React, { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useChat } from "../contexts/ChatContext";

export default function Chats() {
  const [users, setUsers] = useState([]);
  const { updateChat } = useChat();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "restaurantInbox"), (snap) => {
      const list = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      setUsers(list);
    });

    return () => unsub();
  }, []);

  return (
    <div className="chats">
      {users.map((user) => (
        <div
          key={user.uid}
          className="userChat"
          onClick={() => updateChat(user)}
        >
          <img src={user.photoURL} alt="" />
          <div className="userChatInfo">
            <span>{user.displayName}</span>
            <p>{user.lastMessage?.text || "Message..."}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
