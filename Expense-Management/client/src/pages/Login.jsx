import React, { useState } from 'react'
import '../component/pages/login.css'
import api from '../api'
import { setAuth } from '../auth'
import { useNavigate, Link } from 'react-router-dom'

export default function Login(){
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const nav = useNavigate()

  async function submit(e){
    e.preventDefault()
    const res = await api.post('/auth/login', { email, password })
    setAuth(res.data)
    nav('/')
  }

  return (
    <>
      <h2>Login</h2>
      <form onSubmit={submit} className="form">
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button>Login</button>
      </form>
      <div style={{marginTop:12}} className="muted small">Don't have an account? <Link to="/signup">Signup</Link></div>
    </>
  )
}
