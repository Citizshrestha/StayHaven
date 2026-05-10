import { useMemo } from 'react';
import styles from './PasswordStrengthIndicator.module.css';

const PasswordStrengthIndicator = ({ password }) => {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(password),
    };

    // Calculate score
    if (checks.length) score++;
    if (checks.uppercase) score++;
    if (checks.lowercase) score++;
    if (checks.number) score++;
    if (checks.special) score++;

    // Bonus for longer passwords
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;

    // Determine strength level
    if (score <= 2) return { score: 1, label: 'Weak', color: '#ef4444' };
    if (score <= 4) return { score: 2, label: 'Fair', color: '#f59e0b' };
    if (score <= 5) return { score: 3, label: 'Good', color: '#10b981' };
    return { score: 4, label: 'Strong', color: '#059669' };
  }, [password]);

  const requirements = useMemo(() => {
    if (!password) return [];

    return [
      { label: 'At least 8 characters', met: password.length >= 8 },
      { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
      { label: 'One lowercase letter', met: /[a-z]/.test(password) },
      { label: 'One number', met: /[0-9]/.test(password) },
      { label: 'One special character', met: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(password) },
    ];
  }, [password]);

  if (!password) return null;

  return (
    <div className={styles.container}>
      <div className={styles.strengthBar}>
        <div
          className={styles.strengthFill}
          style={{
            width: `${(strength.score / 4) * 100}%`,
            backgroundColor: strength.color,
          }}
        />
      </div>
      <div className={styles.strengthLabel} style={{ color: strength.color }}>
        Password strength: {strength.label}
      </div>
      <ul className={styles.requirements}>
        {requirements.map((req, index) => (
          <li
            key={index}
            className={req.met ? styles.requirementMet : styles.requirementUnmet}
          >
            <span className={styles.checkmark}>{req.met ? '✓' : '○'}</span>
            {req.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PasswordStrengthIndicator;
