import React from 'react'
import ChatSidebar from '../../components/UserChatBar';
import Chat from '../../components/Chat'


const Home = () => {
  return (
    <div className='home'>
      <div className="container">
        <ChatSidebar/>
        <Chat/>
      </div>
    </div>
  )
}

export default Home