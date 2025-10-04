import React, { useEffect, useState } from 'react'
import api from '../api'
import '../component/pages/adminflows.css'

export default function AdminFlows(){
  const [name,setName]=useState('')
  const [steps,setSteps]=useState([''])
  const [flows,setFlows]=useState([])
  const [users,setUsers]=useState([])
  const [ruleType,setRuleType]=useState('')
  const [percent,setPercent]=useState(60)
  const [specificApprover,setSpecificApprover]=useState('')

  useEffect(()=>{fetchFlows()},[])
  async function fetchFlows(){
    const res = await api.get('/flows')
    setFlows(res.data || [])
    const u = await api.get('/users')
    setUsers(u.data || [])
  }

  function updateStep(idx, val){
    const copy=[...steps]; copy[idx]=val; setSteps(copy)
  }
  function addStep(){ setSteps(prev=>[...prev,'']) }

  async function submit(e){
    e.preventDefault()
    const s = steps.map((a,i)=>({ approver_id: a, sequence: i+1 }))
    const rules = ruleType ? { type: ruleType, percent: ruleType === 'percentage' || ruleType === 'hybrid' ? Number(percent) : undefined, specific_approver_id: ruleType === 'specific' || ruleType === 'hybrid' ? specificApprover : undefined } : null
    await api.post('/flows', { name, steps: s, rules })
    setName(''); setSteps(['']); fetchFlows()
  }

  return (
    <>
      <h2>Admin Flows</h2>
      <form onSubmit={submit} className="form">
        <input placeholder="Flow name" value={name} onChange={e=>setName(e.target.value)} />
        {steps.map((s,i)=> (
          <select key={i} value={s} onChange={e=>updateStep(i,e.target.value)}>
            <option value="">(select user)</option>
            {users.map(u=> <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
          </select>
        ))}
        <button type="button" onClick={addStep}>Add step</button>
        <div style={{marginTop:8}}>
          <label>Rule type</label>
          <select value={ruleType} onChange={e=>setRuleType(e.target.value)}>
            <option value="">None</option>
            <option value="percentage">Percentage</option>
            <option value="specific">Specific approver</option>
            <option value="hybrid">Hybrid</option>
          </select>
          {(ruleType==='percentage' || ruleType==='hybrid') && (<input type="number" value={percent} onChange={e=>setPercent(e.target.value)} min={1} max={100} />)}
          {(ruleType==='specific' || ruleType==='hybrid') && (<select value={specificApprover} onChange={e=>setSpecificApprover(e.target.value)}>
            <option value="">(select approver)</option>
            {users.map(u=> <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
          </select>)}
        </div>
        <button type="submit">Create flow</button>
      </form>

      <h3>Existing flows</h3>
      <ul>
        {flows.map(f=>(<li key={f.id}>{f.name || f.id}</li>))}
      </ul>
    </>
  )
}
