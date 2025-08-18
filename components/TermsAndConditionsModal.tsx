import React from 'react';
import {
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

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
            <Text style={styles.title}>תנאי שימוש</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>1. קבלת התנאים</Text>
            <Text style={styles.text}>
              השימוש באפליקציה "ניהול הוצאות משותפות" מהווה הסכמה לתנאי השימוש המפורטים להלן. אם אינך מסכים לתנאים אלה, אנא אל תשתמש באפליקציה.
            </Text>

            <Text style={styles.sectionTitle}>2. תיאור השירות</Text>
            <Text style={styles.text}>
              האפליקציה מאפשרת למשתמשים לנהל הוצאות משותפות בבית, לעקוב אחר הוצאות, לנהל חובות, ולשתף מידע פיננסי עם חברי המשפחה או השותפים.
            </Text>

            <Text style={styles.sectionTitle}>3. הרשמה וחשבון משתמש</Text>
            <Text style={styles.text}>
              • על המשתמש לספק מידע מדויק ומעודכן בעת ההרשמה{'\n'}
              • המשתמש אחראי לשמירת סודיות פרטי ההתחברות שלו{'\n'}
              • המשתמש אחראי לכל הפעילות המתבצעת בחשבונו{'\n'}
              • אסור לשתף חשבון משתמש עם אחרים
            </Text>

            <Text style={styles.sectionTitle}>4. פרטיות ואבטחה</Text>
            <Text style={styles.text}>
              • אנו מתחייבים להגן על פרטיות המשתמשים בהתאם למדיניות הפרטיות שלנו{'\n'}
              • המידע הפיננסי נשמר בשרתים מאובטחים{'\n'}
              • עם זאת, אין אנו יכולים להבטיח אבטחה מוחלטת מפני פריצות או תקלות טכניות
            </Text>

            <Text style={styles.sectionTitle}>5. אחריות המשתמש</Text>
            <Text style={styles.text}>
              • המשתמש אחראי לדיוק המידע שהוא מזין למערכת{'\n'}
              • המשתמש מסכים לא להשתמש באפליקציה למטרות בלתי חוקיות{'\n'}
              • המשתמש לא יעשה שימוש לרעה במערכת או יפגע במשתמשים אחרים
            </Text>

            <Text style={styles.sectionTitle}>6. הגבלת אחריות</Text>
            <Text style={styles.text}>
              • האפליקציה מסופקת "כפי שהיא" ללא כל אחריות{'\n'}
              • אנו לא אחראים לכל נזק ישיר או עקיף שיכול להיגרם מהשימוש באפליקציה{'\n'}
              • אנו לא מתחייבים שהשירות יהיה זמין ללא הפרעה או ללא שגיאות
            </Text>

            <Text style={styles.sectionTitle}>7. הפסקת השירות</Text>
            <Text style={styles.text}>
              • מפתח האפליקציה רשאי להחליט על הפסקת פיתוח האפליקציה וסגירת השרתים בכל רגע נתון{'\n'}
              • המשתמשים מסכימים שלא יוכלו לתבוע על כך שאין להם גישה למידע ששמרו{'\n'}
              • שמירת המידע היא לצורך סדר וארגון בלבד, ואנו איננו מתחייבים לשמירה מלאה ולאורך זמן{'\n'}
              • המשתמשים אחראים לגיבוי המידע החשוב שלהם באופן עצמאי
            </Text>

            <Text style={styles.sectionTitle}>8. שינויים בתנאים</Text>
            <Text style={styles.text}>
              אנו רשאים לעדכן את תנאי השימוש מעת לעת. שינויים מהותיים יובאו לידיעת המשתמשים. המשך השימוש באפליקציה לאחר השינויים מהווה הסכמה לתנאים החדשים.
            </Text>

            <Text style={styles.sectionTitle}>9. קניין רוחני</Text>
            <Text style={styles.text}>
              כל הזכויות באפליקציה, כולל הקוד, העיצוב והתוכן, שייכות למפתח האפליקציה. אסור להעתיק, לשכפל או להפיץ את האפליקציה ללא אישור מפורש.
            </Text>

            <Text style={styles.sectionTitle}>10. דין שולט</Text>
            <Text style={styles.text}>
              תנאי שימוש אלה כפופים לחוקי מדינת ישראל. כל מחלוקת תיפתר בפני בית המשפט המוסמך בישראל.
            </Text>

            <Text style={styles.sectionTitle}>11. יצירת קשר</Text>
            <Text style={styles.text}>
              לשאלות או תלונות בנוגע לתנאי השימוש, ניתן ליצור קשר עם מפתח האפליקציה.
            </Text>

            <Text style={styles.lastUpdated}>
              עודכן לאחרונה: {new Date().toLocaleDateString('he-IL')}
            </Text>
          </ScrollView>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.acceptButton} onPress={onClose}>
              <Text style={styles.acceptButtonText}>אני מסכים לתנאים</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.declineButton} 
              onPress={onDecline || onClose}
            >
              <Text style={styles.declineButtonText}>לא מסכים לתנאים ולא אשתמש באפליקציה</Text>
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
  text: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
    marginBottom: 15,
    textAlign: 'right',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
    fontStyle: 'italic',
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
});

export default TermsAndConditionsModal; 