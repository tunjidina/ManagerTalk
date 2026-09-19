import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';

import { useNavigationState } from '../store/navigationState';
import { useAuthState } from '../store/authState';
import { getFirebaseDb } from '../lib/firebase';

/**
 * Profile.
 *
 * One field today: the name printed on the certificate. It exists because
 * Firebase Auth gives email/password accounts no displayName, and a
 * certificate needs a name the person chose rather than one derived from
 * their email address.
 *
 * Local draft state, committed on Save. Binding the input straight to the
 * store would make Cancel meaningless — every keystroke would already be
 * saved.
 *
 * Save order is Firestore first, store second, navigate last. The store is
 * the UI's read path but Firestore is the record: updating the store first
 * would show the new name on a certificate that a refresh then reverts.
 */
const ProfileScreen: React.FC = () => {
  const setCurrentScreen = useNavigationState((state) => state.setCurrentScreen);

  const user = useAuthState((state) => state.user);
  const certificateName = useAuthState((state) => state.certificateName);
  const setCertificateName = useAuthState((state) => state.setCertificateName);

  const [draft, setDraft] = useState(certificateName || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (saving) {
      return;
    }

    const uid = user ? user.uid : null;

    if (!uid) {
      // AuthGate should make this unreachable; the screen must still say
      // something rather than appear to save and lose the name.
      setError('You are not signed in, so this could not be saved.');
      return;
    }

    setSaving(true);
    setError(null);

    // Stored trimmed, and null rather than an empty string, so the
    // certificate's "is it set?" check and this field agree.
    const trimmed = draft.trim();
    const value = trimmed.length > 0 ? trimmed : null;

    try {
      // The document already exists: ensureUserProfile creates it on first
      // sign-in. updateDoc rather than setDoc for that reason — this never
      // creates a document or a collection.
      await updateDoc(doc(getFirebaseDb(), 'users', uid), {
        certificateName: value
      });
    } catch (err) {
      setSaving(false);
      setError('Your name could not be saved. Check your connection and try again.');
      return;
    }

    setCertificateName(value);
    setSaving(false);
    setCurrentScreen('scenario_select');
  };

  const handleCancel = () => {
    setCurrentScreen('scenario_select');
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <p style={styles.eyebrow}>Account</p>
        <h1 style={styles.title}>Profile</h1>
        <p style={styles.subtitle}>
          The name here is the one printed on your certificate.
        </p>
      </header>

      <div style={styles.divider} />

      {/* Error */}
      {error && (
        <div style={styles.errorBox} role="alert">
          <p style={styles.errorText}>{error}</p>
        </div>
      )}

      {/* Certificate name */}
      <section style={styles.section}>
        <h2 style={styles.sectionLabel}>Certificate Name</h2>

        <div style={styles.card}>
          <div style={styles.field}>
            <label style={styles.fieldLabel} htmlFor="profile-certificate-name">
              Name
            </label>
            <input
              id="profile-certificate-name"
              style={styles.input}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={saving}
              autoComplete="name"
            />
            <p style={styles.hint}>
              Leave this blank to use the name on your sign-in account.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div style={styles.ctaRow}>
        <button
          style={saving ? { ...styles.secondary, ...styles.disabled } : styles.secondary}
          onClick={handleCancel}
          disabled={saving}
        >
          Cancel
        </button>

        <button
          style={saving ? { ...styles.cta, ...styles.disabled } : styles.cta}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
};

export default ProfileScreen;

// -----------------------------
// Styles
// -----------------------------

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '40px',
    maxWidth: '900px',
    margin: '0 auto',
    fontFamily: 'Inter, sans-serif',
    lineHeight: 1.6,
    color: '#1a1a1a'
  },
  header: {
    marginBottom: '28px'
  },
  eyebrow: {
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#6b7280',
    margin: '0 0 10px 0'
  },
  title: {
    fontSize: '34px',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
    margin: '0 0 12px 0'
  },
  subtitle: {
    fontSize: '17px',
    color: '#444',
    maxWidth: '68ch',
    margin: 0
  },
  divider: {
    height: '1px',
    backgroundColor: '#e6e6e6',
    margin: '0 0 36px 0'
  },
  errorBox: {
    backgroundColor: '#fff5f5',
    border: '1px solid #f3c2c2',
    borderRadius: '10px',
    padding: '18px 20px',
    marginBottom: '32px'
  },
  errorText: {
    fontSize: '15px',
    color: '#7a2626',
    margin: 0
  },
  section: {
    marginBottom: '32px'
  },
  sectionLabel: {
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#6b7280',
    margin: '0 0 16px 0'
  },
  card: {
    padding: '24px',
    backgroundColor: '#fafafa',
    border: '1px solid #e6e6e6',
    borderRadius: '12px'
  },
  field: {
    marginBottom: 0,
    maxWidth: '460px'
  },
  fieldLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '8px'
  },
  input: {
    width: '100%',
    padding: '13px 14px',
    borderRadius: '8px',
    border: '1px solid #d4d4d4',
    backgroundColor: '#fff',
    fontSize: '16px',
    fontFamily: 'Inter, sans-serif',
    color: '#1a1a1a',
    boxSizing: 'border-box'
  },
  hint: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '8px 0 0 0'
  },
  ctaRow: {
    marginTop: '8px',
    paddingTop: '28px',
    borderTop: '1px solid #e6e6e6',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center'
  },
  secondary: {
    padding: '16px 28px',
    fontSize: '16px',
    fontWeight: 600,
    fontFamily: 'Inter, sans-serif',
    backgroundColor: '#fff',
    color: '#374151',
    border: '1px solid #d4d4d4',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  cta: {
    padding: '16px 28px',
    fontSize: '18px',
    fontWeight: 600,
    fontFamily: 'Inter, sans-serif',
    backgroundColor: '#0078D4',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  disabled: {
    opacity: 0.55,
    cursor: 'not-allowed'
  }
};
