import React, { useEffect, useState } from 'react'
import api from '../api'
import { Link } from 'react-router-dom'
import '../component/pages/dashboard.css'

export default function Dashboard(){
  const [expenses,setExpenses]=useState([])
  const [showReceiptsFor,setShowReceiptsFor]=useState(null)
  const [receipts,setReceipts]=useState([])
  useEffect(()=>{fetchExpenses()},[])
  async function fetchExpenses(){
    const res = await api.get('/expenses')
    setExpenses(res.data)
  }

  async function viewReceipts(expenseId){
    const res = await api.get(`/receipts/expense/${expenseId}`)
    setReceipts(res.data || [])
    setShowReceiptsFor(expenseId)
  }

  function closeReceipts(){ setShowReceiptsFor(null); setReceipts([]) }

  return (
    <>
      <h2>Dashboard</h2>
      <div style={{display:'flex',gap:12}}>
        <Link to="/approvals">Approvals</Link>
        <Link to="/submit">Submit Expense</Link>
        <Link to="/flows">Admin Flows</Link>
        <Link to="/users">Manage Users</Link>
      </div>
      <ul className="list">
        {expenses.map(e=> (
          <li key={e.id} className="item">
            <div>{e.title || e.description}</div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn ghost" onClick={()=>viewReceipts(e.id)}>View receipts</button>
              <span className="muted">{e.status}</span>
            </div>
          </li>
        ))}
      </ul>

      {showReceiptsFor && (
        <div className="modal-overlay" onClick={closeReceipts}>
          <div className="modal-card" onClick={e=>e.stopPropagation()}>
            <h3>Receipts for {showReceiptsFor}</h3>
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              {receipts.length===0 ? <div className="muted">No receipts</div> : receipts.map(r=> (
                <div key={r.id} style={{width:180}}>
                  {r.url.endsWith('.pdf') ? (<a href={r.url} target="_blank">{r.filename}</a>) : (<img src={r.url} style={{width:'100%',borderRadius:8}} alt={r.filename} />)}
                  <div className="small muted">{new Date(r.uploaded_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
            <div style={{textAlign:'right',marginTop:12}}><button className="btn ghost" onClick={closeReceipts}>Close</button></div>
          </div>
        </div>
      )}
    </>
  )
}
