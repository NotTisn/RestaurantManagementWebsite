import React, { useEffect, useState } from "react";
import { useChat } from "../contexts/ChatContext";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useAuth } from "../contexts/AuthContext";
import Message from "./Message";

export default function Messages() {
  const { data } = useChat();
  const { currentUser } = useAuth();
  const [msgs, setMsgs] = useState([]);

  useEffect(() => {
    if (!data.user?.uid || !data.chatId) return;

    // ✅ Load từ phía đúng hướng: user đang chat với restaurant
    const path = collection(
      db,
      "userChats",
      data.user.uid,
      "chats",
      data.chatId,
      "messages"
    );

    const q = query(path, orderBy("time", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMsgs(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsub();
  }, [data]);

  return (
    <div className="messages">
      {msgs.map((msg) => (
        <Message key={msg.id} message={msg} />
      ))}
    </div>
  );
}
