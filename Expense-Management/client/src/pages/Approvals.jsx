import React, { useEffect, useState } from 'react'
import api from '../api'
import '../component/pages/approvals.css'

export default function Approvals(){
  const [steps,setSteps]=useState([])
  useEffect(()=>{fetchPending()},[])
  async function fetchPending(){
    const res = await api.get('/approvals/pending')
    setSteps(res.data)
  }

  async function decide(stepId, action){
    await api.post(`/approvals/${stepId}/decide`, { action })
    fetchPending()
  }

  return (
    <>
      <h2>Pending Approvals</h2>
      <ul className="list">
        {steps.map(s=> (
          <li key={s.id} className="item">
            <div>
              {s.expense_id} — {s.amount} {s.currency}
              {s.convertedAmount && ` (${s.convertedAmount.toFixed(2)} ${s.companyCurrency})`}
            </div>
            <div>
              <button onClick={()=>decide(s.id,'approve')}>Approve</button>
              <button onClick={()=>decide(s.id,'reject')}>Reject</button>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
