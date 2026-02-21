import { useState } from 'react'
import { LoginForm } from '../components/LoginForm'
import { RegisterForm } from '../components/RegisterForm'
import { TwoFactorAuthForm } from '../components/TwoFactorAuthForm'
import { TwoFactorSetup } from '../components/TwoFactorSetup'
import { useAuth } from '../context/AuthContext'

export function AuthSection() {
  const [mode, setMode] = useState<'login' | 'register' | 'setup2fa'>('login')
  const { requiresTwoFactor, setRequiresTwoFactor, setTempCredentials } = useAuth()

  const handleSwitchToRegister = () => {
    setMode('register')
  }

  const handleSwitchToLogin = () => {
    setMode('login')
  }

  const handleCancelTwoFactor = () => {
    setRequiresTwoFactor(false)
    setTempCredentials(null)
  }

  const handleSetupTwoFactor = () => {
    setMode('setup2fa')
  }

  const handleSetupComplete = () => {
    setMode('login')
  }

  if (requiresTwoFactor) {
    return (
      <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
        <TwoFactorAuthForm onCancel={handleCancelTwoFactor} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      {mode === 'login' && (
        <LoginForm onSwitchToRegister={handleSwitchToRegister} />
      )}
      
      {mode === 'register' && (
        <RegisterForm 
          onSwitchToLogin={handleSwitchToLogin}
          onSetupTwoFactor={handleSetupTwoFactor}
        />
      )}
      
      {mode === 'setup2fa' && (
        <TwoFactorSetup 
          onComplete={handleSetupComplete}
          onCancel={() => setMode('register')}
        />
      )}
    </div>
  )
}
