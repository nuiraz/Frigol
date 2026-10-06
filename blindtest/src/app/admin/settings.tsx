import { useState } from 'react';
import { Platform, Share, StyleSheet } from 'react-native';

import { Button, Card, Input, Label, Muted, Screen } from '@/components/ui';
import { useAdminGuard } from '@/lib/admin-session';
import { confirmAction, notify } from '@/lib/dialogs';
import { isValidData, useStore } from '@/lib/store';

export default function Settings() {
  const ok = useAdminGuard();
  const store = useStore();
  const { settings } = store.data;
  const [pin, setPin] = useState('');
  const [apiKey, setApiKey] = useState(settings.youtubeApiKey);
  const [importText, setImportText] = useState('');

  if (!ok) return null;

  const savePin = () => {
    if (pin.length < 4) return notify('Code trop court', 'Choisis un code d’au moins 4 chiffres.');
    store.updateSettings({ adminPin: pin });
    setPin('');
    notify('Code modifié', 'Le nouveau code administrateur est enregistré.');
  };

  const exportData = async () => {
    // La clé API et le code ne sont pas exportés.
    const json = JSON.stringify({
      ...store.data,
      settings: { adminPin: '', youtubeApiKey: '' },
    });
    if (Platform.OS === 'web') {
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'blindtest-sauvegarde.json';
      a.click();
    } else {
      await Share.share({ message: json, title: 'Sauvegarde Blind Test' });
    }
  };

  const importData = async () => {
    try {
      const parsed = JSON.parse(importText);
      if (!isValidData(parsed)) throw new Error('format');
      const ok = await confirmAction(
        'Importer la sauvegarde',
        `${parsed.categories.length} catégorie(s) remplaceront les catégories actuelles.`,
        'Importer',
      );
      if (!ok) return;
      store.replaceAll({
        ...store.data,
        categories: parsed.categories,
        bestScores: parsed.bestScores ?? {},
      });
      setImportText('');
      notify('Import réussi', 'Les catégories ont été remplacées.');
    } catch {
      notify('Import impossible', 'Le texte collé n’est pas une sauvegarde Blind Test valide.');
    }
  };

  return (
    <Screen>
      <Card>
        <Label>Code administrateur</Label>
        <Input value={pin} onChangeText={setPin} placeholder="Nouveau code" secureTextEntry keyboardType="number-pad" />
        <Button label="Changer le code" small onPress={savePin} disabled={!pin} />
      </Card>

      <Card>
        <Label>Clé API YouTube (optionnelle)</Label>
        <Muted>
          Sans clé, l’import lit la playlist via le lecteur YouTube (jusqu’à ~200 titres). Avec une clé YouTube Data API
          v3 (gratuite sur console.cloud.google.com), l’import est plus rapide et plus fiable.
        </Muted>
        <Input value={apiKey} onChangeText={setApiKey} placeholder="AIza…" autoCapitalize="none" autoCorrect={false} />
        <Button
          label="Enregistrer la clé"
          small
          onPress={() => {
            store.updateSettings({ youtubeApiKey: apiKey.trim() });
            notify('Clé enregistrée', apiKey.trim() ? 'La clé sera utilisée pour les imports.' : 'Clé supprimée.');
          }}
        />
      </Card>

      <Card>
        <Label>Sauvegarde</Label>
        <Muted>Exporte tes catégories pour les partager ou les copier sur un autre téléphone.</Muted>
        <Button label="Exporter les catégories" small variant="secondary" onPress={exportData} />
        <Input
          value={importText}
          onChangeText={setImportText}
          placeholder="Colle ici le contenu d’une sauvegarde…"
          multiline
          style={styles.importBox}
        />
        <Button label="Importer" small variant="secondary" disabled={!importText.trim()} onPress={importData} />
      </Card>

      <Card>
        <Label>Réinitialiser</Label>
        <Button
          label="Effacer les meilleurs scores"
          small
          variant="ghost"
          onPress={async () => {
            if (await confirmAction('Effacer les scores', 'Tous les meilleurs scores seront supprimés.', 'Effacer'))
              store.replaceAll({ ...store.data, bestScores: {} });
          }}
        />
        <Button
          label="Revenir aux catégories de démo"
          small
          variant="danger"
          onPress={async () => {
            if (
              await confirmAction(
                'Réinitialiser',
                'Toutes tes catégories seront remplacées par la démo.',
                'Réinitialiser',
              )
            )
              store.resetToDemo();
          }}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  importBox: { minHeight: 90, textAlignVertical: 'top' },
});
