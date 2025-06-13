import React, { useContext } from 'react'
import {signOut} from "firebase/auth"
import { auth } from '../firebaseConfig'
import { AuthContext } from '../contexts/AuthContext'

const Navbar = () => {
  const {currentUser} = useContext(AuthContext)

  return (
    <div className='navbar'>
      <span className="logo">Chat</span>
      <div className="user">
        <img src={currentUser.photoURL} alt="" />
        <span>{currentUser.name}</span>
        <button type='button' onClick={()=>signOut(auth)}>logout</button>
      </div>
    </div>
  )
}

export default Navbar