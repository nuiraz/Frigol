import { Linking, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button, Card, Label, Muted, Screen } from '@/components/ui';
import { colors, WEB_APP_URL, fonts } from '@/lib/theme';

export default function ShareScreen() {
  return (
    <Screen contentStyle={styles.content}>
      <Card style={styles.card}>
        <Label>Scanne pour jouer</Label>
        <View style={styles.qr}>
          <QRCode value={WEB_APP_URL} size={220} color="#090914" backgroundColor="#ffffff" />
        </View>
        <Text style={styles.url} onPress={() => Linking.openURL(WEB_APP_URL)}>
          {WEB_APP_URL}
        </Text>
        <Muted style={styles.center}>
          Les invités ouvrent le blind test dans leur navigateur, sans rien installer.
        </Muted>
        <Button
          label="Partager le lien"
          small
          onPress={() => Share.share({ message: `On fait un blind test ? ${WEB_APP_URL}` })}
          style={styles.full}
        />
      </Card>
      <Card>
        <Label>Version Expo Go</Label>
        <Muted>
          Sur ton ordinateur, dans le dossier blindtest : npx expo start, puis scanne le QR code affiché dans le
          terminal avec l’appli Expo Go (Android) ou l’appareil photo (iPhone).
        </Muted>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 24 },
  card: { alignItems: 'center' },
  qr: { padding: 16, backgroundColor: '#fff', borderRadius: 20, marginVertical: 6 },
  url: { color: colors.accent, fontFamily: fonts.bold, textAlign: 'center' },
  center: { textAlign: 'center' },
  full: { alignSelf: 'stretch' },
});
