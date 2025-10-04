import React, { useEffect, useState, useRef } from 'react'
import api from '../api'
import '../component/pages/submitexpense.css'

export default function SubmitExpense(){
  const [form,setForm] = useState({ title:'', amount:'', currency:'USD', category:'', description:'', date:'', flow_id: '' })
  const [flows,setFlows] = useState([])
  const [file,setFile] = useState(null)
  const [preview,setPreview] = useState(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const ocrFileInput = useRef(null)

  useEffect(()=>{fetchFlows()},[])
  async function fetchFlows(){
    const res = await api.get('/flows')
    setFlows(res.data || [])
  }

  async function submit(e){
    e.preventDefault()
    const payload = { ...form, amount: Number(form.amount) }
    const res = await api.post('/expenses', payload)
    const expense = res.data
    // upload receipt if present
    if (file) {
      const fd = new FormData()
      fd.append('receipt', file)
      try{
        await api.post(`/receipts/${expense.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      }catch(err){
        console.error('upload failed', err)
      }
    }
    alert('submitted')
    setForm({ title:'', amount:'', currency:'USD', category:'', description:'', date:'', flow_id: '' })
    setFile(null); setPreview(null)
  }

  function onFile(e){
    const f = e.target.files && e.target.files[0]
    if (!f) return setFile(null)
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }

  async function onOcrFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;

    setOcrLoading(true);
    const fd = new FormData();
    fd.append('receipt', f);

    try {
      const res = await api.post('/ocr', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = res.data;
      setForm(prev => ({
        ...prev,
        amount: data.amount || prev.amount,
        date: data.date ? new Date(data.date).toISOString().split('T')[0] : prev.date,
        description: data.description || prev.description,
      }));
    } catch (err) {
      console.error('OCR failed', err);
      alert('OCR failed');
    } finally {
      setOcrLoading(false);
    }
  }

  return (
    <>
      <h2>Submit Expense</h2>
      <form onSubmit={submit} className="form">
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => ocrFileInput.current && ocrFileInput.current.click()}>
            {ocrLoading ? 'Scanning...' : 'Scan Receipt'}
          </button>
          <input type="file" accept="image/*" onChange={onOcrFile} style={{ display: 'none' }} ref={ocrFileInput} />
        </div>
        <input placeholder="Title" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} />
        <input placeholder="Amount" value={form.amount} onChange={e=>setForm({...form, amount:e.target.value})} required />
        <input placeholder="Category" value={form.category} onChange={e=>setForm({...form, category:e.target.value})} />
        <input placeholder="Date" type="date" value={form.date} onChange={e=>setForm({...form, date:e.target.value})} required />
        <input placeholder="Description" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />

        <label>Approval flow</label>
        <select value={form.flow_id} onChange={e=>setForm({...form, flow_id:e.target.value})}>
          <option value="">(no flow — manager only)</option>
          {flows.map(f => <option key={f.id} value={f.id}>{f.name || f.id}</option>)}
        </select>

        <div style={{gridColumn:'1 / -1'}}>
          <label>Receipt (optional)</label>
          <input type="file" accept="image/*,application/pdf" onChange={onFile} />
          {preview && (<div className="receipt-preview" style={{marginTop:8}}><img src={preview} alt="preview" style={{maxWidth:200,maxHeight:140}}/></div>)}
        </div>

        <button type="submit">Submit</button>
      </form>
    </>
  )
}
