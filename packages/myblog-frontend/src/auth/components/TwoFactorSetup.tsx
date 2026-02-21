import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { api, tsrClient } from '../../api/tsrClient';

interface TwoFactorSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function TwoFactorSetup({ onComplete, onCancel }: TwoFactorSetupProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'generate' | 'verify'>('generate');

  const turnOnTwoFactorMutation = tsrClient.auth.turnOnTwoFactor.useMutation({
    onSuccess: () => onComplete(),
  });

  useEffect(() => {
    const generateQR = async () => {
      try {
        setLoading(true);
        const qrBlob = await api.generateTwoFactorQR();
        const url = URL.createObjectURL(qrBlob);
        setQrCodeUrl(url);
      } catch {
        setError('Failed to generate QR code');
      } finally {
        setLoading(false);
      }
    };

    generateQR();
  }, []);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await turnOnTwoFactorMutation.mutateAsync({
        body: { twoFactorAuthenticationCode: code },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Invalid verification code'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setStep('verify');
  };

  return (
    <div>
      <h2>Set up Two-Factor Authentication</h2>

      {step === 'generate' && (
        <div>
          <p>Scan this QR code with your authenticator app:</p>

          {loading && <p>Loading QR code...</p>}

          {error && (
            <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>
          )}

          {qrCodeUrl && (
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <img
                src={qrCodeUrl}
                alt="2FA QR Code"
                style={{ maxWidth: '200px', maxHeight: '200px' }}
              />
            </div>
          )}

          <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
            After scanning, enter the 6-digit code from your app to complete
            setup.
          </p>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleNext}
              disabled={!qrCodeUrl || loading}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#646cff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: !qrCodeUrl || loading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                opacity: !qrCodeUrl || loading ? 0.6 : 1,
              }}
            >
              Next
            </button>

            <button
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#f0f0f0',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === 'verify' && (
        <div>
          <p>
            Enter the 6-digit code from your authenticator app to complete
            setup:
          </p>

          <form onSubmit={handleVerify}>
            <div style={{ marginBottom: '15px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: 'bold',
                }}
              >
                Verification Code:
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
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
                  letterSpacing: '0.5em',
                }}
              />
            </div>

            {error && (
              <p
                style={{ color: 'red', marginBottom: '10px', fontSize: '14px' }}
              >
                {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                disabled={
                  loading ||
                  code.length !== 6 ||
                  turnOnTwoFactorMutation.isPending
                }
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#646cff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor:
                    loading || code.length !== 6 ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  opacity: loading || code.length !== 6 ? 0.6 : 1,
                }}
              >
                {loading || turnOnTwoFactorMutation.isPending
                  ? 'Enabling...'
                  : 'Enable 2FA'}
              </button>

              <button
                type="button"
                onClick={() => setStep('generate')}
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
                  opacity: loading ? 0.6 : 1,
                }}
              >
                Back
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
