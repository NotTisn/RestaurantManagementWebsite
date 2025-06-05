import { createContext, useContext, useState } from "react";

export const ChatContext = createContext();

export const ChatContextProvider = ({ children }) => {
  const [data, setData] = useState({
    user: null,        
    chatId: null,    
  });

  const updateChat = (user) => {
    setData({
      user,
      chatId: "restaurant",
    });
  };

  return (
    <ChatContext.Provider value={{ data, updateChat }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
