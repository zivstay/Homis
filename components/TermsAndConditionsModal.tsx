import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { API_CONFIG } from '../config/api';

interface TermsAndConditionsModalProps {
  visible: boolean;
  onClose: () => void;
  onDecline?: () => void;
}

const TermsAndConditionsModal: React.FC<TermsAndConditionsModalProps> = ({
  visible,
  onClose,
  onDecline,
}) => {
  const [language, setLanguage] = useState<'he' | 'en'>('he');
  const [termsData, setTermsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Static content for UI elements
  const uiContent = {
    he: {
      close: '✕',
      accept: 'אני מסכים לתנאים',
      decline: 'לא מסכים לתנאים ולא אשתמש באפליקציה',
      langToggle: 'English',
      loading: 'טוען תנאי שימוש...',
      error: 'שגיאה בטעינת תנאי השימוש'
    },
    en: {
      close: '✕',
      accept: 'I agree to the terms',
      decline: 'I do not agree to the terms and will not use the app',
      langToggle: 'עברית',
      loading: 'Loading terms and conditions...',
      error: 'Error loading terms and conditions'
    }
  };

  const currentUIContent = uiContent[language];

  // Fetch terms from API
  const fetchTerms = async (lang: 'he' | 'en') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.TERMS_ENDPOINT}/${lang === 'en' ? 'en' : 'he'}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const htmlText = await response.text();
      
      // Simple HTML parsing using regex for React Native compatibility
      const titleMatch = htmlText.match(/<h1[^>]*>([^<]+)<\/h1>/);
      const title = titleMatch ? titleMatch[1].trim() : '';
      
      // Extract sections using regex
      const sections: Array<{title: string, text: string}> = [];
      const h2Regex = /<h2[^>]*>([^<]+)<\/h2>/g;
      const h2Matches = [...htmlText.matchAll(h2Regex)];
      
      h2Matches.forEach((match, index) => {
        const sectionTitle = match[1].trim();
        const startIndex = match.index! + match[0].length;
        const nextH2Index = h2Matches[index + 1]?.index || htmlText.length;
        const sectionText = htmlText.substring(startIndex, nextH2Index)
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&nbsp;/g, ' ') // Replace HTML entities
          .trim();
        
        sections.push({
          title: sectionTitle,
          text: sectionText
        });
      });
      
      // Extract last updated
      const lastUpdatedMatch = htmlText.match(/<div[^>]*class="last-updated"[^>]*>([^<]+)<\/div>/);
      const lastUpdated = lastUpdatedMatch ? lastUpdatedMatch[1].trim() : '';
      
      setTermsData({
        title,
        sections,
        lastUpdated
      });
      
    } catch (err) {
      console.error('Error fetching terms:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Load terms when language changes or modal becomes visible
  useEffect(() => {
    if (visible) {
      fetchTerms(language);
    }
  }, [visible, language]);

  const toggleLanguage = () => {
    const newLang = language === 'he' ? 'en' : 'he';
    setLanguage(newLang);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
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
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>{currentUIContent.close}</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.loadingText}>{currentUIContent.loading}</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{currentUIContent.error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => fetchTerms(language)}>
                  <Text style={styles.retryButtonText}>
                    {language === 'he' ? 'נסה שוב' : 'Retry'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : termsData ? (
              <>
                {termsData.sections.map((section: {title: string, text: string}, index: number) => (
                  <View key={index}>
                    <Text style={[styles.sectionTitle, language === 'en' && styles.sectionTitleEn]}>
                      {section.title}
                    </Text>
                    <Text style={[styles.text, language === 'en' && styles.textEn]}>
                      {section.text}
                    </Text>
                  </View>
                ))}

                <Text style={[styles.lastUpdated, language === 'en' && styles.lastUpdatedEn]}>
                  {termsData.lastUpdated || (
                    language === 'he' 
                      ? `עודכן לאחרונה: ${new Date().toLocaleDateString('he-IL')}`
                      : `Last updated: ${new Date().toLocaleDateString('en-US')}`
                  )}
                </Text>
              </>
            ) : null}
          </ScrollView>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.acceptButton} onPress={onClose}>
              <Text style={styles.acceptButtonText}>{currentUIContent.accept}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.declineButton} 
              onPress={onDecline || onClose}
            >
              <Text style={styles.declineButtonText}>{currentUIContent.decline}</Text>
            </TouchableOpacity>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
    flexDirection: 'column',
    padding: 20,
    gap: 12,
  },
  acceptButton: {
    backgroundColor: '#27ae60',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  declineButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  declineButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TermsAndConditionsModal; 