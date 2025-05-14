// src/contexts/ChatContext.jsx
import { createContext, useContext, useState } from "react";

export const ChatContext = createContext();

export const ChatContextProvider = ({ children }) => {
  const [data, setData] = useState({
    user: null,        // người dùng đang chat
    chatId: null,      // chatId chính là "restaurant"
  });

  const updateChat = (user) => {
    setData({
      user,
      chatId: "restaurant", // cố định vì user -> restaurant
    });
  };

  return (
    <ChatContext.Provider value={{ data, updateChat }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
