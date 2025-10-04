import React, { useState } from 'react'
import '../component/pages/signup.css'
import api from '../api'
import { setAuth } from '../auth'
import { useNavigate, Link } from 'react-router-dom'

export default function Signup(){
  const [companyName,setCompanyName]=useState('')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [country,setCountry]=useState('')
  const nav = useNavigate()

  async function submit(e){
    e.preventDefault()
    const res = await api.post('/auth/signup', { companyName, email, password, country })
    setAuth(res.data)
    nav('/')
  }

  return (
    <>
      <h2>Signup</h2>
      <form onSubmit={submit} className="form">
        <input placeholder="Company name" value={companyName} onChange={e=>setCompanyName(e.target.value)} required />
        <input placeholder="Country" value={country} onChange={e=>setCountry(e.target.value)} />
        <input placeholder="Admin Email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button>Signup</button>
      </form>
      <div style={{marginTop:12}} className="muted small">Already have an account? <Link to="/login">Login</Link></div>
    </>
  )
}
