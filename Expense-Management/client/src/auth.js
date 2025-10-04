export function setAuth({ token, user }) {
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export function getUser() {
  try { return JSON.parse(localStorage.getItem('user')) } catch (e) { return null }
}

export function getToken() { return localStorage.getItem('token') }
