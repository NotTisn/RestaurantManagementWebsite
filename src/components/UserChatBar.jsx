// src/components/ChatSidebar.jsx
import React from "react";
import { useChat } from "../contexts/ChatContext";
import Navbar from "./Navbar";
import Search from "./Search";
import Chats from "./Chats";
import '../style.scss';

export default function ChatSidebar() {
  const { updateChat } = useChat(); 

  return (
    <div className="sidebar">
      <Navbar />
      <Search />
      <Chats onSelect={updateChat} /> 
    </div>
  );
}
