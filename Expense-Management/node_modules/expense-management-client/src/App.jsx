import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Approvals from './pages/Approvals'
import SubmitExpense from './pages/SubmitExpense'
import AdminFlows from './pages/AdminFlows'
import AdminUsers from './pages/AdminUsers'
import { getToken, clearAuth, getUser } from './auth'
import Layout from './component/Layout'

function RequireAuth({ children }){
  const token = getToken()
  if (!token) return <Navigate to="/login" />
  return children
}

export default function App(){
  const user = getUser()
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/login" element={<Login/>} />
          <Route path="/signup" element={<Signup/>} />
          <Route path="/" element={<RequireAuth><Dashboard/></RequireAuth>} />
          <Route path="/approvals" element={<RequireAuth><Approvals/></RequireAuth>} />
          <Route path="/submit" element={<RequireAuth><SubmitExpense/></RequireAuth>} />
          <Route path="/flows" element={<RequireAuth><AdminFlows/></RequireAuth>} />
          <Route path="/users" element={<RequireAuth><AdminUsers/></RequireAuth>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

