import React, { useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";

export default function Message({ message }) {
  const { currentUser, userRole } = useAuth(); 
  const { data } = useChat();
  const ref = useRef();

  const isRestaurant = userRole === "restaurantOwner";
  const isOwner = message.viewType === (isRestaurant ? 1 : 0);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  }, [message]);

  const timeToShow = message.time
    ? typeof message.time === "string"
      ? message.time
      : message.time.toDate().toLocaleTimeString()
    : "";

  return (
    <div ref={ref} className={`message ${isOwner ? "owner" : ""}`}>
      <div className="messageInfo">
        <img
          src={isOwner ? currentUser.photoUrl : data.user.photoUrl}
          alt=""
        />
        <span className="messageTime">{timeToShow}</span>
      </div>
      <div className="messageContent">
        <p>
          <strong>{message.senderDisplayName}</strong> {message.text}
        </p>
        {message.img && <img src={message.img} alt="" />}
      </div>
    </div>
  );
}
