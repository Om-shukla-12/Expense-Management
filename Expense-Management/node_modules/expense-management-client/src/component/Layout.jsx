import React from 'react'
import { Link } from 'react-router-dom'
import { getUser, clearAuth } from '../auth'

export default function Layout({ children }){
  const user = getUser()
  return (
    <div className="container">
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link to="/" style={{textDecoration:'none',color:'inherit',fontWeight:700,fontSize:18}}>ExpenseMgmt</Link>
          <nav style={{display:'flex',gap:12}}>
            <Link to="/submit" style={{color:'var(--muted)'}}>Submit</Link>
            <Link to="/approvals" style={{color:'var(--muted)'}}>Approvals</Link>
            <Link to="/flows" style={{color:'var(--muted)'}}>Flows</Link>
            <Link to="/users" style={{color:'var(--muted)'}}>Users</Link>
          </nav>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {user ? (
            <>
              <span className="small muted">{user.name || user.email}</span>
              <a onClick={() => { clearAuth(); window.location.href = '/login' }} style={{cursor:'pointer',color:'var(--accent)'}}>Logout</a>
            </>
          ) : (
            <Link to="/login" style={{color:'var(--accent)'}}>Login</Link>
          )}
        </div>
      </header>

      <main>
        {children}
      </main>
    </div>
  )
}
