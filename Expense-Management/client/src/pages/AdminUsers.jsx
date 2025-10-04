import React, { useEffect, useState } from 'react'
import api from '../api'
import '../component/pages/adminusers.css'

export default function AdminUsers(){
  const [users,setUsers]=useState([])
  const [form,setForm]=useState({ email:'', name:'', role:'employee', manager_id:'', password:'' })

  useEffect(()=>{fetchUsers()},[])
  async function fetchUsers(){
    const res = await api.get('/users')
    setUsers(res.data || [])
  }

  async function create(e){
    e.preventDefault()
    await api.post('/users', form)
    setForm({ email:'', name:'', role:'employee', manager_id:'', password:'' })
    fetchUsers()
  }

  async function update(id, changes){
    await api.put(`/users/${id}`, changes)
    fetchUsers()
  }

  return (
    <>
      <h2>Manage Users</h2>
      <form onSubmit={create} className="form">
        <input placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required />
        <input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
        <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
        </select>
        <select value={form.manager_id} onChange={e=>setForm({...form,manager_id:e.target.value})}>
          <option value="">No manager</option>
          {users.map(u=> <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
        </select>
        <input placeholder="Password (optional)" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} />
        <button>Create</button>
      </form>

      <h3>Existing users</h3>
      <table style={{width:'100%'}}>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Manager</th><th>Manager Approver</th><th>Actions</th></tr></thead>
        <tbody>
          {users.map(u=> (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.manager_id || '-'}</td>
              <td>{u.is_manager_approver ? 'Yes' : 'No'}</td>
              <td>
                <button onClick={()=> update(u.id, { role: u.role === 'employee' ? 'manager' : 'employee' })}>Toggle Role</button>
                <button onClick={()=> update(u.id, { is_manager_approver: !(u.is_manager_approver) })}>Toggle Approver</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
