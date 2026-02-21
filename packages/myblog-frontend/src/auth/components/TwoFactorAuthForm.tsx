import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'

interface TwoFactorAuthFormProps {
  onCancel: () => void
}

export function TwoFactorAuthForm({ onCancel }: TwoFactorAuthFormProps) {
  const { authenticateTwoFactor } = useAuth()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      await authenticateTwoFactor(code)
      setCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid 2FA code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2>Two-Factor Authentication</h2>
      <p>Please enter the 6-digit code from your authenticator app.</p>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Authentication Code:
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            required
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box',
              fontSize: '18px',
              textAlign: 'center',
              letterSpacing: '0.5em'
            }}
          />
        </div>
        
        {error && (
          <p style={{ color: 'red', marginBottom: '10px', fontSize: '14px' }}>
            {error}
          </p>
        )}
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#646cff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || code.length !== 6 ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              opacity: loading || code.length !== 6 ? 0.6 : 1
            }}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#f0f0f0',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              opacity: loading ? 0.6 : 1
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

