import { Alert } from 'react-native';

interface AdConsentModalProps {
  title?: string;
  message?: string;
  alwaysRequireAd?: boolean;
}

export const showAdConsentModal = async (props: AdConsentModalProps = {}): Promise<boolean> => {
  const {
    title = '🎉 תודה על השימוש',
    message = 'בשביל שתוכל להוסיף הוצאה, נשמח שתצפה בפרסומת קטנה שתעזור לנו להמשיך לפתח את Homeis!\n\n**חשוב לדעת:**\n•תצטרך לצפות בה עד הסוף כדי שההוצאה תתווסף\n•אנחנו דואגים לחווית משתמש נעימה - לא נציג יותר מ-2 פרסומות ביום',
    alwaysRequireAd = false
  } = props;

  if (alwaysRequireAd) {
    // For export - always show ad, user must consent but can cancel
    return new Promise<boolean>((resolve) => {
      Alert.alert(
        title,
        message,
        [
          {
            text: 'ביטול',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'אני מסכים לצפות! 😊',
            style: 'default',
            onPress: () => resolve(true)
          }
        ]
      );
    });
  }

  // For expense creation - user can choose
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'לא עכשיו',
          style: 'cancel',
          onPress: () => resolve(false)
        },
        {
          text: 'אני מסכים לצפות! 😊',
          style: 'default',
          onPress: () => resolve(true)
        }
      ]
    );
  });
}; 