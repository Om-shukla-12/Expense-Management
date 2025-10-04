import React, { useEffect, useState } from 'react'
import api from '../api'

export default function Debug(){
  const [data,setData]=useState(null)
  useEffect(()=>{api.get('/debug').then(r=>setData(r.data)).catch(e=>setData({ error: e.message }))},[])
  if (!data) return <div>Loading...</div>
  return (
    <div>
      <h2>Debug</h2>
      <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
