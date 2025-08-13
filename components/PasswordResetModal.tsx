import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

interface PasswordResetModalProps {
  visible: boolean;
  onClose: () => void;
}

const PasswordResetModal: React.FC<PasswordResetModalProps> = ({ visible, onClose }) => {
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes

  const { requestPasswordReset, verifyResetCode, resetPassword } = useAuth();

  // Timer for code expiry
  useEffect(() => {
    let interval: number;
    if (step === 'code' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            setStep('email');
            setError('קוד האימות פג תוקף. אנא בקש קוד חדש.');
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timeLeft]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const resetState = () => {
    setStep('email');
    setEmail('');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setTimeLeft(600);
    setIsLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleRequestReset = async () => {
    if (!email.trim()) {
      setError('נא להזין כתובת אימייל');
      return;
    }

    if (!email.includes('@')) {
      setError('נא להזין כתובת אימייל תקינה');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await requestPasswordReset(email);
      if (result.success) {
        setStep('code');
        setTimeLeft(600); // Reset timer
        Alert.alert('הצלחה', 'קוד איפוס נשלח לאימייל שלך');
      } else {
        setError(result.error || 'שגיאה בשליחת קוד האיפוס');
      }
    } catch (error) {
      setError('שגיאה בחיבור לשרת');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim() || code.length !== 5) {
      setError('נא להזין קוד בן 5 ספרות');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await verifyResetCode(email, code);
      if (result.success) {
        setStep('password');
      } else {
        setError(result.error || 'קוד לא תקין');
      }
    } catch (error) {
      setError('שגיאה בחיבור לשרת');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      setError('נא להזין סיסמה חדשה');
      return;
    }

    if (newPassword.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('הסיסמאות אינן זהות');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await resetPassword(email, code, newPassword);
      if (result.success) {
        Alert.alert('הצלחה', 'הסיסמה שונתה בהצלחה', [
          { text: 'אישור', onPress: handleClose }
        ]);
      } else {
        setError(result.error || 'שגיאה בשינוי הסיסמה');
      }
    } catch (error) {
      setError('שגיאה בחיבור לשרת');
    } finally {
      setIsLoading(false);
    }
  };

  const renderEmailStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>איפוס סיסמה</Text>
      <Text style={styles.description}>
        הזן את כתובת האימייל שלך ונשלח לך קוד לאיפוס הסיסמה
      </Text>

      <TextInput
        style={styles.input}
        placeholder="כתובת אימייל"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isLoading}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleRequestReset}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'שולח...' : 'שלח קוד איפוס'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
        <Text style={styles.cancelButtonText}>ביטול</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCodeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>הזן קוד אימות</Text>
      <Text style={styles.description}>
        הזן את הקוד בן 5 הספרות שנשלח לכתובת האימייל שלך
      </Text>

      <TextInput
        style={[styles.input, styles.codeInput]}
        placeholder="12345"
        value={code}
        onChangeText={setCode}
        keyboardType="numeric"
        maxLength={5}
        textAlign="center"
        editable={!isLoading}
      />

      <Text style={styles.timerText}>
        זמן שנותר: {formatTime(timeLeft)}
      </Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleVerifyCode}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'מאמת...' : 'אמת קוד'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => setStep('email')}
        disabled={isLoading}
      >
        <Text style={styles.secondaryButtonText}>חזור לשליחת קוד</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
        <Text style={styles.cancelButtonText}>ביטול</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPasswordStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>סיסמה חדשה</Text>
      <Text style={styles.description}>
        הזן סיסמה חדשה לחשבון שלך
      </Text>

      <TextInput
        style={styles.input}
        placeholder="סיסמה חדשה"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        editable={!isLoading}
      />

      <TextInput
        style={styles.input}
        placeholder="אמת סיסמה חדשה"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        editable={!isLoading}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleResetPassword}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'משנה סיסמה...' : 'שנה סיסמה'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
        <Text style={styles.cancelButtonText}>ביטול</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {step === 'email' && renderEmailStep()}
          {step === 'code' && renderCodeStep()}
          {step === 'password' && renderPasswordStep()}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  stepContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#2c3e50',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#7f8c8d',
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
    textAlign: 'right',
  },
  codeInput: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
    textAlign: 'center',
  },
  timerText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#e74c3c',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#ecf0f1',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#e74c3c',
    fontSize: 14,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
});

export default PasswordResetModal;