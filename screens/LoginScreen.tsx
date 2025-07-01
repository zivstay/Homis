import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen: React.FC = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Register form
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerFirstName, setRegisterFirstName] = useState('');
  const [registerLastName, setRegisterLastName] = useState('');
  const [registerError, setRegisterError] = useState('');

  const clearErrors = () => {
    setLoginError('');
    setRegisterError('');
  };

  const handleLogin = async () => {
    clearErrors();
    
    if (!loginEmail || !loginPassword) {
      setLoginError('נא למלא את כל השדות');
      return;
    }

    // Basic email validation for login
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginEmail)) {
      setLoginError('כתובת האימייל אינה תקינה');
      return;
    }

    setIsLoading(true);
    const result = await login(loginEmail, loginPassword);
    setIsLoading(false);

    if (!result.success) {
      // Map common backend errors to Hebrew
      let errorMessage = result.error || 'שגיאה בהתחברות';
      
      // Translate common error messages
      if (errorMessage.includes('Invalid credentials') || errorMessage.includes('incorrect')) {
        errorMessage = 'אימייל או סיסמה שגויים';
      } else if (errorMessage.includes('User not found')) {
        errorMessage = 'משתמש לא נמצא';
      } else if (errorMessage.includes('Connection failed')) {
        errorMessage = 'בעיית חיבור לשרת';
      }
      
      setLoginError(errorMessage);
    }
  };

  const handleRegister = async () => {
    clearErrors();
    
    // Client-side validation
    if (!registerEmail || !registerUsername || !registerPassword || 
        !registerConfirmPassword || !registerFirstName || !registerLastName) {
      setRegisterError('נא למלא את כל השדות');
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

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerEmail)) {
      setRegisterError('כתובת האימייל אינה תקינה');
      return;
    }

    // Username validation
    if (registerUsername.length < 3) {
      setRegisterError('שם המשתמש חייב להיות לפחות 3 תווים');
      return;
    }

    setIsLoading(true);
    const result = await register({
      email: registerEmail,
      username: registerUsername,
      password: registerPassword,
      first_name: registerFirstName,
      last_name: registerLastName,
    });
    setIsLoading(false);

    if (!result.success) {
      // Map common backend errors to Hebrew
      let errorMessage = result.error || 'שגיאה בהרשמה';
      
      // Translate common error messages
      if (errorMessage.includes('already exists') || errorMessage.includes('already registered')) {
        errorMessage = 'משתמש זה כבר קיים במערכת';
      } else if (errorMessage.includes('Invalid email')) {
        errorMessage = 'כתובת האימייל אינה תקינה';
      } else if (errorMessage.includes('Password too short')) {
        errorMessage = 'הסיסמה חייבת להיות לפחות 8 תווים';
      } else if (errorMessage.includes('Username too short')) {
        errorMessage = 'שם המשתמש חייב להיות לפחות 3 תווים';
      } else if (errorMessage.includes('Connection failed')) {
        errorMessage = 'בעיית חיבור לשרת';
      }
      
      setRegisterError(errorMessage);
    }
  };

  const renderLoginForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>התחברות</Text>
      
      <TextInput
        style={[styles.input, loginError ? styles.inputError : null]}
        placeholder="אימייל"
        value={loginEmail}
        onChangeText={(text) => {
          setLoginEmail(text);
          if (loginError) setLoginError('');
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      
      <TextInput
        style={[styles.input, loginError ? styles.inputError : null]}
        placeholder="סיסמה"
        value={loginPassword}
        onChangeText={(text) => {
          setLoginPassword(text);
          if (loginError) setLoginError('');
        }}
        secureTextEntry
      />
      
      {loginError ? (
        <Text style={styles.errorText}>{loginError}</Text>
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
        onPress={() => {
          setIsLogin(false);
          clearErrors();
        }}
      >
        <Text style={styles.linkText}>אין לך חשבון? הירשם כאן</Text>
      </TouchableOpacity>
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
      />
      
      <TextInput
        style={[styles.input, registerError ? styles.inputError : null]}
        placeholder="שם משפחה"
        value={registerLastName}
        onChangeText={(text) => {
          setRegisterLastName(text);
          if (registerError) setRegisterError('');
        }}
      />
      
      <TextInput
        style={[styles.input, registerError ? styles.inputError : null]}
        placeholder="שם משתמש"
        value={registerUsername}
        onChangeText={(text) => {
          setRegisterUsername(text);
          if (registerError) setRegisterError('');
        }}
        autoCapitalize="none"
        autoCorrect={false}
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
      />
      
      {registerError ? (
        <Text style={styles.errorText}>{registerError}</Text>
      ) : null}
      
      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={handleRegister}
        disabled={isLoading}
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
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.appTitle}>Homis</Text>
          <Text style={styles.appSubtitle}>ניהול הוצאות משותפות</Text>
        </View>
        
        {isLogin ? renderLoginForm() : renderRegisterForm()}
      </ScrollView>
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
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
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
});

export default LoginScreen; 