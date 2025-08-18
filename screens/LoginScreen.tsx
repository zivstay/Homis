import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import PasswordResetModal from '../components/PasswordResetModal';
import TermsAndConditionsModal from '../components/TermsAndConditionsModal';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register, sendVerificationCode, verifyCodeAndRegister, resetVerification, showVerification, setShowVerification, pendingUserData } = useAuth();

  // Register form
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerFirstName, setRegisterFirstName] = useState('');
  const [registerLastName, setRegisterLastName] = useState('');
  const [registerError, setRegisterError] = useState('');

  // Email verification
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  // Remove local pendingUserData - using the one from AuthContext
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

  // Password reset modal
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  
  // Terms and conditions modal
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Add new state for terms acceptance
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    setError('');
    setRegisterError('');
    setVerificationError('');
    // Don't reset showVerification here - it should persist
    console.log('🔍 LoginScreen: useEffect triggered by isLogin change, isLogin:', isLogin);
  }, [isLogin]);

  // Add effect to monitor showVerification changes
  useEffect(() => {
    console.log('🔍 LoginScreen: showVerification changed to:', showVerification);
  }, [showVerification]);

  // Add effect to monitor isLogin changes
  useEffect(() => {
    console.log('🔍 LoginScreen: isLogin changed to:', isLogin);
  }, [isLogin]);

  // Timer for verification code expiry
  useEffect(() => {
    let interval: number;
    if (showVerification && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            setShowVerification(false);
            setVerificationError('קוד האימות פג תוקף. אנא נסה שוב.');
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showVerification, timeLeft]);

  const startTimer = () => {
    setTimeLeft(300); // 5 minutes
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleVerifyCode = async () => {
    console.log('🔍 LoginScreen: handleVerifyCode called');
    console.log('🔍 LoginScreen: verificationCode:', verificationCode);
    console.log('🔍 LoginScreen: pendingUserData:', pendingUserData);
    console.log('🔍 LoginScreen: isLoading:', isLoading);
    
    if (!verificationCode || verificationCode.length !== 5) {
      console.log('🔍 LoginScreen: Invalid verification code length');
      setVerificationError('נא להזין קוד בן 5 ספרות');
      return;
    }

    if (!pendingUserData) {
      console.log('🔍 LoginScreen: No pending user data');
      setVerificationError('שגיאה במערכת. אנא נסה שוב.');
      return;
    }

    console.log('🔍 LoginScreen: Starting verification process...');
    setIsLoading(true);
    const result = await verifyCodeAndRegister(pendingUserData.email, verificationCode);
    console.log('🔍 LoginScreen: Verification result:', result);
    setIsLoading(false);

    if (result.success) {
      console.log('🔍 LoginScreen: Verification successful');
      // Registration successful, user is now logged in
      setShowVerification(false);
      setVerificationCode('');
      // setPendingUserData(null); // This is now handled by AuthContext
    } else {
      console.log('🔍 LoginScreen: Verification failed:', result.error);
      let errorMessage = result.error || 'קוד אימות שגוי';
      
      if (errorMessage.includes('expired')) {
        errorMessage = 'קוד האימות פג תוקף. אנא נסה שוב.';
        setShowVerification(false);
      } else if (errorMessage.includes('invalid') || errorMessage.includes('incorrect')) {
        errorMessage = 'קוד אימות שגוי. אנא נסה שוב.';
      }
      
      setVerificationError(errorMessage);
    }
  };

  const handleResendCode = async () => {
    if (!pendingUserData) return;

    setIsLoading(true);
    const result = await sendVerificationCode(pendingUserData);
    setIsLoading(false);

    if (result.success) {
      setTimeLeft(300); // Reset timer
      setVerificationError('');
      Alert.alert('הצלחה', 'קוד אימות חדש נשלח לאימייל שלך');
    } else {
      setVerificationError(result.error || 'שגיאה בשליחת קוד אימות');
    }
  };

  const clearErrors = () => {
    setError('');
    setRegisterError('');
    setVerificationError('');
  };

  const handleLogin = async () => {
    clearErrors();
    
    if (!email || !password) {
      setError('נא למלא את כל השדות');
      return;
    }

    // Basic email validation for login
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('כתובת האימייל אינה תקינה');
      return;
    }

    setIsLoading(true);
    const result = await login({ email, password });
    setIsLoading(false);

    if (!result.success) {
      // Handle specific error messages
      let errorMessage = result.error || 'שגיאה בהתחברות';
      
      if (errorMessage.includes('User not found') || errorMessage.includes('Invalid credentials')) {
        errorMessage = 'שם משתמש או סיסמה שגויים';
      } else if (errorMessage.includes('Network error') || errorMessage.includes('Connection failed')) {
        errorMessage = 'שגיאת חיבור - בדוק את החיבור לאינטרנט';
      }
      
      setError(errorMessage);
    }
  };

  const handleRegister = async () => {
    clearErrors();
    
    console.log('🔍 LoginScreen: Starting registration process...');
    console.log('🔍 LoginScreen: Current isLogin state:', isLogin);
    
         if (!registerEmail || !registerPassword ||
         !registerConfirmPassword || !registerFirstName || !registerLastName) {
       setRegisterError('נא למלא את כל השדות');
       return;
     }

    // Check if terms are accepted
    if (!acceptedTerms) {
      setRegisterError('עליך לאשר את תנאי השימוש כדי להמשיך');
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setRegisterError('הסיסמאות אינן תואמות');
      return;
    }

    if (registerPassword.length < 8) {
      setRegisterError('הסיסמה חייבת להיות לפחות 8 תווים');
      return;
    }

    // Email validation for registration
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerEmail)) {
      setRegisterError('כתובת האימייל אינה תקינה');
      return;
    }

    

         // Generate username from email (remove @domain part)
     const username = registerEmail.split('@')[0];
     
     const userData = {
       email: registerEmail,
       username: username,
       password: registerPassword,
       first_name: registerFirstName,
       last_name: registerLastName,
       accepted_terms: acceptedTerms, // Use the checkbox state
       terms_accepted_at: acceptedTerms ? new Date().toISOString() : null // Only set if accepted
     };

    console.log('🔍 LoginScreen: Sending verification code for:', userData.email);
    setIsLoading(true);
    const result = await sendVerificationCode(userData);
    setIsLoading(false);

    console.log('🔍 LoginScreen: Verification code result:', result);

    if (result.success) {
      console.log('🔍 LoginScreen: Verification code sent successfully, showing verification screen');
      console.log('🔍 LoginScreen: Setting showVerification to true');
      // Store user data and show verification screen - now handled by AuthContext
      // setShowVerification(true); // This is now handled in AuthContext
      setTimeLeft(300); // Reset timer to 5 minutes
      startTimer();
      console.log('🔍 LoginScreen: State updated - showVerification should be true now');
    } else {
      console.log('🔍 LoginScreen: Verification code failed:', result.error);
      // Handle specific error messages
      let errorMessage = result.error || 'שגיאה ברישום';
      
      if (errorMessage.includes('Email already exists')) {
        errorMessage = 'כתובת האימייל כבר קיימת במערכת';
      } else        if (errorMessage.includes('already exists') || errorMessage.includes('already registered')) {
         if (errorMessage.includes('email')) {
           errorMessage = 'כתובת האימייל כבר קיימת במערכת';
         } else {
           errorMessage = 'המשתמש כבר קיים במערכת';
         }
       } else if (errorMessage.includes('Connection failed')) {
        errorMessage = 'שגיאת חיבור - בדוק את החיבור לאינטרנט';
      }
      
      setRegisterError(errorMessage);
    }
  };

  const renderLoginForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>התחברות</Text>
      
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholder="אימייל"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (error) setError('');
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={() => Keyboard.dismiss()}
        blurOnSubmit={true}
      />
      
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholder="סיסמה"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (error) setError('');
        }}
        secureTextEntry
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
        blurOnSubmit={true}
      />
      
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}
      
      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={handleLogin}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'מתחבר...' : 'התחבר'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => setShowPasswordResetModal(true)}
      >
        <Text style={styles.linkText}>שכחת סיסמה?</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => {
          setIsLogin(false);
          clearErrors();
        }}
      >
        <Text style={styles.linkText}>אין לך חשבון? הירשם כאן</Text>
      </TouchableOpacity>
      
             <View style={styles.termsContainer}>
         <Text style={styles.termsText}>
           בהתחברות למערכת, אתה מסכים לתנאי השימוש שלנו
         </Text>
         <TouchableOpacity onPress={() => setShowTermsModal(true)}>
           <Text style={styles.termsLink}>תנאי השימוש</Text>
         </TouchableOpacity>
       </View>
    </View>
  );

  const renderRegisterForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>הרשמה</Text>
      
      <TextInput
        style={[styles.input, registerError ? styles.inputError : null]}
        placeholder="שם פרטי"
        value={registerFirstName}
        onChangeText={(text) => {
          setRegisterFirstName(text);
          if (registerError) setRegisterError('');
        }}
        returnKeyType="next"
        onSubmitEditing={() => Keyboard.dismiss()}
        blurOnSubmit={true}
      />
      
      <TextInput
        style={[styles.input, registerError ? styles.inputError : null]}
        placeholder="שם משפחה"
        value={registerLastName}
        onChangeText={(text) => {
          setRegisterLastName(text);
          if (registerError) setRegisterError('');
        }}
        returnKeyType="next"
        onSubmitEditing={() => Keyboard.dismiss()}
        blurOnSubmit={true}
      />
      
      
      
      <TextInput
        style={[styles.input, registerError ? styles.inputError : null]}
        placeholder="אימייל"
        value={registerEmail}
        onChangeText={(text) => {
          setRegisterEmail(text);
          if (registerError) setRegisterError('');
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={() => Keyboard.dismiss()}
        blurOnSubmit={true}
      />
      
      <TextInput
        style={[styles.input, registerError ? styles.inputError : null]}
        placeholder="סיסמה"
        value={registerPassword}
        onChangeText={(text) => {
          setRegisterPassword(text);
          if (registerError) setRegisterError('');
        }}
        secureTextEntry
        returnKeyType="next"
        onSubmitEditing={() => Keyboard.dismiss()}
        blurOnSubmit={true}
      />
      
      <TextInput
        style={[styles.input, registerError ? styles.inputError : null]}
        placeholder="אימות סיסמה"
        value={registerConfirmPassword}
        onChangeText={(text) => {
          setRegisterConfirmPassword(text);
          if (registerError) setRegisterError('');
        }}
        secureTextEntry
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
        blurOnSubmit={true}
      />
      
      {registerError ? (
        <Text style={styles.errorText}>{registerError}</Text>
      ) : null}
      
      {/* Add terms acceptance checkbox */}
      <View style={styles.termsCheckboxContainer}>
        <TouchableOpacity 
          style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}
          onPress={() => setAcceptedTerms(!acceptedTerms)}
        >
          {acceptedTerms && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
                 <View style={styles.termsTextContainer}>
           <Text style={styles.termsCheckboxText}>
             אני מסכים לתנאי השימוש של המערכת
           </Text>
           <TouchableOpacity onPress={() => setShowTermsModal(true)}>
             <Text style={styles.termsLinkCheckbox}>תנאי השימוש</Text>
           </TouchableOpacity>
         </View>
      </View>
      
      <TouchableOpacity
        style={[
          styles.button, 
          styles.primaryButton,
          !acceptedTerms && styles.buttonDisabled
        ]}
        onPress={handleRegister}
        disabled={isLoading || !acceptedTerms}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'נרשם...' : 'הירשם'}
        </Text>
      </TouchableOpacity>
      
             <TouchableOpacity
         style={styles.linkButton}
         onPress={() => {
           setIsLogin(true);
           clearErrors();
         }}
       >
         <Text style={styles.linkText}>יש לך חשבון? התחבר כאן</Text>
       </TouchableOpacity>
       
       <TouchableOpacity
         style={styles.linkButton}
         onPress={() => {
           setIsLogin(true);
           clearErrors();
         }}
       >
         <Text style={styles.linkText}>חזור להתחברות</Text>
       </TouchableOpacity>
      
             <View style={styles.termsContainer}>
         <Text style={styles.termsText}>
           בהרשמה למערכת, אתה מסכים לתנאי השימוש שלנו
         </Text>
         <TouchableOpacity onPress={() => setShowTermsModal(true)}>
           <Text style={styles.termsLink}>תנאי השימוש</Text>
         </TouchableOpacity>
       </View>
    </View>
  );

  const renderVerificationScreen = () => (
    <View style={styles.form}>
      <Text style={styles.verificationTitle}>אימות אימייל</Text>
      <Text style={styles.verificationSubtitle}>
        שלחנו קוד אימות בן 5 ספרות לכתובת האימייל:
      </Text>
      <Text style={styles.verificationEmail}>{pendingUserData?.email}</Text>
      
      <Text style={[styles.verificationSubtitle, { marginBottom: 20 }]}>
        הזן את הקוד למטה ולחץ על "אמת קוד"
      </Text>
      
      <TextInput
        style={[styles.codeInput, verificationError ? styles.inputError : null]}
        placeholder="קוד אימות (5 ספרות)"
        value={verificationCode}
        onChangeText={(text) => {
          // Only allow numbers and limit to 5 digits
          const numericText = text.replace(/[^0-9]/g, '').substring(0, 5);
          setVerificationCode(numericText);
          if (verificationError) setVerificationError('');
        }}
        keyboardType="numeric"
        maxLength={5}
        textAlign="center"
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
        blurOnSubmit={true}
      />
      
      {verificationCode.length < 5 && (
        <Text style={styles.verificationSubtitle}>
          הזן 5 ספרות מהקוד שנשלח לאימייל שלך
        </Text>
      )}
      
      {verificationCode.length === 5 && (
        <Text style={[styles.verificationSubtitle, { color: '#27ae60', fontWeight: 'bold' }]}>
          ✓ הקוד מוכן לאימות - לחץ על "אמת קוד"
        </Text>
      )}
      
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>
          הקוד יפוג תוקף בעוד: {formatTime(timeLeft)}
        </Text>
      </View>
      
      {verificationError ? (
        <Text style={styles.errorText}>{verificationError}</Text>
      ) : null}
      
      <TouchableOpacity
        style={[
          styles.button, 
          styles.primaryButton, 
          { 
            backgroundColor: verificationCode.length === 5 ? '#27ae60' : '#bdc3c7',
            marginBottom: 20,
            flex: 1,
            minHeight: 50
          }
        ]}
        onPress={() => {
          console.log('🔍 LoginScreen: Verify button pressed');
          console.log('🔍 LoginScreen: Button disabled:', isLoading || verificationCode.length !== 5);
          console.log('🔍 LoginScreen: isLoading:', isLoading);
          console.log('🔍 LoginScreen: verificationCode.length:', verificationCode.length);
          handleVerifyCode();
        }}
        disabled={isLoading || verificationCode.length !== 5}
      >
        <Text style={[styles.buttonText, { color: 'white' }]}>
          {isLoading ? 'מאמת...' : 'אמת קוד'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.resendButton}
        onPress={handleResendCode}
        disabled={isLoading || timeLeft > 240} // Only allow resend after 1 minute
      >
        <Text style={[styles.resendButtonText, (isLoading || timeLeft > 240) && styles.resendButtonTextDisabled]}>
          שלח קוד חדש
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => {
          // setShowVerification(false); // This is now handled in AuthContext
          setVerificationCode('');
          // setPendingUserData(null); // This is now handled by AuthContext
          setVerificationError('');
          resetVerification(); // Reset verification state
        }}
      >
        <Text style={styles.linkText}>חזור לרישום</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Image 
            source={require('../assets/images/main_logo.jpeg')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.appSubtitle}>ניהול הוצאות משותפות</Text>
        </View>
        
        {showVerification ? renderVerificationScreen() : (isLogin ? renderLoginForm() : renderRegisterForm())}
      </ScrollView>
      
      <PasswordResetModal
        visible={showPasswordResetModal}
        onClose={() => setShowPasswordResetModal(false)}
      />
      
      <TermsAndConditionsModal
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onDecline={() => {
          setShowTermsModal(false);
          // אפשר להוסיף כאן לוגיקה נוספת כמו יציאה מהאפליקציה או הצגת הודעה
          Alert.alert(
            'התנאים לא התקבלו',
            'אם אינך מסכים לתנאי השימוש, לא תוכל להשתמש באפליקציה. אנא שקול שוב את החלטתך.',
            [
              { text: 'הבנתי', style: 'default' }
            ]
          );
        }}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImage: {
    width: 150,
    height: 150,
    marginBottom: 16,
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    textAlign: 'right',
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#3498db',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    alignItems: 'center',
  },
  linkText: {
    color: '#3498db',
    fontSize: 14,
  },
  inputError: {
    borderColor: '#e74c3c',
    borderWidth: 2,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  verificationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 10,
  },
  verificationSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 10,
  },
  verificationEmail: {
    fontSize: 16,
    color: '#3498db',
    textAlign: 'center',
    marginBottom: 20,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  resendButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  resendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendButtonTextDisabled: {
    color: '#bdc3c7',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  termsContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  termsText: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 16,
  },
  termsLink: {
    fontSize: 12,
    color: '#3498db',
    textDecorationLine: 'underline',
    fontWeight: 'bold',
    writingDirection: 'rtl',
    lineHeight: 16,
  },
  termsCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 15,
    paddingHorizontal: 5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#3498db',
    borderRadius: 4,
    marginRight: 12,
    marginTop: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  checkboxChecked: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  termsTextContainer: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: 0,
    minHeight: 24,
  },
  termsCheckboxText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  termsLinkCheckbox: {
    fontSize: 14,
    color: '#3498db',
    textDecorationLine: 'underline',
    fontWeight: 'bold',
    lineHeight: 20,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default LoginScreen; 