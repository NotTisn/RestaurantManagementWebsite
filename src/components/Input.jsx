import React, { useState } from "react";
import { v4 as uuid } from "uuid";
import {
  doc,
  updateDoc,
  serverTimestamp,
  addDoc,
  collection,
} from "firebase/firestore";
import { db, storage } from "../firebaseConfig";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useChat } from "../contexts/ChatContext";
import { useAuth } from "../contexts/AuthContext";

export default function Input() {
  const [text, setText] = useState("");
  const [img, setImg] = useState(null);
  const { data } = useChat();
  const { currentUser, userRole } = useAuth();

  async function handleSend(e) {
    e.preventDefault();
    if (!data.chatId || !data.user) return;

    let url = null;

    try {
      // Upload image if exists
      if (img) {
        const sref = ref(storage, uuid());
        const uploadTask = uploadBytesResumable(sref, img);
        await new Promise((resolve, reject) => {
          uploadTask.on("state_changed", null, reject, resolve);
        });
        url = await getDownloadURL(uploadTask.snapshot.ref);
      }

      // Prepare message object
      const msg = {
        id: uuid(),
        text,
        senderId: currentUser.uid,
        time: serverTimestamp(),
        viewType: userRole === "restaurantOwner" ? 1 : 0,
        ...(url && { img: url }),
      };
      

      // Add message to subcollection
      await addDoc(
        collection(
          db,
          "userChats",
          data.user.uid,
          "chats",
          data.chatId,
          "messages"
        ),
        msg
      );

      // Update chat metadata
      const meta = {
        lastMessage: { text },
        date: serverTimestamp(),
      };

      await updateDoc(
        doc(db, "userChats", data.user.uid, "chats", data.chatId),
        meta
      );
      await updateDoc(doc(db, "restaurantInbox", data.user.uid), meta);

      // Clear input
      setText("");
      setImg(null);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  return (
    <form className="input" onSubmit={handleSend}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type something..."
      />
      <input
        id="file"
        type="file"
        style={{ display: "none" }}
        onChange={(e) => setImg(e.target.files[0])}
      />
      <label htmlFor="file">📎</label>
      <button type="submit">Send</button>
    </form>
  );
}