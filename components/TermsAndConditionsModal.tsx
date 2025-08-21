import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { API_CONFIG } from '../config/api';
import { apiService } from '../services/api';

interface TermsAndConditionsModalProps {
  visible: boolean;
  onClose: () => void;
  onDecline?: () => void;
  onAccept?: () => void;
  requireAcceptance?: boolean;
}

const TermsAndConditionsModal: React.FC<TermsAndConditionsModalProps> = ({
  visible,
  onClose,
  onDecline,
  onAccept,
  requireAcceptance = false,
}) => {
  console.log('📄 TermsAndConditionsModal: Component called with props:');
  console.log('📄 TermsAndConditionsModal: - visible:', visible);
  console.log('📄 TermsAndConditionsModal: - requireAcceptance:', requireAcceptance);
  const [language, setLanguage] = useState<'he' | 'en'>('he');
  const [termsData, setTermsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  // Static content for UI elements
  const uiContent = {
    he: {
      close: '✕',
      accept: 'אני מסכים לתנאים',
      decline: 'לא מסכים לתנאים ולא אשתמש באפליקציה',
      langToggle: 'English',
      loading: 'טוען תנאי שימוש...',
      error: 'שגיאה בטעינת תנאי השימוש',
      accepting: 'שומר הסכמה...',
      newTermsTitle: 'תנאי שימוש חדשים',
      newTermsMessage: 'פורסמו תנאי שימוש חדשים. עליך לאשר אותם כדי להמשיך להשתמש באפליקציה.'
    },
    en: {
      close: '✕',
      accept: 'I agree to the terms',
      decline: 'I do not agree to the terms and will not use the app',
      langToggle: 'עברית',
      loading: 'Loading terms and conditions...',
      error: 'Error loading terms and conditions',
      accepting: 'Saving agreement...',
      newTermsTitle: 'New Terms of Service',
      newTermsMessage: 'New terms of service have been published. You must accept them to continue using the application.'
    }
  };

  const currentUIContent = uiContent[language];

  // Fetch terms from API
  const fetchTerms = async (lang: 'he' | 'en') => {
    setLoading(true);
    setError(null);
    
    try {
      const endpoint = lang === 'en' 
        ? `${API_CONFIG.BASE_URL}${API_CONFIG.TERMS_ENDPOINT}/en`
        : `${API_CONFIG.BASE_URL}${API_CONFIG.TERMS_ENDPOINT}/he`;
      
      console.log('🔄 Fetching terms from:', endpoint);
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const htmlText = await response.text();
      
      if (!htmlText || htmlText.trim().length === 0) {
        throw new Error('Empty response');
      }
      
      // Parse HTML using regex (React Native compatible)
      const sections: { title: string; text: string }[] = [];
      
      // Extract title
      const titleMatch = htmlText.match(/<h1[^>]*>([^<]+)<\/h1>/);
      const title = titleMatch ? titleMatch[1].trim() : '';
      
      // Extract sections (h2 + content)
      const h2Regex = /<h2[^>]*>([^<]+)<\/h2>/g;
      const h2Matches = [...htmlText.matchAll(h2Regex)];
      
      h2Matches.forEach((match, index) => {
        const sectionTitle = match[1].trim();
        const startIndex = match.index! + match[0].length;
        const nextH2Index = h2Matches[index + 1]?.index || htmlText.length;
        
        const sectionText = htmlText.substring(startIndex, nextH2Index)
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&nbsp;/g, ' ') // Replace HTML entities
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim();
        
        if (sectionText) {
          sections.push({ title: sectionTitle, text: sectionText });
        }
      });
      
      // Extract last updated date
      const lastUpdatedMatch = htmlText.match(/<div[^>]*class="last-updated"[^>]*>([^<]+)<\/div>/);
      const lastUpdated = lastUpdatedMatch ? lastUpdatedMatch[1].trim() : '';
      
      setTermsData({
        title,
        sections,
        lastUpdated
      });
      
      console.log('✅ Terms loaded successfully:', { title, sectionsCount: sections.length });
      
    } catch (error) {
      console.error('❌ Error fetching terms:', error);
      setError(currentUIContent.error);
    } finally {
      setLoading(false);
    }
  };

  // Accept terms function
  const handleAcceptTerms = async () => {
    if (!requireAcceptance) {
      onClose();
      return;
    }

    setAccepting(true);
    
    try {
      console.log('🔄 Accepting terms...');
      
      const authToken = apiService.getAccessToken();
      if (!authToken) {
        throw new Error('No authentication token available');
      }
      
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ACCEPT_TERMS_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Terms accepted successfully:', result);
        
        if (onAccept) {
          onAccept();
        }
        
        onClose();
        
        Alert.alert(
          language === 'he' ? 'תודה!' : 'Thank you!',
          language === 'he' 
            ? 'תנאי השימוש נשמרו בהצלחה'
            : 'Terms and conditions have been accepted successfully'
        );
      } else {
        throw new Error(result.error || 'Failed to accept terms');
      }
    } catch (error) {
      console.error('❌ Error accepting terms:', error);
      Alert.alert(
        language === 'he' ? 'שגיאה' : 'Error',
        language === 'he' 
          ? 'שגיאה בשמירת ההסכמה לתנאי השימוש'
          : 'Error saving terms acceptance'
      );
    } finally {
      setAccepting(false);
    }
  };

  // Load terms when language changes or modal becomes visible
  useEffect(() => {
    if (visible) {
      console.log('📄 TermsAndConditionsModal: Modal opened, fetching terms...');
      console.log('📄 TermsAndConditionsModal: requireAcceptance:', requireAcceptance);
      console.log('📄 TermsAndConditionsModal: language:', language);
      fetchTerms(language);
    }
  }, [visible, language]);

  const toggleLanguage = () => {
    const newLang = language === 'he' ? 'en' : 'he';
    setLanguage(newLang);
  };

  const retryFetch = () => {
    fetchTerms(language);
  };

  console.log('📄 TermsAndConditionsModal: About to render Modal with visible:', visible);
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => {
        if (!requireAcceptance) {
          onClose();
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={toggleLanguage} style={styles.languageButton}>
              <Text style={styles.languageButtonText}>{currentUIContent.langToggle}</Text>
            </TouchableOpacity>
            <Text style={[styles.title, language === 'en' && styles.titleEn]}>
              {termsData?.title || (language === 'he' ? 'תנאי שימוש' : 'Terms of Service')}
            </Text>
            {!requireAcceptance && (
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>{currentUIContent.close}</Text>
              </TouchableOpacity>
            )}
            {requireAcceptance && (
              <View style={styles.closeButton} />
            )}
          </View>
          
          {requireAcceptance && (
            <View style={styles.newTermsNotification}>
              <Text style={styles.newTermsTitle}>{currentUIContent.newTermsTitle}</Text>
              <Text style={styles.newTermsMessage}>{currentUIContent.newTermsMessage}</Text>
            </View>
          )}
          
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.loadingText}>{currentUIContent.loading}</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={retryFetch}>
                  <Text style={styles.retryButtonText}>
                    {language === 'he' ? 'נסה שוב' : 'Try Again'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : termsData ? (
              <View>
                {termsData.sections?.map((section: { title: string; text: string }, index: number) => (
                  <View key={index}>
                    <Text style={[styles.sectionTitle, language === 'en' && styles.sectionTitleEn]}>
                      {section.title}
                    </Text>
                    <Text style={[styles.text, language === 'en' && styles.textEn]}>
                      {section.text}
                    </Text>
                  </View>
                ))}
                
                {termsData.lastUpdated && (
                  <Text style={[styles.lastUpdated, language === 'en' && styles.lastUpdatedEn]}>
                    {termsData.lastUpdated}
                  </Text>
                )}
              </View>
            ) : null}
          </ScrollView>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.acceptButton, accepting && styles.disabledButton]} 
              onPress={handleAcceptTerms}
              disabled={accepting}
            >
              <Text style={styles.acceptButtonText}>
                {accepting ? currentUIContent.accepting : currentUIContent.accept}
              </Text>
            </TouchableOpacity>
            
            {requireAcceptance ? (
              <TouchableOpacity 
                style={styles.declineButton} 
                onPress={onDecline}
              >
                <Text style={styles.declineButtonText}>{currentUIContent.decline}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.declineButton} 
                onPress={onDecline || onClose}
              >
                <Text style={styles.declineButtonText}>{currentUIContent.decline}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalContainer: {
    backgroundColor: 'white',
    width: '100%',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    flex: 1,
  },
  titleEn: {
    textAlign: 'center',
  },
  newTermsNotification: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    padding: 16,
    margin: 16,
    marginTop: 0,
    borderRadius: 8,
  },
  newTermsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    textAlign: 'center',
    marginBottom: 8,
  },
  newTermsMessage: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    lineHeight: 20,
  },
  languageButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    width: 60,
    alignItems: 'center',
    marginTop: 5,
  },
  languageButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#7f8c8d',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'right',
  },
  sectionTitleEn: {
    textAlign: 'left',
  },
  text: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
    marginBottom: 15,
    textAlign: 'right',
  },
  textEn: {
    textAlign: 'left',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  lastUpdatedEn: {
    textAlign: 'center',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  acceptButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 10,
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  declineButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  declineButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
    opacity: 0.7,
  },
});

export default TermsAndConditionsModal;